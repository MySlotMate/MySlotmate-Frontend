"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { FiX, FiCheck, FiRotateCw } from "react-icons/fi";

interface ImageCropModalProps {
  /** File picked by the user. Null when the modal is closed. */
  file: File | null;
  /** Optional fixed aspect ratio (e.g. 16/9). Omit for fully freeform crop. */
  aspect?: number;
  outputType?: "image/jpeg" | "image/png";
  /** Output quality 0-1 (JPEG only). */
  quality?: number;
  /** Max output dimension (px). The cropped image is downscaled to fit. */
  maxDimension?: number;
  onClose: () => void;
  /** Called with the cropped Blob. The caller uploads. */
  onConfirm: (blob: Blob, fileName: string) => void;
}

/**
 * Reusable image crop modal using react-image-crop.
 *
 * Crop frame is drag-resizable from any corner / edge. When `aspect` is set,
 * the frame keeps a fixed ratio; otherwise it's fully freeform.
 */
export function ImageCropModal({
  file,
  aspect,
  outputType = "image/jpeg",
  quality = 0.92,
  maxDimension = 1920,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Read file → data URL whenever a new file is supplied.
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      setCrop(undefined);
      setCompletedCrop(null);
      setRotation(0);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const initial = aspect
        ? centerCrop(
            makeAspectCrop(
              { unit: "%", width: 80 },
              aspect,
              img.naturalWidth,
              img.naturalHeight,
            ),
            img.naturalWidth,
            img.naturalHeight,
          )
        : centerCrop(
            { unit: "%", x: 10, y: 10, width: 80, height: 80 },
            img.naturalWidth,
            img.naturalHeight,
          );
      setCrop(initial);
    },
    [aspect],
  );

  const handleConfirm = useCallback(async () => {
    const img = imgRef.current;
    if (!img || !completedCrop || !file) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(
        img,
        completedCrop,
        rotation,
        outputType,
        quality,
        maxDimension,
      );
      onConfirm(blob, file.name);
    } finally {
      setBusy(false);
    }
  }, [
    completedCrop,
    rotation,
    outputType,
    quality,
    maxDimension,
    file,
    onConfirm,
  ]);

  if (!file || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Crop image</h2>
            <p className="text-xs text-gray-500">
              Drag the corners or edges to resize the crop area.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-[#1f2937] p-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            keepSelection
            ruleOfThirds
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop source"
              onLoad={onImageLoad}
              style={{
                maxHeight: "70vh",
                transform: `rotate(${rotation}deg)`,
              }}
            />
          </ReactCrop>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <FiRotateCw size={14} />
            Rotate
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={busy || !completedCrop}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0094CA] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#007ba8] disabled:opacity-50"
          >
            <FiCheck size={16} />
            {busy ? "Processing…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Crop, optionally rotate, and downscale the image to a Blob using an
 * offscreen canvas. PixelCrop coordinates are in DISPLAYED pixels, so we
 * scale by the natural/displayed ratio.
 */
async function getCroppedBlob(
  img: HTMLImageElement,
  crop: PixelCrop,
  rotation: number,
  outputType: "image/jpeg" | "image/png",
  quality: number,
  maxDimension: number,
): Promise<Blob> {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const cropW = crop.width * scaleX;
  const cropH = crop.height * scaleY;

  // Render the rotated source onto a buffer canvas, then extract the crop.
  const buffer = document.createElement("canvas");
  const safeSize = Math.max(img.naturalWidth, img.naturalHeight) * 2;
  buffer.width = safeSize;
  buffer.height = safeSize;
  const bctx = buffer.getContext("2d");
  if (!bctx) throw new Error("Canvas 2D context unavailable");

  bctx.translate(safeSize / 2, safeSize / 2);
  bctx.rotate((rotation * Math.PI) / 180);
  bctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const offsetX = safeSize / 2 - img.naturalWidth / 2;
  const offsetY = safeSize / 2 - img.naturalHeight / 2;

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas 2D context unavailable");
  octx.drawImage(
    buffer,
    cropX + offsetX,
    cropY + offsetY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH,
  );

  // Downscale if needed.
  let finalCanvas = out;
  const largest = Math.max(out.width, out.height);
  if (largest > maxDimension) {
    const scale = maxDimension / largest;
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(out.width * scale);
    scaled.height = Math.round(out.height * scale);
    const sctx = scaled.getContext("2d");
    if (!sctx) throw new Error("Canvas 2D context unavailable");
    sctx.drawImage(out, 0, 0, scaled.width, scaled.height);
    finalCanvas = scaled;
  }

  return new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      outputType,
      quality,
    );
  });
}
