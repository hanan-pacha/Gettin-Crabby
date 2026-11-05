// Check 5: the snaring score behaves the way the methodology says, and its rankings don't hinge on the
// exact weights. Uses the page's own functions with all outside requests blocked.
const { openSite, ymdList, save, check } = require("./lib.cjs");

(async () => {
  const site = await openSite();
  const { page } = site;
  const year = ymdList("2026-11-01", "2027-10-31"), season = ymdList("2026-11-07", "2027-06-30");
  const r = await page.evaluate(({ year, season }) => {
    const out = {};
    // Score range, best windows inside first light .. an hour after sunset, two windows apart.
    let n = 0, bad = 0, winBad = 0, overlap = 0;
    const slack = [], strong = [], dawn = [], noon = [];
    for (const s of STATIONS) for (const d of year) {
      const dd = dayData(s, d);
      for (const x of dd.samples) {
        n++; if (!(Number.isInteger(x.score) && x.score >= 0 && x.score <= 100)) bad++;
        if (x.L.name === "Daylight" || x.L.name === "Dawn" || x.L.name === "Dusk") { if (x.mv < .25) slack.push(x.score); else if (x.mv > 1) strong.push(x.score); }
        if (x.mv < .25 && x.L.name === "Dawn") dawn.push(x.score);
        if (x.mv < .25 && x.L.name === "Daylight" && Math.abs(x.t - (dd.sun.rise + dd.sun.set) / 2) < 3600e3) noon.push(x.score);
      }
      for (const w of dd.windows) if (w.start < dd.sun.rise - 90 * 60000 - 1 || w.end > dd.sun.set + 60 * 60000 + 600000) winBad++;
      if (dd.windows.length === 2 && dd.windows[0].start < dd.windows[1].end && dd.windows[1].start < dd.windows[0].end) overlap++;
    }
    const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    out.range = { samples: n, outOfRange: bad, windowsOutsideLight: winBad, overlapping: overlap };
    out.slackVsStrong = { slack: Math.round(avg(slack)), strong: Math.round(avg(strong)), nSlack: slack.length, nStrong: strong.length };
    out.dawnVsNoon = { dawn: Math.round(avg(dawn)), noon: Math.round(avg(noon)) };

    // Factor shapes.
    const mono = (f, xs, dir) => xs.every((x, i) => i === 0 || (dir < 0 ? f(x) <= f(xs[i - 1]) + 1e-12 : f(x) >= f(xs[i - 1]) - 1e-12));
    const ms = [0, .2, .4, .6, .8, 1, 1.3, 1.7, 2.5], hs = [0, .25, .5, .75, 1];
    out.shapes = {
      tideFallsWithCurrent: ["beach", "jetty", "pier", "harbor"].every(st => mono(m => tideFactor(m, .7, true, st), ms, -1)),
      tideRisesWithWater: ["beach", "jetty", "pier", "harbor"].every(st => mono(h => tideFactor(.3, h, true, st), hs, 1)),
      shoreCaresMoreAboutWater: tideFactor(0, 0, true, "beach") < tideFactor(0, 0, true, "pier"),
      risingBeatsFalling: tideFactor(.3, .5, true, "beach") > tideFactor(.3, .5, false, "beach"),
      windHurts: mono(w => wxFactor({ wind: w, gust: w * 1.3, rain: 0 }), [0, 5, 9, 13, 17, 22, 30], -1),
      rainHurts: mono(p => wxFactor({ wind: 3, gust: 4, rain: p }), [0, 30, 50, 80], -1),
      surfHurts: ["beach", "jetty", "pier"].every(st => mono(h => surfFactor(st, { h, p: 10 }), [0, 1, 2.5, 3.5, 4.5, 5.5, 7, 9, 12], -1)),
      jettyStricterThanPier: surfFactor("jetty", { h: 7, p: 10 }) < surfFactor("pier", { h: 7, p: 10 }),
      longPeriodSwellHurts: surfFactor("beach", { h: 6, p: 16 }) < surfFactor("beach", { h: 6, p: 10 }),
      muddyWaterHurts: mono(r48 => clarityFactor({ r48 }), [0, .2, .5, 1.2, 3], -1),
      lightOrder: (() => { const sun = { rise: 0, set: 12 * 3600e3 }; return lightOf(0, sun, "beach").v >= lightOf(6 * 3600e3, sun, "beach").v && lightOf(6 * 3600e3, sun, "beach").v > lightOf(-4 * 3600e3, sun, "beach").v; })(),
    };

    // Rules flow into the score.
    // Each spot is checked on its own closed days (the north coast stays open through July 30).
    let closedMax = 0, closedDaysChecked = 0;
    for (const s of STATIONS.filter(x => !x.bay)) for (const d of year) { const dd = dayData(s, d); if (!dd.season.open) { closedDaysChecked++; closedMax = Math.max(closedMax, dd.dayScore); } }
    out.closedMax = closedMax; out.closedDaysChecked = closedDaysChecked;
    const shelter = STATIONS.find(s => s.name === "Shelter Cove");
    out.closureMax = Math.max(...season.map(d => dayData(shelter, d).dayScore));
    state.target = "rock"; dayCache.clear();
    out.rockOpenAllYear = Math.min(...year.map(d => dayData(shelter, d).dayScore));
    out.bayAlwaysRock = STATIONS.filter(s => s.bay).every(s => dayData(s, "2027-08-15").sp === "rock");
    state.target = "dungeness"; dayCache.clear();
    out.bayAlwaysRock = out.bayAlwaysRock && STATIONS.filter(s => s.bay).every(s => dayData(s, "2027-08-15").sp === "rock");
    return out;
  }, { year, season });

  // Weight sensitivity: change each number by ±20% and compare day rankings and best-window times with the baseline.
  const variants = [["wTide", .8], ["wTide", 1.2], ["exp", .8], ["exp", 1.2], ["kMove", .8], ["kMove", 1.2], ["moveExp", .8], ["moveExp", 1.2], ["ebb", .98 / .95], ["dayMin", .9], ["darkShore", .8], ["darkShore", 1.2]];
  const sens = await page.evaluate(({ season, variants }) => {
    const rank = a => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2; i = j + 1; } return r; };
    const rho = (a, b) => { const ra = rank(a), rb = rank(b), n = a.length, ma = ra.reduce((x, y) => x + y, 0) / n, mb = rb.reduce((x, y) => x + y, 0) / n; let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; } return num / Math.sqrt(da * db); };
    // Spots closed all season (Shelter Cove, domoic acid) have flat scores, so their rankings are only rounding noise.
    const open = STATIONS.filter(s => !s.bay && season.some(d => dayData(s, d).season.open));
    const snap = () => open.map(s => season.map(d => { const dd = dayData(s, d); return [dd.dayScore, dd.windows[0] ? dd.windows[0].start : 0]; }));
    dayCache.clear(); const base = snap(), orig = { ...MODEL };
    const res = [];
    for (const [k, f] of variants) {
      Object.assign(MODEL, orig); MODEL[k] = orig[k] * f; dayCache.clear();
      const alt = snap();
      const rhos = base.map((b, i) => rho(b.map(x => x[0]), alt[i].map(x => x[0]))).sort((a, b) => a - b);
      let same = 0, tot = 0; base.forEach((b, i) => b.forEach((x, j) => { tot++; if (Math.abs(x[1] - alt[i][j][1]) <= 3600e3) same++; }));
      res.push({ change: `${k} ×${f.toFixed(2)}`, medianRho: +rhos[rhos.length >> 1].toFixed(3), minRho: +rhos[0].toFixed(3), bestWindowSame: +(same / tot).toFixed(3) });
    }
    Object.assign(MODEL, orig); dayCache.clear();
    return res;
  }, { season, variants });
  await site.close();

  const s = r.shapes;
  const checks = [
    check("Every score is a whole number from 0 to 100, over a full year at every favorite", r.range.outOfRange === 0, r.range),
    check("Best windows stay between first light and an hour after sunset, and the two never overlap", r.range.windowsOutsideLight === 0 && r.range.overlapping === 0, r.range),
    check("Slack water scores clearly above strong current (daylight, at least 1.4×)", r.slackVsStrong.slack >= 1.4 * r.slackVsStrong.strong, r.slackVsStrong),
    check("At slack water, dawn scores above midday", r.dawnVsNoon.dawn > r.dawnVsNoon.noon, r.dawnVsNoon),
    check("Factor shapes: current, water level, rising tide, wind, rain, surf, swell period, muddy water and light all push the right way", Object.values(s).every(Boolean), s),
    check("Closed Dungeness season keeps ocean spots at 15 or below", r.closedMax <= 15, { maxDayScore: r.closedMax, spotDaysChecked: r.closedDaysChecked }),
    check("The domoic acid closure keeps Shelter Cove at 15 or below all season", r.closureMax <= 15, { maxDayScore: r.closureMax }),
    check("Rock crab is open all year, even inside the Dungeness closure", r.rockOpenAllYear > 40, { minDayScore: r.rockOpenAllYear }),
    check("SF Bay spots are always scored for rock crab, whichever crab is selected", r.bayAlwaysRock, r.bayAlwaysRock),
    check("Rankings are robust: ±20% on any one model number keeps day rankings (median Spearman ≥ 0.85) and best-window times (≥ 80% within an hour)", sens.every(v => v.medianRho >= .85 && v.bestWindowSame >= .8), sens),
  ];
  save("model.json", { checks, details: r, sensitivity: sens });
  for (const c of checks) console.log(c.pass ? "PASS" : "FAIL", c.label, JSON.stringify(c.detail).slice(0, 420));
})().catch(e => { console.error(e); process.exit(1); });
