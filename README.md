# Gettin’ Crabby!

A crabbing forecast website, hosted by Pinchy the Dungeness crab. Dungeness crabbing in Northern California, from Santa Cruz to Crescent City. Search any beach, pier or harbor (or pick one of 21 local favorites) to see the best hours to crab, a tide chart you can tap, and a 7-day outlook. Scores follow the usual California Dungeness season: opens the first Saturday in November, closes June 30 (July 30 north of the Sonoma–Mendocino line).

**Live site: https://hanan-pacha.github.io/Gettin-Crabby/**

The site is static: `docs/index.html` plus `docs/stations-all.json` (the 155 NOAA tide stations between Santa Cruz and the Oregon border, downloaded when someone searches for a place). There is no server and no API key.

## What powers it

| Data | Source | Where it runs |
| --- | --- | --- |
| Tide times and heights | NOAA harmonic constants from the open [Neaps tide database](https://github.com/openwatersio/tide-database), computed with [`@neaps/tide-predictor`](https://www.npmjs.com/package/@neaps/tide-predictor) | In the browser, for any date |
| Sunrise, sunset, moon phase | Standard astronomical formulas | In the browser |
| Wind, gusts, rain chance, air temp | [Open-Meteo](https://open-meteo.com) forecast (free, no key) | Fetched live |
| Place search (beaches, parks, piers) | [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org), with Open-Meteo geocoding as a backup | Fetched when you press Enter |
| Water temperature, observed water level | [NOAA CO-OPS API](https://api.tidesandcurrents.noaa.gov/api/prod/) | Fetched live for the selected spot |

If the live sources can't be reached, the page still works with tides, light, moon and season.

## Publish it with GitHub Pages

1. Merge this branch into `main` (or pick this branch in step 3).
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose the branch, and choose the **/docs** folder. Save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/` (for this repo, https://hanan-pacha.github.io/Gettin-Crabby/).

Each spot has its own link, such as `…/#seattle-wa`, so people can share a specific spot.

## Editing

- Page source: `site/src.html` (HTML, CSS and JS). Station data and the tide library are placed into it at build time.
- Build: `node site/build.mjs` writes `docs/index.html`.
- Favorite spots and searchable stations: edit `FAV` (and the NorCal box) in `site/extract.mjs`, then in a folder with `@neaps/tide-database` installed run `node extract.mjs <repo>/site/stations.json <repo>/docs/stations-all.json`, then in a folder with `@neaps/tide-database` installed run `node extract.mjs` to regenerate `site/stations.json`. Each entry is a NOAA reference station id, a display name, an area, a region and a species.
- Scoring: see `STAGE`, `SEASON`, `lightOf`, `rangeScore` and `wxFactor` in `site/src.html`.

Not for navigation. Season dates are the usual ones; CDFW can delay the opener or restrict traps, so check CDFW before you go.
