# NC Constructed Stormwater Wetland Design Assistant (BIOE 434)

An interactive, client-side web application built for **BIOE 434 (Ecological Engineering)** to generate preliminary constructed stormwater wetland designs in North Carolina.

## Features
- **Interactive NC GIS Map:** Draw contributing drainage and available wetland polygons directly on an OpenStreetMap base layer using Leaflet.js and Turf.js.
- **Location-Based NC Rainfall:** Automatically detects whether the site is in the NC Mountains, Piedmont, or Coastal Plain and retrieves public NOAA Atlas 14 / NC DEQ design storm depths.
- **Transparent Hydrology & Sizing Engine:** Computes runoff volume (Simple Method), required wetland footprint, 3:1 length-to-width layout, four hydrologic zones, temporary ponding depth, and drawdown hydraulics.
- **Automated BIOE 434 Criteria Checks:** Evaluates temporary ponding ($\le 15\text{ in}$), zone proportions, drawdown window ($2\text{–}5\text{ days}$), shallow-water planting density ($\ge 50\text{ plants per } 200\text{ ft}^2$), embankment turf rules, and HSG liner warnings.
- **Curated NC Plant Database:** 20-species North Carolina plant dataset that recommends zone-matched native species while automatically excluding invasive species and cattails (*Typha* spp.).

## Deployment on GitHub Pages
1. Upload `index.html`, `style.css`, `data.js`, `app.js`, and `README.md` to the root of your GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, select `main` and `/ (root)`, and click **Save**.
4. Your live site will publish at `https://<username>.github.io/<repo-name>/`.

## Disclaimer
This tool provides preliminary planning estimates for educational purposes only and is not a construction-ready engineering design.# nc-wetland-design-assistant
