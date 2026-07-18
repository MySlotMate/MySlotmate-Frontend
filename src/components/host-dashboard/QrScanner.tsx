"use client";

import { useEffect, useRef, useState } from "react";
import { FiCameraOff } from "react-icons/fi";

interface QrScannerProps {
  /** Fired once per decoded QR. Ignored while `paused` is true. */
  onScan: (raw: string) => void;
  /** Keeps the camera running but drops decoded codes. */
  paused: boolean;
}

/**
 * Camera QR reader. qr-scanner drives a <video> element and touches
 * `navigator.mediaDevices`, so this component is client-only and loads the
 * library after mount rather than importing it at module scope.
 */
export default function QrScanner({ onScan, paused }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Both props are read through refs so the effect below runs exactly once.
  // Starting a camera is slow and visibly flickers, so it must not restart
  // whenever the parent re-renders with a new callback identity or pause state.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let scanner: { stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { default: QrScannerLib } = await import("qr-scanner");
        if (cancelled) return;

        const instance = new QrScannerLib(
          video,
          (result: { data: string }) => {
            if (!pausedRef.current) onScanRef.current(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: "environment",
            maxScansPerSecond: 5,
          },
        );
        scanner = instance;
        await instance.start();
        if (cancelled) instance.destroy();
      } catch (err) {
        if (cancelled) return;
        const denied =
          err instanceof Error &&
          /permission|denied|notallowed/i.test(`${err.name} ${err.message}`);
        setError(
          denied
            ? "Camera permission denied. Allow camera access, then reload."
            : "Could not start the camera. Check that no other app is using it.",
        );
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
    // Mount-only: the camera is started once and driven through the refs above.
  }, []);

  if (error) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <FiCameraOff className="h-8 w-8 text-red-400" />
        <p className="text-sm font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="w-full rounded-2xl" muted playsInline />
      {paused && (
        <div className="pointer-events-none absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      )}
    </div>
  );
}
