// Check 3: the built-in search places. Coordinates were typed in by hand, so each one is looked up on
// OpenStreetMap (Photon, then Nominatim for anything that disagrees) and must be within 1 mile.
const { openSite, getJSON, sleep, save, check } = require("./lib.cjs");
const BOX = "-124.7,36.9,-121.0,42.05";
const mi = (a, b) => { const R = 3958.8, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2)); };
const words = s => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").split(/[^a-z0-9]+/).filter(w => w.length > 2 && !["state", "beach", "park", "the"].includes(w));
const sameName = (a, b) => { const A = words(a), B = new Set(words(b)); return A.length === 0 || A.some(w => B.has(w)); };

(async () => {
  const site = await openSite();
  const places = await site.page.evaluate(async () => { await loadDB(); return LOCAL_PLACES.map(p => {
    const n = nearestStations(p.lat, p.lon, 1)[0], mp = mpaAt(p.lat, p.lon);
    return { name: p.name, area: p.area, lat: p.lat, lon: p.lon, kind: p.kind, region: regionOf(p.lat, p.lon), bay: inSfBay(p.lat, p.lon),
      setting: guessSetting(p.name, p.kind), station: n.st.name, stationMi: Math.round(n.mi * 10) / 10, mpa: mp ? `${mp.n} (${mp.c})` : null }; }); });
  await site.close();
  const rows = [];
  for (const p of places) {
    const town = p.area.split(",")[0], plain = p.name.replace(/[’']/g, "");
    const queries = [...new Set([`${p.name} ${town}`, p.name, plain, `${plain} ${town}`])];
    const cands = [];
    for (const q of queries) {
      const r = await getJSON(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=${BOX}`);
      for (const f of (r.json && r.json.features) || []) cands.push({ name: f.properties.name || "", lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], src: "photon" });
      await sleep(250);
    }
    let best = cands.filter(f => sameName(p.name, f.name)).map(f => ({ ...f, d: mi(p, f) })).sort((a, b) => a.d - b.d)[0];
    if (!best || best.d > 1) {                          // second opinion from Nominatim (1 request per second)
      for (const q of queries.slice(0, 3)) {
        await sleep(1100);
        const n = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&countrycodes=us&viewbox=-124.7,42.05,-121.0,36.9&bounded=1&q=${encodeURIComponent(q)}`);
        for (const x of Array.isArray(n.json) ? n.json : []) cands.push({ name: x.name || x.display_name, lat: +x.lat, lon: +x.lon, src: "nominatim" });
      }
      best = cands.filter(f => sameName(p.name, f.name)).map(f => ({ ...f, d: mi(p, f) })).sort((a, b) => a.d - b.d)[0];
    }
    rows.push({ ...p, osm: best ? { name: best.name, lat: +best.lat.toFixed(4), lon: +best.lon.toFixed(4), src: best.src, mi: Math.round(best.d * 100) / 100 } : null });
  }
  const off = rows.filter(r => !r.osm || r.osm.mi > 1);
  const far = rows.filter(r => r.stationMi > 25);
  const mpa = rows.filter(r => r.mpa && !/\(ok\)$/.test(r.mpa));
  const checks = [
    check("Every built-in place is within 1 mile of its OpenStreetMap location", off.length === 0, { places: rows.length, outside: off.map(r => `${r.name}: ${r.osm ? r.osm.mi + " mi from " + r.osm.name + " (" + r.osm.src + ")" : "not found"}`) }),
    check("Every built-in place has a tide station within 25 miles", far.length === 0, far.map(r => `${r.name}: ${r.stationMi} mi`)),
    check("No built-in place is in or next to a protected area that bans snaring", mpa.length === 0, mpa.map(r => `${r.name}: ${r.mpa}`)),
  ];
  save("places.json", { checks, rows });
  for (const c of checks) console.log(c.pass ? "PASS" : "FAIL", c.label, JSON.stringify(c.detail).slice(0, 600));
})().catch(e => { console.error(e); process.exit(1); });
