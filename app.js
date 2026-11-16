// Initialize Leaflet Map centered on North Carolina
const map = L.map("map").setView([35.55, -79.4], 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors | NC Wetland Design Assistant"
}).addTo(map);

// Feature groups for Drainage & Wetland polygons
const drainageLayerGroup = new L.FeatureGroup().addTo(map);
const wetlandLayerGroup = new L.FeatureGroup().addTo(map);

let drainageGeoJSON = null;
let wetlandGeoJSON = null;
let activeDrawHandler = null;
let currentDrawTarget = null;

// Polygon Draw Helpers
function startPolygonDraw(target) {
  if (activeDrawHandler) {
    activeDrawHandler.disable();
  }
  currentDrawTarget = target;
  const color = target === "drainage" ? "#0277bd" : "#1b5e20";

  activeDrawHandler = new L.Draw.Polygon(map, {
    allowIntersection: false,
    showArea: true,
    shapeOptions: {
      color: color,
      weight: 3,
      fillOpacity: 0.25
    }
  });
  activeDrawHandler.enable();
}

map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  const geojson = layer.toGeoJSON();

  if (currentDrawTarget === "drainage") {
    drainageLayerGroup.clearLayers();
    drainageLayerGroup.addLayer(layer);
    drainageGeoJSON = geojson;
    updatePolygonReadout("drainage", geojson);
  } else if (currentDrawTarget === "wetland") {
    wetlandLayerGroup.clearLayers();
    wetlandLayerGroup.addLayer(layer);
    wetlandGeoJSON = geojson;
    updatePolygonReadout("wetland", geojson);
  }
  updateLocationRainfallPreview();
});

function getAreaSqFt(geojson) {
  const areaSqMeters = turf.area(geojson);
  return areaSqMeters * 10.7639104;
}

function updatePolygonReadout(target, geojson) {
  const sqFt = getAreaSqFt(geojson);
  const acres = sqFt / 43560;
  const text = `${Math.round(sqFt).toLocaleString()} ft² (${acres.toFixed(2)} acres)`;
  document.getElementById(`${target}-readout`).textContent = text;
}

function isInsideNorthCarolina(geojson) {
  const centroid = turf.centroid(geojson).geometry.coordinates; // [lon, lat]
  const [lon, lat] = centroid;
  return (
    lat >= NC_BOUNDS.minLat &&
    lat <= NC_BOUNDS.maxLat &&
    lon >= NC_BOUNDS.minLon &&
    lon <= NC_BOUNDS.maxLon
  );
}

function detectNCRegion(geojson) {
  const [lon, lat] = turf.centroid(geojson).geometry.coordinates;
  if (lon < NC_RAINFALL_REGIONS.piedmont.lonMin) {
    return { region: NC_RAINFALL_REGIONS.mountains, lat, lon };
  } else if (lon <= NC_RAINFALL_REGIONS.piedmont.lonMax) {
    return { region: NC_RAINFALL_REGIONS.piedmont, lat, lon };
  } else {
    return { region: NC_RAINFALL_REGIONS.coastal, lat, lon };
  }
}

function updateLocationRainfallPreview() {
  const refGeo = wetlandGeoJSON || drainageGeoJSON;
  if (!refGeo) {
    document.getElementById("detected-region").textContent = "Draw polygons to detect location";
    document.getElementById("detected-rain").textContent = "—";
    return;
  }

  if (!isInsideNorthCarolina(refGeo)) {
    document.getElementById("detected-region").textContent = "Out of State (Must be in NC)";
    document.getElementById("detected-rain").textContent = "N/A";
    return;
  }

  const { region, lat, lon } = detectNCRegion(refGeo);
  const stormKey = document.getElementById("storm-select").value;
  const storm = region.storms[stormKey];

  document.getElementById("detected-region").textContent = `${region.name} (${lat.toFixed(3)}°N, ${Math.abs(lon).toFixed(3)}°W)`;
  document.getElementById("detected-rain").textContent = `${storm.depthIn.toFixed(2)} inches (${storm.label})`;
}

// Button Bindings
document.getElementById("draw-drainage").addEventListener("click", () => startPolygonDraw("drainage"));
document.getElementById("draw-wetland").addEventListener("click", () => startPolygonDraw("wetland"));
document.getElementById("storm-select").addEventListener("change", updateLocationRainfallPreview);

document.getElementById("clear-polygons").addEventListener("click", () => {
  drainageLayerGroup.clearLayers();
  wetlandLayerGroup.clearLayers();
  drainageGeoJSON = null;
  wetlandGeoJSON = null;
  document.getElementById("drainage-readout").textContent = "Not drawn yet";
  document.getElementById("wetland-readout").textContent = "Not drawn yet";
  document.getElementById("results-container").classList.add("hidden");
  document.getElementById("btn-print").disabled = true;
  updateLocationRainfallPreview();
});

// Modal Controls
const modal = document.getElementById("equations-modal");
document.getElementById("btn-equations").addEventListener("click", () => modal.classList.remove("hidden"));
document.getElementById("close-modal").addEventListener("click", () => modal.classList.add("hidden"));
document.getElementById("btn-print").addEventListener("click", () => window.print());

// Main Hydrology, Sizing & Ecological Design Calculation Engine
document.getElementById("design-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const errorBanner = document.getElementById("error-banner");
  errorBanner.classList.add("hidden");

  // 1. Input Validation & Error Handling
  if (!drainageGeoJSON || !wetlandGeoJSON) {
    showError("Please draw both the Contributing Drainage Area polygon and the Available Wetland Footprint polygon on the map.");
    return;
  }

  const drainageAreaSqFt = getAreaSqFt(drainageGeoJSON);
  const availableAreaSqFt = getAreaSqFt(wetlandGeoJSON);

  if (drainageAreaSqFt < 500 || availableAreaSqFt < 100) {
    showError("Drawn polygon area is too small or invalid. Please draw valid site boundaries.");
    return;
  }

  if (!isInsideNorthCarolina(drainageGeoJSON) || !isInsideNorthCarolina(wetlandGeoJSON)) {
    showError("Selected site appears to be outside North Carolina. Please place both polygons inside NC.");
    return;
  }

  const imperviousPct = parseFloat(document.getElementById("impervious-input").value);
  if (isNaN(imperviousPct) || imperviousPct < 0 || imperviousPct > 100) {
    showError("Imperviousness must be between 0% and 100%.");
    return;
  }

  const drawdownDays = parseFloat(document.getElementById("drawdown-days").value);
  if (isNaN(drawdownDays) || drawdownDays <= 0) {
    showError("Please enter a valid positive drawdown time in days.");
    return;
  }

  const stormKey = document.getElementById("storm-select").value;
  const hsg = document.getElementById("hsg-select").value;
  const { region, lat, lon } = detectNCRegion(wetlandGeoJSON);
  const storm = region.storms[stormKey];
  const rainfallIn = storm.depthIn;

  // 2. Runoff Volume (Schueler Simple Method)
  const runoffCoeff = 0.05 + 0.009 * imperviousPct;
  const runoffVolumeCuFt = (rainfallIn / 12) * runoffCoeff * drainageAreaSqFt;

  // 3. Required Wetland Area & Ponding Depth Check (Max 15 in = 1.25 ft temporary ponding)
  const maxPondingFt = 15 / 12; // 1.25 ft
  const requiredWetlandAreaSqFt = runoffVolumeCuFt / maxPondingFt;
  const siteRatio = availableAreaSqFt / requiredWetlandAreaSqFt;

  // Use available area if adequate, or flag deficit if too small
  const designSurfaceAreaSqFt = availableAreaSqFt;
  const actualTempPondingFt = runoffVolumeCuFt / designSurfaceAreaSqFt;
  const actualTempPondingIn = actualTempPondingFt * 12;

  // 4. Conceptual Dimensions (3:1 L:W ratio)
  const widthFt = Math.sqrt(designSurfaceAreaSqFt / 3);
  const lengthFt = 3 * widthFt;

  // 5. Zone Breakdown (Midpoints of BIOE 434 criteria summing to 100%)
  const zones = [
    {
      name: "Forebay (Sediment Basin)",
      pct: 0.125,
      rangeLabel: "10–15%",
      areaSqFt: designSurfaceAreaSqFt * 0.125,
      depthText: "36 in below permanent pool (Criteria: 24–40 in)",
      purpose: "Dissipates inflow energy and traps coarse sediment for easy cleanout."
    },
    {
      name: "Non-Forebay Deep Pools",
      pct: 0.10,
      rangeLabel: "5–15%",
      areaSqFt: designSurfaceAreaSqFt * 0.10,
      depthText: "24 in below permanent pool (Criteria: ≥18 in)",
      purpose: "Maintains aquatic refuge, limits thermal spikes, and prevents short-circuiting."
    },
    {
      name: "Shallow-Water Zone",
      pct: 0.40,
      rangeLabel: "35–45%",
      areaSqFt: designSurfaceAreaSqFt * 0.40,
      depthText: "6 in below permanent pool (Criteria: 0–9 in)",
      purpose: "Primary emergent plant shelf for nutrient & pollutant uptake."
    },
    {
      name: "Temporary-Inundation Zone",
      pct: 0.375,
      rangeLabel: "30–45%",
      areaSqFt: designSurfaceAreaSqFt * 0.375,
      depthText: `0–${Math.min(15, actualTempPondingIn).toFixed(1)} in above permanent pool (Criteria: 0–15 in)`,
      purpose: "Detains storm bounce above permanent pool and releases slowly over 2–5 days."
    }
  ];

  // 6. Planting Quantity Calculation
  // Criteria: At least 50 herbaceous plants per 200 sq ft (0.25 plants/sq ft) in shallow-water zone
  // Plus recommended coverage (0.15 plants/sq ft) in temporary inundation & 0.05/sq ft in deep pools
  const shallowZoneArea = zones[2].areaSqFt;
  const tempZoneArea = zones[3].areaSqFt;
  const deepZoneArea = zones[1].areaSqFt;

  const shallowPlantsRequired = Math.ceil((shallowZoneArea / 200) * 50);
  const tempPlantsRecommended = Math.ceil(tempZoneArea * 0.15);
  const deepPlantsRecommended = Math.ceil(deepZoneArea * 0.05);
  const totalPlants = shallowPlantsRequired + tempPlantsRecommended + deepPlantsRecommended;

  // 7. Drawdown Hydraulics
  const avgOutflowCfs = runoffVolumeCuFt / (drawdownDays * 86400);

  // Render All Outputs
  renderResults({
    region, lat, lon, storm, rainfallIn,
    drainageAreaSqFt, availableAreaSqFt, requiredWetlandAreaSqFt, siteRatio,
    imperviousPct, runoffCoeff, runoffVolumeCuFt,
    actualTempPondingIn, lengthFt, widthFt,
    zones, hsg, drawdownDays, avgOutflowCfs,
    shallowPlantsRequired, tempPlantsRecommended, deepPlantsRecommended, totalPlants
  });
});

function showError(msg) {
  const banner = document.getElementById("error-banner");
  banner.textContent = msg;
  banner.classList.remove("hidden");
}

function renderResults(d) {
  document.getElementById("results-container").classList.remove("hidden");
  document.getElementById("btn-print").disabled = false;

  document.getElementById("summary-meta").textContent =
    `Location: ${d.region.name} (${d.lat.toFixed(4)}°N, ${Math.abs(d.lon).toFixed(4)}°W) | Design Storm: ${d.storm.label} | Generated: ${new Date().toLocaleDateString()}`;

  // Feasibility Banner
  const fBanner = document.getElementById("feasibility-banner");
  fBanner.className = "status-banner";
  if (d.siteRatio >= 1.1) {
    fBanner.classList.add("status-pass");
    fBanner.textContent = `SITE FEASIBILITY: ADEQUATE — Available wetland footprint (${Math.round(d.availableAreaSqFt).toLocaleString()} ft²) exceeds the minimum required area (${Math.round(d.requiredWetlandAreaSqFt).toLocaleString()} ft²) by ${((d.siteRatio - 1) * 100).toFixed(0)}%.`;
  } else if (d.siteRatio >= 0.9) {
    fBanner.classList.add("status-warn");
    fBanner.textContent = `SITE FEASIBILITY: MARGINAL — Available footprint (${Math.round(d.availableAreaSqFt).toLocaleString()} ft²) is close to the minimum required (${Math.round(d.requiredWetlandAreaSqFt).toLocaleString()} ft²). Grading and berm placement will be tight.`;
  } else {
    fBanner.classList.add("status-fail");
    fBanner.textContent = `SITE FEASIBILITY: TOO SMALL — Available footprint (${Math.round(d.availableAreaSqFt).toLocaleString()} ft²) is smaller than the required ${Math.round(d.requiredWetlandAreaSqFt).toLocaleString()} ft², causing temporary ponding (${d.actualTempPondingIn.toFixed(1)} in) to exceed the 15-inch maximum limit. Expand wetland footprint or reduce contributing drainage area.`;
  }

  // Metrics Grid
  const metrics = [
    { label: "Contributing Drainage", value: `${(d.drainageAreaSqFt / 43560).toFixed(2)} ac`, sub: `${Math.round(d.drainageAreaSqFt).toLocaleString()} ft² (${d.imperviousPct}% imp.)` },
    { label: "Design Runoff Volume", value: `${Math.round(d.runoffVolumeCuFt).toLocaleString()} ft³`, sub: `P = ${d.rainfallIn.toFixed(2)} in | Rv = ${d.runoffCoeff.toFixed(2)}` },
    { label: "Required Wetland Area", value: `${Math.round(d.requiredWetlandAreaSqFt).toLocaleString()} ft²`, sub: `Available: ${Math.round(d.availableAreaSqFt).toLocaleString()} ft²` },
    { label: "Temp. Ponding Depth", value: `${d.actualTempPondingIn.toFixed(1)} in`, sub: "Max allowed: 15.0 in" },
    { label: "Suggested Layout (3:1)", value: `${Math.round(d.lengthFt)} × ${Math.round(d.widthFt)} ft`, sub: "Length × Width (anti-short-circuit)" },
    { label: "Total Native Plants", value: `${d.totalPlants.toLocaleString()} plugs`, sub: `${d.shallowPlantsRequired.toLocaleString()} in shallow zone` }
  ];

  document.getElementById("metrics-grid").innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-sub">${m.sub}</div>
    </div>
  `).join("");

  // Conceptual Diagram
  document.getElementById("conceptual-diagram").innerHTML = `
    <div class="zone-box" style="background:#01579b;"><strong>INLET + FOREBAY</strong><br/>12.5% Area | 36" Deep<br/>Sediment Trap</div>
    <div>➔</div>
    <div class="zone-box" style="background:#2e7d32;"><strong>SHALLOW BENCH 1</strong><br/>20% Area | 6" Deep<br/>Dense Emergent Plants</div>
    <div>➔</div>
    <div class="zone-box" style="background:#00695c;"><strong>DEEP POOL</strong><br/>10% Area | 24" Deep<br/>Flow Redistribution</div>
    <div>➔</div>
    <div class="zone-box" style="background:#388e3c;"><strong>SHALLOW + TEMP ZONE</strong><br/>57.5% Combined<br/>Bounce Storage</div>
    <div>➔</div>
    <div class="zone-box" style="background:#37474f;"><strong>OUTLET STRUCTURE</strong><br/>Orifice + Trash Rack<br/>${d.drawdownDays}-Day Drawdown</div>
  `;

  // Zones Table
  document.getElementById("zones-tbody").innerHTML = d.zones.map(z => `
    <tr>
      <td><strong>${z.name}</strong></td>
      <td>${(z.pct * 100).toFixed(1)}% (${z.rangeLabel})</td>
      <td>${Math.round(z.areaSqFt).toLocaleString()} ft²</td>
      <td>${z.depthText}</td>
      <td>${z.purpose}</td>
    </tr>
  `).join("");

  // Design Criteria Check Table
  const pondingPass = d.actualTempPondingIn <= 15.0;
  const drawdownPass = d.drawdownDays >= 2 && d.drawdownDays <= 5;
  const linerNeeded = d.hsg === "A" || d.hsg === "B" || d.hsg === "Unknown";

  const criteriaRows = [
    {
      name: "Temporary Ponding Depth",
      req: "≤ 15.0 inches above permanent pool",
      val: `${d.actualTempPondingIn.toFixed(1)} inches`,
      pass: pondingPass
    },
    {
      name: "Zone Area Proportions",
      req: "Forebay 10–15%, Deep 5–15%, Shallow 35–45%, Temp 30–45%",
      val: "12.5% / 10.0% / 40.0% / 37.5% (100% total)",
      pass: true
    },
    {
      name: "Drawdown / Detention Time",
      req: "2.0 to 5.0 days to return to permanent pool",
      val: `${d.drawdownDays} days (Avg release: ${d.avgOutflowCfs.toFixed(3)} cfs)`,
      pass: drawdownPass
    },
    {
      name: "Inlet / Outlet Flow Path",
      req: "Avoid short-circuiting; maximize flow path",
      val: `3:1 L:W (${Math.round(d.lengthFt)} ft × ${Math.round(d.widthFt)} ft) with internal deep pool baffle`,
      pass: true
    },
    {
      name: "Shallow-Water Planting Density",
      req: "≥ 50 herbaceous plants per 200 ft² (0.25/ft²)",
      val: `${d.shallowPlantsRequired.toLocaleString()} plants across ${Math.round(d.zones[2].areaSqFt).toLocaleString()} ft² (0.25/ft²)`,
      pass: true
    },
    {
      name: "Dam / Perimeter Fill Slopes",
      req: "Non-clumping turf grass only; no trees/woody shrubs",
      val: "Specified in embankment & plant exclusion rules",
      pass: true
    },
    {
      name: "Cattails & Invasive Exclusion",
      req: "0 cattails (Typha spp.) or NC invasive plants",
      val: "Excluded by database filter (0 recommended)",
      pass: true
    },
    {
      name: "Outlet Debris & Overflow Control",
      req: "Include trash rack & safe emergency overflow",
      val: "Riser with non-clogging trash rack + emergency spillway",
      pass: true
    }
  ];

  document.getElementById("criteria-tbody").innerHTML = criteriaRows.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.req}</td>
      <td>${c.val}</td>
      <td><span class="pill ${c.pass ? "pill-pass" : "pill-fail"}">${c.pass ? "PASS" : "FAIL"}</span></td>
    </tr>
  `).join("");

  // Soil & Liner Guidance
  let linerHTML = "";
  if (d.hsg === "A") {
    linerHTML = `<div class="status-banner status-fail"><strong>HIGH INFILTRATION / LINER WARNING (HSG A):</strong> Sandy soils drain too rapidly to sustain a permanent pool. A compacted clay liner (≥12 in) or synthetic EPDM/HDPE geomembrane beneath 12 inches of wetland planting topsoil is strongly recommended.</div>`;
  } else if (d.hsg === "B" || d.hsg === "Unknown") {
    linerHTML = `<div class="status-banner status-warn"><strong>MODERATE INFILTRATION / LINER CAUTION (HSG ${d.hsg}):</strong> Verify in-situ saturated hydraulic conductivity via geotechnical borings. If infiltration exceeds 0.1 in/hr, install a low-permeability clay or synthetic liner beneath the 12-inch root-zone soil layer.</div>`;
  } else {
    linerHTML = `<div class="status-banner status-pass"><strong>LOW INFILTRATION SUITABILITY (HSG ${d.hsg}):</strong> Native fine-grained soils typically retain a permanent pool without a synthetic liner, provided subgrade is scarified and topped with 12 inches of organic wetland topsoil.</div>`;
  }

  document.getElementById("soil-guidance").innerHTML = `
    ${linerHTML}
    <p style="font-size:0.85rem; margin-top:0.5rem;"><strong>Topsoil Requirement:</strong> Place at least <strong>12 inches</strong> of uncompacted, organic-rich loamy topsoil across all vegetated benches to support root establishment.</p>
  `;

  // Outlet & Slope Guidance
  document.getElementById("outlet-guidance").innerHTML = `
    <ul class="checklist">
      <li><strong>Inlet Protection:</strong> Install riprap apron/plunge pad at storm pipe outfall discharging into the forebay to prevent scour.</li>
      <li><strong>Outlet Control Structure:</strong> Concrete riser with low-flow drawdown orifice sized for <strong>${d.drawdownDays}-day</strong> release (avg ${d.avgOutflowCfs.toFixed(3)} cfs) and a stainless-steel <strong>trash rack</strong> to prevent clogging.</li>
      <li><strong>Safe Overflow / Bypass:</strong> Construct a vegetated emergency spillway set above the 15-inch temporary ponding elevation to safely pass extreme storms.</li>
      <li><strong>Dam / Perimeter Slopes:</strong> Seed embankments with <strong>non-clumping turf grass</strong> (e.g., turf-type tall fescue). <strong>Do NOT plant trees or woody shrubs</strong> on fill slopes or dams (prevents root piping and structural failure).</li>
    </ul>
  `;

  // Native Plant Recommendations (Strictly filtering out invasiveAvoid === true)
  const safePlants = NC_PLANT_DATABASE.filter(p => !p.invasiveAvoid);
  const excludedCount = NC_PLANT_DATABASE.filter(p => p.invasiveAvoid).length;

  const zoneGroups = [
    {
      key: "shallow",
      title: `Shallow-Water Zone (0–9 in below pool) — Minimum Required: ${d.shallowPlantsRequired.toLocaleString()} herbaceous plugs (50 per 200 ft²)`
    },
    {
      key: "temp_inundation",
      title: `Temporary-Inundation Zone (0–15 in above pool) — Recommended: ${d.tempPlantsRecommended.toLocaleString()} plugs`
    },
    {
      key: "deep_pool",
      title: `Non-Forebay Deep Pools (≥18 in below pool) — Recommended: ${d.deepPlantsRecommended.toLocaleString()} aquatic plugs`
    }
  ];

  document.getElementById("planting-summary").textContent =
    `Filtered ${NC_PLANT_DATABASE.length} NC database entries → ${safePlants.length} approved NC native species shown (${excludedCount} invasive/avoid species including Typha spp. cattails automatically excluded).`;

  document.getElementById("plant-recommendations").innerHTML = zoneGroups.map(group => {
    const matches = safePlants.filter(p => p.zone === group.key);
    return `
      <div class="plant-zone-group">
        <h4>${group.title}</h4>
        <div class="plant-grid">
          ${matches.map(p => `
            <div class="plant-card">
              <strong>${p.commonName}</strong> (<em>${p.scientificName}</em>)<br/>
              <span class="pill pill-pass">${p.nativeStatus}</span> | <span>${p.growthForm}</span><br/>
              <strong>Depth:</strong> ${p.depthRange}<br/>
              <strong>Why it fits:</strong> ${p.function} <em>${p.notes}</em>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  // Construction & Maintenance Checklist
  const maintenanceItems = [
    "Stabilize inlets, outlets, and perimeter side slopes with erosion control matting and riprap prior to diverting stormwater.",
    "Verify finished grading elevations (±0.1 ft) so plants are installed in their exact hydrologic depth zones.",
    "Irrigate and inspect newly installed plugs biweekly during the first growing season (establishment phase) and replant any bare spots (<80% survival).",
    "Conduct routine inspections quarterly and within 48 hours after major storm events (>1.5 inches).",
    "Inspect and clear debris, leaves, and sediment from the outlet trash rack and low-flow orifice after every major storm.",
    "Scout actively for invasive species—especially Cattails (Typha spp.) and Phragmites—and remove immediately by hand or approved spot treatment.",
    "Measure sediment accumulation in the forebay annually; dredge/clean out when sediment fills 50% of forebay design depth.",
    "Maintain a permanent site inspection and maintenance log recording storm checks, trash rack cleanings, sediment removal, and replanting."
  ];

  document.getElementById("maintenance-list").innerHTML = maintenanceItems.map(item => `<li>${item}</li>`).join("");
}
