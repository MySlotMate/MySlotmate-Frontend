// MySlotMate Brand Book — a shareable, 17-page landscape PDF (1920x1080 pages)
// for investors, partners and hosts. Run ./render-brand-book.sh.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(HERE, "../../public/assets/brand");
const OUTS = resolve(HERE, "..");
mkdirSync(resolve(HERE, "html-book"), { recursive: true });
const f = (p) => "file://" + encodeURI(p);
const LOGO = f(`${PUB}/logo-horizontal.png`), LOGO_W = f(`${PUB}/logo-horizontal-white.png`);
const STACK = f(`${PUB}/logo-stacked.png`), ICON = f(`${PUB}/app-icon.png`);
const EX = (p) => f(`${OUTS}/${p}`);

const C = { paper: "#F6F1E9", line: "#E9E2D6", surface: "#ECE6DC", ink: "#1A0933", muted: "#5B5070", faint: "#8E84A0",
  struck: "#B7AEC2", coral: "#FF5A3C", violet: "#7B2FFF", purple: "#A020F0", magenta: "#BF00FF",
  orange: "#FF7A45", pink: "#E6399B", lime: "#D9F26B" };
const G = (t) => `<span class="grad">${t}</span>`;
const S = (t) => `<span class="strike">${t}</span>`;

const pages = []; // [section label, html, dark?]
const add = (label, html, dark = false) => pages.push({ label, html, dark });
const kicker = (t) => `<div class="mono kick">${t}</div>`;
const blk = (bg, fg, title, time, extra = "") =>
  `<div class="blk" style="background:${bg};color:${fg};${extra}"><b>${title}</b>${time ? `<span>${time}</span>` : ""}</div>`;

/* 01 — Cover */
add("Cover", `
  <img class="abs" src="${LOGO}" style="left:120px;top:120px;height:60px">
  <div class="abs" style="left:120px;top:330px">
    <div class="old" style="font-size:150px">Less meetings.</div>
    <h1 style="font-size:196px;margin-top:20px">More ${G("moments.")}</h1>
    <div class="mono" style="margin-top:56px;font-size:24px;letter-spacing:.22em;color:${C.ink}">BRAND BOOK <em>✦</em> EDITION 01 <em>✦</em> NOVEMBER 2026</div>
  </div>
  <div class="abs" style="left:1570px;top:170px;width:400px;display:flex;flex-direction:column;gap:14px;transform:rotate(-4deg)">
    ${blk(C.orange, C.ink, "Sunrise trek", "SAT · 05:30", "height:150px")}
    ${blk(C.pink, "#fff", "Supper club", "SAT · 20:00", "height:120px;margin-left:60px")}
    ${blk(C.lime, C.ink, "Book club", "SUN · 11:00", "height:110px;margin-left:-30px")}
  </div>`);

/* 02 — Agenda */
const AG = [["Why we exist", C.orange], ["What we are", C.purple], ["Mission and vision", C.ink], ["What we believe", C.pink], ["How it works", C.lime],
  ["Who it's for", C.violet], ["Our personality", C.orange], ["How we sound", C.purple], ["Logo", C.ink], ["Colour", C.pink], ["Type", C.lime],
  ["Signature moves", C.violet], ["In the wild", C.orange], ["For hosts", C.purple]];
add("Agenda", `
  ${kicker("THE AGENDA")}
  <h2 style="width:900px">This weekend's ${G("plan.")}</h2>
  <p class="body" style="margin-top:36px;width:760px">Who we are, what we believe, and how MySlotMate looks and sounds wherever people meet it.</p>
  <div class="abs agenda" style="left:1040px;top:170px">
    ${AG.map(([t, c], i) => `<div class="ag"><span class="mono">${String(i + 3).padStart(2, "0")}</span><i style="background:${c}"></i><b>${t}</b></div>`).join("")}
  </div>`);

/* 03 — Why */
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MEET = [["Standup", "Sprint review"], ["1:1", "Budget sync"], ["All-hands", "Client call"], ["Standup", "Roadmap"], ["Weekly sync", "Wrap-up"]];
add("Why we exist", `
  ${kicker("03 ✦ WHY WE EXIST")}
  <h2 style="width:980px">Our calendars are full. Our ${G("weekends aren't.")}</h2>
  <div class="cols2" style="width:930px;margin-top:56px">
    <p class="body">Most of us spend our days in meetings and our evenings on screens. When the weekend comes, the plan is usually "we'll see", and then nothing happens.</p>
    <p class="body">Meanwhile the potter down the road, the trek leader who knows every trail and the home cook with a family recipe have no simple way to share what they love with people who'd love it too.</p>
  </div>
  <div class="abs week" style="left:1160px;top:400px">
    ${DAYS.map((d, i) => `<div class="wcol"><div class="mono day">${d}</div>${i < 5
      ? MEET[i].map((m) => `<div class="meet"><b>${m}</b></div>`).join("")
      : `<div class="empty mono">NOTHING<br>PLANNED</div>`}</div>`).join("")}
  </div>`);

/* 04 — What */
const pillar = (bg, fg, k, t, d) => `<div class="pillar" style="background:${bg};color:${fg}"><span class="mono">${k}</span><b>${t}</b><p>${d}</p></div>`;
add("What we are", `
  ${kicker("04 ✦ WHAT WE ARE")}
  <h2 style="width:1500px">A marketplace for things you do ${G("with people,")} not screens.</h2>
  <div class="pillars">
    ${pillar(C.orange, C.ink, "FOR GUESTS", "Book", "Find something real to do near you this weekend. Pick a slot, pay securely, show up.")}
    ${pillar(C.purple, "#fff", "FOR HOSTS", "Host", "Turn a skill, a hobby or a recipe into a slot. You set the time, the price and the vibe.")}
    ${pillar(C.lime, C.ink, "FOR EVERYONE", "Explore", "Browse what's on by city, day or mood. Not sure what you want? That's the fun part.")}
  </div>
  <div class="mono abs" style="left:120px;top:960px;font-size:22px;letter-spacing:.2em;color:${C.ink}">NOW ON iOS <em>✦</em> ANDROID <em>✦</em> WEB</div>`);

/* 05 — Mission & vision (dark) */
add("Mission and vision", `
  ${kicker("05 ✦ MISSION AND VISION")}
  <div class="abs" style="left:120px;top:250px;width:1500px">
    <div class="mono lab">OUR MISSION</div>
    <h2 class="light" style="font-size:96px;margin-top:20px">Get people off their screens and into rooms, trails and kitchens, ${G("together.")}</h2>
    <div class="mono lab" style="margin-top:90px">OUR VISION</div>
    <h2 class="light" style="font-size:96px;margin-top:20px">Every weekend has something worth ${G("showing up for.")}</h2>
  </div>`, true);

/* 06 — Manifesto */
const BEL = [["Scrolling.", "Showing up."], ["Followers.", "Friends you met at a supper club."], ["Experts only.", "Everyone has something worth teaching."],
  ["Big crowds.", "Small rooms, real names."], ["Someday.", "This Saturday."]];
add("What we believe", `
  ${kicker("06 ✦ WHAT WE BELIEVE")}
  <div class="abs" style="left:120px;top:250px;display:flex;flex-direction:column;gap:30px">
    ${BEL.map(([o, n], i) => `<div class="bel"><span class="old">${o}</span><b>${i === 0 ? G(n) : n}</b></div>`).join("")}
  </div>`);

/* 07 — How it works */
const step = (bg, fg, n, t) => `<div class="stp" style="background:${bg};color:${fg}"><span class="mono">${n}</span><b>${t}</b></div>`;
add("How it works", `
  ${kicker("07 ✦ HOW IT WORKS")}
  <h2>Three taps, ${G("either way.")}</h2>
  <div class="lanes">
    <div><div class="mono lane">FOR GUESTS</div>${step(C.lime, C.ink, "01", "Pick your city")}${step(C.orange, C.ink, "02", "Pick a slot")}${step(C.violet, "#fff", "03", "Show up.")}</div>
    <div><div class="mono lane">FOR HOSTS</div>${step(C.purple, "#fff", "01", "Create a slot")}${step(C.pink, "#fff", "02", "Set time, price, seats")}${step(C.ink, "#fff", "03", "Welcome your guests.")}</div>
  </div>`);

/* 08 — Who it's for */
const who = (bg, fg, k, t) => `<div class="who" style="background:${bg};color:${fg}"><span class="mono">${k}</span><b>${t}</b></div>`;
add("Who it's for", `
  ${kicker("08 ✦ WHO IT'S FOR")}
  <h2 style="width:1400px">Built for people who'd rather ${G("be there.")}</h2>
  <div class="whos">
    ${who(C.surface, C.ink, "GUEST", "The 9-to-5er who wants a weekend worth talking about on Monday.")}
    ${who(C.surface, C.ink, "GUEST", "The new-in-town looking for their people.")}
    ${who(C.surface, C.ink, "GUEST", "The curious one who wants to try everything once.")}
    ${who(C.purple, "#fff", "HOST", "The hobbyist with a skill worth sharing.")}
    ${who(C.orange, C.ink, "HOST", "The local who knows every trail and every shortcut.")}
    ${who(C.pink, "#fff", "HOST", "The home cook with a family recipe and a big table.")}
  </div>`);

/* 09 — Personality */
const trait = (w, n, c) => `<div class="trait"><b style="color:${c}">${w}</b><span class="old">${n}</span></div>`;
add("Our personality", `
  ${kicker("09 ✦ OUR PERSONALITY")}
  <h2 style="width:1500px">If we were a person, we'd be the friend who always ${G("knows what's on.")}</h2>
  <div class="traits">
    ${trait("Warm,", "not cheesy.", C.ink)}${trait("Bold,", "not loud.", C.ink)}${trait("Playful,", "not silly.", C.ink)}${trait("Local,", "not small.", C.ink)}
  </div>`);

/* 10 — Voice */
const SAY = [["Pick a slot.", "Browse our curated selection of experiences."], ["Love doing something? Make it a slot.", "Monetise your passion on our platform."],
  ["Sunrise trek · SAT 05:30", "Amazing outdoor adventure opportunity!!"], ["See you there ✦", "Thank you for choosing MySlotMate."]];
add("How we sound", `
  ${kicker("10 ✦ HOW WE SOUND")}
  <h2>Short sentences. Real things. ${G("Full stops.")}</h2>
  <div class="say">
    <div class="mono hd">WE SAY</div><div class="mono hd">WE DON'T SAY</div>
    ${SAY.map(([a, b]) => `<div class="yes">${a}</div><div class="no">${b}</div>`).join("")}
  </div>
  <div class="abs mono rules">SENTENCE CASE <em>✦</em> "YOU" AND "WE" <em>✦</em> REAL ACTIVITY NAMES <em>✦</em> 24-HOUR TIME <em>✦</em> NO EMOJI IN DESIGNS</div>`);

/* 11 — Logo */
add("Logo", `
  ${kicker("11 ✦ LOGO")}
  <h2>One mark. ${G("Used as is.")}</h2>
  <div class="logos">
    <div class="lg" style="background:#fff"><img src="${LOGO}" style="width:420px"><span class="mono">PRIMARY · ON LIGHT</span></div>
    <div class="lg" style="background:${C.ink}"><img src="${LOGO_W}" style="width:420px"><span class="mono" style="color:#A99BC4">ON DARK AND PHOTOS</span></div>
    <div class="lg" style="background:#fff"><img src="${ICON}" style="width:180px;border-radius:40px"><span class="mono">APP ICON · AVATARS</span></div>
  </div>
  <div class="dont">
    <div><b>Clear space</b><p>At least the height of the mark on every side.</p></div>
    <div><b>Minimum size</b><p>120px wide on screen, 25mm in print.</p></div>
    <div><b>Never</b><p>${S("Stretch")} ${S("recolour")} ${S("add effects")} ${S("redraw")}</p></div>
  </div>`);

/* 12 — Colour */
const sw = (bg, fg, n, hex, w, h) => `<div class="sw" style="background:${bg};color:${fg};width:${w}px;height:${h}px"><b>${n}</b><span class="mono">${hex}</span></div>`;
add("Colour", `
  ${kicker("12 ✦ COLOUR")}
  <h2 style="width:800px;font-size:96px">Paper first. Colour where the ${G("plans are.")}</h2>
  <div class="abs swatches" style="left:1000px;top:200px">
    ${sw("#FFFCF7", C.ink, "Paper", "#F6F1E9", 380, 220)}${sw(C.ink, "#fff", "Ink", "#1A0933", 380, 220)}
    <div class="sw" style="width:772px;height:120px;background:linear-gradient(90deg,${C.violet},${C.purple},${C.magenta});color:#fff"><b>The gradient</b><span class="mono">#7B2FFF → #A020F0 → #BF00FF · ONE PHRASE PER LAYOUT</span></div>
    ${sw(C.orange, C.ink, "Orange", "#FF7A45", 184, 160)}${sw(C.pink, "#fff", "Pink", "#E6399B", 184, 160)}${sw(C.lime, C.ink, "Lime", "#D9F26B", 184, 160)}${sw(C.violet, "#fff", "Violet", "#7B2FFF", 184, 160)}
    <div class="sw" style="width:772px;height:80px;background:${C.surface};color:${C.ink};flex-direction:row;align-items:center;justify-content:space-between"><b style="font-size:30px">Coral <span class="strike" style="font-weight:500">is only ever the strike-through</span></b><span class="mono">#FF5A3C</span></div>
  </div>
  <div class="abs" style="left:120px;top:560px;width:760px">
    <div class="mono lab2">HOW MUCH OF EACH</div>
    <div class="ratio"><i style="flex:70;background:#FFFCF7;box-shadow:inset 0 0 0 3px ${C.line}"></i><i style="flex:15;background:${C.ink}"></i><i style="flex:10;background:linear-gradient(90deg,${C.orange},${C.pink},${C.lime})"></i><i style="flex:5;background:${C.purple}"></i></div>
    <div class="mono ratiol"><span>PAPER 70%</span><span>INK 15%</span><span>EVENTS 10%</span><span>GRADIENT 5%</span></div>
  </div>`);

/* 13 — Type */
add("Type", `
  ${kicker("13 ✦ TYPE")}
  <div class="abs" style="left:120px;top:230px;width:900px">
    <div class="aa">Aa</div>
    <div class="tname">Bricolage Grotesque</div>
    <p class="body" style="margin-top:20px;width:760px">Our headline voice. Bold, tight, a little quirky. Weight 700, tracking -4.5%, sentence case, always left-aligned.</p>
  </div>
  <div class="abs" style="left:1040px;top:230px;width:760px">
    <div class="aa mono" style="font-size:300px;font-weight:400;letter-spacing:-.04em">Aa</div>
    <div class="tname mono" style="font-weight:600;font-size:52px;letter-spacing:.02em">JetBrains Mono</div>
    <p class="body" style="margin-top:20px">The calendar voice: labels, days and times, in UPPERCASE with wide tracking. SAT · 05:30.</p>
  </div>
  <div class="abs mono rules" style="top:960px">ALL FREE ON GOOGLE FONTS <em>✦</em> IN THE APP: OUTFIT FOR HEADINGS, GEIST FOR TEXT</div>`);

/* 14 — Signature moves */
const mv = (n, t, d, demo) => `<div class="mv"><span class="mono">${n}</span><div class="demo">${demo}</div><b>${t}</b><p>${d}</p></div>`;
add("Signature moves", `
  ${kicker("14 ✦ SIGNATURE MOVES")}
  <h2>Four things that make it ${G("ours.")}</h2>
  <div class="moves">
    ${mv("01", "The rewrite", "Cross out the old habit, then say the new one.", `<div class="old" style="font-size:44px">Coming soon.</div><div style="font:700 64px/0.95 'Bricolage Grotesque';letter-spacing:-.045em;color:${C.ink}">We're ${G("live.")}</div>`)}
    ${mv("02", "Calendar blocks", "Plans shown as colourful slots with a mono time.", `<div style="display:flex;gap:10px">${blk(C.orange, C.ink, "Trek", "05:30", "width:130px;height:120px")}${blk(C.pink, "#fff", "Supper", "20:00", "width:130px;height:120px")}</div>`)}
    ${mv("03", "Grid paper", "A cream page with faint squares, like a planner.", `<div class="gp"></div>`)}
    ${mv("04", "The sparkle", "The ✦ from our logo, used as a separator.", `<div style="font:700 56px 'Bricolage Grotesque';color:${C.ink};letter-spacing:-.03em">Book <em>✦</em> Host <em>✦</em> Explore</div>`)}
  </div>`);

/* 15 — In the wild */
add("In the wild", `
  ${kicker("15 ✦ IN THE WILD")}
  <img class="abs shot" src="${EX("calendar/linkedin-personal-1584x396.png")}" style="left:120px;top:200px;width:1680px">
  <div class="abs" style="left:120px;top:660px;display:flex;gap:28px">
    ${[1, 3, 5, 6, 7].map((n) => `<img class="shot" src="${EX(`launch-carousel/slide-0${n}-1080x1350.png`)}" style="width:250px">`).join("")}
    <img class="shot" src="${EX("calendar/profile-picture-cream-1080x1080.png")}" style="width:250px;height:250px;border-radius:50%">
  </div>`);

/* 16 — For hosts */
const tip = (bg, fg, t, d) => `<div class="tip" style="background:${bg};color:${fg}"><b>${t}</b><p>${d}</p></div>`;
add("For hosts", `
  ${kicker("16 ✦ FOR HOSTS")}
  <h2 style="width:1300px">Your slot. ${G("Our stage.")}</h2>
  <p class="body" style="margin-top:28px;width:1100px">Hosts are the heart of MySlotMate. A few simple habits make your slot easy to find, easy to say yes to, and clearly part of the family.</p>
  <div class="tips">
    ${tip(C.lime, C.ink, "Name it like a plan", "“Sunday biryani for ten”, not “Cooking experience”.")}
    ${tip(C.orange, C.ink, "Show real moments", "Your own bright photos of people doing the thing. No stock images.")}
    ${tip(C.purple, "#fff", "Say the practical bits", "Where to meet, what to bring, how long it runs, in 24-hour time.")}
    ${tip(C.ink, "#fff", "Mention us right", "“Book on MySlotMate” with our horizontal logo, unchanged.")}
  </div>`);

/* 17 — Close (dark) */
add("See you there", `
  <img class="abs" src="${LOGO_W}" style="left:120px;top:120px;height:60px">
  <div class="abs" style="left:120px;top:360px">
    <div class="old" style="font-size:120px;color:#4A4560">Goodbye.</div>
    <h1 class="light" style="font-size:230px;margin-top:16px">See you ${G("there.")}</h1>
  </div>
  <div class="abs mono" style="left:120px;top:880px;font-size:28px;letter-spacing:.18em;color:#F8F7FF;display:flex;gap:60px">
    <span>MYSLOTMATE.COM</span><span style="color:#D8B4FE">@MYSLOTMATE</span><span style="color:#A5A8C3">INSTAGRAM · LINKEDIN · X</span>
  </div>`, true);

/* ---------- assemble ---------- */
const N = pages.length;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>MySlotMate Brand Book</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=JetBrains+Mono:wght@400;600&display=block" rel="stylesheet">
<style>
@page { size: 1920px 1080px; margin: 0 }
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:${C.paper};-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Bricolage Grotesque",sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.page{width:1920px;height:1080px;position:relative;overflow:hidden;break-after:page;padding:230px 120px 0;
  background:${C.paper};background-image:linear-gradient(${C.line} 2px,transparent 2px),linear-gradient(90deg,${C.line} 2px,transparent 2px);background-size:60px 60px}
.page.dark{background:${C.ink};background-image:linear-gradient(#24123F 2px,transparent 2px),linear-gradient(90deg,#24123F 2px,transparent 2px);background-size:60px 60px;color:#F8F7FF}
.abs{position:absolute}.mono{font-family:"JetBrains Mono",monospace}
em{font-style:normal;color:${C.purple}}
.dark em{color:#D8B4FE}
.hdr{position:absolute;top:60px;left:120px;right:120px;display:flex;justify-content:space-between;font-size:20px;letter-spacing:.2em;color:${C.faint}}
.ftr{position:absolute;bottom:44px;left:120px;right:120px;display:flex;justify-content:space-between;font-size:20px;letter-spacing:.2em;color:${C.faint}}
.ruler{position:absolute;left:0;right:0;bottom:96px;height:2px;background:#D9D0C3}
.dark .ruler{background:#2E1C4F}.dark .hdr,.dark .ftr{color:#8F82AE}
.kick{position:absolute;left:120px;top:140px;font-size:24px;letter-spacing:.2em;font-weight:600;color:${C.purple}}
.dark .kick{color:${C.lime}}
h1,h2{font-weight:700;letter-spacing:-.045em;line-height:.94;color:${C.ink};text-wrap:balance}
h2{font-size:112px}
.light{color:#F8F7FF}
.grad{background:linear-gradient(90deg,${C.violet},${C.magenta});-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.04em;-webkit-box-decoration-break:clone}
.dark .grad{background:linear-gradient(90deg,#9B5CFF,#D94CFF);-webkit-background-clip:text;background-clip:text}
.old{color:${C.struck};font-weight:500;letter-spacing:-.045em;line-height:1;text-decoration:line-through;text-decoration-color:${C.coral};text-decoration-thickness:.07em}
.strike{text-decoration:line-through;text-decoration-color:${C.coral};text-decoration-thickness:.08em}
.body{font-size:32px;line-height:1.42;color:${C.muted};letter-spacing:-.01em}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:56px}
.blk{border-radius:24px;padding:22px 26px;display:flex;flex-direction:column;gap:8px;box-shadow:0 18px 40px rgba(26,9,51,.14)}
.blk b{font-size:42px;font-weight:700;letter-spacing:-.03em;line-height:1}
.blk span{font-family:"JetBrains Mono",monospace;font-size:18px;letter-spacing:.06em;opacity:.85}
.agenda{display:grid;grid-template-columns:1fr 1fr;gap:18px 60px;width:760px}
.ag{display:flex;align-items:center;gap:20px;padding:16px 0;border-bottom:2px solid ${C.line}}
.ag span{font-size:20px;color:${C.faint};width:36px}.ag i{width:22px;height:22px;border-radius:6px}.ag b{font-size:32px;font-weight:700;letter-spacing:-.025em}
.week{display:flex;gap:10px}
.wcol{width:86px;display:flex;flex-direction:column;gap:10px}
.day{font-size:16px;letter-spacing:.18em;color:${C.faint};padding-left:4px}
.meet{height:150px;border-radius:14px;background:${C.surface};padding:12px 10px;color:${C.faint}}
.meet b{font-size:18px;font-weight:700;text-decoration:line-through;text-decoration-color:${C.coral};text-decoration-thickness:2px;letter-spacing:-.01em;line-height:1.1;display:block}
.empty{height:310px;border:3px dashed #CFC5D8;border-radius:14px;display:grid;place-items:center;text-align:center;font-size:14px;letter-spacing:.12em;color:${C.faint}}
.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:70px;width:1680px}
.pillar{border-radius:32px;padding:44px 48px;height:380px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 44px rgba(26,9,51,.14)}
.pillar span{font-size:20px;letter-spacing:.2em;opacity:.8}.pillar b{font-size:96px;font-weight:800;letter-spacing:-.05em;line-height:1}
.pillar p{font-size:30px;line-height:1.35;margin-top:auto;letter-spacing:-.01em}
.lab{font-size:22px;letter-spacing:.22em;color:${C.lime}}
.bel{display:flex;align-items:baseline;gap:40px}
.bel .old{font-size:52px;width:400px;flex:none}
.bel b{font-size:84px;font-weight:700;letter-spacing:-.045em;line-height:1}
.lanes{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px;width:1680px}
.lane{font-size:22px;letter-spacing:.22em;color:${C.faint};margin-bottom:18px}
.stp{height:130px;border-radius:26px;display:flex;align-items:center;gap:30px;padding:0 40px;margin-bottom:18px;box-shadow:0 14px 30px rgba(26,9,51,.1)}
.stp span{font-size:24px;opacity:.7;letter-spacing:.1em}.stp b{font-size:56px;font-weight:700;letter-spacing:-.035em}
.whos{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:70px;width:1680px}
.who{height:230px;border-radius:28px;padding:34px 40px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 14px 30px rgba(26,9,51,.1)}
.who span{font-size:18px;letter-spacing:.22em;opacity:.75}.who b{font-size:40px;font-weight:700;letter-spacing:-.03em;line-height:1.08}
.traits{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:90px;width:1680px}
.trait{border-top:4px solid ${C.ink};padding-top:28px;display:flex;flex-direction:column;gap:12px}
.trait b{font-size:110px;font-weight:800;letter-spacing:-.05em;line-height:.9}.trait .old{font-size:46px}
.say{display:grid;grid-template-columns:1fr 1fr;column-gap:60px;margin-top:60px;width:1680px}
.say .hd{font-size:22px;letter-spacing:.22em;color:${C.faint};padding-bottom:14px;border-bottom:3px solid ${C.ink}}
.say .yes,.say .no{font-size:40px;padding:22px 0;border-bottom:2px solid ${C.line};letter-spacing:-.025em;line-height:1.15}
.say .yes{font-weight:700}.say .no{color:${C.struck};text-decoration:line-through;text-decoration-color:${C.coral};text-decoration-thickness:3px}
.rules{left:120px;top:930px;font-size:22px;letter-spacing:.2em;color:${C.ink}}
.logos{display:grid;grid-template-columns:1.2fr 1.2fr .8fr;gap:24px;margin-top:56px;width:1680px}
.lg{height:340px;border-radius:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;box-shadow:0 14px 30px rgba(26,9,51,.1);position:relative}
.lg span{position:absolute;bottom:26px;font-size:18px;letter-spacing:.2em;color:${C.faint}}
.dont{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:40px;width:1680px}
.dont b{font-size:34px;font-weight:700;letter-spacing:-.03em}.dont p{font-size:28px;color:${C.muted};margin-top:8px;line-height:1.35}
.dont .strike{color:${C.struck};margin-right:14px}
.swatches{display:flex;flex-wrap:wrap;gap:12px;width:772px}
.sw{border-radius:24px;padding:24px 26px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 14px 30px rgba(26,9,51,.1)}
.sw b{font-size:40px;font-weight:700;letter-spacing:-.03em}.sw span{font-size:16px;letter-spacing:.12em;opacity:.85}
.lab2{font-size:22px;letter-spacing:.22em;color:${C.faint};margin-bottom:18px}
.ratio{display:flex;height:70px;border-radius:18px;overflow:hidden;gap:4px}
.ratiol{display:flex;justify-content:space-between;font-size:18px;letter-spacing:.16em;color:${C.muted};margin-top:16px}
.aa{font-size:340px;font-weight:700;letter-spacing:-.06em;line-height:.85}
.tname{font-size:64px;font-weight:700;letter-spacing:-.04em;margin-top:36px}
.moves{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:60px;width:1680px}
.mv{display:flex;flex-direction:column;gap:14px}
.mv>span{font-size:20px;letter-spacing:.2em;color:${C.faint}}
.demo{height:280px;border-radius:28px;background:#FFFCF7;box-shadow:0 14px 30px rgba(26,9,51,.08);display:flex;flex-direction:column;justify-content:center;padding:28px;overflow:hidden}
.mv b{font-size:44px;font-weight:700;letter-spacing:-.035em;margin-top:8px}.mv p{font-size:26px;color:${C.muted};line-height:1.35}
.gp{height:100%;border-radius:16px;background:${C.paper};background-image:linear-gradient(${C.line} 2px,transparent 2px),linear-gradient(90deg,${C.line} 2px,transparent 2px);background-size:28px 28px;border:2px solid ${C.line}}
.shot{border-radius:22px;box-shadow:0 20px 44px rgba(26,9,51,.18);display:block}
.tips{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:70px;width:1680px}
.tip{height:330px;border-radius:28px;padding:36px 38px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 14px 30px rgba(26,9,51,.12)}
.tip b{font-size:46px;font-weight:700;letter-spacing:-.035em;line-height:1}.tip p{font-size:27px;line-height:1.35}
</style></head><body>
${pages.map((p, i) => `<section class="page${p.dark ? " dark" : ""}" id="p${i + 1}">
  <div class="hdr mono"><span>MYSLOTMATE ✦ BRAND BOOK</span><span>${String(i + 1).padStart(2, "0")} / ${N}</span></div>
  ${p.html}
  <div class="ruler"></div>
  <div class="ftr mono"><span>${p.label.toUpperCase()}</span><span>MYSLOTMATE.COM</span></div>
</section>`).join("\n")}
<script>/* #n shows page n alone (for previews) */const n=+location.hash.slice(1);if(n)document.querySelectorAll('.page').forEach((p,i)=>{if(i!==n-1)p.style.display='none'});</script>
</body></html>`;
writeFileSync(resolve(HERE, "html-book/brand-book.html"), html);
console.log("pages", N);
