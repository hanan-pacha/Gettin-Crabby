# Gettin’ Crabby!

A crabbing forecast website, hosted by Pinchy the Dungeness crab. For 37 coastal spots (blue crab on the Atlantic and Gulf coasts, Dungeness on the Pacific), it shows the best hours to crab, a tide chart you can tap, and a 7-day outlook.

**Live site: https://hanan-pacha.github.io/Gettin-Crabby/**

The whole site is one static file, `docs/index.html`. There is no server and no API key.

## What powers it

| Data | Source | Where it runs |
| --- | --- | --- |
| Tide times and heights | NOAA harmonic constants from the open [Neaps tide database](https://github.com/openwatersio/tide-database), computed with [`@neaps/tide-predictor`](https://www.npmjs.com/package/@neaps/tide-predictor) | In the browser, for any date |
| Sunrise, sunset, moon phase | Standard astronomical formulas | In the browser |
| Wind, gusts, rain chance, air temp | [Open-Meteo](https://open-meteo.com) forecast (free, no key) | Fetched live |
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
- Stations: edit the list in `site/extract.mjs`, then in a folder with `@neaps/tide-database` installed run `node extract.mjs` to regenerate `site/stations.json`. Each entry is a NOAA reference station id, a display name, an area, a region and a species.
- Scoring: see `STAGE`, `SEASON`, `lightOf`, `rangeScore` and `wxFactor` in `site/src.html`.

Not for navigation. Crabbing rules differ by state; check your state wildlife agency before you go.
