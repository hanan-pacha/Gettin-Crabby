// Shared helpers for the verification scripts. See verify/README.md.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "results");
fs.mkdirSync(OUT, { recursive: true });
const UA = "GettinCrabby-verify/1.0";

// Serves docs/ (the published site) on a random local port.
function serve(dir) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r(srv)));
}

// Opens the built site in headless Chromium. By default every outside request is blocked,
// so results come only from the shipped code and its built-in data.
async function openSite(opts = {}) {
  const srv = await serve(path.join(ROOT, "docs"));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ timezoneId: opts.timezoneId || "America/Los_Angeles", viewport: opts.viewport || { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  if (opts.route) await page.route(() => true, opts.route(base));
  else await page.route(u => !u.href.startsWith(base), r => r.abort());
  await page.goto(base + "/" + (opts.hash || ""));
  await page.waitForFunction(() => typeof dayData === "function" && typeof STATIONS !== "undefined");
  return { page, base, errors, close: async () => { await browser.close(); srv.close(); } };
}

// HTTP GET through curl (it already uses this machine's proxy and CA settings).
function get(url, { headers = [], timeout = 40 } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-sS", "-L", "-m", String(timeout), "-A", UA, "-i"];
    for (const h of headers) args.push("-H", h);
    args.push(url);
    execFile("curl", args, { maxBuffer: 64 * 1024 * 1024, encoding: "buffer" }, (err, stdout) => {
      if (err) return reject(err);
      let buf = stdout, status = 0, head = {};
      for (;;) {                                   // skip redirect and 100-continue header blocks
        const s = buf.indexOf("\r\n\r\n"); if (s < 0) break;
        const block = buf.slice(0, s).toString("latin1");
        if (!/^HTTP\//.test(block)) break;
        status = +block.split(" ")[1]; head = {};
        for (const line of block.split("\r\n").slice(1)) { const i = line.indexOf(":"); if (i > 0) head[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim(); }
        buf = buf.slice(s + 4);
        if (!/^HTTP\//.test(buf.slice(0, 5).toString("latin1"))) break;
      }
      resolve({ status, headers: head, body: buf.toString("utf8") });
    });
  });
}
async function getJSON(url, o) {
  const r = await get(url, o);
  try { return { ...r, json: JSON.parse(r.body) }; } catch (e) { return { ...r, json: null }; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Runs async jobs with limited concurrency.
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
// Summary statistics on absolute values.
function stats(xs) {
  const a = xs.map(Math.abs).sort((p, q) => p - q), n = a.length;
  if (!n) return { n: 0 };
  const q = f => a[Math.min(n - 1, Math.floor(f * (n - 1) + 0.5))];
  const r = x => Math.round(x * 1000) / 1000;
  return { n, mean: r(a.reduce((s, x) => s + x, 0) / n), median: r(q(0.5)), p95: r(q(0.95)), max: r(a[n - 1]),
    bias: r(xs.reduce((s, x) => s + x, 0) / n) };
}
function ymdList(a, b) {
  const out = []; let d = new Date(a + "T12:00:00Z");
  const end = new Date(b + "T12:00:00Z");
  while (d <= end) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  return out;
}
function save(name, data) { fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1)); }
function check(label, pass, detail) { return { label, pass: !!pass, detail }; }

module.exports = { ROOT, OUT, openSite, get, getJSON, sleep, pool, stats, ymdList, save, check };
