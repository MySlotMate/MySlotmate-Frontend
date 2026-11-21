#!/bin/zsh
# LinkedIn version of the launch carousel: 7 slides + one 7-page PDF (LinkedIn "document" post).
set -e
cd "${0:A:h}"
VARIANT=linkedin node build-launch-carousel.mjs
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=../launch-carousel-linkedin; mkdir -p $OUT
for i in 1 2 3 4 5 6 7; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=8000 --window-size=1080,1350 \
    --screenshot="$PWD/$OUT/slide-0$i-1080x1350.png" "file://$PWD/html-launch/panorama-linkedin.html#$i" >/dev/null 2>&1
done
{ echo '<!doctype html><html><head><style>@page{size:1080px 1350px;margin:0}*{margin:0;padding:0}img{display:block;width:1080px;height:1350px;break-after:page}</style></head><body>'
  for i in 1 2 3 4 5 6 7; do echo "<img src=\"file://$PWD/$OUT/slide-0$i-1080x1350.png\">"; done
  echo '</body></html>'; } > html-launch/linkedin-pdf.html
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer \
  --virtual-time-budget=5000 --print-to-pdf="$PWD/$OUT/MySlotMate - We're live (LinkedIn carousel).pdf" \
  "file://$PWD/html-launch/linkedin-pdf.html" >/dev/null 2>&1
ls -la $OUT
