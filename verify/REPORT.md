# Verification report

Run 2026-11-06 00:01 UTC against the build in `docs/index.html`. **43 of 44 checks passed.** The protocol, sources and criteria are in [README.md](README.md); the model is described in [../METHODOLOGY.md](../METHODOLOGY.md).

## 1. Tide predictions vs NOAA

| Result | Check | Measured |
|---|---|---|
| ✅ Pass | Favorites: high/low times vs NOAA (median ≤ 3 min, 95th pct ≤ 10 min, max ≤ 20 min) | n 4705, median 1.75, 95th pct 5.925, max 18.768 |
| ❌ Miss | Favorites: high/low heights vs NOAA (median ≤ 0.05 ft, 95th pct ≤ 0.15 ft, max ≤ 0.3 ft) | n 4705, median 0.053, 95th pct 0.113, max 0.154<br>**Note:** Median 0.053 ft against a 0.05 ft criterion (about half an inch; no bias, max 0.15 ft). Re-running with all 37 harmonic constituents gives the same difference, so it comes from small differences between the open-source tide library and NOAA's own prediction program, not from the data. Heights are shown to 0.1 ft and the score uses relative water level, so this does not change any forecast. Left as a recorded miss rather than loosening the criterion after the fact. |
| ✅ Pass | Favorites: no missing or extra highs/lows | events: 4705; missingOrExtra: 0 |
| ✅ Pass | Search stations: high/low times vs NOAA (95th pct ≤ 15 min) | n 3186, median 1.923, 95th pct 3.482, max 9.94 |
| ✅ Pass | Search stations: high/low heights vs NOAA (95th pct ≤ 0.25 ft) | n 3186, median 0.043, 95th pct 0.1, max 0.188 |
| ✅ Pass | Search stations: missing or extra highs/lows ≤ 1% | events: 3186; missingOrExtra: 0 |
| ✅ Pass | Search stations: NOAA has predictions for every station | failed: none |
| ✅ Pass | Full tide curve at reference stations (RMSE ≤ 0.1 ft, max ≤ 0.25 ft) | id 9419750, name Crescent City Harbor, points 128, rmse 0.06, max 0.107; id 9418767, name North Jetty, points 128, rmse 0.064, max 0.116; id 9418024, name Shelter Cove, points 128, rmse 0.084, max 0.128; id 9417426, name Noyo Harbor, points 128, rmse 0.083, max 0.127; id 9416841, name Point Arena Pier, points 128, rmse 0.07, max 0.122; id 9415020, name Drakes Beach, points 128, rmse 0.066, max 0.114 … (11) |

## 2. Sun, moon, clock and season

| Result | Check | Measured |
|---|---|---|
| ✅ Pass | Sunrise vs astral (95th pct ≤ 2 min, max ≤ 4 min) | n 8946, median 0.28, 95th pct 0.63, max 0.69 |
| ✅ Pass | Sunset vs astral (95th pct ≤ 2 min, max ≤ 4 min) | n 8946, median 0.6, 95th pct 1.47, max 1.67 |
| ✅ Pass | Moon illuminated fraction vs PyEphem (max error ≤ 0.08) | n 426, median 0, 95th pct 0, max 0 |
| ✅ Pass | Moon phase name matches on the day of every new, quarter and full moon | events: 58; mismatches: none |
| ✅ Pass | Local midnight matches zoneinfo for every day, including clock changes | days: 426; mismatches: none |
| ✅ Pass | Dungeness season matches the regulation for every favorite and day (Oct 2026 – Dec 2029) | spotDays: 24948; mismatches: none |
| ✅ Pass | Opener rule reproduces past opening days (2021–2026) | page: 2021: 6; 2022: 5; 2023: 4; 2024: 2; 2025: 1; 2026: 7; 2027: 6; known: 2021: 6; 2022: 5; 2023: 4; 2024: 2; 2025: 1; 2026: 7 |
| ✅ Pass | Every favorite's region matches the region rules | none |
| ✅ Pass | SF Bay outline contains exactly the SF Bay favorites | none |
| ✅ Pass | SF Bay outline puts the 20 bay-side places inside and Golden Gate ocean beaches outside | unexpectedInside: none; missingInside: none; oceanWronglyInside: none |

## 3. Built-in places

| Result | Check | Measured |
|---|---|---|
| ✅ Pass | Every built-in place is within 1 mile of its OpenStreetMap location | places: 66; outside: none |
| ✅ Pass | Every built-in place has a tide station within 25 miles | none |
| ✅ Pass | No built-in place is in or next to a protected area that bans snaring | none |

## 4. Live services and deployed site

| Result | Check | Measured |
|---|---|---|
| ✅ Pass | NOAA tide predictions: answers, matches the parsed shape, allows browser access (CORS) | status: 200; cors: *; shape: true |
| ✅ Pass | Photon place search: answers, matches the parsed shape, allows browser access (CORS) | status: 200; cors: *; shape: true |
| ✅ Pass | Nominatim place search: answers, matches the parsed shape, allows browser access (CORS) | status: 200; cors: *; shape: true |
| ✅ Pass | Open-Meteo (weather, surf, geocoding): answers in the parsed shape, or is only rate-limiting this test machine | forecast: status: 429; cors: *; shape: false; note: Daily API request limit exceeded. Please try again tomorrow.; marine: status: 200; cors: *; shape: true; geocoding: status: 200; cors: *; shape: true; note: HTTP 429 'daily limit' applies to this shared test IP; each visitor's browser has its own limit |
| ✅ Pass | NOAA live water data: at least one favorite has water temperature and water level | withTemp: Crescent City Harbor; North Jetty; Point Arena Pier; Drakes Beach; Alameda Shoreline; withLevel: Crescent City Harbor; North Jetty; Point Arena Pier; Drakes Beach; Fort Point; Alameda Shoreline |
| ✅ Pass | GitHub Pages serves the committed docs/index.html | status: 200; deployed: e1d6ee4c1ea7892c; committed: e1d6ee4c1ea7892c; workingCopy: d81f7f01f895939c |
| ✅ Pass | End to end: live data indicator turns on and names only the sources that loaded | Live surf and water data |
| ✅ Pass | End to end: Fort Point shows NOAA's live water reading | Right now: 61, fair (held back by low water). Early incoming tide at 1.0 ft, slow current. High tide in 5 hr 6 min (9:06 PM). Water is running 1.2 ft above the prediction (often onshore wind or rain runoff). NOAA, 7 min ago |
| ✅ Pass | End to end: typing 'baker' finds Baker Beach | Fort Baker Sausalito · favorite 86 Excellent; Baker Beach beach · San Francisco Tides 1.3 mi away; Baker-Barry Tunnel tunnel · Marin, CA Tides 0.8 mi away |
| ✅ Pass | End to end: typing 'ocean beach' finds San Francisco's Ocean Beach and no out-of-area results | Ocean Beach San Francisco · favorite 3 Slow; Ocean Beach beach · San Francisco, CA Tides 1.3 mi away; Ocean Beach Climate Change Adaptation Project construction · San Francisco, CA Tides 3.1 mi away |
| ✅ Pass | End to end: no page errors and no sideways scrolling on a phone | errors: none; scrollWidth: 390 |

## 5. Snaring score behavior

| Result | Check | Measured |
|---|---|---|
| ✅ Pass | Every score is a whole number from 0 to 100, over a full year at every favorite | samples: 1111425; outOfRange: 0; windowsOutsideLight: 0; overlapping: 0 |
| ✅ Pass | Best windows stay between first light and an hour after sunset, and the two never overlap | samples: 1111425; outOfRange: 0; windowsOutsideLight: 0; overlapping: 0 |
| ✅ Pass | Slack water scores clearly above strong current (daylight, at least 1.4×) | slack: 52; strong: 37; nSlack: 197381; nStrong: 14992 |
| ✅ Pass | At slack water, dawn scores above midday | dawn: 55; noon: 50 |
| ✅ Pass | Factor shapes: current, water level, rising tide, wind, rain, surf, swell period, muddy water and light all push the right way | tideFallsWithCurrent: true; tideRisesWithWater: true; shoreCaresMoreAboutWater: true; risingBeatsFalling: true; windHurts: true; rainHurts: true; surfHurts: true; jettyStricterThanPier: true; longPeriodSwellHurts: true; muddyWaterHurts: true; lightOrder: true |
| ✅ Pass | Closed Dungeness season keeps ocean spots at 15 or below | maxDayScore: 10; spotDaysChecked: 1991 |
| ✅ Pass | The domoic acid closure keeps Shelter Cove at 15 or below all season | maxDayScore: 10 |
| ✅ Pass | Rock crab is open all year, even inside the Dungeness closure | minDayScore: 76 |
| ✅ Pass | SF Bay spots are always scored for rock crab, whichever crab is selected | true |
| ✅ Pass | 'Why it scores N' stays short: at most 4 reasons of at most 60 characters, never empty | windows: 9912; maxLines: 4; maxLen: 43; empty: 0 |
| ✅ Pass | 'Why it scores N' names the right main drag: current, wind, surf, closed season, protected area, none at a perfect dawn | strongCurrent: move; strongWind: wind; bigSurf: surf; closedSeason: season; protectedArea: mpa; perfectDawn: none |
| ✅ Pass | Rankings are robust: ±20% on any one model number keeps day rankings (median Spearman ≥ 0.85) and best-window times (≥ 80% within an hour) | change wTide ×0.80, medianRho 0.996, minRho 0.995, bestWindowSame 0.889; change wTide ×1.20, medianRho 0.995, minRho 0.994, bestWindowSame 0.985; change exp ×0.80, medianRho 0.998, minRho 0.997, bestWindowSame 0.997; change exp ×1.20, medianRho 0.998, minRho 0.997, bestWindowSame 0.998; change kMove ×0.80, medianRho 0.999, minRho 0.998, bestWindowSame 0.995; change kMove ×1.20, medianRho 0.999, minRho 0.998, bestWindowSame 0.995 … (12) |
