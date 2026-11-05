# How Gettin’ Crabby! scores crab snaring

Gettin’ Crabby! forecasts **crab snaring** (crab loop traps cast on a rod and reel) in Northern California, from Santa Cruz (36.9° N) to the Oregon border. Every 10 minutes of every day gets a score from 0 to 100. The day's score is its best two-hour window. The latest check of everything below is in [verify/REPORT.md](verify/REPORT.md).

## Inputs

| Input | Source | Notes |
|---|---|---|
| Tide heights and times | NOAA harmonic constants (from the open [Neaps tide database](https://github.com/openwatersio/tide-database)), computed in the browser with [`@neaps/tide-predictor`](https://www.npmjs.com/package/@neaps/tide-predictor) | Feet above MLLW, local time. Subordinate stations use NOAA's time and height offsets. 21 favorites plus 118 salt-water stations for place search |
| Sunrise and sunset | Standard solar position formulas | Checked against astral |
| Moon phase | Low-precision Sun and Moon positions (Meeus) | Display only; not part of the score |
| Wind, gusts, rain chance, rain in the last 48 hours | [Open-Meteo forecast](https://open-meteo.com) | Used when available |
| Wave height and period | [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api) | Only at spots open to ocean swell |
| Water temperature, observed water level | [NOAA CO-OPS](https://api.tidesandcurrents.noaa.gov/api/prod/) | Shown, not scored |
| Seasons, closures, gear rules | 14 CCR [§29.80](https://www.law.cornell.edu/regulations/california/14-CCR-29.80), [§29.85](https://www.law.cornell.edu/regulations/california/14-CCR-29.85), [CDFW in-season notices](https://wildlife.ca.gov/fishing/ocean/regulations/inseason) | Checked Nov 5, 2026 |
| Marine protected areas | 14 CCR [§632](https://www.law.cornell.edu/regulations/california/14-CCR-632) | Parsed into `site/mpas.json` by `site/extract-mpas.py` |

## The score

For each 10-minute moment:

**1. Water movement.** A snare sits on the bottom; strong current drags and rolls it, so slack water is best. Current isn't measured, so the rate the water rises or falls stands in for it:

- `m = |dh/dt| ÷ (π × mean tide range ÷ 12.42 h)`. This is about 0 at the tide turn, about 1 at mid-tide on an average day, and more on big-tide days.
- `M = max(0.25, 1 − 0.55 m)`

**2. Water level.** High water brings crabs within casting range of beaches and jetties. `hn` is where the water sits between the surrounding low (0) and high (1):

- beach or jetty: `0.6 + 0.4 hn`
- pier or harbor: `0.85 + 0.15 hn` (deep water anyway)

**3. Tide factor.** `T = M^0.8 × level × (0.95 if the tide is falling)`. Crabs move in on the flood, so rising water gets a small edge.

**4. Light.** Crabs feed most at dawn and dusk (within 75 minutes of sunrise or sunset):

| Light | Value |
|---|---|
| Dawn or dusk | 1.0 |
| Daylight | 0.85 at noon, rising to 0.92 toward dawn and dusk |
| Dark, beach or jetty | 0.6 (footing and sneaker waves) |
| Dark, pier or harbor | 0.8 |

**5. Combined.** `score = 100 × (0.62 T + 0.38 light)^1.4 × season × weather × surf × clarity`, rounded. The exponent spreads the scores so that good and great hours separate.

| Multiplier | Values |
|---|---|
| Season | Dungeness open: `0.3 + 0.7 × activity`, where activity by month is Nov 1.0, Dec 0.95, Jan 0.9, then easing to 0.4 in late season (crabs are fullest early). Dungeness closed or under a closure: 0.1. Rock crab: 1.0 |
| Wind (for casting) | Effective wind is the larger of the wind and 0.7 × gusts: under 8 mph 1.0; 8–12 0.92; 12–16 0.78; 16–20 0.6; 20–25 0.45; 25+ 0.3 |
| Rain chance | Over 70%: 0.88; over 40%: 0.95 |
| Surf at a beach | Under 2 ft 1.0; 2–3 ft 0.95; 3–4 ft 0.85; 4–5 ft 0.72; 5–6 ft 0.6; 6–8 ft 0.4; 8+ ft 0.2 |
| Surf at a jetty or rocks | Under 3 ft 1.0; 3–4 ft 0.9; 4–5 ft 0.8; 5–6 ft 0.65; 6–8 ft 0.4; 8+ ft 0.15 |
| Surf at a pier | Under 4 ft 1.0; 4–6 ft 0.9; 6–8 ft 0.75; 8–10 ft 0.6; 10+ ft 0.45 |
| Long-period swell | 14 s or more with waves of 5 ft or more: × 0.85 (surges and sneaker waves) |
| Sheltered spots | Surf is ignored |
| Water clarity | Rain in the past 48 hours over 1 inch: 0.85; over 0.4 inch: 0.93 (snaring guides say snares need reasonably clear water) |
| Protected area | The score is 0 if the spot is in or next to a protected area where crab take is banned or snares aren't allowed |

**Best windows.** The best window is the strongest two-hour stretch between 90 minutes before sunrise and an hour after sunset. A second window is shown if one at least three hours away scores well.

All tunable numbers are in the `MODEL` object and the factor functions in `site/src.html`.

## Spot types and swell

Each spot is a **beach**, a **jetty or rocks**, a **pier**, or a **harbor or bay**. A spot is open to ocean swell unless it is:

- a harbor,
- inside San Francisco Bay, or
- inside one of the sheltered-water outlines: Tomales Bay, Humboldt Bay, Bodega Harbor, Pillar Point Harbor, Crescent City Harbor, Bolinas Lagoon, or Noyo Harbor.

Favorites have hand-set types. Searched places get a type guessed from their name and map category (pier, wharf or dock is a pier; jetty, breakwater, rocks or point is a jetty; harbor, marina or lagoon is a harbor). People can change the type on the spot's page.

## Rules built in

- **Dungeness season** (§29.85(b)(2)). It opens the first Saturday in November and runs through July 30 in Del Norte, Humboldt and Mendocino counties, and through June 30 elsewhere. The Sonoma/Mendocino line is taken as 38°46.125′ N, CDFW's Fishing Zone 3 boundary.
- **No Dungeness in San Francisco or San Pablo Bay** (§29.85(b)(1)), between the Golden Gate Bridge and the Carquinez Bridge. Spots inside a rough outline of the bays are scored for rock crab only.
- **Rock crabs and other Cancer crabs** (§29.85(c)): open all year, 35 a day, at least 4 inches (except Fish and Game districts 8 and 9).
- **Dungeness limits:** 10 a day, at least 5¾ inches.
- **Snares** (§29.80(d), (e)): crab loop traps may have up to six loops and may be used north of Point Arguello for all crabs. CDFW's trap restrictions don't apply to snares, and snares don't need a crab trap validation (CDFW crab FAQ; [Oct 30, 2026 release](https://wildlife.ca.gov/News/Archive/recreational-dungeness-crab-fishing-begins-in-most-areas-nov-7-with-trap-restrictions-commercial-season-delayed)).
- **Closures in effect.** As of Oct 30, 2026, Dungeness take and possession are prohibited from Cape Mendocino (40°10′ N) to Ten Mile State Marine Reserve (39°33.3′ N) because of domoic acid. This is the `CLOSURES` list in `site/src.html` and must be updated by hand when CDFW changes it.
- **Marine protected areas** (§632). Each Northern California area's boundary points and allowed take are parsed from the regulation:
  - **No take:** state marine reserves, and conservation areas that don't allow crab.
  - **Snaring not allowed:** areas that allow crab only with other gear (for example "Dungeness crab by trap, hoop net or hand").
  - **Fine:** areas that allow all recreational take, loop traps or marine invertebrates.

  The inshore edge of each area is the shoreline, which the data only approximates. So a spot counts if it is inside an outline, or within 0.15 to 0.3 miles of its edge.

## Why these choices

- **Slack water and high tide.** Crabbing guides for this coast agree that slack water, especially around high tide, is best: the gear stays put and crabs come within reach.
- **Dawn and dusk.** Dungeness are reported most active around dawn and dusk.
- **Clear water, small surf.** Snares need reasonably clear water. Surf and sneaker waves make beaches and jetties dangerous.

These are common practitioner guidance, not measured catch rates.

## Limits

- **The weights are judgment, not fitted to catch data.** The verification shows the rankings barely change if any single number moves by ±20%. Logging real catches would be the way to tune them.
- **Current speed is approximated from how fast the water rises and falls.** In narrow channels like the Golden Gate, slack current can lag the turn of the tide by up to an hour or so.
- **Tides are astronomical predictions.** They match NOAA's to about 2 minutes and 0.05 ft, but storms, wind and river flow can shift real water levels. The site shows NOAA's live observed level where a sensor exists.
- **Protected-area outlines, the SF Bay outline and the sheltered-water outlines are approximate.** Check CDFW's MPA maps near a boundary.
- **Closures change between site updates.** Always check CDFW before going.
- **Open-Meteo's surf model may not resolve small coves.** When no surf forecast is available, surf is left out of the score.

## Keeping the rules current

1. Read CDFW's in-season page and update `CLOSURES` in `site/src.html`.
2. If §632 changes, run `python3 site/extract-mpas.py <632 text> site/mpas.json`.
3. Rebuild with `node site/build.mjs`.
4. Rerun `sh verify/run.sh`.
