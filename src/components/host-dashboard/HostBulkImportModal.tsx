"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import {
  LuX,
  LuDownload,
  LuUpload,
  LuLoader2,
  LuCheckCircle,
  LuAlertTriangle,
  LuFileSpreadsheet,
} from "react-icons/lu";
import { toast } from "sonner";
import * as api from "~/lib/api";
import type { OccurrenceAvailability } from "~/lib/api";

// Times are IST everywhere in this product; mirrors HostOnSpotBookingModal.
const istFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
function formatOccurrence(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : istFormatter.format(d);
}

// Money is stored in paise throughout the API.
function formatRupees(cents: number): string {
  return `\u20B9${(cents / 100).toLocaleString("en-IN")}`;
}

// How often the progress view re-reads the job. The rows are booked
// sequentially server-side, so a couple of seconds is plenty.
const POLL_MS = 2000;

interface HostBulkImportModalProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  /** Fired once the job finishes with at least one booking, so the dashboard
   *  can refresh its counts. */
  onImported?: () => void;
}

/**
 * Bulk booking import: the host downloads an .xlsx template, fills in guest
 * names and phone numbers, uploads it, and watches the rows get booked.
 *
 * Two-phase by design. Header and parse errors are returned synchronously by the
 * upload call, so a malformed file is rejected here and now, with the missing
 * columns named. Only once the file is known-good does a job exist, and from
 * then on the view is pure progress: processed/total, successes, and a table of
 * failed rows the host can act on.
 */
export default function HostBulkImportModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onImported,
}: HostBulkImportModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [authUser] = useAuthState(auth);
  const [idToken, setIdToken] = useState<string | null>(null);
  useEffect(() => {
    if (authUser) {
      void authUser.getIdToken().then(setIdToken);
    } else {
      setIdToken(localStorage.getItem("msm_auth_token"));
    }
  }, [authUser]);

  const [occurrences, setOccurrences] = useState<OccurrenceAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [occLoading, setOccLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerError, setHeaderError] =
    useState<api.BookingImportHeaderError | null>(null);
  // Set when the event genuinely can't be imported (tiered, or attendee-detail
  // gated). Blocks upload rather than letting the host waste time on a sheet.
  const [blocked, setBlocked] = useState<string | null>(null);
  // Payment terms for this event, from the server. Drives the offline-payment
  // notice: a PAID event is importable, but only by the host declaring they
  // collected the fee themselves.
  const [eligibility, setEligibility] =
    useState<api.BookingImportValidation | null>(null);
  const [offlineAck, setOfflineAck] = useState(false);
  // A rejected comp code, shown under the coupon field. Separate from `blocked`
  // so a typo never unmounts the field itself.
  const [couponError, setCouponError] = useState<string | null>(null);

  const [status, setStatus] = useState<api.BookingImportStatus | null>(null);
  // The full per-row report, fetched once the job finishes. Kept out of the poll
  // response so a 1000-row import doesn't ship its whole row list every 2s.
  const [reportRows, setReportRows] = useState<api.BookingImportRow[] | null>(
    null,
  );
  const [reportTab, setReportTab] = useState<"failed" | "success">("failed");
  const [downloadingReport, setDownloadingReport] = useState(false);
  // The poll loop is self-perpetuating: each completed fetch changes state, which
  // re-runs the effect and schedules the next tick. A failed fetch leaves `status`
  // untouched, so it must bump this counter instead — otherwise one network blip
  // silently ends polling and the progress bar freezes mid-import forever.
  const [pollTick, setPollTick] = useState(0);
  // Guards the onImported callback so it fires once, not on every poll tick.
  const notifiedRef = useRef(false);

  const reset = useCallback(() => {
    setFile(null);
    setCouponCode("");
    setError(null);
    setHeaderError(null);
    setStatus(null);
    setBlocked(null);
    setReportRows(null);
    setReportTab("failed");
    setOfflineAck(false);
    setCouponError(null);
    notifiedRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  // On open: load the bookable dates. Deliberately NOT gated on idToken — the
  // availability endpoint is public, and gating it on a token that resolves
  // asynchronously would leave this effect having already bailed out by the time
  // the token arrives, stranding the dropdown on "No upcoming dates".
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setOccLoading(true);

    api
      .getEventAvailability(eventId)
      .then((res) => {
        if (cancelled) return;
        const now = Date.now();
        const upcoming = (res.data || []).filter(
          (o) => !o.is_paused && new Date(o.date).getTime() > now,
        );
        setOccurrences(upcoming);
        const firstOpen =
          upcoming.find((o) => !o.is_fully_booked) ?? upcoming[0];
        setSelectedDate(firstOpen ? firstOpen.date : "");
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load available dates.");
      })
      .finally(() => {
        if (!cancelled) setOccLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, eventId]);

  // Re-checked whenever the coupon changes (not just on open): a paid event is
  // blocked only until a comp code is supplied, so the banner has to clear once
  // the host types a valid one — otherwise they enter a working code and still
  // stare at "this event is paid".
  const checkImportable = useCallback(
    (code: string) => {
      if (!idToken) return;
      setCouponError(null);
      api
        .validateBookingImportEvent(eventId, idToken, code.trim() || undefined)
        .then((res) => {
          setEligibility(res.data);
          setBlocked(null);
          // A comp code that covers the event removes the offline liability, so
          // a stale tick can't leak through as an unintended declaration.
          if (res.data.payment_mode !== "offline") setOfflineAck(false);
        })
        .catch((err: Error & { status?: number }) => {
          // A rejected COUPON (400) must not tear down the payment section — the
          // coupon input lives inside it, so nulling eligibility would make the
          // field the host just typed into disappear with no way to correct it.
          // Only a hard rejection (tiered / attendee-details / not-owner) means
          // the section genuinely shouldn't render.
          if (err.status === 400) {
            setCouponError(err.message);
            return;
          }
          setEligibility(null);
          setBlocked(err.message);
        });
    },
    [eventId, idToken],
  );

  useEffect(() => {
    if (!isOpen) return;
    checkImportable(couponCode);
    // Deliberately not keyed on couponCode — that would fire a request per
    // keystroke. The coupon field re-checks on blur instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, checkImportable]);

  // Poll the running job. Stops as soon as the job reaches a terminal state.
  useEffect(() => {
    const jobId = status?.job.id;
    const jobStatus = status?.job.status;
    if (!jobId || !idToken) return;
    if (jobStatus === "completed" || jobStatus === "failed") return;

    const timer = setTimeout(() => {
      api
        .getBookingImportJob(jobId, idToken)
        .then((res) => setStatus(res.data))
        // A transient failure isn't worth interrupting the host over, but it
        // must still drive the next tick — see the note on pollTick.
        .catch(() => setPollTick((t) => t + 1));
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [status, pollTick, idToken]);

  // Once the job is done, pull the full row list so the host can review what
  // booked as well as what didn't. Runs once — `reportRows` being non-null is
  // the guard, and the tab defaults to whichever list is worth reading first.
  useEffect(() => {
    const job = status?.job;
    if (!job || !idToken || reportRows !== null) return;
    if (job.status !== "completed" && job.status !== "failed") return;

    api
      .listBookingImportRows(job.id, idToken)
      .then((res) => {
        setReportRows(res.data);
        setReportTab(job.failed_rows > 0 ? "failed" : "success");
      })
      .catch(() => {
        // Non-fatal: the counters and the poll's failed-row list are still shown,
        // and the downloadable report is unaffected.
        setReportRows([]);
      });
  }, [status, idToken, reportRows]);

  // Tell the dashboard to refresh, once, when a finished job booked anything.
  useEffect(() => {
    const job = status?.job;
    if (!job || notifiedRef.current) return;
    if (job.status === "completed" && job.success_rows > 0) {
      notifiedRef.current = true;
      onImported?.();
    }
  }, [status, onImported]);

  const handleDownloadTemplate = async () => {
    if (!idToken) return;
    setDownloading(true);
    try {
      const blob = await api.downloadBookingImportTemplate(idToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "myslotmate-booking-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the template. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadReport = async () => {
    const job = status?.job;
    if (!job || !idToken) return;
    setDownloadingReport(true);
    try {
      const blob = await api.downloadBookingImportReport(job.id, idToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-import-report-${job.id.slice(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the report. Please try again.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !idToken) return;
    setUploading(true);
    setError(null);
    setHeaderError(null);
    try {
      const res = await api.uploadBookingImport(
        {
          file,
          eventId,
          occurrenceDate: selectedDate || undefined,
          couponCode: couponCode.trim() || undefined,
          offlineAck,
        },
        idToken,
      );
      // The job is already running; switch to the progress view and let the
      // poll effect take over.
      setStatus({ job: res.data, failed_rows: [] });
    } catch (err) {
      const e = err as Error;
      setHeaderError(api.getImportHeaderError(err));
      setError(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const job = status?.job;
  const running =
    job && (job.status === "pending" || job.status === "processing");
  const finished = job?.status === "completed" || job?.status === "failed";
  const percent =
    job && job.total_rows > 0
      ? Math.round((job.processed_rows / job.total_rows) * 100)
      : 0;

  // While the job runs, only the failed rows are available (they ride the poll).
  // Once it's done, the full list arrives and the tabs become meaningful.
  const bookedRows = (reportRows ?? []).filter((r) => r.status === "success");
  const failedRows = reportRows
    ? reportRows.filter((r) => r.status === "failed")
    : (status?.failed_rows ?? []);
  const visibleRows = reportTab === "success" ? bookedRows : failedRows;

  // Seats actually booked. Null until the full row list has loaded — the job
  // counters track ROWS, and a row may hold several seats, so there is no honest
  // seat count before then.
  const bookedSeats = reportRows
    ? bookedRows.reduce((sum, r) => sum + r.quantity, 0)
    : null;

  const isPaidEvent = (eligibility?.unit_price_cents ?? 0) > 0;
  const isCouponMode = eligibility?.payment_mode === "coupon";
  const needsOfflineAck = eligibility?.requires_offline_ack === true;
  // The upload button waits on the declaration, mirroring the server's own
  // check — the server rejects with 428 regardless, this just avoids the trip.
  const uploadBlocked = needsOfflineAck && !offlineAck;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Bulk add bookings
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{eventTitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* ---------------- Upload phase ---------------- */}
          {!job && (
            <>
              <ol className="space-y-1 text-sm text-gray-600">
                <li>
                  <span className="font-semibold text-gray-900">1.</span>{" "}
                  Download the template below.
                </li>
                <li>
                  <span className="font-semibold text-gray-900">2.</span> Fill
                  in each guest&apos;s <strong>Name</strong> and{" "}
                  <strong>Phone</strong> (Quantity is optional). One row per
                  phone number.
                </li>
                <li>
                  <span className="font-semibold text-gray-900">3.</span> Upload
                  it here — we&apos;ll book each row and report any that fail.
                </li>
              </ol>

              <button
                onClick={handleDownloadTemplate}
                disabled={downloading || !idToken}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0094CA] bg-[#0094CA]/5 px-4 py-3 text-sm font-semibold text-[#0094CA] transition hover:bg-[#0094CA]/10 disabled:opacity-60"
              >
                {downloading ? (
                  <LuLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LuDownload className="h-4 w-4" />
                )}
                Download Excel template
              </button>

              {blocked && (
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <LuAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{blocked}</span>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Date &amp; time
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition outline-none focus:border-[#0094CA] disabled:opacity-60"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={uploading || occLoading || occurrences.length === 0}
                >
                  {occLoading && <option value="">Loading dates…</option>}
                  {!occLoading && occurrences.length === 0 && (
                    <option value="">No upcoming dates</option>
                  )}
                  {!occLoading &&
                    occurrences.map((o) => (
                      <option key={o.date} value={o.date}>
                        {formatOccurrence(o.date)}
                        {o.is_fully_booked
                          ? " — Full"
                          : ` — ${o.remaining} left`}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Every guest in the file is booked onto this slot (times in
                  IST).
                </p>
              </div>

              {/* Coupon — only meaningful for paid events */}
              {/* Payment — only shown for a paid experience, where the host has
                  a real choice to make. Free events need nothing here. */}
              {isPaidEvent && (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Payment
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRupees(eligibility?.unit_price_cents ?? 0)} / guest
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Free-booking code{" "}
                      <span className="font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      onBlur={(e) => checkImportable(e.target.value)}
                      placeholder="e.g. GUESTLIST"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition outline-none focus:border-[#0094CA]"
                      disabled={uploading}
                    />
                    {couponError ? (
                      <p className="mt-1 text-xs font-medium text-red-700">
                        {couponError}
                      </p>
                    ) : (
                      isCouponMode && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          Code accepted — these bookings are comped to free.
                        </p>
                      )
                    )}
                  </div>

                  {/* The offline declaration. A bulk upload cannot take payment,
                      so with no comp code the host is stating they collected it
                      themselves. Re-checked server-side. */}
                  {needsOfflineAck && (
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <input
                        type="checkbox"
                        checked={offlineAck}
                        onChange={(e) => setOfflineAck(e.target.checked)}
                        disabled={uploading}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0094CA]"
                      />
                      <span className="text-xs text-amber-900">
                        <strong className="block">
                          I have collected payment from these guests myself.
                        </strong>
                        MySlotMate isn&apos;t handling this money, so these
                        bookings won&apos;t add to your earnings or payouts.
                        They&apos;ll be recorded as collected offline.
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* File */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Filled spreadsheet
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setError(null);
                    setHeaderError(null);
                  }}
                  disabled={uploading}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
              </div>

              {(error ?? headerError) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {headerError ? (
                    <>
                      <p className="font-semibold">
                        Your spreadsheet is missing{" "}
                        {headerError.missing.length === 1
                          ? "a column"
                          : "some columns"}
                        .
                      </p>
                      <p className="mt-1">
                        Missing:{" "}
                        <strong>{headerError.missing.join(", ")}</strong>
                        <br />
                        Expected: {headerError.expected.join(", ")}
                        <br />
                        Found: {headerError.found.join(", ") || "(nothing)"}
                      </p>
                      <p className="mt-1.5 text-xs">
                        Download the template above and copy your guests into
                        it.
                      </p>
                    </>
                  ) : (
                    error
                  )}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={
                  uploading ||
                  !file ||
                  !idToken ||
                  !selectedDate ||
                  uploadBlocked
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0094CA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-60"
              >
                {uploading ? (
                  <LuLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LuUpload className="h-4 w-4" />
                )}
                {uploading ? "Checking your file…" : "Upload and book"}
              </button>
            </>
          )}

          {/* ---------------- Progress phase ---------------- */}
          {job && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <LuFileSpreadsheet className="h-5 w-5 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {job.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {job.total_rows} guest{job.total_rows === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {running ? "Booking guests…" : "Finished"}
                  </span>
                  <span className="text-gray-500">
                    {job.processed_rows} of {job.total_rows}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      finished ? "bg-emerald-500" : "bg-[#0094CA]"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-2xl font-bold text-emerald-700">
                    {job.success_rows}
                  </p>
                  <p className="text-xs font-medium text-emerald-700">Booked</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-2xl font-bold text-red-700">
                    {job.failed_rows}
                  </p>
                  <p className="text-xs font-medium text-red-700">Failed</p>
                </div>
              </div>

              {job.status === "failed" && job.error_message && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {job.error_message}
                </div>
              )}

              {/* Offline imports: restate what the host collected, since the
                  platform holds none of this money and its own earnings screens
                  will (correctly) show nothing for these seats. */}
              {job.payment_mode === "offline" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                  {/* The total is withheld until the full row list has loaded:
                      job.success_rows counts ROWS, not seats, so using it while
                      the import runs would show a knowingly-understated rupee
                      figure that then jumps. A wrong money number, however
                      briefly, is worse than no number. */}
                  {bookedSeats !== null ? (
                    <>
                      <strong className="block text-sm">
                        Collected offline:{" "}
                        {formatRupees(job.unit_price_cents * bookedSeats)}
                      </strong>
                      {formatRupees(job.unit_price_cents)} x {bookedSeats} seat
                      {bookedSeats === 1 ? "" : "s"} you collected directly.
                    </>
                  ) : (
                    <strong className="block text-sm">
                      Payment collected by you —{" "}
                      {formatRupees(job.unit_price_cents)} per guest
                    </strong>
                  )}{" "}
                  These bookings don&apos;t count towards your MySlotMate
                  earnings or payouts.
                </div>
              )}

              {finished && job.failed_rows === 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  <LuCheckCircle className="h-4 w-4" />
                  All {job.success_rows} guests were booked.
                </div>
              )}

              {/* Per-row report. While the job runs only failures are known
                  (they ride the poll); once it finishes both lists are shown. */}
              {(failedRows.length > 0 ||
                (finished && bookedRows.length > 0)) && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      onClick={() => setReportTab("failed")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        reportTab === "failed"
                          ? "bg-red-50 text-red-700"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      Didn&apos;t book ({job.failed_rows})
                    </button>
                    <button
                      onClick={() => setReportTab("success")}
                      disabled={!finished}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                        reportTab === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                      title={
                        finished
                          ? undefined
                          : "Available once the import finishes"
                      }
                    >
                      Booked ({job.success_rows})
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Row</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Phone</th>
                          <th className="px-3 py-2 font-medium">
                            {reportTab === "success" ? "Seats" : "Reason"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visibleRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-6 text-center text-sm text-gray-400"
                            >
                              {reportTab === "success"
                                ? "No guests were booked."
                                : "Nothing failed."}
                            </td>
                          </tr>
                        ) : (
                          visibleRows.map((row) => (
                            <tr key={row.id}>
                              <td className="px-3 py-2 text-gray-400">
                                {row.row_number}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {row.guest_name || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {row.guest_phone || "—"}
                              </td>
                              {reportTab === "success" ? (
                                <td className="px-3 py-2 text-gray-600">
                                  {row.quantity}
                                </td>
                              ) : (
                                <td className="px-3 py-2 text-red-700">
                                  {row.error_message ?? "Unknown error"}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {reportTab === "failed" && failedRows.length > 0 && (
                    <p className="mt-1.5 text-xs text-gray-400">
                      Fix these in your sheet and upload just those rows again —
                      guests already booked won&apos;t be duplicated.
                    </p>
                  )}
                </div>
              )}

              {finished && (
                <button
                  onClick={handleDownloadReport}
                  disabled={downloadingReport}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0094CA] bg-[#0094CA]/5 px-4 py-3 text-sm font-semibold text-[#0094CA] transition hover:bg-[#0094CA]/10 disabled:opacity-60"
                >
                  {downloadingReport ? (
                    <LuLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LuDownload className="h-4 w-4" />
                  )}
                  Download full report (Excel)
                </button>
              )}

              {running && (
                <p className="text-center text-xs text-gray-400">
                  You can close this window — booking continues in the
                  background.
                </p>
              )}

              <div className="flex gap-3">
                {finished && (
                  <button
                    onClick={reset}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Import another file
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-xl bg-[#0094CA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#007ba8]"
                >
                  {finished ? "Done" : "Close"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
