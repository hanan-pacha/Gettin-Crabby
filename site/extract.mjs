// Builds the Northern California data files from the Neaps tide database (NOAA harmonics).
// Run from a folder with @neaps/tide-database installed:
//   node extract.mjs <repo>/site/stations.json <repo>/docs/stations-all.json
import { stations, stationsById } from "@neaps/tide-database";
import fs from "fs";
const [outFav = "stations.json", outAll = "stations-all.json"] = process.argv.slice(2);
const r4 = x => Math.round(x * 1e4) / 1e4;
// NorCal: Santa Cruz to the Oregon border.
const BOX = { s: 36.9, n: 42.05, e: -121.0 };
const inBox = s => s.latitude >= BOX.s && s.latitude <= BOX.n && s.longitude <= BOX.e;
const isNoaa = s => s.kind === "tide" && s.source?.name?.startsWith("US National Oceanic");

// Favorite spots: [NOAA station, spot name, area, region, optional spot lat/lon when the spot isn't at the station]
const FAV = [
  ["9419750", "Crescent City Harbor", "Crescent City", "Humboldt & Del Norte"],
  ["9419059", "Trinidad Pier", "Trinidad", "Humboldt & Del Norte"],
  ["9418801", "Woodley Island", "Eureka, Humboldt Bay", "Humboldt & Del Norte"],
  ["9418767", "North Jetty", "Humboldt Bay", "Humboldt & Del Norte"],
  ["9418024", "Shelter Cove", "Lost Coast", "Humboldt & Del Norte"],
  ["9417426", "Noyo Harbor", "Fort Bragg", "Mendocino"],
  ["9416841", "Point Arena Pier", "Arena Cove", "Mendocino"],
  ["9415625", "Bodega Bay", "Bodega Harbor", "Marin & Sonoma"],
  ["9415469", "Lawson's Landing", "Dillon Beach, Tomales Bay", "Marin & Sonoma"],
  ["9415339", "Marshall", "Tomales Bay", "Marin & Sonoma"],
  ["9415020", "Drakes Bay", "Point Reyes", "Marin & Sonoma"],
  ["9414290", "Fort Point", "Golden Gate, San Francisco", "SF Bay"],
  ["9414806", "Fort Baker", "Sausalito", "SF Bay"],
  ["9414837", "Paradise Beach", "Tiburon", "SF Bay"],
  ["9414816", "Berkeley Pier", "Berkeley", "SF Bay"],
  ["9415056", "Point Pinole Pier", "Richmond", "SF Bay"],
  ["9414750", "Alameda Shoreline", "Alameda", "SF Bay"],
  ["9414275", "Ocean Beach", "San Francisco", "SF & South Coast"],
  ["9414275", "Pacifica Pier", "Pacifica", "SF & South Coast", 37.6338, -122.4954],
  ["9414131", "Pillar Point Harbor", "Half Moon Bay", "SF & South Coast"],
  ["9413745", "Santa Cruz Wharf", "Santa Cruz", "SF & South Coast"],
];
const get = id => stationsById.get("noaa/" + id);
const refOf = s => s.type === "reference" ? s : stationsById.get(s.offsets.reference);
const gtOf = s => { const d = s.datums || {}; return d.GT ?? (d.MHHW != null && d.MLLW != null ? d.MHHW - d.MLLW : null); };
const offsetsOf = s => s.type === "reference" ? undefined : {
  time: { high: s.offsets.time?.high ?? 0, low: s.offsets.time?.low ?? 0 },
  height: { high: s.offsets.height?.high ?? 1, low: s.offsets.height?.low ?? 1, type: s.offsets.height?.type || "ratio" } };
const fav = FAV.map(([id, name, area, group, lat, lon]) => {
  const s = get(id); if (!s) throw new Error("missing " + id);
  const ref = refOf(s), d = ref.datums;
  return { id, name, area, group, sp: "dungeness", lat: lat ?? r4(s.latitude), lon: lon ?? r4(s.longitude), tz: s.timezone,
    off: r4(d.MSL - d.MLLW), gt: r4(gtOf(s) ?? gtOf(ref)), offsets: offsetsOf(s), station: s.name,
    hc: ref.harmonic_constituents.filter(c => c.amplitude > 0.002).map(c => [c.name, r4(c.amplitude), Math.round(c.phase * 100) / 100]) };
});
fs.writeFileSync(outFav, JSON.stringify(fav));

// All NorCal stations for place search (compact format read by loadDB()).
const cons = [], ci = n => { let i = cons.indexOf(n); if (i < 0) { cons.push(n); i = cons.length - 1; } return i; };
const tzs = [], ti = z => { let i = tzs.indexOf(z); if (i < 0) { tzs.push(z); i = tzs.length - 1; } return i; };
const refs = {}, subs = [];
const addRef = s => {
  const id = s.source.id; if (refs[id]) return id;
  const d = s.datums || {}; if (d.MSL == null || d.MLLW == null) return null;
  refs[id] = [s.name, r4(s.latitude), r4(s.longitude), ti(s.timezone), r4(d.MSL - d.MLLW), r4(gtOf(s)),
    s.harmonic_constituents.filter(c => c.amplitude > 0.004).map(c => [ci(c.name), r4(c.amplitude), Math.round(c.phase * 10) / 10])];
  return id;
};
for (const s of stations.filter(s => isNoaa(s) && inBox(s))) {
  if (s.type === "reference") { addRef(s); continue; }
  const o = s.offsets; if (!o?.reference) continue;
  const ref = stationsById.get(o.reference); if (!ref || ref.type !== "reference" || !ref.harmonic_constituents?.length) continue;
  const rid = addRef(ref); if (!rid) continue;
  const f = offsetsOf(s), gt = gtOf(s);
  subs.push([s.source.id, s.name, r4(s.latitude), r4(s.longitude), ti(s.timezone), rid, f.time.high, f.time.low, r4(f.height.high), r4(f.height.low), f.height.type === "fixed" ? 1 : 0, gt == null ? null : r4(gt)]);
}
fs.writeFileSync(outAll, JSON.stringify({ v: 1, c: cons, z: tzs, r: refs, s: subs }));
console.log(fav.length, "favorites;", Object.keys(refs).length, "reference +", subs.length, "subordinate stations,", fs.statSync(outAll).size, "bytes");
