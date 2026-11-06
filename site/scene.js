/* Gettin’ Crabby! header scene: Pinchy, the squid-packed snare and the sand, placed by script from the time t.
   Built from site/scene.js by site/build.mjs. Every step starts on the pose the last one ended on, and the loop ends exactly where it starts. */
(function () {
"use strict";

const $ = id => document.getElementById(id);
const PACE = 1.3;   // how much slower than the first version (1 = original speed)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a) * u, mod = (a, n) => ((a % n) + n) % n;
const E = {
  out3: u => 1 - Math.pow(1 - u, 3), out2: u => 1 - (1 - u) * (1 - u), in2: u => u * u,
  smooth: u => u * u * (3 - 2 * u), io: u => u < .5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u),
  back: u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};

/* ================= drawings ================= */
const TONES = [["#f8e0d8", "#d99f95", "#c98a80"], ["#f3c9c1", "#cf8c83", "#b8736a"], ["#faeee7", "#dcb5ab", "#cc988e"], ["#efbeb3", "#c97f75", "#ae665d"]];
// One squid, head on the left, centered on (0,0) after the translate. s = scale.
function squidG(tone, x, y, rot, s) {
  const [f, e, sp] = TONES[tone];
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-16 -5)">
    <g fill="none" stroke="${e}" stroke-width=".95" stroke-linecap="round"><path d="M7 4.2q-2-1.7-3.9-.9"/><path d="M7 4.8q-2.4-.7-4.5.1"/><path d="M7 5.3q-2.4.7-4.4 1.6"/><path d="M7 5.8q-2 1.6-3.7 2.5"/><path d="M7 4.5q-3.4-2.7-6.4-2.3"/><path d="M7 5.5q-3.4 2.5-6.6 2.7"/></g>
    <g fill="${e}"><ellipse cx=".5" cy="2.2" rx="1.1" ry=".7"/><ellipse cx=".3" cy="8.2" rx="1.1" ry=".7"/></g>
    <path d="M24.2 5L27.6 1.3L31.2 5L27.6 8.7Z" fill="${f}" stroke="${e}" stroke-width=".55"/>
    <path d="M9.6 3.1Q20 2 30.6 5Q20 8 9.6 6.9Z" fill="${f}" stroke="${e}" stroke-width=".6"/>
    <ellipse cx="8.6" cy="5" rx="2.3" ry="2" fill="${f}" stroke="${e}" stroke-width=".5"/>
    <circle cx="8.4" cy="4.5" r=".9" fill="#12202a"/>
    <g fill="${sp}" opacity=".6"><circle cx="14.5" cy="4.2" r=".75"/><circle cx="18" cy="5.7" r=".65"/><circle cx="21.5" cy="4.4" r=".7"/><circle cx="24.6" cy="5.5" r=".5"/></g></g>`;
}
// The snare: six nylon loops, a swivel and ring for the line, and a bait cage packed to the brim with squid.
const SN = { vw: 72, vh: 72, ringX: 36, ringY: 5.5 };
function snareSvg(w) {
  const h = Math.round(w * SN.vh / SN.vw);
  let loops = ""; for (const a of [-70, -40, -12, 12, 40, 70]) { const r = a * Math.PI / 180, cx = 36 + 21 * Math.sin(r), cy = 38 - 21 * Math.cos(r); loops += `<ellipse${a === -70 ? ' class="lcap"' : ""} cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="4.8" ry="8.8" transform="rotate(${a} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`; }
  let mesh = ""; for (const x of [22, 30, 38, 46, 54]) mesh += `<path d="M${x} 38V64"/>`;
  const pile = [[28, 61, -4, 1.3, 0], [45, 58, 6, 1.25, 2], [29, 52, 5, 1.3, 1], [45, 48, -7, 1.25, 3], [29, 43, -6, 1.3, 2], [45, 39, 8, 1.25, 0], [24, 34, -20, 1.2, 3], [48, 33, 17, 1.2, 2], [36, 30, -2, 1.3, 1]];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${SN.vw} ${SN.vh}">
    <defs><clipPath id="pile"><rect x="13" y="16" width="46" height="48"/></clipPath></defs>
    <path d="M36 30V7" stroke="var(--cage)" stroke-width="1.4" fill="none"/>
    <g fill="none" stroke="var(--loop)" stroke-width="1.7" opacity=".97">${loops}</g>
    <circle cx="${SN.ringX}" cy="${SN.ringY}" r="2.3" fill="none" stroke="var(--loop)" stroke-width="1.5"/>
    <rect x="14" y="38" width="44" height="26" rx="4" fill="#22313a"/>
    <g clip-path="url(#pile)">${pile.map(p => squidG(p[4], p[0], p[1], p[2], p[3])).join("")}</g>
    <g stroke="var(--cage)" stroke-width="1" opacity=".6" fill="none">${mesh}<path d="M14 51H58M14 58H58"/></g>
    <rect x="14" y="38" width="44" height="26" rx="4" fill="none" stroke="var(--cage)" stroke-width="2.3"/>
    <path d="M12 38H60" stroke="var(--cage)" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="36" cy="66.2" rx="12" ry="2.4" fill="var(--cage)"/>
  </svg>`;
}
// Pinchy: every moving part is a named group so the script can set its angle from the time t.
function crabSvg(size) {
  const top = x => 58 - 20 * Math.sqrt(Math.max(0, 1 - ((x - 60) / 40) ** 2));
  let bumps = ""; for (let x = 25; x <= 95; x += 7.8) bumps += `<circle cx="${x.toFixed(1)}" cy="${(top(x) + 1.6).toFixed(1)}" r="3.5"/>`;
  const leg = ([x, y, dx, dy]) => `<path d="M${x} ${y}q${(dx * .6).toFixed(1)} ${(dy * .1 - 4).toFixed(1)} ${dx} ${dy}"/><path d="M${120 - x} ${y}q${(-dx * .6).toFixed(1)} ${(dy * .1 - 4).toFixed(1)} ${-dx} ${dy}"/>`;
  const L = [[30, 66, -15, 4], [33, 70, -14, 10], [38, 73, -11, 15], [45, 75, -6, 18]];
  const claw = (cx, cy, rot) => `<g transform="translate(${cx} ${cy}) rotate(${rot})"><ellipse rx="9.5" ry="7.5" fill="var(--crab)"/>
    <g class="f1"><ellipse cx="-4.6" cy="-8" rx="3.7" ry="6.6" transform="rotate(-18 -4.6 -8)" fill="var(--crab)"/><circle cx="-6.2" cy="-13.2" r="2.4" fill="var(--claw)"/></g>
    <g class="f2"><ellipse cx="4.6" cy="-9" rx="3.9" ry="7.2" transform="rotate(16 4.6 -9)" fill="var(--crab)"/><circle cx="6.8" cy="-15.2" r="2.5" fill="var(--claw)"/></g>
    <ellipse cx="-2.5" cy="-1.5" rx="3" ry="2" fill="#fff" opacity=".22"/></g>`;
  const eye = x => `<circle cx="${x}" cy="27" r="6.8" fill="#fff" stroke="var(--crab-dark)" stroke-width="1.4"/>`;
  const star = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-5L1.3-1.3 5 0 1.3 1.3 0 5-1.3 1.3-5 0-1.3-1.3Z" fill="var(--sun)"/>`;
  const wl = (cx, cy, rx, ry, rot) => `<ellipse class="wl" data-c="${cx},${cy}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="var(--loop)" stroke-width="2.4" visibility="hidden"/>`;
  return `<svg width="${size}" height="${Math.round(size * 96 / 136)}" viewBox="-8 0 136 96">
    <g class="sparkle" visibility="hidden">${star(22, 12, 1)}${star(100, 8, .8)}</g>
    <g class="root">
      <g fill="none" stroke="var(--crab-dark)" stroke-width="4.2" stroke-linecap="round"><g class="legsA">${leg(L[0])}${leg(L[2])}</g><g class="legsB">${leg(L[1])}${leg(L[3])}</g></g>
      <g stroke="var(--crab-dark)" stroke-width="3.4" stroke-linecap="round"><path d="M52 45L49.5 31"/><path d="M68 45L70.5 31"/></g>
      <ellipse cx="60" cy="58" rx="40" ry="20" fill="var(--crab)"/><g fill="var(--crab)">${bumps}</g>
      <path d="M24 62q36 22 72 0q-4 14-36 16q-32-2-36-16z" fill="var(--crab-dark)" opacity=".28"/>
      <ellipse cx="45" cy="48" rx="12" ry="4" fill="#fff" opacity=".2"/>
      ${eye(49.5)}${eye(70.5)}
      <g class="pupils"><g class="pL"><circle cx="50.3" cy="28" r="3.5" fill="var(--pupil)"/><circle cx="51.5" cy="26" r="1.4" fill="#fff"/></g><g class="pR"><circle cx="71.3" cy="28" r="3.5" fill="var(--pupil)"/><circle cx="72.5" cy="26" r="1.4" fill="#fff"/></g></g>
      <ellipse cx="41" cy="61" rx="5.2" ry="3.1" fill="var(--cheek)" opacity=".75"/><ellipse cx="79" cy="61" rx="5.2" ry="3.1" fill="var(--cheek)" opacity=".75"/>
      <path class="mSmile" d="M53.5 60q6.5 6.5 13 0" fill="none" stroke="var(--pupil)" stroke-width="2.3" stroke-linecap="round"/>
      <g class="mGrin" visibility="hidden"><path d="M52.5 59q7.5 10 15 0z" fill="var(--pupil)"/><path d="M56.2 62.4q3.8 2.4 7.6 0" fill="var(--cheek)"/></g>
      <ellipse class="mOh" cx="60" cy="62.5" rx="3.3" ry="4" fill="var(--pupil)" visibility="hidden"/>
      <g class="armL"><path d="M24 55Q12 51 13 41" fill="none" stroke="var(--crab)" stroke-width="5.5" stroke-linecap="round"/>${claw(13, 34, -12)}</g>
      <g class="armR"><path d="M96 55Q108 51 107 41" fill="none" stroke="var(--crab)" stroke-width="5.5" stroke-linecap="round"/>${claw(107, 34, 12)}${wl(109, 30, 12.5, 16, 12)}
        <g class="held" visibility="hidden">${squidG(1, 111, 14, 78, .6)}</g></g>
    </g></svg>`;
}
function popSvg(kind, w) {
  if (kind === "squid") return `<svg width="${w}" height="${Math.round(w * .78)}" viewBox="0 0 60 47"><g fill="#fbfcfc" stroke="#cfdadd" stroke-width="1"><circle cx="30" cy="19" r="15"/><circle cx="16" cy="22" r="10"/><circle cx="44" cy="22" r="10"/><circle cx="22" cy="12" r="9"/><circle cx="38" cy="11" r="9"/><circle cx="14" cy="38" r="3.4"/><circle cx="8" cy="44" r="2"/></g>
    <g fill="#fbfcfc"><circle cx="30" cy="19" r="14"/><circle cx="16" cy="22" r="9"/><circle cx="44" cy="22" r="9"/><circle cx="22" cy="12" r="8"/><circle cx="38" cy="11" r="8"/></g>${squidG(1, 30, 18, -12, .78)}</svg>`;
  return "";
}

/* ================= scene ================= */
const band = $("band"), walker = $("walker"), snare = $("snare"), thought = $("thought"), bangEl = $("bang"), fx = $("fx"),
  shoreEl = $("shore"), lineP = $("fishLine"), fade = $("fade"), sandSvg = $("sandSvg"), sandCover = $("sandCover"), dome = $("dome"), domeSvg = $("domeSvg");
let W = 0, H = 0, crabW = 0, crabH = 0, snareW = 0, snareH = 0, snareX = 0, emergeX = 0, reachX = 0, A = { x: 0, y: 0 }, P0 = { x: 0, y: 0 };
let surf = [], plan = [], cycle = 0, seg = {}, GR = [], grainEls = [], cp = {}, lcap = null;
const strandEl = document.getElementById("strand");

function buildShore() {
  const len = shoreEl.getTotalLength(), pts = [];
  for (let i = 0; i <= 400; i++) { const p = shoreEl.getPointAtLength(len * i / 400); if (p.y < 89) pts.push(p); }
  pts.sort((a, b) => a.x - b.x);
  surf = pts.map(p => [p.x / 1440 * W, H - 64 + p.y / 90 * 64]);
}
function shoreY(x) {
  if (!surf.length) return H - 30;
  if (x <= surf[0][0]) return surf[0][1];
  for (let i = 1; i < surf.length; i++) if (x <= surf[i][0]) { const [x0, y0] = surf[i - 1], [x1, y1] = surf[i]; return y0 + (y1 - y0) * (x - x0) / ((x1 - x0) || 1); }
  return surf[surf.length - 1][1];
}
const footY = x => shoreY(x) + crabH * .1;           // where Pinchy's feet touch the sand

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function burst(t, x, y, n, speed, up, size, seed, spread = 0) {
  const r = mulberry(seed);
  for (let k = 0; k < n; k++) { const a = (r() - .5) * Math.PI * .95, v = speed * (.45 + r() * .75);
    GR.push({ t, x: x + (r() - .5) * spread, y, vx: Math.sin(a) * v, vy: -Math.cos(a) * v * up - r() * speed * .25, r: size * (.6 + r() * .7), life: .5 + r() * .35 }); }
}

function buildPlan() {
  const speed = clamp(W / 9, 70, 130);
  emergeX = Math.max(crabW * .8, W * .2);
  snareX = Math.round(W * (W < 600 ? .64 : .6));
  reachX = snareX - snareW * .5 - crabW * .22;
  const attachOff = snareH * SN.ringY / SN.vh;
  const ys0 = footY(snareX) - snareH * (68.6 / SN.vh);
  P0 = { x: snareX, y: ys0 + attachOff };
  A = { x: snareX + Math.max(70, W * .09), y: -110 };
  const walkDur = Math.max(1.2, (reachX - emergeX) / speed);
  const S = [["bump", .6], ["emerge", .85], ["shake", .6], ["look", .4], ["cast", .9], ["land", .45], ["want", .85], ["walk", walkDur], ["reach", .5], ["grab", .35], ["snap", .3], ["haul", 1.55], ["gap", .6]];
  let t = 0; plan = S.map(([name, dur]) => { const s = { name, dur: dur * PACE, t0: t }; t += dur * PACE; return s; }); cycle = t;
  seg = Object.fromEntries(plan.map(s => [s.name, s]));
  GR = []; const fy = footY(emergeX);
  burst(seg.bump.t0 + .1, emergeX, fy, 6, 110, 1, 2.4, 11); burst(seg.bump.t0 + .45, emergeX, fy, 7, 120, 1, 2.6, 12);
  burst(seg.emerge.t0 + .12, emergeX, fy, 14, 190, 1.1, 3, 13, crabW * .3); burst(seg.emerge.t0 + .45, emergeX, fy, 9, 140, 1, 2.6, 14, crabW * .5);
  burst(seg.shake.t0 + .02, emergeX, fy - crabH * .75, 11, 120, .5, 2.6, 15, crabW * .6); burst(seg.shake.t0 + .3, emergeX, fy - crabH * .6, 8, 100, .4, 2.4, 16, crabW * .6);
  burst(seg.land.t0, snareX, footY(snareX), 14, 170, 1, 3, 17, snareW * .6);
  fx.innerHTML = GR.map(() => `<circle r="2" fill="var(--sand)" visibility="hidden"/>`).join(""); grainEls = [...fx.children];
}

function layout() {
  W = band.clientWidth; H = band.clientHeight;
  crabW = Math.round(clamp(W * .085, 70, 108)); crabH = Math.round(crabW * 96 / 136);
  snareW = Math.round(crabW * .74); snareH = Math.round(snareW * SN.vh / SN.vw);
  walker.innerHTML = crabSvg(crabW); snare.innerHTML = snareSvg(snareW);
  const q = s => walker.querySelector(s);
  cp = { root: q(".root"), legsA: q(".legsA"), legsB: q(".legsB"), armL: q(".armL"), armR: q(".armR"), pupils: q(".pupils"), pL: q(".pL"), pR: q(".pR"),
    smile: q(".mSmile"), grin: q(".mGrin"), oh: q(".mOh"), held: q(".held"), sparkle: q(".sparkle"), wl: [...walker.querySelectorAll(".wl")],
    f: [...walker.querySelectorAll(".armL .f1, .armL .f2, .armR .f1, .armR .f2")] };
  thought.innerHTML = popSvg("squid", Math.round(crabW * .66)); lcap = snare.querySelector(".lcap");
  buildShore(); buildPlan();
  sandSvg.style.transform = `translateY(${crabH * .1}px)`;
  const stops = document.querySelectorAll("#fade stop"), al = W < 600 ? [.55, .05] : [.9, .25];   // on a phone the line fades out quickly so it never fights the text
  stops[0].setAttribute("stop-opacity", al[0]); stops[1].setAttribute("stop-opacity", al[1]);
  domeSvg.setAttribute("width", W); domeSvg.setAttribute("height", H);
  fx.setAttribute("width", W); fx.setAttribute("height", H);
}

/* ---- drawing one moment ---- */
function setCrab(c) {
  const sc = crabW / 136;
  cp.root.setAttribute("transform", `translate(0 ${(c.bob || 0).toFixed(2)})`);
  const ph = c.phase || 0, amp = c.legAmp == null ? 12 : c.legAmp;
  cp.legsA.setAttribute("transform", `rotate(${(amp * Math.sin(ph)).toFixed(2)} 60 64)`);
  cp.legsB.setAttribute("transform", `rotate(${(-amp * Math.sin(ph)).toFixed(2)} 60 64)`);
  cp.armL.setAttribute("transform", `rotate(${(c.armL || 0).toFixed(2)} 24 55)`);
  cp.armR.setAttribute("transform", `rotate(${(c.armR || 0).toFixed(2)} 96 55)`);
  const pn = c.pinch || 0;
  cp.f[0].setAttribute("transform", `rotate(${pn} 0 -3)`); cp.f[1].setAttribute("transform", `rotate(${-pn} 0 -3)`);
  cp.f[2].setAttribute("transform", `rotate(${pn} 0 -3)`); cp.f[3].setAttribute("transform", `rotate(${-pn} 0 -3)`);
  const ps = c.pupilS == null ? 1 : c.pupilS;
  cp.pL.setAttribute("transform", `translate(${(c.dx || 0) + 50.3 * (1 - ps)} ${(c.dy || 0) + 28 * (1 - ps)}) scale(${ps})`);
  cp.pR.setAttribute("transform", `translate(${(c.dx || 0) + 71.3 * (1 - ps)} ${(c.dy || 0) + 28 * (1 - ps)}) scale(${ps})`);
  const m = c.mouth || "smile";
  const V = on => on ? "inherit" : "hidden";   // "inherit", so a hidden crab stays hidden
  cp.smile.setAttribute("visibility", V(m === "smile")); cp.grin.setAttribute("visibility", V(m === "grin")); cp.oh.setAttribute("visibility", V(m === "oh"));
  cp.sparkle.setAttribute("visibility", V(c.sparkle));
  cp.held.setAttribute("visibility", V(c.held));
  const k = c.wrap || 0;
  for (const el of cp.wl) {
    if (k <= 0) { el.setAttribute("visibility", "hidden"); continue; }
    const [cx, cy] = el.dataset.c.split(","), s = 1 + (1 - k) * .9;
    el.setAttribute("visibility", "inherit"); el.setAttribute("opacity", Math.min(1, k * 3).toFixed(2));
    el.setAttribute("transform", `translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy}) ${el.getAttribute("transform").replace(/translate\([^)]*\) scale\([^)]*\) translate\([^)]*\) /, "")}`);
  }
}
const Rot = (a, v) => { const r = a * Math.PI / 180, co = Math.cos(r), si = Math.sin(r); return { x: v.x * co - v.y * si, y: v.x * si + v.y * co }; };
const cPx = (x, y) => ({ x: (x + 8) * crabW / 136, y: y * crabW / 136 });   // a point in the crab drawing -> pixels in its box
// centre of the loop on the near claw for arm angle th
const clawLoop = th => { const sh = cPx(96, 55), cl = cPx(109, 30), r = Rot(th, { x: cl.x - sh.x, y: cl.y - sh.y }); return { x: sh.x + r.x, y: sh.y + r.y }; };
const standMap = (p, x, topY, rot) => { const r = Rot(rot, { x: p.x - crabW / 2, y: p.y - crabH }); return { x: x + r.x, y: topY + crabH + r.y }; };
const crabHangCss = (Gw, phi, Gc) => `translate(${Gw.x.toFixed(2)}px, ${Gw.y.toFixed(2)}px) rotate(${phi.toFixed(2)}deg) translate(${(-Gc.x).toFixed(2)}px, ${(-Gc.y).toFixed(2)}px)`;
function crabCss(x, topY, rot, sx, sy, mv) {
  let s = `translate(${(x - crabW / 2).toFixed(2)}px, ${topY.toFixed(2)}px) translate(${crabW / 2}px, ${crabH}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) translate(${-crabW / 2}px, ${-crabH}px)`;
  if (mv) s = `translate(${mv.px.toFixed(2)}px, ${mv.py.toFixed(2)}px) rotate(${mv.a.toFixed(2)}deg) translate(${(-mv.px).toFixed(2)}px, ${(-mv.py).toFixed(2)}px) translate(${mv.dx.toFixed(2)}px, ${mv.dy.toFixed(2)}px) ` + s;
  return s;
}
function snareCss(P, psi, sx, sy) {   // pivot = where the line ties on
  const aw = snareW / 2, ah = snareH * SN.ringY / SN.vh;
  return `translate(${P.x.toFixed(2)}px, ${P.y.toFixed(2)}px) rotate(${psi.toFixed(2)}deg) translate(${-aw}px, ${-ah}px) translate(${aw}px, ${snareH}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) translate(${-aw}px, ${-snareH}px)`;
}
function setLine(P, tension) {
  const dx = P.x - A.x, dy = P.y - A.y, d = Math.hypot(dx, dy), sag = d * .17 * (1 - tension);
  lineP.setAttribute("d", `M${A.x.toFixed(1)} ${A.y.toFixed(1)} Q${((P.x + A.x) / 2 + sag * .25).toFixed(1)} ${((P.y + A.y) / 2 + sag).toFixed(1)} ${P.x.toFixed(1)} ${P.y.toFixed(1)}`);
  fade.setAttribute("x1", P.x); fade.setAttribute("y1", P.y); fade.setAttribute("x2", A.x); fade.setAttribute("y2", Math.max(0, A.y * .2));
}
function pop(el, x, y, on, k = 1) { el.style.visibility = on && k > .01 ? "visible" : "hidden"; if (on) el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${k.toFixed(3)})`; }

function draw(t) {
  t = mod(t, cycle);
  const s = plan.find(p => t >= p.t0 && t < p.t0 + p.dur) || plan[plan.length - 1], u = clamp((t - s.t0) / s.dur, 0, 1), n = s.name;
  const stride = crabW * .26;
  // ---- Pinchy ----
  const c = { vis: true, x: emergeX, dy: 0, lift: 0, rot: 0, sx: 1, sy: 1, bob: 0, phase: 0, armL: 0, armR: 0, dx: 0, dy2: 0, mouth: "smile", pinch: 0, wrap: 0, held: false, sparkle: false, pupilS: 1 };
  let snareP = { ...P0 }, snareVis = false, snareRot = 0, ssx = 1, ssy = 1, tension = .12, mv = null, hang = null, overlay = false, domeH = 0, bangOn = false, thoughtOn = false;
  const idle = (extra = 0) => { c.armL = -8 + extra; c.armR = 8 - extra; };
  const flightP = sU => ({ x: lerp(W + 40, snareX, E.out3(sU)), y: lerp(8, P0.y, sU * sU) });
  if (t >= seg.cast.t0) snareVis = true;
  if (t >= seg.haul.t0 + seg.haul.dur) snareVis = false;
  const track = f => ({ dx: clamp((f.x - emergeX) / (W * .22), -1, 1) * 2.7, dy: clamp((f.y - (footY(emergeX) - crabH * .6)) / (H * .5), -1, 1) * 2.2 });   // eyes follow the snare
  const xS = reachX + 4, Gw0 = standMap(clawLoop(60), xS, footY(xS) - crabH, 3.5);   // where the near claw sits when the loop closes
  const walkEnd = (reachX - emergeX) / stride * Math.PI * 2, wAL = -8 + Math.sin(walkEnd) * 4, wAR = 8 - Math.sin(walkEnd) * 4;
  switch (n) {
    case "bump": c.vis = false; { const g = E.back(clamp(u * 1.5, 0, 1)); domeH = crabH * .26 * g * (1 + Math.sin(u * 46) * .1 * (1 - u)); } break;
    case "emerge": { const r = E.out3(u), fd = 1 - E.smooth(u); c.dy = (1 - r) * crabH * 1.12; domeH = crabH * .26 * (1 - E.smooth(clamp((u - .15) / .5, 0, 1)));
      c.armL = lerp(58, -8, r); c.armR = lerp(-58, 8, r); c.dx = Math.sin(u * 7) * 2.3 * fd; c.dy2 = Math.sin(u * 5 + 1) * fd; c.mouth = u > .5 ? "smile" : "oh"; } break;
    case "shake": { const d = 1 - u; c.x = emergeX + Math.sin(u * 70) * 3.4 * d * crabW / 94; c.rot = Math.sin(u * 70) * 3.6 * d; idle(Math.sin(u * Math.PI * 14) * 11); c.mouth = "grin"; c.dx = Math.sin(u * 30) * 1.6 * d; } break;
    case "look": { const k = E.out3(clamp(u * 2.5, 0, 1)); idle(); c.dx = lerp(0, 2.7, k); c.dy2 = lerp(0, -2.2, k); c.rot = 1.5 * E.smooth(u); c.armR = lerp(8, 20, E.smooth(u)); } break;
    case "cast": { const f = flightP(u), tr = track(f); snareP = f; snareRot = -62 * Math.pow(1 - u, 2); tension = lerp(.1, .45, u);
      idle(); c.armR = lerp(20, 8, E.smooth(u)); c.rot = lerp(1.5, 0, E.smooth(u)); c.dx = tr.dx; c.dy2 = tr.dy; } break;
    case "land": { snareRot = 7 * Math.sin(u * 17) * Math.pow(1 - u, 2); const q = Math.sin(clamp(u * 2.2, 0, 1) * Math.PI); ssy = 1 - .15 * q; ssx = 1 + .08 * q; tension = .12;
      const tr = track(P0); c.lift = Math.sin(clamp(u * 2, 0, 1) * Math.PI) * 8; idle(); c.dx = tr.dx; c.dy2 = lerp(tr.dy, .5, E.smooth(clamp(u * 3, 0, 1))); c.mouth = "oh"; bangOn = u > .06 && u < .98; c.pupilS = 1 + .1 * Math.sin(clamp(u * 2, 0, 1) * Math.PI); } break;
    case "want": { thoughtOn = true; c.lift = Math.abs(Math.sin(u * Math.PI * 3)) * 5; idle(Math.sin(u * Math.PI * 12) * 9); c.dx = 2.7; c.dy2 = .5; c.mouth = "grin"; c.sparkle = true; } break;
    case "walk": { const e = .5 * u + .5 * E.smooth(u); c.x = lerp(emergeX, reachX, e); c.phase = (c.x - emergeX) / stride * Math.PI * 2; c.bob = -2.4 * Math.abs(Math.sin(c.phase));
      c.armL = -8 + Math.sin(c.phase) * 4; c.armR = 8 - Math.sin(c.phase) * 4; c.dx = 2.7; c.dy2 = .5; c.mouth = "grin"; thoughtOn = u < .12; } break;
    case "reach": { c.x = reachX; const r = E.out3(u), g = 1 - E.smooth(clamp(u / .3, 0, 1)); c.phase = walkEnd; c.legAmp = 12 * g; c.bob = -2.4 * Math.abs(Math.sin(walkEnd)) * g;
      c.armR = lerp(wAR, 60, r); c.armL = lerp(wAL, -30, r); c.pinch = lerp(0, -9, r); c.rot = lerp(0, 3.5, r); c.x += lerp(0, 4, r); c.dx = 2.7; c.dy2 = lerp(.5, .9, r); c.mouth = "grin"; } break;
    case "grab": { c.x = reachX + 4; c.armR = 60 + Math.sin(u * Math.PI * 2) * 1.5; c.armL = -30; c.rot = 3.5; c.pinch = lerp(-9, 16, E.out3(clamp(u * 2.2, 0, 1))); c.held = u > .45; c.dx = 2.7; c.dy2 = .9; c.mouth = "grin"; c.sparkle = true; } break;
    case "snap": { c.x = reachX + 4; const k = E.out3(clamp(u * 2.4, 0, 1)), w = E.out3(clamp(u * 3, 0, 1)); c.wrap = k; c.armR = 60; c.armL = -30 + 8 * k; c.rot = 3.5; c.pinch = 16; c.held = true; c.mouth = "oh";
      c.dx = lerp(2.7, 0, w); c.dy2 = lerp(.9, 0, w); c.pupilS = lerp(1, .75, w); tension = lerp(.12, 1, E.out3(clamp(u * 5, 0, 1)));
      const j = Math.sin(clamp(u * 3.5, 0, 1) * Math.PI) * 3.5; snareP = { x: P0.x, y: P0.y - j }; bangOn = true;
      hang = { Gc: clawLoop(60), Gw: { x: Gw0.x, y: Gw0.y - j }, phi: 3.5 }; } break;
    case "haul": { c.x = reachX + 4; const e = .35 * u + .65 * E.in2(u), ang = 8 * Math.sin(u * 13) * Math.min(1, u * 6) * (1 - .3 * u), ramp = clamp(u * 7, 0, 1), sw = E.smooth(clamp((u - .04) / .4, 0, 1));
      const D = { x: (A.x - P0.x) * e, y: (A.y - P0.y) * e }, Pc = { x: P0.x + D.x, y: P0.y + D.y };
      snareP = Pc; snareRot = ang; tension = 1;
      const kick = (t - s.t0) * 27 / PACE; c.phase = kick; c.legAmp = 28 * ramp + 12 * (1 - ramp);
      c.armR = lerp(60, 18, sw) + Math.sin(kick * .8) * 7 * ramp; c.armL = -22 + Math.sin(kick * .8 + 2) * 24 * ramp;
      c.wrap = 1; c.held = true; c.pinch = 16; c.mouth = "oh"; c.pupilS = .75; c.dx = Math.sin(kick * .5) * 1.2 * ramp;
      const Gr = Rot(ang, { x: Gw0.x - P0.x, y: Gw0.y - P0.y });   // the claw rides along with the snare
      hang = { Gc: clawLoop(c.armR), Gw: { x: Pc.x + Gr.x, y: Pc.y + Gr.y }, phi: lerp(3.5, -56, sw) + ang + 6 * Math.sin(u * 11 + 1) * E.smooth(clamp((u - .2) / .3, 0, 1)) }; } break;
    case "gap": c.vis = false; break;
  }
  const fy = footY(c.x), topY = fy - crabH - c.lift + c.dy;
  walker.style.visibility = c.vis ? "visible" : "hidden";
  walker.style.transform = hang ? crabHangCss(hang.Gw, hang.phi, hang.Gc) : crabCss(c.x, topY, c.rot, c.sx, c.sy, null);
  setCrab({ ...c, dy: c.dy2 });
  // ---- snare + line ----
  snare.style.visibility = snareVis ? "visible" : "hidden";
  snare.style.transform = snareCss(snareP, snareRot, ssx, ssy);
  lineP.setAttribute("visibility", snareVis ? "visible" : "hidden");
  const caught = hang && c.wrap > 0;
  lcap.setAttribute("visibility", caught && c.wrap > .05 ? "hidden" : "inherit");
  if (caught) {
    const aw = snareW / 2, ah = snareH * SN.ringY / SN.vh, r = Rot(snareRot, { x: 17 / SN.vw * snareW - aw, y: 37 / SN.vh * snareH - ah });
    const S0 = { x: snareP.x + r.x, y: snareP.y + r.y }, G1 = hang.Gw, d = Math.hypot(G1.x - S0.x, G1.y - S0.y);
    strandEl.setAttribute("visibility", "visible"); strandEl.setAttribute("opacity", Math.min(1, c.wrap * 2).toFixed(2));
    strandEl.setAttribute("d", `M${S0.x.toFixed(1)} ${S0.y.toFixed(1)} Q${((S0.x + G1.x) / 2).toFixed(1)} ${((S0.y + G1.y) / 2 + d * .12 * (1 - tension)).toFixed(1)} ${G1.x.toFixed(1)} ${G1.y.toFixed(1)}`);
  } else strandEl.setAttribute("visibility", "hidden");
  if (snareVis) setLine(snareP, tension);
  // ---- sand, dust, bubbles ----
  if (domeH > .6) { const base = footY(emergeX), w = crabW * .42; dome.setAttribute("visibility", "visible"); dome.setAttribute("d", `M${emergeX - w} ${base} A${w} ${domeH} 0 0 1 ${emergeX + w} ${base} Z`); } else dome.setAttribute("visibility", "hidden");
  GR.forEach((g, i) => { const tau = (t - g.t) / PACE, el = grainEls[i]; if (tau < 0 || tau > g.life) { el.setAttribute("visibility", "hidden"); return; }
    el.setAttribute("visibility", "visible"); el.setAttribute("cx", (g.x + g.vx * tau).toFixed(1)); el.setAttribute("cy", (g.y + g.vy * tau + 520 * tau * tau).toFixed(1));
    el.setAttribute("r", (g.r * (1 - .45 * tau / g.life)).toFixed(2)); el.setAttribute("opacity", (1 - tau / g.life).toFixed(2)); });
  const age = (t0, t1) => clamp((t - t0) / .18, 0, 1), fadeOut = t1 => clamp((t1 - t) / .12, 0, 1);
  const tAge = thoughtOn ? E.back(age(seg.want.t0, 0)) * fadeOut(seg.walk.t0 + seg.walk.dur * .12) : 0;
  const bAge = bangOn ? (n === "land" ? E.back(age(seg.land.t0 + seg.land.dur * .06, 0)) * fadeOut(seg.land.t0 + seg.land.dur) : E.back(age(seg.snap.t0, 0)) * fadeOut(seg.snap.t0 + seg.snap.dur)) : 0;
  pop(thought, c.x + crabW * .3, topY - crabH * .42 + (thoughtOn ? Math.sin(t * 6 / PACE) * 1.5 : 0), thoughtOn, tAge);
  pop(bangEl, c.x + crabW * .12, topY - 18, bangOn, bAge);
  // The pose as numbers (px and degrees), so a test can check that nothing jumps between steps.
  const COM = cPx(60, 58); let ctr, tilt = c.rot;
  if (hang) { const v = Rot(hang.phi, { x: COM.x - hang.Gc.x, y: COM.y - hang.Gc.y }); ctr = { x: hang.Gw.x + v.x, y: hang.Gw.y + v.y }; tilt = hang.phi; } else ctr = standMap(COM, c.x, topY, c.rot);
  const ex = ctr.x, ey = ctr.y;
  return { name: n, u,
    crab: { vis: c.vis, x: ex, y: ey, rot: tilt, sx: c.sx, sy: c.sy, bob: (c.bob || 0), leg: (c.legAmp == null ? 12 : c.legAmp) * Math.sin(c.phase || 0), armL: c.armL, armR: c.armR, pinch: c.pinch, dx: c.dx, dy: c.dy2, pupilS: c.pupilS, wrap: c.wrap },
    snare: { vis: snareVis, x: snareP.x, y: snareP.y, rot: snareRot, sx: ssx, sy: ssy } };
}
window.__crabScene = { cycle: () => cycle, plan: () => plan, draw: t => { manual = true; return draw(t); } };   // for the verification scripts
/* ================= run ================= */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, toggle = document.getElementById("animToggle");
let clock = 0, last = 0, manual = false, onScreen = true, userPref = null, paused = reduce;
try { userPref = localStorage.getItem("pt-anim"); } catch (e) {}
if (userPref === "off") paused = true; else if (userPref === "on") paused = false;   // an explicit choice beats the device setting
const label = () => { if (toggle) { toggle.textContent = paused ? "Play Pinchy" : "Pause Pinchy"; toggle.setAttribute("aria-label", paused ? "Play the header animation" : "Pause the header animation"); } };
function frame(now) {
  if (!manual && !paused && onScreen && !document.hidden) { if (last) clock += Math.min(.1, (now - last) / 1000); draw(clock); }
  last = now; requestAnimationFrame(frame);
}
let relayoutTimer = 0;
function relayout() { layout(); if (!manual) draw(clock); }
layout(); clock = seg.want.t0 + seg.want.dur * .5; draw(clock); label();   // the first frame is already a picture: Pinchy beside the snare, thinking about squid
if ("ResizeObserver" in window) new ResizeObserver(() => { cancelAnimationFrame(relayoutTimer); relayoutTimer = requestAnimationFrame(relayout); }).observe(band); else addEventListener("resize", relayout);
if ("IntersectionObserver" in window) new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(band);
if (toggle) toggle.onclick = () => { paused = !paused; manual = false; label(); try { localStorage.setItem("pt-anim", paused ? "off" : "on"); } catch (e) {} };
requestAnimationFrame(frame);
})();
