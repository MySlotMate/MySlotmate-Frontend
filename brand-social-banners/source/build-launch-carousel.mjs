// Launch carousel: 7 Instagram slides (1080x1350) drawn as ONE 7560px panorama,
// so the weekend timeline and a few blocks run across slide edges. Sliced by
// render-launch-carousel.sh.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = resolve(HERE, "../../public/assets/brand");
mkdirSync(resolve(HERE, "html-launch"), { recursive: true });
const LOGO = `file://${BRAND}/logo-horizontal.png`;

// VARIANT=linkedin swaps Instagram-only wording ("link in bio").
const LI = process.env.VARIANT === "linkedin";
const N = 7, SW = 1080, SH = 1350, W = N * SW;
const X = (i, x = 0) => i * SW + x; // slide i, local x
const C = { paper: "#F6F1E9", line: "#E9E2D6", ink: "#1A0933", muted: "#5B5070", coral: "#FF5A3C",
  purple: "#A020F0", violet: "#7B2FFF", orange: "#FF7A45", pink: "#E6399B", lime: "#D9F26B", meet: "#ECE6DC" };

const block = ({ x, y, w, h, bg, fg = "#fff", title, time, rot = 0, size = 40, strike }) =>
  `<div class="blk" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg};color:${fg};transform:rotate(${rot}deg);padding:${size * 0.6}px ${size * 0.7}px">
    <b class="${strike ? "strike" : ""}" style="font-size:${size}px">${title}</b>${time ? `<span style="font-size:${size * 0.42}px">${time}</span>` : ""}</div>`;
const kicker = (i, text, color = C.purple) => `<div class="abs mono kick" style="left:${X(i, 80)}px;top:200px;color:${color}">${text}</div>`;
const h1 = (i, y, size, html, w = 920) => `<h1 class="abs" style="left:${X(i, 80)}px;top:${y}px;width:${w}px;font-size:${size}px">${html}</h1>`;
const G = (t) => `<span class="grad">${t}</span>`;

/* ---------- chrome shared by every slide: header, weekend timeline, swipe cue ---------- */
const TIMES = ["FRI · 18:00", "FRI · 21:00", "SAT · 06:00", "SAT · 13:00", "SAT · 19:00", "SUN · 11:00", "SUN · 20:00"];
let chrome = "";
for (let i = 0; i < N; i++) {
  chrome += `<div class="abs mono top" style="left:${X(i, 80)}px">${i === 0 ? `<img src="${LOGO}" style="height:46px;display:block;margin-top:-10px">` : "MYSLOTMATE ✦ WE'RE LIVE"}</div>
  <div class="abs mono top" style="left:${X(i, 860)}px;width:140px;text-align:right">0${i + 1} / 0${N}</div>
  <div class="abs mono when" style="left:${X(i, 80)}px">${TIMES[i]}</div>
  <div class="abs mono when" style="left:${X(i, 700)}px;width:300px;text-align:right">${i < N - 1 ? "SWIPE →" : "SEE YOU THERE ✦"}</div>`;
}
// One ruler across the whole panorama: ticks every 45px, taller each 'hour'.
let ticks = "";
for (let x = 0; x <= W; x += 45) ticks += `<i style="left:${x}px;height:${x % 270 === 0 ? 26 : 12}px"></i>`;

/* ================= SLIDES ================= */
const s = [];

// 01 — Cover: "Coming soon" struck out, "We're live." takes over.
s.push(`
  <div class="abs old" style="left:${X(0, 80)}px;top:300px;font-size:118px">Coming soon.</div>
  ${h1(0, 440, 250, `We're<br>${G("live.")}`)}
  <div class="abs mono" style="left:${X(0, 84)}px;top:965px;font-size:30px;letter-spacing:.16em;color:${C.ink}">NOW ON iOS <em>✦</em> ANDROID <em>✦</em> WEB</div>
  ${block({ x: X(0, 760), y: 1010, w: 560, h: 150, bg: C.ink, title: "Launch day", time: "TODAY · ALL DAY", rot: -4, size: 50 })}`);

// 02 — What it is.
s.push(`
  ${kicker(1, "WHAT IS MYSLOTMATE?")}
  ${h1(1, 262, 98, `A marketplace for things you do ${G("with people,")} not screens.`)}
  ${block({ x: X(1, 80), y: 840, w: 400, h: 150, bg: C.purple, title: "Pottery night", time: "THU · 19:00", rot: -3 })}
  ${block({ x: X(1, 520), y: 815, w: 420, h: 150, bg: C.orange, fg: C.ink, title: "Sunrise trek", time: "SAT · 05:30", rot: 4 })}
  ${block({ x: X(1, 290), y: 1025, w: 330, h: 140, bg: C.pink, title: "Supper club", time: "SAT · 20:00", rot: 2 })}
  ${block({ x: X(1, 650), y: 1005, w: 320, h: 150, bg: C.ink, title: "Open mic", time: "FRI · 20:00", rot: -5 })}`);

// 03 — Book.
const step = (i, y, n, text, bg, fg, extra = "") => `
  <div class="step" style="left:${X(i, 80)}px;top:${y}px;background:${bg};color:${fg}"><span class="mono">${n}</span><b>${text}</b>${extra}</div>`;
s.push(`
  ${kicker(2, "01 ✦ BOOK")}
  ${h1(2, 262, 116, `Your weekend, ${G("sorted")} in three taps.`)}
  ${step(2, 700, "01", "Pick your city", C.lime, C.ink)}
  ${step(2, 850, "02", "Pick a slot", C.orange, C.ink)}
  ${step(2, 1000, "03", "Show up.", C.violet, "#fff", `<div class="stamp mono">✓ BOOKED</div>`)}`);

// 04 — Host: a slot being created.
const field = (k, v) => `<div class="f"><span class="mono">${k}</span><b>${v}</b></div>`;
s.push(`
  ${kicker(3, "02 ✦ HOST")}
  ${h1(3, 262, 104, `Love doing something? ${G("Make it a slot.")}`)}
  <p class="abs sub" style="left:${X(3, 80)}px;top:700px;width:900px">Teach pottery. Lead the trek you know by heart. Cook your grandmother's recipe for ten strangers. You set the time, the price and the vibe.</p>
  <div class="card" style="left:${X(3, 80)}px;top:880px">
    ${field("TITLE", "Grandma's Sunday biryani")}
    ${field("WHEN", "SUN · 13:00")}
    ${field("SEATS", "10")}
    <div class="pub mono"><span>NEW SLOT</span><span class="on">● PUBLISHED</span></div>
  </div>`);

// 05 — Explore: a cloud of things to do, one pill crossing into slide 06.
const TAGS = [
  ["Paint", C.purple, "#fff", 80, 680, -4, 76], ["Trek", C.orange, C.ink, 400, 660, 5, 76], ["Jam", C.ink, "#fff", 700, 700, -6, 76],
  ["Cook", C.pink, "#fff", 120, 820, 3, 64], ["Dance", C.lime, C.ink, 420, 810, -3, 70], ["Read", C.violet, "#fff", 790, 840, 6, 60],
  ["Climb", C.ink, "#fff", 70, 960, -5, 66], ["Brew", C.orange, C.ink, 360, 950, 4, 60], ["Sketch", C.purple, "#fff", 620, 975, -2, 64],
  ["Bake", C.lime, C.ink, 180, 1080, 6, 58], ["Sing", C.pink, "#fff", 470, 1090, -4, 60], ["Run", C.violet, "#fff", 760, 1090, 3, 58],
];
s.push(`
  ${kicker(4, "03 ✦ EXPLORE")}
  ${h1(4, 262, 116, `Not sure what you want? ${G("Perfect.")}`)}
  ${TAGS.map(([t, bg, fg, x, y, r, f]) => `<div class="pill" style="left:${X(4, x)}px;top:${y}px;background:${bg};color:${fg};transform:rotate(${r}deg);font-size:${f}px">${t}</div>`).join("")}
  <div class="pill" style="left:${X(4, 740)}px;top:545px;background:${C.meet};color:#9B93A8;transform:rotate(8deg);font-size:64px"><span class="strike">Scroll</span></div>`);

// 06 — The manifesto, with the week from the banners.
const DAYS = [
  ["THU", [[0, 66, "Sprint review", "10:00", C.meet, "#9B93A8", 1], [76, 66, "Budget sync", "14:00", C.meet, "#9B93A8", 1], [152, 120, "Pottery night", "19:00", C.purple, "#fff"]]],
  ["FRI", [[0, 66, "1:1 catch-up", "11:00", C.meet, "#9B93A8", 1], [76, 196, "Open mic", "20:00", C.ink, "#fff"]]],
  ["SAT", [[0, 120, "Sunrise trek", "05:30", C.orange, C.ink], [130, 142, "Supper club", "20:00", C.pink, "#fff"]]],
  ["SUN", [[0, 86, "Book club", "11:00", C.lime, C.ink], [96, 176, "Salsa basics", "17:00", C.violet, "#fff"]]],
];
let cal = "";
const CX = X(5, 80), CY = 690, CW = 215, CG = 12, k = 420 / 272;
DAYS.forEach(([d, evs], i) => {
  const cx = CX + i * (CW + CG);
  cal += `<div class="abs mono" style="left:${cx + 6}px;top:${CY}px;font-size:22px;letter-spacing:.2em;color:#8E84A0">${d}</div>`;
  for (const [t, h, title, time, bg, fg, strike] of evs)
    cal += `<div class="ev" style="left:${cx}px;top:${CY + 44 + t * k}px;width:${CW}px;height:${h * k}px;background:${bg};color:${fg}"><b class="${strike ? "strike" : ""}">${title}</b><span>${time}</span></div>`;
});
s.push(`
  <div class="abs old" style="left:${X(5, 80)}px;top:250px;font-size:128px">Less meetings.</div>
  ${h1(5, 400, 150, `More ${G("moments.")}`)}
  ${cal}`);

// 07 — CTA.
const store = (x, small, big, bg, fg) => `<div class="store" style="left:${X(6, x)}px;background:${bg};color:${fg}"><span class="mono">${small}</span><b>${big}</b></div>`;
s.push(`
  ${kicker(6, "YOUR FIRST SLOT IS WAITING")}
  ${h1(6, 262, 112, `Start booking. Start hosting. ${G("Start showing up.")}`)}
  ${store(80, "DOWNLOAD ON THE", "App Store", C.ink, "#fff")}
  ${store(560, "GET IT ON", "Google Play", C.ink, "#fff")}
  <div class="store wide" style="left:${X(6, 80)}px;top:1010px;background:linear-gradient(90deg,${C.violet},#BF00FF);color:#fff"><span class="mono">OR BOOK ON THE WEB</span><b>myslotmate.com</b></div>
  <div class="abs mono" style="left:${X(6, 80)}px;top:1160px;font-size:26px;letter-spacing:.16em;color:${C.ink}">${LI ? "LINK IN THE POST ↑" : "LINK IN BIO ↗"}</div>`);

writeFileSync(resolve(HERE, `html-launch/panorama${LI ? "-linkedin" : ""}.html`), `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=JetBrains+Mono:wght@400;600&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${SH}px;overflow:hidden}
body{position:relative;background:${C.paper};color:${C.ink};font-family:"Bricolage Grotesque",sans-serif;-webkit-font-smoothing:antialiased}
.abs{position:absolute}.mono{font-family:"JetBrains Mono",monospace}
.grid{position:absolute;inset:0;background-image:linear-gradient(${C.line} 2px,transparent 2px),linear-gradient(90deg,${C.line} 2px,transparent 2px);background-size:54px 54px;opacity:.55}
.top{top:84px;font-size:22px;letter-spacing:.2em;color:#8E84A0}
.when{top:1262px;font-size:22px;letter-spacing:.2em;color:#8E84A0}
.ruler{position:absolute;left:0;top:1220px;width:${W}px;height:2px;background:#D9D0C3}
.ruler i{position:absolute;top:2px;width:2px;background:#D9D0C3}
.kick{font-size:26px;letter-spacing:.2em;font-weight:600}
h1{font-weight:700;letter-spacing:-.045em;line-height:.94;color:${C.ink}}
.grad{background:linear-gradient(90deg,${C.violet},#BF00FF);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.04em}
.old{color:#B7AEC2;font-weight:500;letter-spacing:-.045em;line-height:1;text-decoration:line-through;text-decoration-color:${C.coral};text-decoration-thickness:.07em}
.strike{text-decoration:line-through;text-decoration-color:${C.coral};text-decoration-thickness:.08em}
em{font-style:normal;color:${C.purple}}
.blk,.ev{position:absolute;border-radius:24px;display:flex;flex-direction:column;justify-content:flex-start;gap:6px;box-shadow:0 18px 40px rgba(26,9,51,.14)}
.blk b{font-weight:700;letter-spacing:-.03em;line-height:1}
.blk span,.ev span{font-family:"JetBrains Mono",monospace;opacity:.85;letter-spacing:.06em}
.ev{border-radius:18px;padding:16px 18px;gap:4px;box-shadow:0 8px 18px rgba(26,9,51,.08)}
.ev b{font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.05}.ev span{font-size:17px}
.step{position:absolute;width:920px;height:130px;border-radius:26px;display:flex;align-items:center;gap:34px;padding:0 40px;box-shadow:0 14px 30px rgba(26,9,51,.1)}
.step span{font-size:28px;opacity:.7;letter-spacing:.1em}.step b{font-size:62px;font-weight:700;letter-spacing:-.035em}
.stamp{margin-left:auto;border:4px solid #fff;border-radius:16px;padding:10px 18px;font-size:26px;font-weight:600;letter-spacing:.14em;transform:rotate(-6deg)}
.sub{font-size:34px;line-height:1.3;color:${C.muted};letter-spacing:-.01em}
.card{position:absolute;width:920px;background:${C.ink};color:#fff;border-radius:28px;padding:30px 40px;box-shadow:0 24px 50px rgba(26,9,51,.25)}
.f{display:flex;align-items:baseline;gap:30px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.12)}
.f span{width:120px;font-size:20px;letter-spacing:.18em;color:#A99BC4}.f b{font-size:40px;font-weight:600;letter-spacing:-.02em}
.pub{display:flex;justify-content:space-between;padding-top:20px;font-size:20px;letter-spacing:.18em;color:#A99BC4}
.pub .on{color:${C.lime}}
.pill{position:absolute;padding:.14em .5em .2em;border-radius:999px;font-weight:800;letter-spacing:-.04em;line-height:1;box-shadow:0 14px 30px rgba(26,9,51,.12)}
.store{position:absolute;top:780px;width:440px;height:190px;border-radius:30px;padding:34px 40px;display:flex;flex-direction:column;justify-content:center;gap:8px;box-shadow:0 18px 40px rgba(26,9,51,.18)}
.store.wide{width:920px;height:130px;flex-direction:row;align-items:center;justify-content:space-between}
.store span{font-size:20px;letter-spacing:.18em;opacity:.75}.store b{font-size:56px;font-weight:700;letter-spacing:-.035em;line-height:1}
</style></head><body>
<div class="grid"></div><div class="ruler">${ticks}</div>
${chrome}
${s.join("\n")}
<script>/* #n shows slide n alone (used for slicing) */const n=+location.hash.slice(1);if(n)document.body.style.marginLeft=-(n-1)*${SW}+'px';</script>
</body></html>`);
console.log("built panorama", W, "x", SH);
