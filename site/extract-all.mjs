// Builds docs/stations-all.json: every NOAA tide station in the US mainland and Alaska,
// for the "search any beach" feature. Run from a folder with @neaps/tide-database installed:
//   node extract-all.mjs <repo>/docs/stations-all.json
import { stations, stationsById } from "@neaps/tide-database";
import fs from "fs";
const out = process.argv[2] || "stations-all.json";
const r4 = x => Math.round(x * 1e4) / 1e4;
const keep = s => s.kind === "tide" && s.country_code === "US" && s.source?.name?.startsWith("US National Oceanic") && s.latitude > 24 && s.longitude < -60;
const cons = [], ci = n => { let i = cons.indexOf(n); if (i < 0) { cons.push(n); i = cons.length - 1; } return i; };
const tzs = [], ti = z => { let i = tzs.indexOf(z); if (i < 0) { tzs.push(z); i = tzs.length - 1; } return i; };
const refs = {}, subs = [];
const addRef = s => {
  const id = s.source.id; if (refs[id]) return id;
  const d = s.datums || {}; if (d.MSL == null || d.MLLW == null) return null;
  refs[id] = [s.name, r4(s.latitude), r4(s.longitude), ti(s.timezone), r4(d.MSL - d.MLLW), r4(d.GT ?? (d.MHHW - d.MLLW)),
    s.harmonic_constituents.filter(c => c.amplitude > 0.004).map(c => [ci(c.name), r4(c.amplitude), Math.round(c.phase * 10) / 10])];
  return id;
};
for (const s of stations.filter(keep)) {
  if (s.type === "reference") { addRef(s); continue; }
  const o = s.offsets; if (!o || !o.reference) continue;
  const ref = stationsById.get(o.reference); if (!ref || ref.type !== "reference" || !ref.harmonic_constituents?.length) continue;
  const rid = addRef(ref); if (!rid) continue;
  const gt = s.datums?.GT ?? (s.datums?.MHHW != null && s.datums?.MLLW != null ? s.datums.MHHW - s.datums.MLLW : null);
  subs.push([s.source.id, s.name, r4(s.latitude), r4(s.longitude), ti(s.timezone), rid,
    o.time?.high ?? 0, o.time?.low ?? 0, r4(o.height?.high ?? (o.height?.type === "fixed" ? 0 : 1)), r4(o.height?.low ?? (o.height?.type === "fixed" ? 0 : 1)), o.height?.type === "fixed" ? 1 : 0, gt == null ? null : r4(gt)]);
}
fs.writeFileSync(out, JSON.stringify({ v: 1, c: cons, z: tzs, r: refs, s: subs }));
console.log(Object.keys(refs).length, "reference +", subs.length, "subordinate,", fs.statSync(out).size, "bytes");
