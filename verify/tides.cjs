// Check 1: tide predictions against NOAA CO-OPS official predictions.
// Our numbers come from the shipped page code (dayData), NOAA's from api.tidesandcurrents.noaa.gov.
const { openSite, getJSON, pool, stats, ymdList, save, check } = require("./lib.cjs");

const NOAA = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?";
const q = p => NOAA + new URLSearchParams({ application: "gettin_crabby_verify", format: "json", units: "english", datum: "MLLW", time_zone: "gmt", product: "predictions", ...p });
const compact = ymd => ymd.replace(/-/g, "");
const dayBefore = ymd => new Date(Date.parse(ymd + "T12:00:00Z") - 86400000).toISOString().slice(0, 10);
const dayAfter = ymd => new Date(Date.parse(ymd + "T12:00:00Z") + 86400000).toISOString().slice(0, 10);

async function noaaHilo(id, from, to) {
  const r = await getJSON(q({ station: id, interval: "hilo", begin_date: compact(dayBefore(from)), end_date: compact(dayAfter(to)) }));
  if (!r.json || !r.json.predictions) return { error: (r.json && r.json.error && r.json.error.message) || `HTTP ${r.status}` };
  return { ev: r.json.predictions.map(p => ({ t: Date.parse(p.t.replace(" ", "T") + "Z"), ft: +p.v, high: p.type === "H" })) };
}
async function noaaSix(id, from, to) {
  const r = await getJSON(q({ station: id, interval: "6", begin_date: compact(from), end_date: compact(to) }));
  if (!r.json || !r.json.predictions) return { error: (r.json && r.json.error && r.json.error.message) || `HTTP ${r.status}` };
  return { pts: r.json.predictions.map(p => ({ t: Date.parse(p.t.replace(" ", "T") + "Z"), ft: +p.v })) };
}
// Pairs every NOAA high/low with our nearest extreme of the same kind.
function compare(noaa, ours) {
  const N = noaa.filter(e => e.t >= ours.t0 && e.t < ours.t1);
  const out = { n: N.length, dt: [], dh: [], missing: [], extra: [] }, used = new Set();
  for (const e of N) {
    let best = null;
    ours.ev.forEach((o, i) => { if (o.high !== e.high) return; const d = Math.abs(o.t - e.t); if (!best || d < best.d) best = { d, i, o }; });
    if (!best || best.d > 3 * 3600e3) { out.missing.push(new Date(e.t).toISOString()); continue; }
    used.add(best.i); out.dt.push((best.o.t - e.t) / 60000); out.dh.push(best.o.ft - e.ft);
  }
  ours.ev.forEach((o, i) => { if (!used.has(i) && o.t > ours.t0 + 3 * 3600e3 && o.t < ours.t1 - 3 * 3600e3) out.extra.push(new Date(o.t).toISOString()); });
  return out;
}

(async () => {
  const site = await openSite();
  const { page } = site;
  const favs = await page.evaluate(() => STATIONS.map(s => ({ slug: s.slug, name: s.name, id: s.id, sub: !!s.offsets })));
  const periods = [["2026-11-06", "2026-12-05"], ["2027-03-01", "2027-03-31"]];   // March includes the DST change (Mar 14)
  const oursFav = (slug, days) => page.evaluate(({ slug, days }) => {
    const s = STATIONS.find(x => x.slug === slug), ev = []; let t0, t1;
    for (const d of days) { const dd = dayData(s, d); if (t0 == null) t0 = dd.start; t1 = dd.end; for (const e of dd.inDay) ev.push({ t: e.t, ft: e.ft, high: e.high }); }
    return { ev, t0, t1 };
  }, { slug, days });

  // 1a. Favorites, one row per unique NOAA station
  const seen = new Set(), favRows = [];
  for (const f of favs) { if (seen.has(f.id)) continue; seen.add(f.id); favRows.push(f); }
  const fav = await pool(favRows, 3, async f => {
    const row = { id: f.id, name: f.name, subordinate: f.sub, dt: [], dh: [], missing: [], extra: [], n: 0, errors: [] };
    for (const [a, b] of periods) {
      const noaa = await noaaHilo(f.id, a, b);
      if (noaa.error) { row.errors.push(noaa.error); continue; }
      const c = compare(noaa.ev, await oursFav(f.slug, ymdList(a, b)));
      row.n += c.n; row.dt.push(...c.dt); row.dh.push(...c.dh); row.missing.push(...c.missing); row.extra.push(...c.extra);
    }
    return row;
  });

  // 1b. Every searchable station (place search), one week
  const all = await page.evaluate(async () => { await loadDB(); return DB.list.map(s => ({ id: s.id, name: s.name, sub: !!s.ref })); });
  const week = ["2026-11-06", "2026-11-12"];
  const oursId = (id, days) => page.evaluate(async ({ id, days }) => {
    await loadDB(); const st = DB.list.find(x => x.id === id);
    const s = makePlace({ name: "check " + id, lat: st.lat, lon: st.lon, stationId: id }), ev = []; let t0, t1;
    for (const d of days) { const dd = dayData(s, d); if (t0 == null) t0 = dd.start; t1 = dd.end; for (const e of dd.inDay) ev.push({ t: e.t, ft: e.ft, high: e.high }); }
    return { ev, t0, t1 };
  }, { id, days });
  const allRows = await pool(all, 4, async st => {
    const noaa = await noaaHilo(st.id, ...week);
    if (noaa.error) return { id: st.id, name: st.name, subordinate: st.sub, error: noaa.error };
    const c = compare(noaa.ev, await oursId(st.id, ymdList(...week)));
    return { id: st.id, name: st.name, subordinate: st.sub, n: c.n, dt: c.dt, dh: c.dh, missing: c.missing, extra: c.extra };
  });

  // 1c. Full curve at reference favorites (NOAA 6-minute predictions; NOAA publishes these only for reference stations)
  const refs = favRows.filter(f => !f.sub);
  const curve = await pool(refs, 3, async f => {
    const noaa = await noaaSix(f.id, "2026-11-06", "2026-11-08");
    if (noaa.error) return { id: f.id, name: f.name, error: noaa.error };
    const ours = await page.evaluate(({ slug, days }) => { const s = STATIONS.find(x => x.slug === slug); return days.flatMap(d => dayData(s, d).samples.map(p => ({ t: p.t, ft: p.ft }))); }, { slug: f.slug, days: ["2026-11-06", "2026-11-07", "2026-11-08"] });
    const m = new Map(ours.map(p => [p.t, p.ft]));
    const diffs = noaa.pts.filter(p => m.has(p.t)).map(p => m.get(p.t) - p.ft);
    const rmse = Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / (diffs.length || 1));
    return { id: f.id, name: f.name, points: diffs.length, rmse: Math.round(rmse * 1000) / 1000, max: Math.round(Math.max(...diffs.map(Math.abs)) * 1000) / 1000 };
  });
  await site.close();

  const pick = (rows, k) => rows.flatMap(r => r[k] || []);
  const favDt = stats(pick(fav, "dt")), favDh = stats(pick(fav, "dh"));
  const ok = allRows.filter(r => !r.error);
  const subs = ok.filter(r => r.subordinate), refsAll = ok.filter(r => !r.subordinate);
  const allDt = stats(pick(ok, "dt")), allDh = stats(pick(ok, "dh"));
  const favMiss = pick(fav, "missing").length + pick(fav, "extra").length;
  const allEvents = ok.reduce((s, r) => s + r.n, 0), allMiss = pick(ok, "missing").length + pick(ok, "extra").length;
  const worst = ok.map(r => ({ id: r.id, name: r.name, sub: r.subordinate, dt: stats(r.dt).max, dh: stats(r.dh).max })).sort((a, b) => b.dt - a.dt).slice(0, 8);
  const curveOk = curve.filter(c => !c.error);
  const checks = [
    check("Favorites: high/low times vs NOAA (median ≤ 3 min, 95th pct ≤ 10 min, max ≤ 20 min)", favDt.median <= 3 && favDt.p95 <= 10 && favDt.max <= 20, favDt),
    check("Favorites: high/low heights vs NOAA (median ≤ 0.05 ft, 95th pct ≤ 0.15 ft, max ≤ 0.3 ft)", favDh.median <= 0.05 && favDh.p95 <= 0.15 && favDh.max <= 0.3, favDh),
    check("Favorites: no missing or extra highs/lows", favMiss === 0, { events: fav.reduce((s, r) => s + r.n, 0), missingOrExtra: favMiss }),
    check("Search stations: high/low times vs NOAA (95th pct ≤ 15 min)", allDt.p95 <= 15, { ...allDt, stations: ok.length, reference: refsAll.length, subordinate: subs.length }),
    check("Search stations: high/low heights vs NOAA (95th pct ≤ 0.25 ft)", allDh.p95 <= 0.25, allDh),
    check("Search stations: missing or extra highs/lows ≤ 1%", allMiss <= 0.01 * allEvents, { events: allEvents, missingOrExtra: allMiss }),
    check("Search stations: NOAA has predictions for every station", allRows.every(r => !r.error), { failed: allRows.filter(r => r.error).map(r => `${r.id} ${r.name}: ${r.error}`) }),
    check("Full tide curve at reference stations (RMSE ≤ 0.1 ft, max ≤ 0.25 ft)", curveOk.length && curveOk.every(c => c.rmse <= 0.1 && c.max <= 0.25), curve),
  ];
  save("tides.json", { checks, favorites: fav.map(r => ({ id: r.id, name: r.name, subordinate: r.subordinate, events: r.n, time: stats(r.dt), height: stats(r.dh), missing: r.missing, extra: r.extra, errors: r.errors })),
    stations: { count: ok.length, time: allDt, height: allDh, subordinateTime: stats(pick(subs, "dt")), referenceTime: stats(pick(refsAll, "dt")), worstTiming: worst, failed: allRows.filter(r => r.error) }, curve });
  for (const c of checks) console.log(c.pass ? "PASS" : "FAIL", c.label, JSON.stringify(c.detail).slice(0, 300));
})().catch(e => { console.error(e); process.exit(1); });
