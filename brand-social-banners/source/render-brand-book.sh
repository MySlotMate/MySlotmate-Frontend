#!/bin/zsh
# Builds the brand book, renders a PNG of each page for review, and prints the PDF.
set -e
cd "${0:A:h}"
node build-brand-book.mjs
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=../brand-book; mkdir -p $OUT/pages
N=$(grep -o 'id="p[0-9]*"' html-book/brand-book.html | wc -l | tr -d ' ')
mkdir -p html-book/hires
for i in $(seq 1 $N); do
  n=$(printf %02d $i)
  # 1x PNG for quick review
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=8000 --window-size=1920,1080 \
    --screenshot="$PWD/$OUT/pages/page-$n.png" "file://$PWD/html-book/brand-book.html#$i" >/dev/null 2>&1
  # 2x render for the PDF (Chrome's PDF printer breaks gradient text and shadows, so the PDF is built from images)
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --allow-file-access-from-files --virtual-time-budget=8000 --window-size=1920,1080 \
    --screenshot="$PWD/html-book/hires/page-$n.png" "file://$PWD/html-book/brand-book.html#$i" >/dev/null 2>&1
  sips -Z 2400 -s format jpeg -s formatOptions 80 "html-book/hires/page-$n.png" --out "html-book/hires/page-$n.jpg" >/dev/null
done
{ echo '<!doctype html><html><head><style>@page{size:1920px 1080px;margin:0}*{margin:0;padding:0}img{display:block;width:1920px;height:1080px;break-after:page}</style></head><body>'
  for i in $(seq 1 $N); do echo "<img src=\"file://$PWD/html-book/hires/page-$(printf %02d $i).jpg\">"; done
  echo '</body></html>'; } > html-book/pdf.html
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --no-pdf-header-footer \
  --virtual-time-budget=10000 --print-to-pdf="$PWD/$OUT/MySlotMate Brand Book.pdf" \
  "file://$PWD/html-book/pdf.html" >/dev/null 2>&1
ls -la $OUT
