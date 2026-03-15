import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

function nowIso() {
  return new Date().toISOString();
}

function isUuidLike(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? ""),
  );
}

async function visit(page, path, { label }) {
  const entry = {
    label,
    path,
    url: new URL(path, baseUrl).toString(),
    startedAt: nowIso(),
    navigation: { ok: false, status: null, redirectedFrom: null },
    console: [],
    pageErrors: [],
    requestFailures: [],
    detected: { nextErrorOverlay: false },
  };

  const onConsole = (msg) => {
    entry.console.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location?.() ?? null,
    });
  };
  const onPageError = (err) => {
    entry.pageErrors.push({ message: String(err?.message ?? err), stack: err?.stack ?? null });
  };
  const onRequestFailed = (req) => {
    entry.requestFailures.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      failure: req.failure()?.errorText ?? null,
    });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  try {
    const resp = await page.goto(entry.url, { waitUntil: "domcontentloaded" });
    entry.navigation.ok = true;
    entry.navigation.status = resp?.status?.() ?? null;
    entry.navigation.redirectedFrom = resp?.request?.()?.redirectedFrom?.()?.url?.() ?? null;

    // Let client components hydrate and any sockets attempt to connect.
    await page.waitForTimeout(2000);

    // Detect Next.js dev error overlay (best-effort).
    entry.detected.nextErrorOverlay = (await page.locator("nextjs-portal").count()) > 0;
  } catch (e) {
    entry.navigation.ok = false;
    entry.pageErrors.push({ message: String(e?.message ?? e), stack: e?.stack ?? null });
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    entry.finishedAt = nowIso();
  }

  return entry;
}

async function main() {
  const uuidLike = process.env.MSM_HOST_ID ?? "123e4567-e89b-12d3-a456-426614174000";
  if (!isUuidLike(uuidLike)) {
    throw new Error(`MSM_HOST_ID must be UUID-like. Got: ${uuidLike}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const report = {
    baseUrl,
    startedAt: nowIso(),
    runs: [],
    notes: [
      "This script captures console/page errors and request failures.",
      "It does not assert UI content beyond basic Next.js overlay detection.",
    ],
  };

  report.runs.push(await visit(page, "/host-dashboard", { label: "overview" }));
  report.runs.push(await visit(page, "/host-dashboard/calendar", { label: "calendar" }));

  // Messages (no host id in localStorage)
  await context.addInitScript(() => {
    try {
      localStorage.removeItem("msm_host_id");
    } catch {
      // ignore
    }
  });
  report.runs.push(await visit(page, "/host-dashboard/messages", { label: "messages:no-host-id" }));

  // Messages (simulate host id)
  await context.addInitScript((v) => {
    try {
      localStorage.setItem("msm_host_id", v);
    } catch {
      // ignore
    }
  }, uuidLike);
  report.runs.push(await visit(page, "/host-dashboard/messages", { label: "messages:with-host-id" }));

  report.runs.push(await visit(page, "/host-dashboard/earnings", { label: "earnings" }));

  report.finishedAt = nowIso();
  await browser.close();

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();

