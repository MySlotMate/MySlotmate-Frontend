#!/bin/zsh
# Renders the founder announcement poster at 1080x1350.
set -e
cd "${0:A:h}"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --allow-file-access-from-files --virtual-time-budget=8000 --window-size=1080,1350 \
  --screenshot="$PWD/../founder-announcement/Founder announcement (1080x1350).png" "file://$PWD/founder-poster.html" >/dev/null 2>&1
