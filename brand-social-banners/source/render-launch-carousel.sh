#!/bin/zsh
# Renders the launch panorama and slices it into seven 1080x1350 slides.
set -e
cd "${0:A:h}"
node build-launch-carousel.mjs
OUT=../launch-carousel; mkdir -p $OUT
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --allow-file-access-from-files --virtual-time-budget=8000 \
  --window-size=7560,1350 --screenshot="$PWD/$OUT/panorama-7560x1350.png" "file://$PWD/html-launch/panorama.html" >/dev/null 2>&1
for i in 1 2 3 4 5 6 7; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --allow-file-access-from-files --virtual-time-budget=8000 \
    --window-size=1080,1350 --screenshot="$PWD/$OUT/slide-0$i-1080x1350.png" "file://$PWD/html-launch/panorama.html#$i" >/dev/null 2>&1
done
ls $OUT
