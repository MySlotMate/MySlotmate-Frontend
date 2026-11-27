"use client";

/**
 * Creatives on a Boost (PRD: Creatives). The host uploads reels, posts,
 * stories and brand material and sees what our team did with each; the team's
 * own creatives wait here for the host to approve or ask for changes.
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  FiFile,
  FiImage,
  FiTrash2,
  FiUploadCloud,
  FiVideo,
} from "react-icons/fi";
import { useIdToken } from "~/hooks/useIdToken";
import {
  useApproveCreative,
  useDeleteCreative,
  usePlanCreatives,
  useRequestCreativeChanges,
  useSaveCreative,
} from "~/hooks/useBoostPlan";
import {
  CREATIVE_STATUS_LABEL,
  CREATIVE_TYPES,
  fileProblem,
  type CreativeDTO,
  type CreativeStatus,
  type CreativeType,
  type PlanBoostDTO,
} from "~/lib/boostPlan";
import { GRADIENT } from "./parts";

const TONE: Record<CreativeStatus, string> = {
  submitted: "bg-white/[0.08] text-white/70",
  in_use: "bg-emerald-400/15 text-emerald-200",
  needs_changes: "bg-amber-300/15 text-amber-100",
  not_used: "bg-white/[0.06] text-white/45",
  awaiting_approval: "bg-[#B724EA]/25 text-white",
  approved: "bg-emerald-400/15 text-emerald-200",
  changes_requested: "bg-amber-300/15 text-amber-100",
};

function Thumb({ c }: { c: CreativeDTO }) {
  const f = c.files[0];
  const isVideo = c.type === "reel" || f?.mime_type.startsWith("video/");
  if (f?.url && !isVideo && (f.mime_type.startsWith("image/") || !f.mime_type))
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user upload, any host
      <img
        src={f.url}
        alt=""
        className="h-14 w-11 shrink-0 rounded-lg bg-white/[0.06] object-cover"
      />
    );
  const Icon = isVideo ? FiVideo : c.type === "brand" ? FiFile : FiImage;
  return (
    <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
      <Icon className="h-4 w-4 text-white/50" />
    </span>
  );
}

export default function BoostCreatives({ boost }: { boost: PlanBoostDTO }) {
  const idToken = useIdToken();
  const { data: creatives = [], isLoading } = usePlanCreatives(
    boost.id,
    idToken,
  );
  const save = useSaveCreative(idToken);
  const approve = useApproveCreative(idToken);
  const changes = useRequestCreativeChanges(idToken);
  const remove = useDeleteCreative(idToken);
  const [type, setType] = useState<CreativeType>("reel");
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [opened, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const t = CREATIVE_TYPES.find((x) => x.value === type)!;
  const canUpload = boost.status !== "ended";
  // Open by itself until the first creative is in.
  const open = opened || (!isLoading && creatives.length === 0);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const chosen = Array.from(list).slice(0, t.maxFiles);
    const bad = chosen.map((f) => fileProblem(type, f)).filter(Boolean);
    if (bad.length) {
      toast.error(bad[0]);
      return;
    }
    setFiles(chosen);
  };

  const upload = () =>
    save.mutate(
      {
        boostId: boost.id,
        files,
        body: {
          type,
          caption: caption.trim() || undefined,
          channels: boost.channels,
        },
      },
      {
        onSuccess: () => {
          toast.success("Uploaded. Your manager will review it.");
          setFiles([]);
          setCaption("");
          setOpen(false);
        },
        onError: (e) => toast.error(e.message || "Upload failed."),
      },
    );

  const askChanges = (c: CreativeDTO) => {
    const note = window.prompt("What should your manager change?");
    if (!note?.trim()) return;
    changes.mutate(
      { boostId: boost.id, id: c.id, note: note.trim() },
      {
        onSuccess: () => toast.success("Sent to your manager."),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Creatives</h3>
        {canUpload && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/85 hover:bg-white/[0.06]"
          >
            <FiUploadCloud className="h-3.5 w-3.5" /> Upload
          </button>
        )}
      </div>

      {creatives.length > 0 && (
        <ul className="space-y-2">
          {creatives.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-2.5"
            >
              <Thumb c={c} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-white">
                    {CREATIVE_TYPES.find((x) => x.value === c.type)?.label}
                    {c.files.length > 1 ? ` · ${c.files.length} files` : ""}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[c.status]}`}
                  >
                    {CREATIVE_STATUS_LABEL[c.status]}
                  </span>
                  {c.uploaded_by_kind === "admin" && (
                    <span className="text-[11px] text-white/45">
                      by your manager
                    </span>
                  )}
                </div>
                {c.caption && (
                  <p className="truncate text-xs text-white/55">{c.caption}</p>
                )}
                {c.status_note && (
                  <p className="text-xs text-amber-100/90">{c.status_note}</p>
                )}
                {c.status === "awaiting_approval" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={approve.isPending}
                      onClick={() =>
                        approve.mutate(
                          { boostId: boost.id, id: c.id },
                          {
                            onSuccess: () => toast.success("Approved."),
                            onError: (e) => toast.error(e.message),
                          },
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${GRADIENT}`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => askChanges(c)}
                      className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Ask for changes
                    </button>
                  </div>
                )}
              </div>
              {c.uploaded_by_kind === "host" &&
                c.status !== "in_use" &&
                canUpload &&
                (confirmDelete === c.id ? (
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate(
                          { boostId: boost.id, id: c.id },
                          {
                            onSuccess: () => setConfirmDelete(null),
                            onError: (e) => toast.error(e.message),
                          },
                        )
                      }
                      className="rounded-full bg-rose-500/80 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Delete creative"
                    onClick={() => setConfirmDelete(c.id)}
                    className="rounded-full p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {canUpload && open && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap gap-1.5">
            {CREATIVE_TYPES.map((x) => (
              <button
                key={x.value}
                type="button"
                aria-pressed={type === x.value}
                onClick={() => {
                  setType(x.value);
                  setFiles([]);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  type === x.value
                    ? "border-[#B724EA] bg-[#B724EA]/20 text-white"
                    : "border-white/15 text-white/60 hover:text-white"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50">{t.hint}</p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-white/15 px-3 py-4 text-sm text-white/70 hover:border-white/30"
          >
            <FiUploadCloud className="h-5 w-5" />
            {files.length
              ? files.map((f) => f.name).join(", ")
              : `Choose ${t.maxFiles > 1 ? `up to ${t.maxFiles} files` : "a file"}`}
          </button>
          <input
            ref={input}
            type="file"
            hidden
            accept={t.accept}
            multiple={t.maxFiles > 1}
            onChange={(e) => pick(e.target.files)}
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption or note for your manager (optional)"
            className="w-full rounded-xl border border-white/10 bg-[#0D0E1C] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#B57BFF]"
          />
          <div className="flex gap-2">
            {creatives.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setFiles([]);
                }}
                className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={!files.length || save.isPending}
              onClick={upload}
              className={`flex-1 rounded-full py-2 text-sm font-semibold text-white disabled:opacity-50 ${GRADIENT}`}
            >
              {save.isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
