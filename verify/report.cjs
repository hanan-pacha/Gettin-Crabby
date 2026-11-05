// Builds verify/REPORT.md from the JSON results of the latest run.
const fs = require("fs");
const path = require("path");
const R = path.join(__dirname, "results");
const groups = [["tides.json", "1. Tide predictions vs NOAA"], ["astro.json", "2. Sun, moon, clock and season"], ["places.json", "3. Built-in places"], ["live.json", "4. Live services and deployed site"], ["model.json", "5. Snaring score behavior"]];
// Notes for checks that missed their pre-set criteria, explaining the cause and whether it matters.
const NOTES = {
  "Favorites: high/low heights vs NOAA": "Median 0.053 ft against a 0.05 ft criterion (about half an inch; no bias, max 0.15 ft). Re-running with all 37 harmonic constituents gives the same difference, so it comes from small differences between the open-source tide library and NOAA's own prediction program, not from the data. Heights are shown to 0.1 ft and the score uses relative water level, so this does not change any forecast. Left as a recorded miss rather than loosening the criterion after the fact.",
};
const fmt = d => {
  if (d == null) return "";
  if (Array.isArray(d)) return d.length ? d.slice(0, 6).map(x => typeof x === "object" ? Object.entries(x).map(([k, v]) => `${k} ${v}`).join(", ") : String(x)).join("; ") + (d.length > 6 ? ` … (${d.length})` : "") : "none";
  if (typeof d === "object") {
    if ("median" in d && "max" in d) return `n ${d.n}, median ${d.median}, 95th pct ${d.p95}, max ${d.max}`;
    return Object.entries(d).filter(([, v]) => v !== "" && v != null).map(([k, v]) => `${k}: ${typeof v === "object" ? fmt(v) : v}`).join("; ");
  }
  return String(d);
};
let pass = 0, total = 0, out = [];
const when = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
for (const [file, title] of groups) {
  const f = path.join(R, file);
  if (!fs.existsSync(f)) { out.push(`## ${title}\n\nNot run.\n`); continue; }
  const { checks } = JSON.parse(fs.readFileSync(f, "utf8"));
  out.push(`## ${title}\n\n| Result | Check | Measured |\n|---|---|---|`);
  for (const c of checks) {
    total++; if (c.pass) pass++;
    const note = Object.entries(NOTES).find(([k]) => c.label.startsWith(k));
    out.push(`| ${c.pass ? "✅ Pass" : "❌ Miss"} | ${c.label} | ${fmt(c.detail).replace(/\|/g, "/").slice(0, 600)}${!c.pass && note ? `<br>**Note:** ${note[1]}` : ""} |`);
  }
  out.push("");
}
const md = `# Verification report\n\nRun ${when} against the build in \`docs/index.html\`. **${pass} of ${total} checks passed.** The protocol, sources and criteria are in [README.md](README.md); the model is described in [../METHODOLOGY.md](../METHODOLOGY.md).\n\n${out.join("\n")}`;
fs.writeFileSync(path.join(__dirname, "REPORT.md"), md);
console.log(`REPORT.md: ${pass}/${total} passed`);
