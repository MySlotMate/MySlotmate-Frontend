// "Less meetings. More moments." — the calendar direction, at every platform size.
// Run ./render-calendar.sh to produce the PNGs.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = resolve(HERE, "../../public/assets/brand");
const OUT = resolve(HERE, "html-calendar");
mkdirSync(OUT, { recursive: true });
const LOGO = `file://${BRAND}/logo-horizontal.png`;
const MARK = `file://${BRAND}/logo-mark.png`;

const C = {
  paper: "#F6F1E9", line: "#E9E2D6", ink: "#1A0933", muted: "#5B5070",
  coral: "#FF5A3C", purple: "#A020F0", violet: "#7B2FFF",
};
// Event looks. "meet" is a struck-out work meeting.
const KIND = {
  meet: ["#ECE6DC", "#9B93A8"], purple: [C.purple, "#fff"], ink: [C.ink, "#fff"],
  orange: ["#FF7A45", C.ink], pink: ["#E6399B", "#fff"], lime: ["#D9F26B", C.ink], violet: [C.violet, "#fff"],
};

/* Each day column is 272 units tall; events are [top, height, title, time, kind]. */
const DAY = {
  THU: [[0, 66, "Sprint review", "10:00", "meet"], [76, 66, "Budget sync", "14:00", "meet"], [152, 120, "Pottery night", "19:00", "purple"]],
  FRI: [[0, 66, "1:1 catch-up", "11:00", "meet"], [76, 196, "Open mic", "20:00 · 3 slots left", "ink"]],
  FRI2: [[0, 60, "1:1 catch-up", "11:00", "meet"], [70, 60, "Weekly sync", "15:00", "meet"], [140, 132, "Open mic", "20:00 · 3 slots left", "ink"]],
  SAT: [[0, 120, "Sunrise trek", "05:30", "orange"], [130, 142, "Supper club", "20:00", "pink"]],
  SUN: [[0, 86, "Book club", "11:00", "lime"], [96, 176, "Salsa basics", "17:00", "violet"]],
};

function calendar({ x, y, colW, gap = 10, bodyH, days, labels }) {
  const k = bodyH / 272, f = colW / 132; // vertical / type scale
  let s = "";
  days.forEach((d, i) => {
    const cx = x + i * (colW + gap);
    s += `<div class="abs mono day" style="left:${cx + 4 * f}px;top:${y}px;font-size:${13 * f}px">${labels[i]}</div>`;
    for (const [t, h, title, time, kind] of DAY[d] ?? d) {
      const [bg, fg] = KIND[kind];
      s += `<div class="ev" style="left:${cx}px;top:${y + 34 * f + t * k}px;width:${colW}px;height:${h * k}px;background:${bg};color:${fg};border-radius:${12 * f}px;padding:${10 * f}px ${12 * f}px">
        <b class="${kind === "meet" ? "strike" : ""}" style="font-size:${15 * f}px">${title}</b><span style="font-size:${11 * f}px">${time}</span></div>`;
    }
  });
  return s;
}

const headline = ({ x, y, size, sub, subSize, oneLine }) => `
  <div class="abs" style="left:${x}px;top:${y}px">
    <h1 style="font-size:${size}px"><span class="old" style="text-decoration-thickness:${Math.max(3, size * 0.066)}px">Less meetings.</span>${oneLine ? " " : "<br>"}More <span class="grad">moments.</span></h1>
    ${sub ? `<p class="sub" style="font-size:${subSize}px;margin-top:${subSize}px">${sub}</p>` : ""}
  </div>`;
const logo = (x, y, h) => `<img class="abs" src="${LOGO}" style="left:${x}px;top:${y}px;height:${h}px">`;
const SUB = "Find something real to do this weekend, near you.";

const GUIDES = {
  "linkedin-personal-1584x396": [[60, 190, 330, 330, 1]],
  "linkedin-company-1128x191": [[20, 110, 150, 150]],
  "facebook-cover-1640x624": [[266, 0, 1108, 624], [60, 470, 330, 330, 1]],
  "x-header-1500x500": [[0, 60, 1500, 380], [40, 330, 340, 340, 1]],
  "youtube-banner-2560x1440": [[507, 508, 1546, 423], [0, 508, 2560, 423]],
};

function page({ name, w, h, grid = 44, body, guides = false }) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=JetBrains+Mono:wght@400;600&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;background:${C.paper};color:${C.ink};font-family:"Bricolage Grotesque",sans-serif;-webkit-font-smoothing:antialiased}
.abs{position:absolute}.mono{font-family:"JetBrains Mono",monospace}
.grid{position:absolute;inset:0;background-image:linear-gradient(${C.line} 1px,transparent 1px),linear-gradient(90deg,${C.line} 1px,transparent 1px);background-size:${grid}px ${grid}px;opacity:.6}
h1{font-weight:700;letter-spacing:-.045em;line-height:1}
.old{color:#B7AEC2;font-weight:500;text-decoration:line-through;text-decoration-color:${C.coral}}
.grad{background:linear-gradient(90deg,${C.violet},#BF00FF);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.03em}
.sub{color:${C.muted}}
.day{letter-spacing:.2em;color:#8E84A0}
.ev{position:absolute;display:flex;flex-direction:column;gap:2px;overflow:hidden;box-shadow:0 6px 14px rgba(26,9,51,.08)}
.ev b{font-weight:700;letter-spacing:-.01em;line-height:1.1}
.ev span{font-family:"JetBrains Mono",monospace;opacity:.8}
.strike{text-decoration:line-through;text-decoration-color:${C.coral};text-decoration-thickness:2px}
.guide{position:absolute;outline:2px dashed #12B886;z-index:9}
</style></head><body><div class="grid"></div>${body}
${guides ? (GUIDES[name] ?? []).map((g) => `<div class="guide" style="left:${g[0]}px;top:${g[1]}px;width:${g[2]}px;height:${g[3]}px;${g[4] ? "border-radius:50%" : ""}"></div>`).join("") : ""}
</body></html>`;
  writeFileSync(`${OUT}/${name}${guides ? "__guides" : ""}.html`, html);
  if (!guides && GUIDES[name]) page({ name, w, h, grid, body, guides: true });
}

const ALL4 = { days: ["THU", "FRI", "SAT", "SUN"], labels: ["THU", "FRI", "SAT", "SUN"] };
const LAST3 = { days: ["FRI2", "SAT", "SUN"], labels: ["FRI", "SAT", "SUN"] };

/* ================= BANNERS ================= */
page({ name: "linkedin-personal-1584x396", w: 1584, h: 396, body: `
  ${logo(64, 56, 42)}
  ${headline({ x: 430, y: 96, size: 76, sub: SUB, subSize: 20 })}
  ${calendar({ x: 1000, y: 34, colW: 132, bodyH: 272, ...ALL4 })}` });

// Company page: LinkedIn already shows the logo, so no wordmark here.
page({ name: "linkedin-company-1128x191", w: 1128, h: 191, grid: 32, body: `
  ${headline({ x: 230, y: 34, size: 46, sub: "Find something real to do this weekend.", subSize: 15 })}
  ${calendar({ x: 640, y: 22, colW: 104, gap: 8, bodyH: 110, days: [
      [[0, 272, "Sprint review", "10:00", "meet"]], [[0, 272, "Open mic", "20:00", "ink"]],
      [[0, 272, "Sunrise trek", "05:30", "orange"]], [[0, 272, "Salsa basics", "17:00", "violet"]]],
    labels: ["THU", "FRI", "SAT", "SUN"] })}` });

// Facebook: phones show only the centre ~1108px, so everything lives there.
page({ name: "facebook-cover-1640x624", w: 1640, h: 624, grid: 52, body: `
  ${logo(300, 70, 48)}
  ${headline({ x: 300, y: 206, size: 82, sub: SUB, subSize: 22 })}
  ${calendar({ x: 924, y: 120, colW: 142, gap: 12, bodyH: 380, ...LAST3 })}` });

// X: avatar sits bottom-left, so the logo takes the space above it.
page({ name: "x-header-1500x500", w: 1500, h: 500, grid: 46, body: `
  ${logo(64, 84, 42)}
  ${headline({ x: 430, y: 160, size: 66, sub: SUB, subSize: 18 })}
  ${calendar({ x: 990, y: 78, colW: 148, gap: 12, bodyH: 312, ...LAST3 })}` });

// YouTube: only the centre 1546x423 is safe on every device.
page({ name: "youtube-banner-2560x1440", w: 2560, h: 1440, grid: 64, body: `
  ${logo(570, 560, 52)}
  ${headline({ x: 570, y: 660, size: 104, sub: SUB, subSize: 27 })}
  ${calendar({ x: 1350, y: 538, colW: 166, gap: 12, bodyH: 330, ...ALL4 })}` });

/* ---------- profile pictures ---------- */
function square(name, size, inner) {
  writeFileSync(`${OUT}/${name}.html`, `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=JetBrains+Mono:wght@500;600&display=block" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}html,body{width:${size}px;height:${size}px;overflow:hidden}
body{display:grid;place-items:center;background:${C.paper};font-family:"Bricolage Grotesque",sans-serif;-webkit-font-smoothing:antialiased}
.grid{position:fixed;inset:0;background-image:linear-gradient(${C.line} 2px,transparent 2px),linear-gradient(90deg,${C.line} 2px,transparent 2px);background-size:90px 90px;opacity:.6}
</style></head><body><div class="grid"></div>${inner}</body></html>`);
}
// The mark PNG has a white background; multiply drops it onto the paper colour.
square("profile-picture-cream-1080x1080", 1080, `<img src="${MARK}" style="position:relative;width:66%;mix-blend-mode:multiply;margin-top:2%">`);

/* ---------- Instagram highlight covers (1080x1920, centre is what shows) ---------- */
const HL = [
  ["explore", "Explore", "SAT · 05:30", "orange"], ["host", "Host", "YOUR SLOT", "purple"],
  ["moments", "Moments", "IRL ONLY", "pink"], ["cities", "Cities", "NEAR YOU", "violet"], ["faq", "FAQ", "ASK US", "lime"],
];
for (const [slug, word, time, kind] of HL) {
  const [bg, fg] = KIND[kind];
  writeFileSync(`${OUT}/highlight-${slug}-1080x1920.html`, `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=JetBrains+Mono:wght@500;600&display=block" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden}
body{display:grid;place-items:center;background:${bg};color:${fg};-webkit-font-smoothing:antialiased}
.b{display:flex;flex-direction:column;align-items:center;text-align:center}
.b b{font-family:"Bricolage Grotesque";font-weight:800;font-size:${word.length > 6 ? 180 : word.length > 4 ? 220 : 260}px;letter-spacing:-.05em;line-height:.9}
.b span{font-family:"JetBrains Mono";font-weight:600;font-size:46px;letter-spacing:.14em;opacity:.8;margin-top:34px}
</style></head><body><div class="b"><b>${word}</b><span>${time}</span></div></body></html>`);
}
console.log("built", OUT);
