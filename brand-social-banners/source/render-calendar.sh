#!/bin/zsh
# Renders the calendar-direction creatives to ../calendar/ at exact pixel sizes.
set -e
cd "${0:A:h}"
node build-calendar.mjs
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=../calendar
mkdir -p $OUT/previews-with-safe-zones $OUT/instagram-highlights
for f in html-calendar/*.html; do
  n=${f:t:r}; base=${n%__guides}
  dims=${base##*-}; w=${dims%x*}; h=${dims#*x}
  if [[ $n == *__guides ]]; then out=$OUT/previews-with-safe-zones/$base.png
  elif [[ $n == highlight-* ]]; then out=$OUT/instagram-highlights/$n.png
  else out=$OUT/$n.png; fi
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=8000 \
    --window-size=$w,$h --screenshot="$PWD/$out" "file://$PWD/$f" >/dev/null 2>&1
done
ls -R $OUT
