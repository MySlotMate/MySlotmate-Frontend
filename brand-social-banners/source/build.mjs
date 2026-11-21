// Generates one HTML page per social banner at its exact pixel size.
// Render with ./render.sh (headless Chrome) -> ../*.png
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(HERE, "../../public");
const OUT = resolve(HERE, "html");
mkdirSync(OUT, { recursive: true });
const asset = (p) => "file://" + encodeURI(`${PUB}/${p}`);

const LOGO = asset("assets/brand/logo-horizontal-white.png");
const MARK = asset("assets/brand/logo-mark.png");
const P = {
  paint: [asset("Event Photos/sip-and-paint/sip-and-paint.webp"), "Sip & Paint", "50% 30%"],
  crochet: [asset("Event Photos/Chrochet event/IMG_1134.webp"), "Crochet Circle", "50% 45%"],
  mic: [asset("Event Photos/open-mic/openmic3.webp"), "Open Mic", "50% 55%"],
  trip: [asset("Event Photos/adventure/adventure.webp"), "Adventure", "50% 70%"],
  food: [asset("Event Photos/plate-to-fame/IMG-20260621-WA0069.webp"), "Plate to Fame", "50% 50%"],
  group: [asset("Event Photos/Chrochet event/IMG_1142.webp"), "Crochet Circle", "50% 50%"],
};

/* ---------- deterministic randomness (same output every build) ---------- */
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}

/* ---------- city skyline (ported from the website's CitySky) ---------- */
function skyline(W = 1440, H = 300) {
  const rnd = seeded(11);
  let far = "", near = "", win = "";
  for (let x = -20; x < W + 20; ) {
    const w = 40 + rnd() * 70, h = 90 + rnd() * 150;
    far += `<rect x="${x}" y="${H - h - 30}" width="${w}" height="${h + 30}" rx="2"/>`;
    x += w + 2;
  }
  for (let x = -10; x < W + 10; ) {
    const w = 46 + rnd() * 64, h = 60 + rnd() * 130, top = H - h;
    near += `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="3"/>`;
    const cols = Math.max(2, Math.floor((w - 12) / 12)), rows = Math.floor((h - 16) / 16);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (rnd() < 0.28) {
          const lit = rnd() < 0.7;
          rnd();
          win += `<rect x="${x + 8 + c * 12}" y="${top + 10 + r * 16}" width="5" height="7" rx="1" fill="${lit ? "#C4A5F5" : "#1E1F38"}" opacity="${lit ? 0.55 : 1}"/>`;
        }
    x += w + 3;
  }
  return `<svg class="skyline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24174A"/><stop offset="1" stop-color="#0F0B22"/></linearGradient>
      <linearGradient id="near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#13142A"/><stop offset="1" stop-color="#080914"/></linearGradient>
    </defs>
    <g fill="url(#far)" opacity=".7">${far}</g><g fill="url(#near)">${near}</g><g>${win}</g></svg>`;
}

function stars(w, h, seed = 23) {
  const rnd = seeded(seed);
  const n = Math.round((w * h) / 9000);
  let s = "";
  for (let i = 0; i < n; i++) {
    const big = rnd() > 0.88;
    const size = (big ? 2.6 : 1.4) * Math.max(1, w / 1600);
    s += `<i class="star" style="left:${(rnd() * 100).toFixed(2)}%;top:${(rnd() * 70).toFixed(2)}%;width:${size}px;height:${size}px;opacity:${(0.35 + rnd() * 0.6).toFixed(2)}"></i>`;
  }
  return s;
}

/* ---------- the logo's four-point sparkle ---------- */
const SPARK = "M0,-1 C0.09,-0.28 0.28,-0.09 1,0 C0.28,0.09 0.09,0.28 0,1 C-0.09,0.28 -0.28,0.09 -1,0 C-0.28,-0.09 -0.09,-0.28 0,-1Z";
const sparkle = (x, y, r, o = 1, color = "#fff") =>
  `<svg class="abs" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px;opacity:${o};filter:drop-shadow(0 0 ${r * 0.6}px rgba(216,180,254,.8))" viewBox="-1 -1 2 2"><path d="${SPARK}" fill="${color}"/></svg>`;

/* ---------- building blocks ---------- */
function polaroid({ photo, x, y, w, rot = 0, chip, shadow = 1 }) {
  const [src, caption, pos] = P[photo];
  const pad = w * 0.032;
  return `<figure class="abs polaroid" style="left:${x}px;top:${y}px;width:${w}px;padding:${pad}px ${pad}px ${w * 0.12}px;transform:rotate(${rot}deg);border-radius:${w * 0.03}px;box-shadow:0 ${w * 0.1}px ${w * 0.2}px rgba(0,0,0,${0.55 * shadow})">
    <div class="ph" style="background-image:url('${src}');background-position:${pos};border-radius:${w * 0.012}px"></div>
    <figcaption style="font-size:${w * 0.056}px;bottom:${w * 0.033}px">${caption}</figcaption>
    ${chip ? ticket({ ...chip, base: w }) : ""}
  </figure>`;
}

// "Slot booked" ticket: the signature element. It says what the product does.
function ticket({ base, text = "Slot booked", when = "Sat · 7 PM", dx = 0.55, dy = -0.1, rot = -8, s = 1 }) {
  const f = base * 0.068 * s;
  return `<div class="ticket" style="left:${base * dx}px;top:${base * dy}px;transform:rotate(${rot}deg);font-size:${f}px;padding:${f * 0.62}px ${f * 1.05}px ${f * 0.62}px ${f * 0.62}px;gap:${f * 0.55}px">
    <span class="tick" style="width:${f * 1.55}px;height:${f * 1.55}px"><svg viewBox="0 0 24 24" width="${f}" height="${f}"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <span class="tt"><b>${text}</b><em>${when}</em></span>
  </div>`;
}

function headline({ x, y, size, w, align = "left", sub, subSize, logoH, logoGap, url, oneLine, lines }) {
  return `<div class="abs copy" style="left:${x}px;top:${y}px;width:${w}px;text-align:${align};${align === "center" ? "align-items:center" : ""}">
    ${logoH ? `<img src="${LOGO}" style="height:${logoH}px;margin-bottom:${logoGap ?? logoH * 0.9}px">` : ""}
    <h1 style="font-size:${size}px">${lines ?? `Life happens when you${oneLine ? " " : "<br>"}`}<span class="grad">show&nbsp;up.</span></h1>
    ${sub ? `<p style="font-size:${subSize}px;margin-top:${subSize * 0.9}px">${sub}</p>` : ""}
    ${url ? `<p class="url" style="font-size:${subSize * 0.92}px;margin-top:${subSize * 0.7}px">${url}</p>` : ""}
  </div>`;
}

const logo = (x, y, h) => `<img class="abs" src="${LOGO}" style="left:${x}px;top:${y}px;height:${h}px">`;

// The three-photo cluster, sized by the width of its centre card.
const cluster = (x, y, W) => `
  ${polaroid({ photo: "crochet", x, y: y + 0.15 * W, w: 0.92 * W, rot: -8 })}
  ${polaroid({ photo: "mic", x: x + 0.73 * W, y: y + 0.24 * W, w: 0.85 * W, rot: 9 })}
  ${polaroid({ photo: "paint", x: x + 0.29 * W, y, w: W, rot: 2, chip: { dx: 0.6, dy: -0.1, rot: 6, s: 1.1 } })}`;

const SUB = `Book experiences <i>✦</i> Host your own <i>✦</i> Live it offline`;

function page({ name, w, h, body, skyH = "40%", glow = "50% 100%", guides = [] }) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden;background:#080914}
body{position:relative;font-family:Outfit,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.abs{position:absolute}
.sky{position:absolute;inset:0;background:linear-gradient(180deg,#080914 0%,#0A0B1C 38%,#1A0F33 74%,#2A1150 100%)}
.glow{position:absolute;inset:0;background:radial-gradient(60% 70% at ${glow},rgba(160,32,240,.45),rgba(123,47,255,.14) 50%,transparent 80%)}
.star{position:absolute;border-radius:50%;background:#fff}
.skyline{position:absolute;left:0;bottom:0;width:100%;height:${skyH};opacity:.32}
.ground{position:absolute;left:0;right:0;bottom:0;height:18%;background:linear-gradient(0deg,rgba(8,9,20,.85),transparent)}
.polaroid{background:#E6E2EF;transform-origin:50% 50%}
.polaroid .ph{width:100%;aspect-ratio:4/3;background-size:cover;filter:brightness(.86) contrast(1.08) saturate(1.06)}
.polaroid figcaption{position:absolute;left:0;right:0;text-align:center;font-weight:600;color:#2A2C45;letter-spacing:-.01em}
.ticket{position:absolute;display:flex;align-items:center;white-space:nowrap;border-radius:999px;background:rgba(18,20,38,.92);border:1px solid rgba(216,180,254,.28);box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.2);backdrop-filter:blur(8px)}
.ticket .tick{display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#7B2FFF,#A020F0 55%,#BF00FF);box-shadow:0 0 18px rgba(191,0,255,.55)}
.ticket .tt{display:flex;flex-direction:column;line-height:1.08}
.ticket b{font-weight:600;color:#fff}
.ticket em{font-style:normal;font-weight:400;color:#A5A8C3;font-size:.82em}
.copy{display:flex;flex-direction:column;align-items:flex-start}
.copy img{width:auto;flex:none}
h1{font-weight:300;line-height:1.02;letter-spacing:-.035em;color:#fff}
.grad{font-weight:600;background:linear-gradient(90deg,#9A5BFF,#B93BF6 50%,#D92CFF);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.04em}
.copy p{color:#A5A8C3;font-weight:400;letter-spacing:.005em}
.copy p i{font-style:normal;color:#B93BF6;margin:0 .45em;font-size:.8em;position:relative;top:-.05em}
.copy p.url{color:#D8B4FE;font-weight:500;letter-spacing:.02em}
.guide{position:absolute;outline:2px dashed #34D399;z-index:99}
</style></head><body>
<div class="sky"></div>${stars(w, h)}<div class="glow"></div>${skyline()}<div class="ground"></div>
${body}
${guides.map((g) => `<div class="guide" style="left:${g[0]}px;top:${g[1]}px;width:${g[2]}px;height:${g[3]}px;${g[4] ? "border-radius:50%" : ""}"></div>`).join("")}
</body></html>`;
  writeFileSync(`${OUT}/${name}.html`, html);
  if (guides.length) return;
  // Same banner with the platform's crop/overlay zones drawn, for checking.
  page({ name: `${name}__guides`, w, h, body, skyH, glow, guides: GUIDES[name] ?? [] });
}

/* Platform overlay / safe zones (approximate, used for the __guides previews) */
const GUIDES = {
  "linkedin-personal-1584x396": [[60, 190, 330, 330, 1]],
  "linkedin-company-1128x191": [[20, 110, 150, 150]],
  "facebook-cover-1640x624": [[266, 0, 1108, 624], [60, 470, 330, 330, 1]],
  "x-header-1500x500": [[0, 60, 1500, 380], [40, 330, 340, 340, 1]],
  "youtube-banner-2560x1440": [[507, 508, 1546, 423], [0, 508, 2560, 423]],
};

/* ================= BANNERS ================= */

// LinkedIn personal profile background. The profile photo covers the
// lower-left, so the logo sits in the empty space above it.
page({
  name: "linkedin-personal-1584x396", w: 1584, h: 396, skyH: "55%", glow: "70% 100%",
  body: `
  ${logo(64, 58, 44)}
  ${headline({ x: 430, y: 104, w: 720, size: 70, sub: SUB, subSize: 21 })}
  ${cluster(1160, 66, 250)}
  ${sparkle(1170, 52, 13)}${sparkle(1548, 350, 10, 0.8)}${sparkle(1110, 340, 7, 0.7)}`,
});

// LinkedIn company page cover.
page({
  name: "linkedin-company-1128x191", w: 1128, h: 191, skyH: "70%", glow: "62% 100%",
  body: `
  ${headline({ x: 250, y: 40, w: 600, size: 44, oneLine: true, sub: SUB, subSize: 16 })}
  ${polaroid({ photo: "crochet", x: 872, y: 26, w: 124, rot: -10 })}
  ${polaroid({ photo: "paint", x: 976, y: 16, w: 132, rot: 7, chip: { dx: -0.55, dy: 0.72, rot: -6, s: 1.25 } })}
  ${sparkle(858, 28, 9)}${sparkle(230, 36, 6, 0.7)}`,
});

// Facebook page cover. Mobile shows the centre ~1108px, so everything that
// matters lives there.
page({
  name: "facebook-cover-1640x624", w: 1640, h: 624, skyH: "42%", glow: "64% 100%",
  body: `
  ${logo(300, 64, 50)}
  ${headline({ x: 300, y: 148, w: 620, size: 88, lines: "Life happens<br>when you<br>", sub: SUB, subSize: 22 })}
  ${cluster(895, 150, 300)}
  ${sparkle(905, 130, 16)}${sparkle(1350, 520, 11, 0.8)}${sparkle(860, 520, 7, 0.6)}`,
});

// X (Twitter) header. The avatar sits bottom-left, so the logo takes the
// space above it and the headline starts to its right.
page({
  name: "x-header-1500x500", w: 1500, h: 500, skyH: "48%", glow: "68% 100%",
  body: `
  ${logo(64, 84, 42)}
  ${headline({ x: 430, y: 150, w: 620, size: 60, sub: SUB, subSize: 19 })}
  ${cluster(1035, 120, 268)}
  ${sparkle(1040, 104, 14)}${sparkle(1450, 430, 10, 0.8)}${sparkle(980, 420, 7, 0.6)}`,
});

// YouTube channel art: TV shows all of it, desktop a 2560x423 strip, phones
// only the centre 1546x423. Logo, headline and photos sit in that box.
page({
  name: "youtube-banner-2560x1440", w: 2560, h: 1440, skyH: "34%", glow: "60% 100%",
  body: `
  ${logo(560, 548, 50)}
  ${headline({ x: 560, y: 640, w: 980, size: 90, sub: SUB, subSize: 26 })}
  ${cluster(1580, 560, 296)}
  ${sparkle(1590, 545, 18)}${sparkle(2030, 905, 12, 0.8)}${sparkle(1500, 600, 9, 0.6)}
  ${sparkle(1280, 260, 26, 0.9)}${sparkle(2200, 300, 14, 0.7)}${sparkle(700, 1150, 12, 0.5)}`,
});

/* ---------- profile pictures (square, circle-safe) ---------- */
function avatar(name, size, bg) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0}html,body{width:${size}px;height:${size}px;overflow:hidden}
body{display:grid;place-items:center;background:${bg}}
img{width:62%;filter:invert(1) grayscale(1) contrast(4);mix-blend-mode:screen;margin-top:2%}
</style></head><body><img src="${MARK}"></body></html>`;
  writeFileSync(`${OUT}/${name}.html`, html);
}
avatar("profile-picture-1080x1080", 1080, "linear-gradient(135deg,#7B2FFF 0%,#A020F0 50%,#BF00FF 100%)");
avatar("profile-picture-dark-1080x1080", 1080, "radial-gradient(70% 70% at 50% 85%,#3A1470 0%,#160C2E 55%,#080914 100%)");

console.log("built", OUT);
