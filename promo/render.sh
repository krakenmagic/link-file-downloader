#!/bin/bash
# 日英×4シーンのストア用スクリーンショット(1280x800)を生成する。
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="file://$DIR/app.html"
OUT="$DIR/screenshots"
mkdir -p "$OUT"

SCENES="hero picker popup done"
LANGS="ja en"
i=0
for lang in $LANGS; do
  n=1
  for scene in $SCENES; do
    out="$OUT/${lang}-${n}-${scene}.png"
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
      --force-device-scale-factor=1 --window-size=1280,800 \
      --screenshot="$out" "$APP#${lang}/${scene}" >/dev/null 2>&1
    echo "  $out"
    n=$((n+1))
  done
done
echo "done"
