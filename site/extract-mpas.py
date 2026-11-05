"""Builds site/mpas.json from 14 CCR § 632 (Marine Protected Areas), as published by Cornell LII.
Usage: python3 extract-mpas.py <632-as-text.txt> mpas.json
Only Northern California areas (36.9°N to the Oregon border) are kept. Each area gets:
  n: name, k: SMR | SMCA | SMRMA | SMP, p: boundary points [lat, lon],
  s: shape  ("poly" = closed by the shoreline, "strip" = shoreline strip between two points,
             "line" = estuary mouth line; the protected waters lie behind it),
  c: crab snaring rule ("no" = no take of crabs, "other" = crab allowed only with other gear,
             "ok" = loop traps allowed or no take restriction), x: the exception text.
Boundaries are approximations: the real inshore edge is the mean high tide line."""
import json, re, sys
text = open(sys.argv[1], encoding="utf-8").read()
start = text.find("(b) Areas and Special Regulations for Use"); text = text[start if start > 0 else 0:]
flat = re.sub(r"\s+", " ", text)
head = re.compile(r"\((\d+)\) ([A-Z][A-Za-z.'’ ]+?(?:State Marine (?:Reserve|Conservation Area|Recreational Management Area|Park)))\.? ")
coord = re.compile(r"(\d{2})° ?(\d{1,2}(?:\.\d+)?)' ?N\. lat\. ?(\d{3})° ?(\d{1,2}(?:\.\d+)?)' ?W\. long")
kinds = {"Reserve": "SMR", "Conservation Area": "SMCA", "Recreational Management Area": "SMRMA", "Park": "SMP"}
heads = list(head.finditer(flat)); out, skipped = [], []
for i, m in enumerate(heads):
    body = flat[m.end(): heads[i + 1].start() if i + 1 < len(heads) else len(flat)]
    body = re.split(r"\(\d+\) [A-Z][A-Za-z .'’]+Special Closure", body)[0]
    name = m.group(2).strip()
    kind = next(v for k, v in kinds.items() if name.endswith(k))
    pts = [[round(int(a) + float(b) / 60, 5), round(-(int(c) + float(d) / 60), 5)] for a, b, c, d in coord.findall(body)]
    if not pts: skipped.append(name); continue
    if max(p[0] for p in pts) < 36.9 or min(p[1] for p in pts) > -121.0: continue
    exc = ""
    if "following specified exception" in body:
        exc = body.split("following specified exception", 1)[1][:900]
    elif kind in ("SMRMA", "SMP"):
        exc = body[body.find("(B)"):][:900] if "(B)" in body else ""
    low = exc.lower()
    if kind == "SMR": rule = "no"
    elif "all recreational take is allowed" in low: rule = "ok"
    elif "loop trap" in low: rule = "ok"
    elif "marine invertebrates" in low: rule = "ok"   # e.g. Stewarts Point: invertebrates from shore
    elif kind == "SMRMA" and not re.search(r"prohibit|unlawful|only", low): rule = "ok"
    elif "crab" in low: rule = "other"
    else: rule = "no"
    shape = "poly"
    if len(pts) == 2 and "seaward of mean lower low water" in body: shape = "strip"
    elif len(pts) == 2 and re.search(r"mouth|within [A-Z][a-z]+ (?:Estero|Estuary|Lagoon)|of a line connecting", body): shape = "line"
    elif len(pts) == 2: shape = "strip"
    out.append({"n": name, "k": kind, "p": pts, "s": shape, "c": rule, "x": re.sub(r"\s*\[[^\]]*\]", "", exc).strip()[:300]})
json.dump(out, open(sys.argv[2], "w"), separators=(",", ":"))
print(len(out), "NorCal areas;", "skipped (no coordinates):", skipped)
for a in out: print(f"  {a['k']:5} {a['c']:5} {a['s']:5} {len(a['p']):2} pts  {a['n']}")
