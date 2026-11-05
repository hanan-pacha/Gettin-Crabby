# Gettin’ Crabby!

A crab snaring forecast for Northern California, from Santa Cruz to Crescent City, hosted by Pinchy the Dungeness crab. Search any beach, pier or harbor, or pick one of 21 local favorites. Each spot shows the best hours to snare, a tide chart you can tap, and a 7-day outlook.

Scores follow California's rules:

- Dungeness opens the first Saturday in November and closes June 30, or July 30 in Del Norte, Humboldt and Mendocino.
- No Dungeness in San Francisco or San Pablo Bay; bay spots are scored for rock crab, which is open all year.
- Current CDFW closures and marine protected areas are built in.

**Live site: https://hanan-pacha.github.io/Gettin-Crabby/**

- How the score works: [METHODOLOGY.md](METHODOLOGY.md)
- How it was checked, and the latest results: [verify/README.md](verify/README.md) and [verify/REPORT.md](verify/REPORT.md)

The site is one static file, `docs/index.html`. It includes the tide library, 118 NOAA salt-water tide stations, 47 marine protected areas and about 65 well-known beaches and piers. There is no server and no API key.

## What powers it

| Data | Source | Where it runs |
| --- | --- | --- |
| Tide times and heights | NOAA harmonic constants from the open [Neaps tide database](https://github.com/openwatersio/tide-database), computed with [`@neaps/tide-predictor`](https://www.npmjs.com/package/@neaps/tide-predictor) | In the browser, for any date |
| Sunrise, sunset, moon phase | Standard astronomical formulas | In the browser |
| Wind, gusts, rain | [Open-Meteo](https://open-meteo.com) forecast (free, no key) | Fetched live |
| Surf (wave height and period) | [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) | Fetched live for spots open to the ocean |
| Place search | [Photon](https://photon.komoot.io) and [Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap), with Open-Meteo geocoding as a backup | Fetched as you type |
| Water temperature, observed water level | [NOAA CO-OPS API](https://api.tidesandcurrents.noaa.gov/api/prod/) | Fetched live for the selected spot |
| Seasons, closures, gear rules, protected areas | California Code of Regulations Title 14 §29.80, §29.85, §632 and CDFW in-season notices | Built in (checked Nov 5, 2026) |

If the live sources can't be reached, the page still works with tides, light and season.

Each spot has its own link, such as `…/#ocean-beach-san-francisco`, so people can share a specific spot.

## Editing

- **Page source:** `site/src.html` (HTML, CSS and JS). Station data, protected areas and the tide library are placed into it at build time by `node site/build.mjs`, which writes `docs/index.html`.
- **Favorites and searchable stations:** edit `FAV` in `site/extract.mjs`. Each favorite has a NOAA station, a name, an area, a region, a spot type, and whether it's open to ocean swell. Then, in a folder with `@neaps/tide-database` installed, run `node extract.mjs <repo>/site/stations.json <repo>/site/stations-all.json` and rebuild.
- **Protected areas:** `site/extract-mpas.py` turns the text of 14 CCR §632 into `site/mpas.json`.
- **Scoring and rules:** the `MODEL`, `CLOSURES`, `ACTIVITY` and `seasonOf` definitions and the factor functions in `site/src.html`. See METHODOLOGY.md.
- **Checks:** `sh verify/run.sh` reruns the verification protocol and rewrites `verify/REPORT.md`.

Not for navigation. Season dates and closures are as of the date above; CDFW can change them at any time, so check CDFW before you go.
