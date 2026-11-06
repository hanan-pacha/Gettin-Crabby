// Check 4: the live services the page calls from visitors' browsers, the deployed site, and an end-to-end
// run of the built page against the real services (each outside request is fetched for real and handed to the browser).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { ROOT, openSite, get, getJSON, save, check } = require("./lib.cjs");
const ORIGIN = "Origin: https://hanan-pacha.github.io";
const SITE = "https://hanan-pacha.github.io/Gettin-Crabby/";
const sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

(async () => {
  const checks = [], info = {};
  // 4a. Each service answers, in the shape the page parses, with a CORS header that lets a browser read it.
  const svc = async (label, url, shapeOk) => {
    let r;
    for (let k = 0; k < 2 && !r; k++) { try { r = await getJSON(url, { headers: [ORIGIN] }); } catch (e) { if (k) { info[label] = { status: 0, cors: null, shape: false, note: String(e.message).split("\n")[0].slice(0, 160) }; return info[label]; } await new Promise(z => setTimeout(z, 2000)); } }
    const cors = r.headers["access-control-allow-origin"];
    const row = { status: r.status, cors: cors || null, shape: r.json ? shapeOk(r.json) : false, note: r.json && (r.json.reason || (r.json.error && r.json.error.message)) || "" };
    info[label] = row; return row;
  };
  const noaa = await svc("NOAA predictions", "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?application=gettin_crabby_verify&format=json&units=english&datum=MLLW&time_zone=gmt&product=predictions&interval=hilo&station=9414290&date=today", j => Array.isArray(j.predictions));
  const photon = await svc("Photon search", "https://photon.komoot.io/api/?q=baker%20beach&limit=3&lang=en&bbox=-124.7,36.9,-121.0,42.05", j => Array.isArray(j.features) && j.features.every(f => f.geometry && f.properties));
  const nomi = await svc("Nominatim search", "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=us&viewbox=-124.7,42.05,-121.0,36.9&bounded=1&q=ocean%20beach", j => Array.isArray(j) && j.every(x => x.lat && x.lon));
  const omGeo = await svc("Open-Meteo geocoding", "https://geocoding-api.open-meteo.com/v1/search?name=bodega&count=3&countryCode=US", j => Array.isArray(j.results));
  const omWx = await svc("Open-Meteo forecast", "https://api.open-meteo.com/v1/forecast?latitude=37.76,41.74&longitude=-122.52,-124.2&hourly=wind_speed_10m,precipitation&timeformat=unixtime&timezone=GMT&forecast_days=1", j => Array.isArray(j) && j[0].hourly && Array.isArray(j[0].hourly.time));
  const omSea = await svc("Open-Meteo marine", "https://marine-api.open-meteo.com/v1/marine?latitude=37.76,41.74&longitude=-122.52,-124.2&hourly=wave_height,wave_period&length_unit=imperial&timeformat=unixtime&timezone=GMT&forecast_days=1", j => Array.isArray(j) && j[0].hourly && Array.isArray(j[0].hourly.wave_height));
  for (const [label, r] of [["NOAA tide predictions", noaa], ["Photon place search", photon], ["Nominatim place search", nomi]])
    checks.push(check(`${label}: answers, matches the parsed shape, allows browser access (CORS)`, r.status === 200 && r.shape && r.cors, r));
  const limited = [omGeo, omWx, omSea].filter(r => r.status === 429);
  checks.push(check("Open-Meteo (weather, surf, geocoding): answers in the parsed shape, or is only rate-limiting this test machine", [omGeo, omWx, omSea].every(r => (r.status === 200 && r.shape) || r.status === 429),
    { forecast: omWx, marine: omSea, geocoding: omGeo, note: limited.length ? "HTTP 429 'daily limit' applies to this shared test IP; each visitor's browser has its own limit" : "" }));

  // 4b. Which favorites have live NOAA water temperature and water level.
  const site0 = await openSite();
  const favs = await site0.page.evaluate(() => STATIONS.map(s => ({ name: s.name, id: s.id })));
  await site0.close();
  const water = [];
  for (const f of favs) {
    const q = p => `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?application=gettin_crabby_verify&format=json&time_zone=gmt&units=english&date=latest&station=${f.id}&product=${p}`;
    const t = await getJSON(q("water_temperature")), l = await getJSON(q("water_level&datum=MLLW"));
    water.push({ name: f.name, id: f.id, waterTemp: !!(t.json && t.json.data), waterLevel: !!(l.json && l.json.data), cors: t.headers["access-control-allow-origin"] || null });
  }
  info.water = water;
  checks.push(check("NOAA live water data: at least one favorite has water temperature and water level", water.some(w => w.waterTemp) && water.some(w => w.waterLevel),
    { withTemp: water.filter(w => w.waterTemp).map(w => w.name), withLevel: water.filter(w => w.waterLevel).map(w => w.name) }));

  // 4c. The deployed site serves exactly the committed build.
  const dep = await get(SITE);
  let committed = "";
  try { committed = execFileSync("git", ["-C", ROOT, "show", "HEAD:docs/index.html"], { encoding: "utf8", maxBuffer: 64e6 }); } catch (e) {}
  const local = fs.readFileSync(path.join(ROOT, "docs", "index.html"), "utf8");
  info.deployed = { status: dep.status, deployed: sha(dep.body), committed: sha(committed), workingCopy: sha(local) };
  checks.push(check("GitHub Pages serves the committed docs/index.html", dep.status === 200 && dep.body === committed, info.deployed));

  // 4d. End to end: the built page against the real services.
  const route = base => async r => {
    const u = r.request().url();
    if (u.startsWith(base)) return r.continue();
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return r.abort();
    try {
      const h = r.request().headers(), res = await get(u, { headers: h.origin ? [`Origin: ${h.origin}`] : [] });
      const headers = {}; for (const [k, v] of Object.entries(res.headers)) if (!["content-length", "transfer-encoding", "content-encoding", "connection"].includes(k)) headers[k] = v;
      await r.fulfill({ status: res.status || 502, headers, body: res.body });
    } catch (e) { await r.abort(); }
  };
  const site = await openSite({ route, hash: "#fort-point-san-francisco", viewport: { width: 390, height: 844 } });
  const { page } = site;
  await page.waitForTimeout(4000);
  // The wind answer is large (21 spots) and this machine's proxy is slow: when the service is healthy, give the page up to 25 s to show it.
  for (const [src, word] of [[omWx, "wind"], [omSea, "surf"]]) if (src.status === 200) await page.waitForFunction(w => new RegExp(w).test(document.getElementById("live").textContent), word, { timeout: 25000 }).catch(() => {});
  const e2e = {};
  e2e.live = await page.textContent("#live");
  e2e.nowLine = await page.$eval(".nowline", e => e.innerText.replace(/\s+/g, " ")).catch(() => "");
  e2e.weatherFact = await page.$$eval(".fact", a => a.map(e => e.innerText.replace(/\s+/g, " ")).filter(t => /WEATHER|SURF/i.test(t)));
  await page.click("#q"); await page.type("#q", "baker", { delay: 40 }); await page.waitForTimeout(3500);
  e2e.searchBaker = await page.$$eval("#places .prow", a => a.map(e => e.innerText.replace(/\s+/g, " ")));
  await page.fill("#q", ""); await page.type("#q", "ocean beach", { delay: 40 }); await page.waitForTimeout(3500);
  e2e.searchOcean = await page.$$eval("#places .prow", a => a.map(e => e.innerText.replace(/\s+/g, " ")));
  const mapRow = await page.$('#places .prow[data-place]:not([aria-disabled="true"])');
  if (mapRow) { await mapRow.click(); await page.waitForTimeout(1500); e2e.opened = [await page.textContent(".hero h2"), await page.$eval(".hero .stationline", e => e.innerText.replace(/\s+/g, " ")).catch(() => "")]; }
  e2e.errors = site.errors;
  e2e.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: path.join(__dirname, "results", "e2e-phone.png") });
  await site.close();
  info.e2e = e2e;
  checks.push(check("End to end: live data indicator turns on and names only the sources that loaded", /^Live/.test(e2e.live) && (/wind/.test(e2e.live) === (omWx.status === 200)) && (/surf/.test(e2e.live) === (omSea.status === 200)), e2e.live));
  checks.push(check("End to end: Fort Point shows NOAA's live water reading", /Water (temperature|is running)/.test(e2e.nowLine), e2e.nowLine));
  checks.push(check("End to end: typing 'baker' finds Baker Beach", e2e.searchBaker.some(t => /Baker Beach/.test(t)), e2e.searchBaker));
  checks.push(check("End to end: typing 'ocean beach' finds San Francisco's Ocean Beach and no out-of-area results", e2e.searchOcean.some(t => /Ocean Beach/.test(t) && /San Francisco/.test(t)) && !e2e.searchOcean.some(t => /San Diego|, NY|, NJ/.test(t)), e2e.searchOcean));
  checks.push(check("End to end: no page errors and no sideways scrolling on a phone", e2e.errors.length === 0 && e2e.scrollWidth <= 390, { errors: e2e.errors, scrollWidth: e2e.scrollWidth }));
  save("live.json", { checks, info });
  for (const c of checks) console.log(c.pass ? "PASS" : "FAIL", c.label, JSON.stringify(c.detail).slice(0, 400));
})().catch(e => { console.error(e); process.exit(1); });
