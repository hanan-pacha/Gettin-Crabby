// Check 2, part 1: dump the page's own sun, moon, clock and season calculations so astro.py can
// compare them with independent implementations (astral, PyEphem, Python zoneinfo, the regulation text).
const { openSite, ymdList, save } = require("./lib.cjs");
(async () => {
  const site = await openSite();
  const days = ymdList("2026-11-01", "2027-12-31");
  const seasonDays = ymdList("2026-10-01", "2029-12-31");
  const out = await site.page.evaluate(({ days, seasonDays }) => {
    const sp = ymd => ymd.split("-").map(Number);
    const sun = STATIONS.map(s => ({ name: s.name, lat: s.lat, lon: s.lon,
      days: days.map(d => { const [y, m, dd] = sp(d); const r = sunTimes(y, m, dd, s.lat, s.lon); return [d, r.rise, r.set]; }) }));
    const noon = days.map(d => { const [y, m, dd] = sp(d); const t = zoned(y, m, dd, 12, "America/Los_Angeles"), a = zoned(y, m, dd, 0, "America/Los_Angeles"), n = new Date(Date.UTC(y, m - 1, dd + 1)); const b = zoned(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), 0, "America/Los_Angeles"); const mo = moon(t, a, b); return [d, t, mo.k, mo.name]; });
    const midnights = days.map(d => { const [y, m, dd] = sp(d); return [d, zoned(y, m, dd, 0, "America/Los_Angeles")]; });
    const season = STATIONS.map(s => ({ name: s.name, lat: s.lat, group: s.group,
      open: seasonDays.map(d => { const [y, m, dd] = sp(d); const r = seasonOf(s, "dungeness", y, m, dd); return r.open ? 1 : 0; }) }));
    const regions = STATIONS.map(s => ({ name: s.name, group: s.group, computed: regionOf(s.lat, s.lon), bay: inSfBay(s.lat, s.lon) }));
    const places = LOCAL_PLACES.map(p => ({ name: p.name, lat: p.lat, lon: p.lon, region: regionOf(p.lat, p.lon), bay: inSfBay(p.lat, p.lon) }));
    const openers = [2021, 2022, 2023, 2024, 2025, 2026, 2027].map(y => [y, firstSaturdayNov(y)]);
    return { sun, noon, midnights, season, seasonDays, regions, places, openers };
  }, { days, seasonDays });
  out.errors = site.errors;
  save("astro-page.json", out);
  console.log("dumped", out.sun.length, "spots x", days.length, "days;", out.errors.length, "page errors");
  await site.close();
})().catch(e => { console.error(e); process.exit(1); });
