# Verification protocol

These scripts check that Gettin’ Crabby!'s numbers and rules are right. Each check compares the **shipped page code** (loaded from `docs/index.html` in headless Chromium, with its own functions called directly) against an independent source, using pass/fail criteria that were fixed before the first run. Results go to `verify/results/`, and `verify/REPORT.md` summarizes the latest run.

## What is checked

| # | Script | Compared with | Pass criteria |
|---|---|---|---|
| 1 | `tides.cjs` | NOAA CO-OPS official predictions (api.tidesandcurrents.noaa.gov) for all 21 favorites (Nov 6 – Dec 5, 2026 and March 2027, which includes the clock change) and every searchable station (one week) | Favorites: high/low times median ≤ 3 min, 95th pct ≤ 10, max ≤ 20; heights median ≤ 0.05 ft, 95th pct ≤ 0.15, max ≤ 0.3; no missing or extra tides. Search stations: times 95th pct ≤ 15 min, heights 95th pct ≤ 0.25 ft, ≤ 1% missing/extra. 6-minute curve at reference stations: RMSE ≤ 0.1 ft, max ≤ 0.25 ft |
| 2 | `astro-dump.cjs` + `astro.py` | astral (sunrise/sunset), PyEphem (moon), Python zoneinfo (local midnight and daylight saving), the text of 14 CCR §29.85 (season) | Sunrise/sunset 95th pct ≤ 2 min, max ≤ 4; moon lit fraction within 0.08 and the right phase name on every new, quarter and full moon day; local midnight exact; season identical for every spot and day Oct 2026 – Dec 2029; past opening days reproduced; region and SF Bay outline consistent |
| 3 | `places.cjs` | OpenStreetMap (Photon and Nominatim) | Every built-in place within 1 mile of its OSM location, a tide station within 25 miles, and not in or next to a protected area that bans snaring (14 CCR §632) |
| 4 | `live.cjs` | The live services the page calls, the deployed site, and an end-to-end run against the real services | Each service answers in the shape the page parses and sends a CORS header; at least one favorite has live NOAA water data; GitHub Pages serves the committed build; live indicator, live water reading and place search work end to end with no page errors or sideways scrolling on a phone |
| 5 | `model.cjs` | The methodology's own claims | Scores 0–100; best windows within the light limits; slack water ≥ 1.4× strong current; dawn above midday; every factor pushes the right way; closed season and closures hold scores ≤ 15; rock crab open all year; SF Bay always rock crab; ±20% on any model number keeps day rankings (median Spearman ≥ 0.85) and best-window times (≥ 80% within an hour) |

The regulations themselves (14 CCR §29.80, §29.85, §632 and CDFW's in-season notices) were read from wildlife.ca.gov and law.cornell.edu. `site/extract-mpas.py` turns §632 into `site/mpas.json`.

## Running it

Needs Node 18+ with Playwright and Chromium, Python 3.10+ with `pip install astral==3.2 ephem==4.1.6`, curl, and network access to api.tidesandcurrents.noaa.gov, photon.komoot.io, nominatim.openstreetmap.org, api.open-meteo.com, marine-api.open-meteo.com, geocoding-api.open-meteo.com and hanan-pacha.github.io.

```sh
node site/build.mjs        # build docs/index.html first
sh verify/run.sh           # runs every check, then writes verify/REPORT.md
```

Open-Meteo limits requests per network address. A shared test machine can hit that limit (HTTP 429); the live check reports it instead of failing, because each visitor's browser has its own allowance.
