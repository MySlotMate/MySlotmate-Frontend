"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { FiX, FiCamera, FiExternalLink, FiCheck } from "react-icons/fi";
import { LuBadgeCheck, LuStar, LuUsers } from "react-icons/lu";
import { FaInstagram, FaLinkedin, FaGlobe } from "react-icons/fa";
import { toast } from "sonner";
import { useDragDrop } from "~/hooks/useDragDrop";
import { EventAlbums } from "~/components/profile/PhotoKit";
import PhotoAlbums from "~/components/profile/PhotoAlbums";
import {
  useEventsByHost,
  useMyHost,
  useUpdateHostProfile,
  useUploadFiles,
} from "~/hooks/useApi";

/** The fields a host edits here. Name, email and phone come from the account. */
interface Editable {
  avatarUrl: string;
  tagline: string;
  bio: string;
  tags: string[];
  instagram: string;
  linkedin: string;
  website: string;
}

const EMPTY: Editable = {
  avatarUrl: "",
  tagline: "",
  bio: "",
  tags: [],
  instagram: "",
  linkedin: "",
  website: "",
};

const FIELD =
  "w-full rounded-xl border border-white/10 bg-[#0D0F1E] px-4 py-3 text-sm text-white placeholder-[#777B98] outline-none transition focus:border-[#A020F0]";

/**
 * Host profile: what guests see about you. Two tabs, "About you" and
 * "Photos". One Save button that appears only when something changed.
 */
export default function HostProfileEditPage() {
  const [user] = useAuthState(auth);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => setStoredUserId(localStorage.getItem("msm_user_id")), []);
  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  const { data: host, isLoading } = useMyHost(validUserId);
  const { data: myEvents } = useEventsByHost(host?.id ?? null);
  const pastEvents = (myEvents ?? [])
    .filter(
      (e) =>
        e.status !== "draft" &&
        e.status !== "cancelled" &&
        new Date(e.next_available_date ?? e.time).getTime() < Date.now(),
    )
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  const updateMutation = useUpdateHostProfile();
  const uploadMutation = useUploadFiles();

  const saved = useMemo<Editable>(
    () =>
      host
        ? {
            avatarUrl: host.avatar_url ?? "",
            tagline: host.tagline ?? "",
            bio: host.bio ?? "",
            tags: host.expertise_tags ?? [],
            instagram: host.social_instagram ?? "",
            linkedin: host.social_linkedin ?? "",
            website: host.social_website ?? "",
          }
        : EMPTY,
    [host],
  );

  const [form, setForm] = useState<Editable>(EMPTY);
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [newTag, setNewTag] = useState("");
  const [tab, setTab] = useState<"about" | "photos">("about");

  useEffect(() => {
    if (!host) return;
    localStorage.setItem("msm_host_id", host.id);
    setForm(saved);
  }, [host, saved]);

  const dirty =
    !!pendingAvatar || JSON.stringify(form) !== JSON.stringify(saved);

  const set = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const pickAvatar = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a JPG or PNG image.");
      return;
    }
    setForm((p) => ({ ...p, avatarUrl: URL.createObjectURL(file) }));
    setPendingAvatar(file);
  }, []);

  const drag = useDragDrop({ onDrop: pickAvatar, accept: "image/*" });

  const addTag = () => {
    const raw = newTag.trim().replace(/^#/, "");
    if (raw && !form.tags.includes(`#${raw}`))
      set("tags", [...form.tags, `#${raw}`]);
    setNewTag("");
  };

  const save = async () => {
    if (!host) return;
    try {
      let avatarUrl = form.avatarUrl;
      if (pendingAvatar) {
        const res = await uploadMutation.mutateAsync({
          files: [pendingAvatar],
          folder: "hosts/avatars",
        });
        avatarUrl = res.data[0]?.url ?? saved.avatarUrl;
      }
      await updateMutation.mutateAsync({
        hostId: host.id,
        body: {
          tagline: form.tagline.trim() || null,
          bio: form.bio.trim() || null,
          avatar_url: avatarUrl || null,
          expertise_tags: form.tags,
          social_instagram: form.instagram.trim() || null,
          social_linkedin: form.linkedin.trim() || null,
          social_website: form.website.trim() || null,
        },
      });
      setPendingAvatar(null);
      toast.success("Profile saved");
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
    }
  };

  const saving = updateMutation.isPending || uploadMutation.isPending;

  /* What's still missing, in the order worth fixing. */
  const missing = [
    !form.avatarUrl && "a photo",
    !form.tagline && "a tagline",
    !form.bio && "a bio",
    form.tags.length === 0 && "a few tags",
    !form.instagram && !form.linkedin && !form.website && "a social link",
    host && !host.is_identity_verified && "ID verification",
  ].filter(Boolean) as string[];
  const total = 6;
  const donePct = Math.round(((total - missing.length) / total) * 100);

  if (isLoading || (!host && validUserId)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#080914]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
      </div>
    );
  }

  if (!host) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          No host profile found. Please apply as a host first.
        </div>
      </main>
    );
  }

  const name = `${host.first_name} ${host.last_name}`.trim();

  return (
    <div className="min-h-screen bg-[#080914] pb-28">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
              Profile
            </h1>
            <p className="mt-1 text-sm text-[#A5A8C3]">
              What guests see about you.
            </p>
          </div>
          <Link
            href={`/host/${host.slug ?? host.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]"
          >
            <FiExternalLink className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">View public profile</span>
            <span className="sm:hidden">View</span>
          </Link>
        </div>

        {/* Identity card */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-[#121426] p-5">
          <div className="flex items-center gap-4">
            <div
              onDragEnter={drag.handleDragEnter}
              onDragLeave={drag.handleDragLeave}
              onDragOver={drag.handleDragOver}
              onDrop={drag.handleDrop}
              className="shrink-0"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change photo"
                className={`group relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 transition ${
                  drag.isDragging ? "ring-[#A020F0]" : "ring-white/10"
                }`}
              >
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[#A020F0]/20 text-2xl font-semibold text-[#E9D5FF]">
                    {name.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <FiCamera className="h-5 w-5 text-white" />
                </span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => pickAvatar(Array.from(e.target.files ?? []))}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-white">
                {name}
              </p>
              <p className="truncate text-xs text-[#777B98]">
                {user?.email ?? host.phn_number ?? ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge
                  on={host.is_identity_verified}
                  icon={LuBadgeCheck}
                  label={
                    host.is_identity_verified
                      ? "ID verified"
                      : "ID not verified"
                  }
                />
                {host.is_super_host && (
                  <Badge on icon={LuStar} label="Super host" />
                )}
                {host.is_community_champ && (
                  <Badge on icon={LuUsers} label="Community champ" />
                )}
              </div>
            </div>
          </div>

          {/* Completion */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white">
                {missing.length === 0
                  ? "Your profile is complete"
                  : `Profile ${donePct}% done`}
              </span>
              {missing.length > 0 && (
                <span className="text-[#777B98]">
                  Add {missing.slice(0, 2).join(" and ")}
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${missing.length === 0 ? "bg-green-400" : "bg-[#A020F0]"}`}
                style={{ width: `${donePct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="mt-5 flex rounded-full border border-white/10 bg-[#121426] p-1">
          {(
            [
              ["about", "About you"],
              ["photos", "Photos"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                tab === key
                  ? "bg-[#A020F0] text-white"
                  : "text-[#A5A8C3] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "about" ? (
          <section className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#121426] p-5">
            <Field label="Tagline" hint="One line that sums up what you host.">
              <input
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                maxLength={90}
                placeholder="e.g. Sunrise treks around Guwahati"
                className={FIELD}
              />
            </Field>

            <Field label="Bio" hint="Who you are and why guests will love it.">
              <textarea
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                rows={5}
                placeholder="A few lines about you…"
                className={`${FIELD} resize-none`}
              />
            </Field>

            <Field label="Tags" hint="Press Enter to add.">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0D0F1E] p-2 focus-within:border-[#A020F0]">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-[#A020F0]/20 px-3 py-1 text-xs font-medium text-[#E9D5FF]"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        set(
                          "tags",
                          form.tags.filter((t) => t !== tag),
                        )
                      }
                      aria-label={`Remove ${tag}`}
                      className="hover:text-white"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder={form.tags.length ? "Add more" : "e.g. Trekking"}
                  className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm text-white placeholder-[#777B98] outline-none"
                />
              </div>
            </Field>

            <div>
              <p className="mb-1.5 text-sm font-medium text-white">Links</p>
              <div className="space-y-2">
                {(
                  [
                    ["instagram", FaInstagram, "instagram.com/yourname"],
                    ["linkedin", FaLinkedin, "linkedin.com/in/yourname"],
                    ["website", FaGlobe, "yourwebsite.com"],
                  ] as const
                ).map(([key, Icon, ph]) => (
                  <label key={key} className="relative block">
                    <Icon
                      className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#777B98]"
                      aria-hidden
                    />
                    <span className="sr-only">{key}</span>
                    <input
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={ph}
                      inputMode="url"
                      className={`${FIELD} pl-11`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#777B98]">
              Your name, email and phone come from your account settings.
            </p>
          </section>
        ) : (
          <div className="mt-4 space-y-4">
            <section className="rounded-2xl border border-white/10 bg-[#121426] p-5">
              <h2 className="text-sm font-semibold text-white">
                Share photos with your guests
              </h2>
              <p className="mt-1 mb-4 text-xs text-[#777B98]">
                Add photos to an event you&apos;ve hosted. Everyone who went
                finds them in their journey. Only share photos the people in
                them are happy with.
              </p>
              <EventAlbums pastEvents={pastEvents} />
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#121426] p-5">
              <h2 className="text-sm font-semibold text-white">
                Albums on your profile
              </h2>
              <p className="mt-1 mb-4 text-xs text-[#777B98]">
                The Photos tab of your public profile: past events, credentials,
                your work.
              </p>
              <PhotoAlbums
                owner={{ userId: validUserId }}
                firstName={host.first_name}
                isMe
              />
            </section>
          </div>
        )}
      </main>

      {/* Save bar: only when there's something to save */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6 md:pl-[92px] xl:pl-[264px]">
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-white/10 bg-[#1A1C33] p-3 pl-4 shadow-2xl shadow-black/50">
            <p className="flex-1 text-sm text-white">Unsaved changes</p>
            <button
              onClick={() => {
                setForm(saved);
                setPendingAvatar(null);
              }}
              disabled={saving}
              className="rounded-full px-4 py-2 text-sm font-medium text-[#A5A8C3] transition hover:text-white"
            >
              Discard
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-[#A020F0] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-50"
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <FiCheck className="h-4 w-4" />
              )}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-white">{label}</span>
        {hint && <span className="text-xs text-[#777B98]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Badge({
  on,
  icon: Icon,
  label,
}: {
  on: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        on ? "bg-[#A020F0]/15 text-[#E9D5FF]" : "bg-white/[0.06] text-[#777B98]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
