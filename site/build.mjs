// Builds two copies of the page from src.html:
//   docs/index.html            full HTML document for GitHub Pages
//   <artifactOutPath>  body-only page for a Claude artifact
// Usage: node site/build.mjs [artifactOutPath]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
let body = fs.readFileSync(path.join(here, "src.html"), "utf8");
body = body.replace("/*__TP__*/", () => fs.readFileSync(path.join(here, "tide-predictor.min.js"), "utf8").replace(/<\/script/gi, "<\\/script"));
body = body.replace("/*__STATIONS__*/", () => fs.readFileSync(path.join(here, "stations.json"), "utf8"));
const head = body.slice(0, body.indexOf("<style>"));
const rest = body.slice(body.indexOf("<style>"));
const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")}<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231d5f8a'/%3E%3Cpath d='M4 19c4-5 8-5 12 0s8 5 12 0' stroke='white' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E">
${rest.slice(0, rest.indexOf("</style>") + 8)}
</head>
<body>
${rest.slice(rest.indexOf("</style>") + 8).trim()}
</body>
</html>
`;
fs.mkdirSync(path.join(here, "../docs"), { recursive: true });
fs.writeFileSync(path.join(here, "../docs/index.html"), full);
const out = process.argv[2];
if (out) fs.writeFileSync(out, body);
console.log("docs/index.html", full.length, out ? `+ ${out} ${body.length}` : "");
