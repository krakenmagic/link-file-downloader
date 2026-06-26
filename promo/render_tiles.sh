#!/bin/bash
# プロモーションタイル(小440x280 / マーキー1400x560)を日英で生成。
# Chromeで描画→PILでアルファ除去(24bit PNG, no alpha)。
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="file://$DIR/tiles.html"
OUT="$DIR/tiles"
mkdir -p "$OUT"

render() { # lang size w h name
  local raw="$OUT/.raw_$5.png"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=$3,$4 \
    --screenshot="$raw" "$APP#$1/$2" >/dev/null 2>&1
  python3 - "$raw" "$OUT/$5.png" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
bg = Image.new("RGB", im.size, (255, 255, 255))
bg.paste(im, mask=im.split()[3])  # アルファを白で合成
bg.save(dst, "PNG")  # 24bit, アルファ無し
PY
  rm -f "$raw"
  echo "  $OUT/$5.png"
}

render ja small    440  280  small-ja
render en small    440  280  small-en
render ja marquee  1400 560  marquee-ja
render en marquee  1400 560  marquee-en
echo done
