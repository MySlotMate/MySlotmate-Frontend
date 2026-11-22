// Four new creative directions, mocked as the LinkedIn profile banner (1584x396).
// None of them reuse the website's night sky, skyline or event photos.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = resolve(HERE, "../../public/assets/brand");
const OUT = resolve(HERE, "html");
mkdirSync(OUT, { recursive: true });
const LOGO_W = `file://${BRAND}/logo-horizontal-white.png`;
const LOGO_P = `file://${BRAND}/logo-horizontal.png`;
const W = 1584, H = 396;

const SPARK = "M0,-1 C0.09,-0.28 0.28,-0.09 1,0 C0.28,0.09 0.09,0.28 0,1 C-0.09,0.28 -0.28,0.09 -1,0 C-0.28,-0.09 -0.09,-0.28 0,-1Z";
const spark = (size, fill) => `<svg width="${size}" height="${size}" viewBox="-1 -1 2 2"><path d="${SPARK}" fill="${fill}"/></svg>`;
// Grain keeps flat colour from looking like a default gradient.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='.5'/></svg>")`;

function page(name, css, body) {
  writeFileSync(`${OUT}/${name}.html`, `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,500;12..96,700;12..96,800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:"Bricolage Grotesque",sans-serif;-webkit-font-smoothing:antialiased}
.abs{position:absolute}.mono{font-family:"JetBrains Mono",monospace}
.grain{position:absolute;inset:0;background-image:${GRAIN};mix-blend-mode:overlay;opacity:.35;pointer-events:none}
${css}
</style></head><body>${body}</body></html>`);
}

/* ---------- A. OFFLINE MODE: a phone setting, switched on ---------- */
page("A-offline-mode", `
body{background:radial-gradient(40% 90% at 82% 45%,#D04BFF 0,transparent 70%),linear-gradient(115deg,#24074F 0%,#5B16C9 50%,#A51BF2 100%);color:#fff}
h1{font-weight:300;font-size:60px;letter-spacing:-.03em;line-height:1}
h1 b{display:block;font-weight:800;font-size:96px;letter-spacing:-.045em;line-height:.95}
.sub{font-size:21px;opacity:.8;margin-top:22px}
.status{right:56px;top:26px;font-size:13px;letter-spacing:.14em;opacity:.75;display:flex;gap:22px}
.toggle{left:1170px;top:112px;width:330px;height:170px;border-radius:999px;background:linear-gradient(90deg,rgba(255,255,255,.12),rgba(255,255,255,.28));border:2px solid rgba(255,255,255,.55);box-shadow:0 30px 80px rgba(36,7,79,.6),inset 0 0 40px rgba(255,255,255,.12)}
.knob{position:absolute;right:14px;top:13px;width:140px;height:140px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 14px 34px rgba(36,7,79,.5)}
.tlabel{left:1170px;top:300px;width:330px;text-align:center;font-size:14px;letter-spacing:.3em}
.tlabel span{color:#E9FF6B}
`, `
<div class="grain"></div>
<img class="abs" src="${LOGO_W}" style="left:64px;top:56px;height:42px">
<div class="abs mono status"><span>✕ NO NOTIFICATIONS</span><span>SOCIAL BATTERY ▮▮▮▮ 100%</span></div>
<div class="abs" style="left:430px;top:92px">
  <h1>Switch to<b>offline mode.</b></h1>
  <p class="sub">Real experiences near you, booked in a tap. Or host your own.</p>
</div>
<div class="abs toggle"><div class="knob">${spark(64, "#A020F0")}</div></div>
<div class="abs mono tlabel">OFFLINE MODE · <span>ON</span></div>
`);

/* ---------- B. ADMIT ONE: the banner is a ticket to real life ---------- */
const TX = 420, TY = 40, TW = 1120, TH = 316, STUB = 300;
page("B-admit-one", `
body{background:linear-gradient(120deg,#6E1FE6,#A020F0 55%,#C21CF0)}
.ticket{left:${TX}px;top:${TY}px;width:${TW}px;height:${TH}px;background:#FFF5E9;border-radius:18px;box-shadow:0 30px 70px rgba(40,6,90,.45);transform:rotate(-1.2deg)}
.notch{position:absolute;width:44px;height:44px;border-radius:50%;background:#9A22EE}
.perf{position:absolute;left:${TW - STUB}px;top:30px;bottom:30px;border-left:3px dashed #D9C9E8}
.kicker{font-size:14px;letter-spacing:.24em;color:#8A1FD8}
h1{font-family:"Instrument Serif",serif;font-weight:400;font-size:96px;line-height:.92;color:#1A0933;letter-spacing:-.01em;margin-top:14px}
h1 i{color:#A020F0}
.meta{display:flex;gap:46px;margin-top:22px}
.meta div{font-size:12px;letter-spacing:.2em;color:#9A8BAE}
.meta b{display:block;font-family:"Bricolage Grotesque";font-size:20px;letter-spacing:-.01em;color:#1A0933;font-weight:600;margin-top:4px}
.stub{position:absolute;left:${TW - STUB + 30}px;top:34px;width:${STUB - 60}px;bottom:34px;display:flex;flex-direction:column;justify-content:space-between}
.no{font-size:66px;font-weight:800;color:#1A0933;letter-spacing:-.04em;line-height:1}
.bar{height:64px;background:repeating-linear-gradient(90deg,#1A0933 0 3px,transparent 3px 6px,#1A0933 6px 7px,transparent 7px 11px,#1A0933 11px 15px,transparent 15px 17px)}
`, `
<div class="grain"></div>
<img class="abs" src="${LOGO_W}" style="left:64px;top:56px;height:42px">
<div class="abs ticket">
  <div class="notch" style="left:-22px;top:${TH / 2 - 22}px"></div>
  <div class="notch" style="right:-22px;top:${TH / 2 - 22}px"></div>
  <div class="notch" style="left:${TW - STUB - 22}px;top:-22px"></div>
  <div class="notch" style="left:${TW - STUB - 22}px;bottom:-22px"></div>
  <div class="perf"></div>
  <div class="abs" style="left:52px;top:38px">
    <div class="mono kicker">ADMIT ONE ✦ REAL LIFE ✦ NO SCREENS</div>
    <h1>Your weekend, <i>booked.</i></h1>
    <div class="meta mono">
      <div>WHERE<b>Near you</b></div><div>WHEN<b>This Saturday</b></div><div>WITH<b>New people</b></div>
    </div>
  </div>
  <div class="stub">
    <div class="mono kicker">SLOT</div>
    <div class="no">Nº 0001</div>
    <div class="bar"></div>
  </div>
</div>
`);

/* ---------- C. LESS MEETINGS: a calendar taken back ---------- */
const cols = ["THU", "FRI", "SAT", "SUN"];
const CX = 1000, CY = 34, CW = 132, CG = 10, ROW = 3.1; // px per 10 minutes, roughly
const ev = (col, top, h, title, time, bg, fg, strike) =>
  `<div class="ev" style="left:${CX + col * (CW + CG)}px;top:${CY + 34 + top}px;height:${h}px;background:${bg};color:${fg}">
    <b${strike ? ' class="strike"' : ""}>${title}</b><span>${time}</span></div>`;
page("C-less-meetings", `
body{background:#F6F1E9;color:#1A0933}
.grid{left:0;top:0;width:100%;height:100%;background-image:linear-gradient(#E9E2D6 1px,transparent 1px),linear-gradient(90deg,#E9E2D6 1px,transparent 1px);background-size:44px 44px;opacity:.6}
h1{font-size:76px;font-weight:700;letter-spacing:-.045em;line-height:1}
h1 .old{color:#B7AEC2;font-weight:500;text-decoration:line-through;text-decoration-thickness:5px;text-decoration-color:#FF5A3C}
h1 .grad{background:linear-gradient(90deg,#7B2FFF,#BF00FF);-webkit-background-clip:text;color:transparent}
.sub{font-size:20px;color:#5B5070;margin-top:20px}
.day{font-size:13px;letter-spacing:.2em;color:#8E84A0;width:${CW}px;text-align:left;top:${CY}px}
.ev{position:absolute;width:${CW}px;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;overflow:hidden;box-shadow:0 6px 14px rgba(26,9,51,.08)}
.ev b{font-size:15px;font-weight:700;letter-spacing:-.01em;line-height:1.1}
.ev span{font-family:"JetBrains Mono";font-size:11px;opacity:.8}
.strike{text-decoration:line-through;text-decoration-color:#FF5A3C;text-decoration-thickness:2px}
`, `
<div class="abs grid"></div>
<img class="abs" src="${LOGO_P}" style="left:64px;top:56px;height:42px">
<div class="abs" style="left:430px;top:96px">
  <h1><span class="old">Less meetings.</span><br>More <span class="grad">moments.</span></h1>
  <p class="sub">Find something real to do this weekend, near you.</p>
</div>
${cols.map((d, i) => `<div class="abs mono day" style="left:${CX + i * (CW + CG) + 4}px">${d}</div>`).join("")}
${ev(0, 0, 66, "Sprint review", "10:00", "#ECE6DC", "#9B93A8", 1)}
${ev(0, 76, 66, "Budget sync", "14:00", "#ECE6DC", "#9B93A8", 1)}
${ev(0, 152, 120, "Pottery night", "19:00", "#A020F0", "#fff")}
${ev(1, 0, 66, "1:1 catch-up", "11:00", "#ECE6DC", "#9B93A8", 1)}
${ev(1, 76, 196, "Open mic", "20:00 · 3 slots left", "#1A0933", "#fff")}
${ev(2, 0, 120, "Sunrise trek", "05:30", "#FF7A45", "#1A0933")}
${ev(2, 130, 142, "Supper club", "20:00", "#E6399B", "#fff")}
${ev(3, 0, 86, "Book club", "11:00", "#D9F26B", "#1A0933")}
${ev(3, 96, 176, "Salsa basics", "17:00", "#7B2FFF", "#fff")}
`);

/* ---------- D. LOG OFF. LIVE ON.: big verbs, one sticker ---------- */
const verbs = ["PAINT", "HIKE", "JAM", "COOK", "DANCE", "MEET", "CLIMB", "SING", "BREW", "PLAY"];
const row = (offset, hot) => {
  let s = "";
  for (let k = 0; k < 14; k++) {
    const v = verbs[(k + offset) % verbs.length];
    const cls = v === hot ? "hot" : k % 2 ? "out" : "dim";
    s += `<span class="${cls}">${v}</span><i>✦</i>`;
  }
  return s;
};
page("D-log-off-live-on", `
body{background:#0E0B14;color:#fff}
.rows{left:-120px;top:-14px;display:flex;flex-direction:column;gap:2px}
.r{white-space:nowrap;font-size:112px;font-weight:800;letter-spacing:-.03em;line-height:.96}
.r i{font-style:normal;font-size:.4em;color:#3A2C55;margin:0 .35em;position:relative;top:-.45em}
.dim{color:#221A33}.out{color:transparent;-webkit-text-stroke:2px #3A2C55}
.hot{background:linear-gradient(90deg,#8B3BFF,#C21CF0);-webkit-background-clip:text;color:transparent}
.fade{left:0;top:0;width:520px;height:100%;background:linear-gradient(90deg,#0E0B14 55%,transparent)}
.sticker{left:700px;top:112px;padding:26px 40px 30px;background:#E4FF5C;color:#0E0B14;border-radius:22px;transform:rotate(-4deg);box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 0 6px #0E0B14}
.sticker h1{font-size:84px;font-weight:800;letter-spacing:-.05em;line-height:.9}
.sticker p{font-family:"JetBrains Mono";font-size:14px;letter-spacing:.14em;margin-top:12px}
`, `
<div class="abs rows">
  <div class="r" style="margin-left:-40px">${row(0, "PAINT")}</div>
  <div class="r" style="margin-left:-260px">${row(3, "COOK")}</div>
  <div class="r" style="margin-left:-120px">${row(6, "CLIMB")}</div>
  <div class="r" style="margin-left:-330px">${row(1, "HIKE")}</div>
</div>
<div class="abs fade"></div>
<div class="grain"></div>
<img class="abs" src="${LOGO_W}" style="left:64px;top:56px;height:42px">
<div class="abs sticker"><h1>Log off.<br>Live on.</h1><p>EXPERIENCES NEAR YOU · HOST YOUR OWN</p></div>
`);
console.log("ok");
