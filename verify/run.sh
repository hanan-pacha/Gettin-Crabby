#!/bin/sh
# Runs the whole verification protocol and writes verify/REPORT.md. See verify/README.md.
set -e
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
node verify/tides.cjs
node verify/astro-dump.cjs
"$PY" verify/astro.py
node verify/places.cjs
node verify/live.cjs
node verify/model.cjs
node verify/scene.cjs
node verify/report.cjs
