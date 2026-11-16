// Public NC Rainfall Lookup (Derived from NOAA Atlas 14 Vol. 2 & NC DEQ Stormwater Manual)
// North Carolina is divided by longitude bands into Mountains, Piedmont, and Coastal Plain
const NC_RAINFALL_REGIONS = {
  mountains: {
    name: "Blue Ridge / Western NC Mountains",
    lonMax: -81.3,
    storms: {
      wq: { label: "NC Water Quality Storm (1.0 in)", depthIn: 1.00 },
      "1yr24": { label: "1-Year, 24-Hour (NOAA Atlas 14)", depthIn: 2.85 },
      "2yr24": { label: "2-Year, 24-Hour (NOAA Atlas 14)", depthIn: 3.45 },
      "10yr24": { label: "10-Year, 24-Hour (NOAA Atlas 14)", depthIn: 4.95 }
    }
  },
  piedmont: {
    name: "NC Piedmont (e.g., Charlotte, Greensboro, Raleigh)",
    lonMin: -81.3,
    lonMax: -78.5,
    storms: {
      wq: { label: "NC Water Quality Storm (1.0 in)", depthIn: 1.00 },
      "1yr24": { label: "1-Year, 24-Hour (NOAA Atlas 14)", depthIn: 2.75 },
      "2yr24": { label: "2-Year, 24-Hour (NOAA Atlas 14)", depthIn: 3.35 },
      "10yr24": { label: "10-Year, 24-Hour (NOAA Atlas 14)", depthIn: 4.85 }
    }
  },
  coastal: {
    name: "NC Coastal Plain & Tidewater (e.g., Wilmington, Greenville)",
    lonMin: -78.5,
    storms: {
      wq: { label: "NC Water Quality Storm (1.5 in Coastal Standard)", depthIn: 1.50 },
      "1yr24": { label: "1-Year, 24-Hour (NOAA Atlas 14)", depthIn: 3.25 },
      "2yr24": { label: "2-Year, 24-Hour (NOAA Atlas 14)", depthIn: 3.95 },
      "10yr24": { label: "10-Year, 24-Hour (NOAA Atlas 14)", depthIn: 5.85 }
    }
  }
};

// Approximate North Carolina Bounding Polygon for Out-of-State Error Validation
const NC_BOUNDS = {
  minLat: 33.84,
  maxLat: 36.59,
  minLon: -84.32,
  maxLon: -75.46
};

// 20-Species North Carolina Constructed Wetland Plant Database
// Sources: NC State Extension Gardener Plant Toolbox & NC Invasive Plant Council (NC-IPC)
// Note: Includes flagged invasive/avoid species (including Cattails) to demonstrate active database filtering.
const NC_PLANT_DATABASE = [
  // DEEP POOL / SUBMERGED & FLOATING-LEAF (18–36 in below permanent pool)
  {
    commonName: "Fragrant Water Lily",
    scientificName: "Nymphaea odorata",
    nativeStatus: "Native to NC",
    zone: "deep_pool",
    depthRange: "18–36 in below pool",
    growthForm: "Aquatic floating-leaf perennial",
    function: "Shades deep pools to limit algal blooms and lowers water temperature.",
    notes: "Ideal for non-forebay deep pools; avoid placing directly at high-velocity inlet.",
    invasiveAvoid: false
  },
  {
    commonName: "Spatterdock (Yellow Pond Lily)",
    scientificName: "Nuphar advena",
    nativeStatus: "Native to NC",
    zone: "deep_pool",
    depthRange: "18–36 in below pool",
    growthForm: "Rhizomatous aquatic perennial",
    function: "Stabilizes deep pool sediments and provides aquatic macroinvertebrate habitat.",
    notes: "Tolerates fluctuating water levels and moderate turbidity.",
    invasiveAvoid: false
  },
  {
    commonName: "American Eelgrass (Wild Celery)",
    scientificName: "Vallisneria americana",
    nativeStatus: "Native to NC",
    zone: "deep_pool",
    depthRange: "18–40 in below pool",
    growthForm: "Submerged aquatic perennial",
    function: "Oxygenates water column and traps fine suspended particulates.",
    notes: "Requires clear enough water during initial establishment.",
    invasiveAvoid: false
  },

  // SHALLOW-WATER ZONE (0–9 in below permanent pool)
  {
    commonName: "Pickerelweed",
    scientificName: "Pontederia cordata",
    nativeStatus: "Native to NC",
    zone: "shallow",
    depthRange: "0–9 in below pool",
    growthForm: "Emergent herbaceous perennial",
    function: "High nitrogen and phosphorus uptake; dense stems slow sheet flow.",
    notes: "Showy purple spikes; strong pollinator magnet across NC.",
    invasiveAvoid: false
  },
  {
    commonName: "Broadleaf Arrowhead (Duck Potato)",
    scientificName: "Sagittaria latifolia",
    nativeStatus: "Native to NC",
    zone: "shallow",
    depthRange: "0–9 in below pool",
    growthForm: "Emergent herbaceous perennial",
    function: "Rapid nutrient assimilation and sediment trapping in shallow benches.",
    notes: "Spreads reliably by tubers; excellent wildlife food source.",
    invasiveAvoid: false
  },
  {
    commonName: "Soft Rush",
    scientificName: "Juncus effusus",
    nativeStatus: "Native to NC",
    zone: "shallow",
    depthRange: "0–6 in below pool",
    growthForm: "Clumping evergreen rush",
    function: "Year-round root filtration and shoreline erosion resistance.",
    notes: "Maintains structural stems through winter when broadleaf plants die back.",
    invasiveAvoid: false
  },
  {
    commonName: "Lizard's Tail",
    scientificName: "Saururus cernuus",
    nativeStatus: "Native to NC",
    zone: "shallow",
    depthRange: "0–6 in below pool",
    growthForm: "Emergent spreading perennial",
    function: "Forms dense root mats that filter fine sediments and heavy metals.",
    notes: "Performs well in both full sun and partial shade.",
    invasiveAvoid: false
  },
  {
    commonName: "Golden Club",
    scientificName: "Orontium aquaticum",
    nativeStatus: "Native to NC",
    zone: "shallow",
    depthRange: "3–9 in below pool",
    growthForm: "Emergent aquatic perennial",
    function: "Early spring nutrient uptake and benthic stabilization.",
    notes: "Native across NC Piedmont and Coastal Plain wetlands.",
    invasiveAvoid: false
  },
  {
    commonName: "Three-Square Bulrush",
    scientificName: "Schoenoplectus pungens",
    nativeStatus: "Native to NC",
    zone: "shallow",
    depthRange: "0–9 in below pool",
    growthForm: "Emergent sedge/bulrush",
    function: "High hydraulic resistance and microbial biofilm surface area.",
    notes: "Tolerates urban runoff salinity and fluctuating inundation.",
    invasiveAvoid: false
  },
  {
    commonName: "Blue Flag Iris",
    scientificName: "Iris versicolor",
    nativeStatus: "Native to NC",
    zone: "shallow",
    depthRange: "0–4 in below pool",
    growthForm: "Rhizomatous emergent perennial",
    function: "Phosphorus uptake along shallow water margins.",
    notes: "Best placed at the upper edge of the shallow-water bench.",
    invasiveAvoid: false
  },

  // TEMPORARY-INUNDATION ZONE (0–15 in above permanent pool)
  {
    commonName: "Swamp Milkweed",
    scientificName: "Asclepias incarnata",
    nativeStatus: "Native to NC",
    zone: "temp_inundation",
    depthRange: "0–12 in above pool",
    growthForm: "Herbaceous perennial",
    function: "Deep taproot stabilizes saturated banks; premier Monarch butterfly host.",
    notes: "Thrives in periodic inundation followed by moist soil conditions.",
    invasiveAvoid: false
  },
  {
    commonName: "Woolgrass",
    scientificName: "Scirpus cyperinus",
    nativeStatus: "Native to NC",
    zone: "temp_inundation",
    depthRange: "0–12 in above pool",
    growthForm: "Tussock-forming sedge",
    function: "Dense fibrous roots prevent bank rilling during storm bounce.",
    notes: "Very resilient in compacted urban stormwater soils.",
    invasiveAvoid: false
  },
  {
    commonName: "Cardinal Flower",
    scientificName: "Lobelia cardinalis",
    nativeStatus: "Native to NC",
    zone: "temp_inundation",
    depthRange: "0–9 in above pool",
    growthForm: "Herbaceous perennial",
    function: "Nutrient interception in lower temporary-inundation fringe.",
    notes: "Attracts hummingbirds; prefers moist organic soils.",
    invasiveAvoid: false
  },
  {
    commonName: "Joe-Pye Weed",
    scientificName: "Eutrochium fistulosum",
    nativeStatus: "Native to NC",
    zone: "temp_inundation",
    depthRange: "6–15 in above pool",
    growthForm: "Tall herbaceous perennial",
    function: "High evapotranspiration and late-summer pollinator support.",
    notes: "Best suited for upper temporary-inundation bench.",
    invasiveAvoid: false
  },
  {
    commonName: "Fox Sedge",
    scientificName: "Carex vulpinoidea",
    nativeStatus: "Native to NC",
    zone: "temp_inundation",
    depthRange: "0–12 in above pool",
    growthForm: "Clumping perennial sedge",
    function: "Rapid groundcover establishment that outcompetes weeds.",
    notes: "Excellent matrix species for temporary-inundation zone.",
    invasiveAvoid: false
  },
  {
    commonName: "Swamp Rose Mallow",
    scientificName: "Hibiscus moscheutos",
    nativeStatus: "Native to NC",
    zone: "temp_inundation",
    depthRange: "0–10 in above pool",
    growthForm: "Robust herbaceous perennial",
    function: "Heavy biomass nutrient uptake and storm surge damping.",
    notes: "Dies back to ground each winter; non-woody root crown.",
    invasiveAvoid: false
  },

  // INVASIVE / AVOID SPECIES (NEVER RECOMMENDED BY ENGINE)
  {
    commonName: "Broadleaf Cattail",
    scientificName: "Typha latifolia",
    nativeStatus: "Native (Aggressive Monoculture)",
    zone: "shallow",
    depthRange: "0–12 in below pool",
    growthForm: "Aggressive rhizomatous herb",
    function: "Excluded — forms dense monocultures that choke out biodiversity and clog outlets.",
    notes: "Explicitly prohibited by BIOE 434 design criteria.",
    invasiveAvoid: true
  },
  {
    commonName: "Narrowleaf Cattail",
    scientificName: "Typha angustifolia",
    nativeStatus: "Non-Native / Invasive in NC",
    zone: "shallow",
    depthRange: "0–12 in below pool",
    growthForm: "Aggressive rhizomatous herb",
    function: "Excluded — aggressive invader that displaces native wetland flora.",
    notes: "Explicitly prohibited by BIOE 434 design criteria.",
    invasiveAvoid: true
  },
  {
    commonName: "Common Reed (Phragmites)",
    scientificName: "Phragmites australis",
    nativeStatus: "Invasive (NC-IPC Listed)",
    zone: "temp_inundation",
    depthRange: "0–15 in above/below pool",
    growthForm: "Tall invasive grass",
    function: "Excluded — severe NC invasive species that destroys wetland habitat.",
    notes: "Flagged by NC Invasive Plant Council.",
    invasiveAvoid: true
  },
  {
    commonName: "Purple Loosestrife",
    scientificName: "Lythrum salicaria",
    nativeStatus: "Invasive (NC-IPC Listed)",
    zone: "temp_inundation",
    depthRange: "0–12 in above pool",
    growthForm: "Invasive perennial herb",
    function: "Excluded — noxious wetland invader.",
    notes: "Flagged by NC Invasive Plant Council.",
    invasiveAvoid: true
  }
];
