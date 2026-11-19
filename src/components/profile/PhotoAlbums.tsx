"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Images,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useAddAlbumPhotos,
  useDeleteAlbum,
  useDeleteAlbumPhoto,
  useProfileAlbums,
  useSaveAlbum,
  useUploadFiles,
} from "~/hooks/useApi";
import type { ProfileAlbumDTO } from "~/lib/api";
import { EmptyCard, GRADIENT_BTN } from "./ProfileKit";
import { Lightbox } from "./PhotoKit";

/**
 * The Photos tab: named albums shown like folders on an Android home screen —
 * four small previews and "+N" for the rest. One place for any purpose:
 * past events for community hosts, credentials for professionals, or
 * anything else someone wants to share.
 */

const MAX_PER_UPLOAD = 10;
const MAX_PER_ALBUM = 50;
const IDEAS = [
  "Past events",
  "Credentials",
  "Behind the scenes",
  "My work",
  "My space",
  "Travels",
];

/** Read an image's size so photos can keep their shape. */
function sizeOf(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ width: 4, height: 5 });
    img.src = url;
  });
}

/* ------------------------------------------------------------------ */

/** Folder-style tile: a 2×2 of small previews, the last one "+N". */
export function AlbumFolder({
  title,
  urls,
  count,
  onOpen,
}: {
  title: string;
  urls: string[];
  count: number;
  onOpen: () => void;
}) {
  const cells = [0, 1, 2, 3];
  const more = count - 3;
  return (
    <button type="button" onClick={onOpen} className="group min-w-0 text-left">
      <div className="grid aspect-square grid-cols-2 gap-1.5 rounded-[26px] bg-white/[0.05] p-2 ring-1 ring-white/[0.06] transition group-hover:bg-white/[0.08] group-hover:ring-white/15 sm:gap-2 sm:p-2.5">
        {cells.map((i) => {
          const url = urls[i];
          const isMore = i === 3 && count > 4;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-[14px] bg-white/[0.04]"
            >
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className={`h-full w-full object-cover ${isMore ? "scale-110 blur-[1px] brightness-50" : ""}`}
                />
              )}
              {isMore && (
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white sm:text-base">
                  +{more}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 truncate px-1 text-sm font-semibold">{title}</p>
      <p className="px-1 text-xs text-white/45">
        {count} photo{count === 1 ? "" : "s"}
      </p>
    </button>
  );
}

/* ------------------------------------------------------------------ */

function NewAlbumSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (album: ProfileAlbumDTO) => void;
}) {
  const [title, setTitle] = useState("");
  const save = useSaveAlbum();

  const create = async () => {
    if (!title.trim()) return toast.error("Give the album a name.");
    try {
      const res = await save.mutateAsync({ body: { title: title.trim() } });
      toast.success("Album created. Now add some photos.");
      onCreated(res.data);
    } catch {
      toast.error("Couldn't create the album. Please try again.");
    }
  };

  return (
    <div
      className="msm-modal fixed inset-0 z-[310] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New album"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#121426] p-6 text-white sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-outfit text-xl font-bold">New album</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mt-5 block text-sm text-white/70">
          Album name
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void create()}
            maxLength={40}
            placeholder="e.g. Hornbill 2025, Certificates"
            className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-[#080914] px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#A020F0]/60"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setTitle(idea)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 transition hover:border-white/25 hover:text-white"
            >
              {idea}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void create()}
          disabled={save.isPending}
          className={`mt-6 h-12 w-full rounded-full text-sm font-semibold disabled:opacity-60 ${GRADIENT_BTN}`}
        >
          {save.isPending ? "Creating…" : "Create album"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** An opened album: its photos, and for the owner, rename/add/remove/delete. */
function AlbumView({
  album,
  isMe,
  onClose,
}: {
  album: ProfileAlbumDTO;
  isMe: boolean;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(album.title);
  const [viewer, setViewer] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const save = useSaveAlbum();
  const remove = useDeleteAlbum();
  const upload = useUploadFiles();
  const addPhotos = useAddAlbumPhotos();
  const removePhoto = useDeleteAlbumPhoto();
  const busy = upload.isPending || addPhotos.isPending;
  const urls = album.photos.map((p) => p.url);

  useEffect(() => setTitle(album.title), [album.title]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && viewer === null && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, viewer]);

  const rename = async () => {
    const t = title.trim();
    setEditing(false);
    if (!t || t === album.title) return setTitle(album.title);
    try {
      await save.mutateAsync({ id: album.id, body: { title: t } });
    } catch {
      setTitle(album.title);
      toast.error("Couldn't rename the album.");
    }
  };

  const add = async (list: FileList | null) => {
    const room = MAX_PER_ALBUM - album.photos.length;
    const files = Array.from(list ?? [])
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.min(MAX_PER_UPLOAD, room));
    if (inputRef.current) inputRef.current.value = "";
    if (!files.length) {
      if (room <= 0)
        toast.error(`An album holds up to ${MAX_PER_ALBUM} photos.`);
      return;
    }
    try {
      const sizes = await Promise.all(files.map(sizeOf));
      const res = await upload.mutateAsync({ files, folder: "general" });
      await addPhotos.mutateAsync({
        albumId: album.id,
        items: (res.data ?? []).map((r, i) => ({
          url: r.url,
          width: sizes[i]?.width ?? null,
          height: sizes[i]?.height ?? null,
        })),
      });
      toast.success(
        `${files.length} photo${files.length === 1 ? "" : "s"} added`,
      );
    } catch {
      toast.error("Couldn't add those photos. Please try again.");
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete "${album.title}" and its photos?`)) return;
    try {
      await remove.mutateAsync(album.id);
      toast.success("Album deleted");
      onClose();
    } catch {
      toast.error("Couldn't delete the album.");
    }
  };

  return createPortal(
    <div
      className="msm-modal fixed inset-0 z-[300] flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={album.title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-4xl flex-col overflow-hidden bg-[#0E0F1F] text-white sm:max-h-[88vh] sm:rounded-3xl sm:border sm:border-white/10"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={title}
                  maxLength={40}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void rename();
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setTitle(album.title);
                      setEditing(false);
                    }
                  }}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-[#080914] px-3 text-[15px] font-semibold outline-none focus:border-[#A020F0]/60"
                />
                <button
                  type="button"
                  aria-label="Save name"
                  onClick={() => void rename()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A020F0]/25 text-[#E9D5FF]"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-outfit truncate text-lg font-bold">
                  {album.title}
                </h2>
                {isMe && (
                  <button
                    type="button"
                    aria-label="Rename album"
                    onClick={() => setEditing(true)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-white/45">
              {album.photos.length} photo
              {album.photos.length === 1 ? "" : "s"}
            </p>
          </div>
          {isMe && (
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
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold disabled:opacity-60 ${GRADIENT_BTN}`}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {busy ? "Uploading…" : "Add photos"}
                </span>
              </button>
              <button
                type="button"
                aria-label="Delete album"
                onClick={() => void del()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Photos */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {album.photos.length ? (
            <div className="columns-2 gap-2.5 sm:columns-3">
              {album.photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setViewer(i)}
                  className="mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-xl bg-white/[0.04]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.caption ?? ""}
                    loading="lazy"
                    style={
                      p.width && p.height
                        ? { aspectRatio: `${p.width} / ${p.height}` }
                        : undefined
                    }
                    className="w-full object-cover transition duration-300 hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          ) : (
            <EmptyCard
              icon={<Images className="h-6 w-6" />}
              title="This album is empty"
              text={
                isMe
                  ? "Add photos to fill it up. Anyone who visits your profile can see them."
                  : "No photos here yet."
              }
            />
          )}
          {isMe && album.photos.length > 0 && (
            <p className="mt-4 text-center text-xs text-white/35">
              Only share photos the people in them are happy with.
            </p>
          )}
        </div>
      </div>

      {viewer !== null && (
        <Lightbox
          title={album.title}
          photos={urls}
          start={viewer}
          removable={isMe ? new Set(urls) : new Set()}
          onRemove={
            isMe
              ? (url) => {
                  const photo = album.photos.find((p) => p.url === url);
                  if (!photo) return;
                  void removePhoto
                    .mutateAsync({ albumId: album.id, photoId: photo.id })
                    .then(() => {
                      toast.success("Photo removed");
                      setViewer(null);
                    })
                    .catch(() => toast.error("Couldn't remove that photo."));
                }
              : undefined
          }
          onClose={() => setViewer(null)}
        />
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */

export default function PhotoAlbums({
  owner,
  firstName,
  isMe,
}: {
  /** A user id (own profile) or a host id/slug (public host page). */
  owner: { userId?: string | null; hostId?: string | null };
  firstName: string;
  isMe: boolean;
}) {
  const { items, supported, isLoading } = useProfileAlbums(owner);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Visitors only see albums with something in them.
  const albums = items.filter((a) => isMe || a.photos.length > 0);
  const open = albums.find((a) => a.id === openId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-[26px] bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  if (!albums.length && !isMe) {
    return (
      <EmptyCard
        icon={<Images className="h-6 w-6" />}
        title="No photos yet"
        text={`${firstName} hasn't shared any albums yet.`}
      />
    );
  }

  return (
    <div>
      {isMe && (
        <p className="mb-4 text-[13px] text-white/50">
          {supported
            ? "Group your photos into albums: past events, credentials, your work. Anyone who visits your profile can see them."
            : "Albums are coming soon: group photos of past events, credentials or your work for anyone who visits your profile."}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
        {albums.map((a) => (
          <AlbumFolder
            key={a.id}
            title={a.title}
            urls={a.photos.map((p) => p.url)}
            count={a.photos.length}
            onOpen={() => setOpenId(a.id)}
          />
        ))}
        {isMe && (
          <button
            type="button"
            disabled={!supported}
            onClick={() => setCreating(true)}
            className="group min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-white/15 text-white/55 transition group-enabled:group-hover:border-[#A020F0]/60 group-enabled:group-hover:text-white">
              <Plus className="h-7 w-7" />
            </span>
            <p className="mt-2 px-1 text-sm font-semibold text-white/70">
              New album
            </p>
            <p className="px-1 text-xs text-white/40">
              {supported ? "Name it anything" : "Coming soon"}
            </p>
          </button>
        )}
      </div>

      {creating && (
        <NewAlbumSheet
          onClose={() => setCreating(false)}
          onCreated={(a) => {
            setCreating(false);
            setOpenId(a.id);
          }}
        />
      )}
      {open && (
        <AlbumView album={open} isMe={isMe} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}
