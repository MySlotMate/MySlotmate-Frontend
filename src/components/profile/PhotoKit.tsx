"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Images,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useUpdateEvent, useUploadFiles } from "~/hooks/useApi";
import type { EventDTO } from "~/lib/api";
import { formatIST } from "~/lib/datetime";
import { CARD, EmptyCard } from "./ProfileKit";

/**
 * Shared photo pieces: the full-screen viewer, and the host's event albums
 * (photos added to an experience reach every guest's journey).
 */

const MAX_PHOTOS = 20;

function photosOf(e: EventDTO) {
  return Array.from(
    new Set([e.cover_image_url ?? "", ...(e.gallery_urls ?? [])]),
  ).filter(Boolean);
}

/* ------------------------------------------------------------------ */

export function Lightbox({
  title,
  photos,
  start,
  removable,
  onRemove,
  onClose,
}: {
  title: string;
  photos: string[];
  start: number;
  /** Photos the host may delete (the gallery, not the poster). */
  removable: Set<string>;
  onRemove?: (url: string) => void;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const n = photos.length;
  const url = photos[Math.min(i, n - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => (v + 1) % n);
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, onClose]);

  if (!url || typeof document === "undefined") return null;
  // Portal to <body>, and keep clicks from bubbling: albums often sit
  // inside a card link, which would otherwise navigate.
  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      className="msm-modal fixed inset-0 z-[400] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title}
          <span className="ml-2 font-normal text-white/50">
            {Math.min(i, n - 1) + 1} / {n}
          </span>
        </p>
        {onRemove && removable.has(url) && (
          <button
            type="button"
            onClick={() => onRemove(url)}
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="max-h-full max-w-full rounded-xl object-contain"
        />
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setI((v) => (v - 1 + n) % n)}
              className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setI((v) => (v + 1) % n)}
              className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */

/**
 * One album tile: cover, count, title, and — for the owner — add photos plus
 * an optional menu (rename / delete for custom albums).
 */
function AlbumCard({
  title,
  subtitle,
  photos,
  canEdit,
  onOpen,
  onAdd,
  menu,
}: {
  title: string;
  subtitle?: string;
  photos: string[];
  canEdit: boolean;
  onOpen: (start: number) => void;
  /** Upload is done here; the caller saves the new URLs. */
  onAdd?: (urls: string[]) => Promise<void>;
  menu?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadFiles();
  const [saving, setSaving] = useState(false);
  const busy = upload.isPending || saving;

  const add = async (files: FileList | null) => {
    if (!files?.length || !onAdd) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`An album holds up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    try {
      const res = await upload.mutateAsync({
        files: picked,
        folder: "events/gallery",
      });
      const urls = (res.data ?? []).map((r) => r.url);
      setSaving(true);
      await onAdd(urls);
      toast.success(
        `${urls.length} photo${urls.length === 1 ? "" : "s"} added to ${title}`,
      );
    } catch {
      toast.error("Couldn't add those photos. Please try again.");
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={`overflow-hidden ${CARD}`}>
      <button
        type="button"
        onClick={() => photos.length && onOpen(0)}
        className="group relative block aspect-square w-full overflow-hidden bg-white/[0.03]"
        aria-label={`Open photos: ${title}`}
      >
        {photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0]}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Images className="absolute inset-0 m-auto h-8 w-8 text-white/20" />
        )}
        {photos.length > 1 && (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <Images className="h-3 w-3" /> {photos.length}
          </span>
        )}
      </button>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{title}</p>
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-white/50">
                {subtitle}
              </p>
            )}
          </div>
          {canEdit && menu}
        </div>
        {canEdit && onAdd && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void add(e.target.files)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 py-1.5 text-xs font-semibold text-[#D8B4FE] transition hover:bg-white/[0.05] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {busy ? "Uploading…" : "Add photos"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Photo albums for the experiences a host has run. Photos added here go
 * into each event's gallery, which every guest who booked then sees in
 * their journey ("Photos from the host"). Lives in the host dashboard.
 */
export function EventAlbums({ pastEvents }: { pastEvents: EventDTO[] }) {
  const [viewer, setViewer] = useState<{ id: string; start: number } | null>(
    null,
  );
  const update = useUpdateEvent();
  const open = pastEvents.find((e) => e.id === viewer?.id);

  const save = (event: EventDTO, gallery: string[]) =>
    update.mutateAsync({
      eventId: event.id,
      body: { host_id: event.host_id, gallery_urls: gallery },
    });

  return (
    <>
      {pastEvents.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {pastEvents.map((e) => (
            <AlbumCard
              key={e.id}
              title={e.title}
              subtitle={`${formatIST(e.time, "MMM yyyy")}${e.total_bookings ? ` · ${e.total_bookings} went` : ""}`}
              photos={photosOf(e)}
              canEdit
              onOpen={(start) => setViewer({ id: e.id, start })}
              onAdd={async (urls) => {
                await save(e, [...(e.gallery_urls ?? []), ...urls]);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyCard
          icon={<Images className="h-6 w-6" />}
          title="No past experiences yet"
          text="After you host one, add photos from it here. Everyone who went will find them in their journey."
        />
      )}

      {open && viewer && (
        <Lightbox
          title={open.title}
          photos={photosOf(open)}
          start={viewer.start}
          removable={new Set(open.gallery_urls ?? [])}
          onRemove={(url) =>
            void save(
              open,
              (open.gallery_urls ?? []).filter((u) => u !== url),
            )
              .then(() => {
                toast.success("Photo removed");
                setViewer(null);
              })
              .catch(() => toast.error("Couldn't remove that photo."))
          }
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
