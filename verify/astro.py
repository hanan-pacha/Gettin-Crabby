"""Check 2, part 2: compare the page's sun, moon, clock and season math with independent sources.
Needs: pip install astral==3.2 ephem==4.1.6   (run astro-dump.cjs first)"""
import json, os, statistics
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import ephem
from astral import Observer
from astral.sun import sun

HERE = os.path.dirname(os.path.abspath(__file__))
page = json.load(open(os.path.join(HERE, "results", "astro-page.json")))
LA = ZoneInfo("America/Los_Angeles")
checks = []
def check(label, ok, detail): checks.append({"label": label, "pass": bool(ok), "detail": detail})
def summ(xs):
    a = sorted(abs(x) for x in xs); n = len(a)
    return {"n": n, "median": round(a[n // 2], 2), "p95": round(a[int(0.95 * (n - 1))], 2), "max": round(a[-1], 2)} if n else {"n": 0}

# Sunrise and sunset vs astral (NOAA solar algorithm, standard -0.833° refraction)
dr, ds = [], []
for spot in page["sun"]:
    obs = Observer(latitude=spot["lat"], longitude=spot["lon"])
    for d, rise, sset in spot["days"]:
        ref = sun(obs, date=date.fromisoformat(d), tzinfo=LA)
        dr.append((rise - ref["sunrise"].timestamp() * 1000) / 60000)
        ds.append((sset - ref["sunset"].timestamp() * 1000) / 60000)
sr, ss = summ(dr), summ(ds)
check("Sunrise vs astral (95th pct ≤ 2 min, max ≤ 4 min)", sr["p95"] <= 2 and sr["max"] <= 4, sr)
check("Sunset vs astral (95th pct ≤ 2 min, max ≤ 4 min)", ss["p95"] <= 2 and ss["max"] <= 4, ss)

# Moon: illuminated fraction at local noon, and phase names on the days of the four main phases
dk = [k - ephem.Moon(ephem.Date(datetime.fromtimestamp(t / 1000, timezone.utc))).moon_phase for d, t, k, name in page["noon"]]
mk = summ(dk)
check("Moon illuminated fraction vs PyEphem (max error ≤ 0.08)", mk["max"] <= 0.08, mk)
names = {d: name for d, t, k, name in page["noon"]}
events, miss = [], []
start, end = ephem.Date("2026/11/01"), ephem.Date("2027/12/31")
for fn, label in ((ephem.next_new_moon, "New moon"), (ephem.next_first_quarter_moon, "First quarter"), (ephem.next_full_moon, "Full moon"), (ephem.next_last_quarter_moon, "Last quarter")):
    t = fn(start)
    while t < end:
        local = ephem.Date(t).datetime().replace(tzinfo=timezone.utc).astimezone(LA).date().isoformat()
        if local in names:
            events.append(local)
            if names[local] != label: miss.append(f"{local}: expected {label}, page says {names[local]}")
        t = fn(ephem.Date(t + 1))
check("Moon phase name matches on the day of every new, quarter and full moon", not miss, {"events": len(events), "mismatches": miss})

# Local midnight (time zone and daylight saving) vs Python zoneinfo
bad = [d for d, ms in page["midnights"] if abs(ms - datetime.fromisoformat(d).replace(tzinfo=LA).timestamp() * 1000) > 0]
check("Local midnight matches zoneinfo for every day, including clock changes", not bad, {"days": len(page["midnights"]), "mismatches": bad[:5]})

# Season vs the regulation text (14 CCR §29.85(b)(2)) and CDFW's Oct 30, 2026 domoic acid closure
def first_sat_nov(y):
    d = date(y, 11, 1)
    return d + timedelta(days=(5 - d.weekday()) % 7)
def reg_open(lat, group, d):
    d = date.fromisoformat(d)
    if 39.555 <= lat < 40.1667 and d >= date(2026, 10, 30): return 0           # closure still in effect as of Nov 5, 2026
    north = group in ("Mendocino", "Humboldt & Del Norte")                       # Del Norte, Humboldt and Mendocino counties
    end = date(d.year, 7, 30) if north else date(d.year, 6, 30)
    return 1 if d >= first_sat_nov(d.year) or d <= end else 0
diff = []
for spot in page["season"]:
    for d, o in zip(page["seasonDays"], spot["open"]):
        if o != reg_open(spot["lat"], spot["group"], d): diff.append(f"{spot['name']} {d}: page {o}")
check("Dungeness season matches the regulation for every favorite and day (Oct 2026 – Dec 2029)", not diff, {"spotDays": len(page["season"]) * len(page["seasonDays"]), "mismatches": diff[:8]})
known = {2021: 6, 2022: 5, 2023: 4, 2024: 2, 2025: 1, 2026: 7}     # opener dates reported by CDFW and news releases
op = {y: d for y, d in page["openers"]}
check("Opener rule reproduces past opening days (2021–2026)", all(op[y] == d for y, d in known.items()), {"page": op, "known": known})

# Regions and the SF Bay (no Dungeness) outline
wrong = [f"{r['name']}: listed {r['group']}, computed {r['computed']}" for r in page["regions"] if r["group"] != r["computed"]]
check("Every favorite's region matches the region rules", not wrong, wrong)
baybad = [r["name"] for r in page["regions"] if r["bay"] != (r["group"] == "SF Bay")]
check("SF Bay outline contains exactly the SF Bay favorites", not baybad, baybad)
# Reviewed by hand against a map: these are east of the Golden Gate Bridge, inside SF or San Pablo Bay.
EXPECTED_BAY = {"Aquatic Park Pier", "Ayala Cove", "Candlestick Point", "Cesar Chavez Park", "China Camp State Park", "Coyote Point",
  "Crissy Field East Beach", "Crown Memorial State Beach", "Dumbarton Pier", "Elephant Rock Pier", "Fort Mason", "Heron's Head Park",
  "Keller Beach", "McNears Beach", "Middle Harbor Shoreline Park", "Pier 7", "Point Isabel", "Point Molate Beach", "San Leandro Marina", "Torpedo Wharf"}
# West of the bridge (ocean side): Dungeness is legal here.
EXPECTED_OCEAN = {"Baker Beach", "China Beach", "Mile Rock Beach", "Kirby Cove", "Rodeo Beach"}
inside = {p["name"] for p in page["places"] if p["bay"]}
outside = {p["name"] for p in page["places"] if not p["bay"]}
check("SF Bay outline puts the 20 bay-side places inside and Golden Gate ocean beaches outside", inside == EXPECTED_BAY and EXPECTED_OCEAN <= outside,
      {"unexpectedInside": sorted(inside - EXPECTED_BAY), "missingInside": sorted(EXPECTED_BAY - inside), "oceanWronglyInside": sorted(EXPECTED_OCEAN - outside)})

json.dump({"checks": checks}, open(os.path.join(HERE, "results", "astro.json"), "w"), indent=1)
for c in checks: print("PASS" if c["pass"] else "FAIL", c["label"], json.dumps(c["detail"])[:260])
