#!/bin/zsh
# Renders every banner HTML to a PNG at its exact pixel size.
set -e
cd "${0:A:h}"
node build.mjs
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p ../previews-with-safe-zones
for f in html/*.html; do
  n=${f:t:r}
  dims=${n##*-}; w=${dims%x*}; h=${dims#*x}
  [[ $n == *__guides ]] && { base=${n%__guides}; dims=${base##*-}; w=${dims%x*}; h=${dims#*x}; out=../previews-with-safe-zones/$base.png; } || out=../$n.png
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=8000 \
    --window-size=$w,$h --screenshot="$PWD/$out" "file://$PWD/$f" >/dev/null 2>&1
  echo "$out"
done
