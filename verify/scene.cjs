// Check 6: the animated header scene (Pinchy, the snare, the sand) on the real page.
const fs = require("fs");
const path = require("path");
const { openSite, diffImages, save, check } = require("./lib.cjs");

const TH = { x: 1, y: 1, rot: 3, sx: .03, sy: .03, bob: .7, leg: 3, armL: 3, armR: 3, pinch: 3, dx: .8, dy: .8, pupilS: .05, wrap: .1 };

(async () => {
  const checks = [], info = {};

  // 6a. Loop seam and step handoffs, desktop and phone, light and dark.
  const seams = [], jumps = [], errorsSeen = [];
  for (const [w, h] of [[1280, 700], [390, 800]]) for (const scheme of ["light", "dark"]) {
    const site = await openSite({ viewport: { width: w, height: h }, colorScheme: scheme }); const { page } = site;
    await page.waitForTimeout(500);
    const bh = await page.evaluate(() => document.getElementById("band").getBoundingClientRect().height), clip = { x: 0, y: 0, width: w, height: Math.round(bh) };
    const cyc = await page.evaluate(() => __crabScene.cycle());
    const shot = async t => { await page.evaluate(t => __crabScene.draw(t), t); await page.waitForTimeout(50); return page.screenshot({ clip }); };
    const parts = () => page.evaluate(() => ["walker", "snare", "thought", "bang", "fishLine", "strand", "dome"].filter(id => getComputedStyle(document.getElementById(id)).visibility !== "hidden").concat([...document.querySelectorAll("#fx circle")].filter(c => getComputedStyle(c).visibility !== "hidden").map(() => "grain")));
    const a = await shot(0), pa = await parts(), z = await shot(cyc - 1e-6), pz = await parts();
    const df = await diffImages(page, a, z);
    seams.push({ width: w, scheme, cycleSeconds: +cyc.toFixed(2), visibleAtStart: pa, visibleAtEnd: pz, pixelsOverNoise: df.real, noisePixels: df.any, maxDifference: df.max });
    const flags = await page.evaluate(TH => {
      const cyc = __crabScene.cycle(), eps = 1e-4, out = []; let n = 0;
      for (const s of __crabScene.plan()) {
        const tb = s.t0, pre = __crabScene.draw(tb === 0 ? cyc - eps : tb - eps), post = __crabScene.draw(tb + eps);
        for (const part of ["crab", "snare"]) { if (!pre[part].vis || !post[part].vis) continue;
          for (const k of Object.keys(TH)) { if (pre[part][k] == null) continue; n++; const d = Math.abs(post[part][k] - pre[part][k]); if (d > TH[k]) out.push(`${pre.name} -> ${post.name}: ${part}.${k} jumps ${d.toFixed(2)}`); } }
      }
      return { n, out };
    }, TH);
    jumps.push({ width: w, scheme, compared: flags.n, jumps: flags.out });
    errorsSeen.push(...site.errors);
    await site.close();
  }
  info.seams = seams; info.jumps = jumps;
  checks.push(check("Loop seam: at the start and end of the loop no scene part is visible, and the two frames differ only by anti-aliasing noise (≤ 24 of 255 levels), phone and desktop, light and dark",
    seams.every(s => s.visibleAtStart.length === 0 && s.visibleAtEnd.length === 0 && s.pixelsOverNoise === 0), seams));
  checks.push(check("Handoffs: no pose value jumps between steps (position ≤ 1 px, angles ≤ 3°) at all 13 boundaries", jumps.every(j => j.jumps.length === 0), jumps.map(j => `${j.width}px ${j.scheme}: ${j.compared} compared, ${j.jumps.length} jumps ${j.jumps.join("; ")}`)));

  // 6b. Real time: runs for a few seconds with no page errors and actually moves.
  {
    const site = await openSite({ viewport: { width: 1280, height: 700 } }); const { page } = site;
    const before = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 345 } }); await page.waitForTimeout(2500);
    const after = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 345 } }); await page.waitForTimeout(1500);
    const moved = await diffImages(page, before, after);
    info.running = { moved: moved.real > 0, pixelsChanged: moved.real, errors: site.errors };
    checks.push(check("Real time: the scene moves on its own and raises no page errors", info.running.moved && site.errors.length === 0, info.running));
    await site.close();
  }

  // 6c. Reduced motion and the pause control.
  {
    const r = {};
    let site = await openSite({ viewport: { width: 1280, height: 700 }, reducedMotion: "reduce" }); let page = site.page;
    r.reducedLabel = await page.textContent("#animToggle");
    const s1 = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 345 } }); await page.waitForTimeout(900);
    r.reducedStill = (await diffImages(page, s1, await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 345 } }))).real === 0;
    await page.click("#animToggle"); await page.waitForTimeout(900);
    r.playLabel = await page.textContent("#animToggle");
    r.playMoves = (await diffImages(page, s1, await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 345 } }))).real > 0;
    await site.close();
    site = await openSite({ viewport: { width: 1280, height: 700 } }); page = site.page;
    await page.click("#animToggle"); r.pausedLabel = await page.textContent("#animToggle");
    const p1 = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 345 } }); await page.waitForTimeout(900);
    r.pauseHolds = (await diffImages(page, p1, await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 345 } }))).real === 0;
    r.saved = await page.evaluate(() => localStorage.getItem("pt-anim"));
    await page.reload(); await page.waitForFunction(() => typeof dayData === "function"); await page.waitForTimeout(400);
    r.afterReload = await page.textContent("#animToggle");
    await site.close();
    info.motion = r;
    checks.push(check("Reduced motion: the scene stands still and offers 'Play Pinchy', which starts it", r.reducedLabel === "Play Pinchy" && r.reducedStill && r.playLabel === "Pause Pinchy" && r.playMoves, r));
    checks.push(check("Pause control: 'Pause Pinchy' freezes the scene, and the choice is remembered after a reload", r.pausedLabel === "Play Pinchy" && r.pauseHolds && r.saved === "off" && r.afterReload === "Play Pinchy", r));
  }

  // 6d. The scene never blocks the page, and on desktop it stays clear of the header text and controls.
  {
    const res = { blocked: [], overlaps: [] };
    for (const w of [1024, 1280, 1440]) {
      const site = await openSite({ viewport: { width: w, height: 800 } }); const { page } = site;
      const r = await page.evaluate(() => {
        const blocked = [...document.querySelectorAll("#stage, #stage *")].filter(e => getComputedStyle(e).pointerEvents !== "none").map(e => e.id || e.tagName);
        const rect = e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
        const hit = (a, b, pad = 2) => a.l < b.r - pad && a.r > b.l + pad && a.t < b.b - pad && a.b > b.t + pad;
        const targets = [...document.querySelectorAll(".brand h1, .brand p, .datebar > *, #bubble")].map(e => [e.id || e.className || e.tagName, rect(e)]);
        const overlaps = new Set(), cyc = __crabScene.cycle();
        for (let t = 0; t < cyc; t += .1) {
          __crabScene.draw(t);
          for (const id of ["walker", "snare", "thought", "bang"]) { const el = document.getElementById(id); if (getComputedStyle(el).visibility === "hidden") continue; const b = rect(el); for (const [name, tr] of targets) if (hit(b, tr)) overlaps.add(`${id} over ${name} at ${t.toFixed(1)}s`); }
        }
        return { blocked, overlaps: [...overlaps].slice(0, 6) };
      });
      res.blocked.push(...r.blocked); res.overlaps.push(...r.overlaps.map(o => `${w}px: ${o}`)); await site.close();
    }
    info.layout = res;
    checks.push(check("The scene never captures clicks (every scene element ignores the pointer)", res.blocked.length === 0, res.blocked));
    checks.push(check("Desktop (1024, 1280, 1440 px): Pinchy, the snare and his bubbles never cross the title, text, date controls or speech bubble", res.overlaps.length === 0, res.overlaps));
  }

  save("scene.json", { checks, info });
  for (const c of checks) console.log(c.pass ? "PASS" : "FAIL", c.label, JSON.stringify(c.detail).slice(0, 300));
  if (errorsSeen.length) console.log("page errors:", errorsSeen);
  process.exit(checks.every(c => c.pass) && !errorsSeen.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
