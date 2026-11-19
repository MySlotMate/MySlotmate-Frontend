"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { FiX, FiEdit2, FiCheck } from "react-icons/fi";
import { LuShieldCheck, LuBadgeCheck, LuStar, LuUsers } from "react-icons/lu";
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
  useConnectSocialMedia,
  useDisconnectSocialMedia,
} from "~/hooks/useApi";

/* ------------------------------------------------------------------ */
/*  Types & mock data                                                  */
/* ------------------------------------------------------------------ */

interface HostProfileData {
  avatarUrl: string;
  firstName: string;
  lastName: string;
  tagline: string;
  bio: string;
  expertiseTags: string[];
  socialInstagram: string;
  socialLinkedin: string;
  socialWebsite: string;
  // Trust & Safety
  isGovIdVerified: boolean;
  email: string;
  phone: string;
  // Badges
  isIdentityVerified: boolean;
  isSuperHost: boolean;
  isCommunityChamp: boolean;
}

const INITIAL: HostProfileData = {
  avatarUrl:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  firstName: "Julian",
  lastName: "Warin",
  tagline: "Curating mindful experiences in downtown lofts.",
  bio: "Hi, I'm Julian! I've been hosting art events for over 5 years. My spaces are designed to help you disconnect and focus on creativity. I love minimal design, organic coffee, and indie electronic music.",
  expertiseTags: ["#Minimalism", "#Wellness", "#RemoteWork"],
  socialInstagram: "",
  socialLinkedin: "Julian Warin",
  socialWebsite: "www.julianwarin.dot.pr",
  isGovIdVerified: true,
  email: "julian@example.com",
  phone: "",
  isIdentityVerified: true,
  isSuperHost: true,
  isCommunityChamp: false,
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HostProfileEditPage() {
  const [user] = useAuthState(auth);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarDropZoneRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<HostProfileData>(INITIAL);
  const [newTag, setNewTag] = useState("");
  const [hostId, setHostId] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  // Drag and drop for avatar - define handleAvatarFiles before useDragDrop
  const handleAvatarFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (file?.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setForm((p) => ({ ...p, avatarUrl: url }));
      setPendingAvatarFile(file);
      toast.success("Avatar image selected!");
    } else if (file) {
      toast.error("Please select a valid image file (PNG, JPG, JPEG)");
    }
  }, []);

  const {
    isDragging: isAvatarDragging,
    handleDragEnter: handleAvatarDragEnter,
    handleDragLeave: handleAvatarDragLeave,
    handleDragOver: handleAvatarDragOver,
    handleDrop: handleAvatarDrop,
  } = useDragDrop({
    onDrop: handleAvatarFiles,
    accept: "image/*",
  });

  // Read userId from localStorage
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => {
    setStoredUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  // React Query
  const { data: hostData, isLoading: loading } = useMyHost(validUserId);
  // Past experiences, for the photo albums below.
  const { data: myEvents } = useEventsByHost(hostData?.id ?? null);
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
  const connectSocialMutation = useConnectSocialMedia();
  const disconnectSocialMutation = useDisconnectSocialMedia();
  const saving = updateMutation.isPending;

  /* Populate form from API data */
  useEffect(() => {
    if (hostData) {
      setHostId(hostData.id);
      localStorage.setItem("msm_host_id", hostData.id);
      setForm({
        avatarUrl: hostData.avatar_url ?? "",
        firstName: hostData.first_name,
        lastName: hostData.last_name,
        tagline: hostData.tagline ?? "",
        bio: hostData.bio ?? "",
        expertiseTags: hostData.expertise_tags ?? [],
        socialInstagram: hostData.social_instagram ?? "",
        socialLinkedin: hostData.social_linkedin ?? "",
        socialWebsite: hostData.social_website ?? "",
        isGovIdVerified: hostData.is_identity_verified,
        email: user?.email ?? "",
        phone: hostData.phn_number ?? "",
        isIdentityVerified: hostData.is_identity_verified,
        isSuperHost: hostData.is_super_host,
        isCommunityChamp: hostData.is_community_champ,
      });
    }
  }, [hostData, user?.email]);

  /* helpers */
  const update = <K extends keyof HostProfileData>(
    key: K,
    value: HostProfileData[K],
  ) => setForm((p) => ({ ...p, [key]: value }));

  const addTag = () => {
    const tag = newTag.trim().startsWith("#")
      ? newTag.trim()
      : `#${newTag.trim()}`;
    if (tag.length > 1 && !form.expertiseTags.includes(tag)) {
      update("expertiseTags", [...form.expertiseTags, tag]);
    }
    setNewTag("");
  };

  const removeTag = (tag: string) =>
    update(
      "expertiseTags",
      form.expertiseTags.filter((t) => t !== tag),
    );

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      handleAvatarFiles(files);
    },
    [handleAvatarFiles],
  );

  const handleSave = async () => {
    if (!hostId) {
      toast.error("Host profile not loaded yet.");
      return;
    }
    try {
      // Upload new avatar if changed
      let avatarUrl: string | undefined;
      if (pendingAvatarFile) {
        try {
          const uploadRes = await uploadMutation.mutateAsync({
            files: [pendingAvatarFile],
            folder: "hosts/avatars",
          });
          avatarUrl = uploadRes.data[0]?.url;
          setPendingAvatarFile(null);
        } catch {
          // Upload failed, continue with existing avatar
        }
      }

      await updateMutation.mutateAsync({
        hostId,
        body: {
          tagline: form.tagline || null,
          bio: form.bio || null,
          avatar_url: avatarUrl ?? (form.avatarUrl || null),
          expertise_tags: form.expertiseTags,
          social_instagram: form.socialInstagram || null,
          social_linkedin: form.socialLinkedin || null,
          social_website: form.socialWebsite || null,
        },
      });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  /* profile completion */
  const completionChecks = [
    !!form.firstName,
    !!form.lastName,
    !!form.tagline,
    !!form.bio,
    form.expertiseTags.length > 0,
    !!form.avatarUrl,
    form.isGovIdVerified,
    !!form.email,
    !!form.phone,
    !!form.socialLinkedin || !!form.socialInstagram,
  ];
  const completionPct = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  );

  return (
    <div className="min-h-screen bg-[#080914]">
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
        </div>
      ) : (
        <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10 lg:px-10">
          {/* Header row */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-outfit text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
                Host Profile
              </h1>
              <p className="mt-1 text-sm text-[#A5A8C3]">
                Manage your public persona and build trust with your guests.
              </p>
            </div>
            {hostId ? (
              <Link
                href={`/host/${hostData?.slug ?? hostId}`}
                className="shrink-0 rounded-lg border border-white/15 bg-[#121426] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.04]"
              >
                Preview Public Profile
              </Link>
            ) : (
              <span className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-[#777B98]">
                Preview Public Profile
              </span>
            )}
          </div>

          {/* ── Profile completion bar ── */}
          <div className="mt-6 rounded-xl border border-white/10 bg-[#121426] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuShieldCheck className="h-5 w-5 text-[#D8B4FE]" />
                <span className="text-sm font-semibold text-white">
                  Profile Completion
                </span>
              </div>
              <span
                className={`text-sm font-bold ${completionPct === 100 ? "text-green-300" : "text-[#D8B4FE]"}`}
              >
                {completionPct}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#A020F0] transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            {completionPct < 100 && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[#A5A8C3]">
                  Almost there! Add a phone number to reach 100%.
                </p>
                <button className="text-xs font-semibold text-[#D8B4FE] hover:underline">
                  Complete now
                </button>
              </div>
            )}
          </div>

          {/* ── Body: Two columns ── */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ─── LEFT: Basic Information (2/3) ─── */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-white/10 bg-[#121426] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    Basic Information
                  </h2>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#A020F0] to-[#00bde5] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-[#A020F0]/20 transition-all duration-200 hover:from-[#008bbd] hover:to-[#00b0d6] hover:shadow-md hover:shadow-[#A020F0]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    {saving ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#121426] border-t-transparent" />
                    ) : (
                      <FiCheck className="h-4 w-4" />
                    )}
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>

                {/* Avatar */}
                <div className="mt-6 flex items-center gap-5">
                  {form?.avatarUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.avatarUrl}
                      alt="Avatar"
                      loading="lazy"
                      className="h-20 w-20 rounded-full border-2 border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/10 bg-white/[0.06]">
                      <span className="text-2xl text-[#777B98]">👤</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      Your Avatar
                    </p>
                    <p className="text-xs text-[#A5A8C3]">
                      Recommended 500×500px, JPG or PNG
                    </p>
                    <div
                      ref={avatarDropZoneRef}
                      onDragEnter={handleAvatarDragEnter}
                      onDragLeave={handleAvatarDragLeave}
                      onDragOver={handleAvatarDragOver}
                      onDrop={handleAvatarDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`mt-3 cursor-pointer rounded-lg border-2 border-dashed p-3 text-center transition ${
                        isAvatarDragging
                          ? "border-[#A020F0] bg-[#A020F0]/10"
                          : "border-white/15 hover:border-[#A020F0] hover:bg-white/[0.04]"
                      }`}
                    >
                      <p
                        className={`text-xs transition ${isAvatarDragging ? "font-semibold text-[#D8B4FE]" : "text-[#A5A8C3]"}`}
                      >
                        {isAvatarDragging
                          ? "Drop image here"
                          : "Drag or click to upload"}
                      </p>
                    </div>
                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => update("avatarUrl", "")}
                        className="text-xs font-medium text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>

                {/* First / Last name */}
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                      First Name
                    </label>
                    <input
                      value={form.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                      className="w-full rounded-lg border border-white/15 px-4 py-3 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                      Last Name
                    </label>
                    <input
                      value={form.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                      className="w-full rounded-lg border border-white/15 px-4 py-3 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0]"
                    />
                  </div>
                </div>

                {/* Tagline */}
                <div className="mt-5">
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                    Tagline
                  </label>
                  <input
                    value={form.tagline}
                    onChange={(e) => update("tagline", e.target.value)}
                    className="w-full rounded-lg border border-white/15 px-4 py-3 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0]"
                  />
                </div>

                {/* Bio */}
                <div className="mt-5">
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-white/15 px-4 py-3 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0]"
                  />
                </div>

                {/* Expertise Tags */}
                <div className="mt-5">
                  <label className="mb-2 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                    Expertise &amp; Vibe
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {form.expertiseTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-[#A020F0] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 hover:text-white/70"
                        >
                          <FiX className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTag()}
                        placeholder="+ Add Tag"
                        className="w-24 rounded-lg border border-white/15 px-3 py-1.5 text-xs outline-none focus:border-[#A020F0]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Social Presence ─── */}
              <div className="rounded-xl border border-white/10 bg-[#121426] p-6">
                <h2 className="text-lg font-bold text-white">
                  Social Presence
                </h2>

                <div className="mt-5 space-y-4">
                  {/* Instagram */}
                  <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-orange-400">
                        <FaInstagram className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Instagram
                        </p>
                        {form.socialInstagram ? (
                          <p
                            onClick={() =>
                              window.open(form.socialInstagram, "_blank")
                            }
                            className="cursor-pointer text-xs text-[#A5A8C3] transition hover:text-[#D8B4FE] hover:underline"
                          >
                            {form.socialInstagram}
                          </p>
                        ) : (
                          <p className="text-xs text-[#A5A8C3]">
                            Not connected
                          </p>
                        )}
                      </div>
                    </div>
                    {form.socialInstagram ? (
                      <button
                        onClick={async () => {
                          if (!validUserId) {
                            toast.error("User ID not found");
                            return;
                          }
                          try {
                            await disconnectSocialMutation.mutateAsync({
                              userId: validUserId,
                              platform: "instagram",
                            });
                            update("socialInstagram", "");
                            toast.success("Instagram disconnected");
                          } catch {
                            toast.error("Failed to disconnect Instagram");
                          }
                        }}
                        className="text-[#777B98] hover:text-[#A5A8C3]"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const val = prompt(
                            "Enter your Instagram profile URL (e.g., https://instagram.com/username):",
                            "https://instagram.com/",
                          );
                          if (val?.trim()) {
                            if (!validUserId) {
                              toast.error("User ID not found");
                              return;
                            }
                            try {
                              await connectSocialMutation.mutateAsync({
                                userId: validUserId,
                                platform: "instagram",
                                url: val.trim(),
                              });
                              update("socialInstagram", val.trim());
                              toast.success("Instagram connected!");
                            } catch (err) {
                              console.error(
                                "Failed to connect Instagram:",
                                err,
                              );
                              toast.error("Failed to connect Instagram");
                            }
                          }
                        }}
                        disabled={connectSocialMutation.isPending}
                        className="text-sm font-semibold text-[#D8B4FE] hover:underline disabled:opacity-50"
                      >
                        {connectSocialMutation.isPending
                          ? "Connecting..."
                          : "Connect"}
                      </button>
                    )}
                  </div>

                  {/* LinkedIn */}
                  <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2]">
                        <FaLinkedin className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          LinkedIn
                        </p>
                        {form.socialLinkedin ? (
                          <p
                            onClick={() =>
                              window.open(form.socialLinkedin, "_blank")
                            }
                            className="cursor-pointer text-xs text-[#D8B4FE] transition hover:underline"
                          >
                            {form.socialLinkedin.includes("linkedin.com")
                              ? form.socialLinkedin
                              : `https://linkedin.com/in/${form.socialLinkedin}`}
                          </p>
                        ) : (
                          <p className="text-xs text-[#A5A8C3]">
                            Not connected
                          </p>
                        )}
                      </div>
                    </div>
                    {form.socialLinkedin ? (
                      <button
                        onClick={async () => {
                          if (!validUserId) {
                            toast.error("User ID not found");
                            return;
                          }
                          try {
                            await disconnectSocialMutation.mutateAsync({
                              userId: validUserId,
                              platform: "linkedin",
                            });
                            update("socialLinkedin", "");
                            toast.success("LinkedIn disconnected");
                          } catch (err) {
                            console.error(
                              "Failed to disconnect LinkedIn:",
                              err,
                            );
                            toast.error("Failed to disconnect LinkedIn");
                          }
                        }}
                        className="text-[#777B98] hover:text-[#A5A8C3]"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const val = prompt(
                            "Enter your LinkedIn profile URL (e.g., https://linkedin.com/in/username):",
                            "https://linkedin.com/in/",
                          );
                          if (val?.trim()) {
                            if (!validUserId) {
                              toast.error("User ID not found");
                              return;
                            }
                            try {
                              await connectSocialMutation.mutateAsync({
                                userId: validUserId,
                                platform: "linkedin",
                                url: val.trim(),
                              });
                              update("socialLinkedin", val.trim());
                              toast.success("LinkedIn connected!");
                            } catch (err) {
                              console.error("Failed to connect LinkedIn:", err);
                              toast.error("Failed to connect LinkedIn");
                            }
                          }
                        }}
                        disabled={connectSocialMutation.isPending}
                        className="text-sm font-semibold text-[#D8B4FE] hover:underline disabled:opacity-50"
                      >
                        {connectSocialMutation.isPending
                          ? "Connecting..."
                          : "Connect"}
                      </button>
                    )}
                  </div>

                  {/* Website */}
                  <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                        <FaGlobe className="h-4 w-4 text-[#A5A8C3]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Website
                        </p>
                        {form.socialWebsite ? (
                          <p
                            onClick={() =>
                              window.open(form.socialWebsite, "_blank")
                            }
                            className="cursor-pointer text-xs text-[#A5A8C3] transition hover:text-[#D8B4FE] hover:underline"
                          >
                            {form.socialWebsite}
                          </p>
                        ) : (
                          <p className="text-xs text-[#A5A8C3]">Not set</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-[#777B98] hover:text-[#A5A8C3]"
                      onClick={async () => {
                        const val = prompt(
                          "Enter your website URL (e.g., https://example.com):",
                          form.socialWebsite,
                        );
                        if (val?.trim()) {
                          if (!validUserId) {
                            toast.error("User ID not found");
                            return;
                          }
                          try {
                            await connectSocialMutation.mutateAsync({
                              userId: validUserId,
                              platform: "website",
                              url: val.trim(),
                            });
                            update("socialWebsite", val.trim());
                            toast.success("Website updated!");
                          } catch (err) {
                            console.error("Failed to update website:", err);
                            toast.error("Failed to update website");
                          }
                        } else if (val === "" && form.socialWebsite) {
                          // User cleared the website
                          if (!validUserId) {
                            toast.error("User ID not found");
                            return;
                          }
                          try {
                            await disconnectSocialMutation.mutateAsync({
                              userId: validUserId,
                              platform: "website",
                            });
                            update("socialWebsite", "");
                            toast.success("Website removed");
                          } catch (err) {
                            console.error("Failed to remove website:", err);
                            toast.error("Failed to remove website");
                          }
                        }
                      }}
                      disabled={
                        connectSocialMutation.isPending ||
                        disconnectSocialMutation.isPending
                      }
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT: Trust & Safety (1/3) ─── */}
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-[#121426] p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <span className="text-green-400">🛡️</span> Trust &amp; Safety
                </h2>
                <p className="mt-1 text-xs text-[#A5A8C3]">
                  Verification enhances trust.
                </p>

                <div className="mt-5 space-y-5">
                  {/* Government ID */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Government ID
                      </p>
                      <p className="text-xs text-[#A5A8C3]">
                        {form.isGovIdVerified
                          ? "Identity Verified"
                          : "Not verified"}
                      </p>
                    </div>
                    {form.isGovIdVerified ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15">
                        <FiCheck className="h-4 w-4 text-green-300" />
                      </div>
                    ) : (
                      <button className="rounded-lg bg-[#A020F0] px-4 py-1.5 text-xs font-semibold text-white">
                        Verify Now
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Email Address
                      </p>
                      <p className="text-xs text-[#A5A8C3]">
                        {form.email || "No email"}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Phone Number
                      </p>
                      <p className="text-xs text-[#A5A8C3]">
                        {form.phone || "No phone number"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Earned Trust Badges */}
                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="mb-3 text-sm font-semibold text-white">
                    Earned Trust Badges
                  </p>
                  <div className="flex gap-3">
                    {/* Identity Verified */}
                    <div
                      className={`flex flex-col items-center rounded-xl border px-4 py-3 ${
                        form.isIdentityVerified
                          ? "border-[#A020F0] bg-[#241333]"
                          : "border-white/10 bg-white/[0.04] opacity-40"
                      }`}
                    >
                      <LuBadgeCheck
                        className={`h-6 w-6 ${form.isIdentityVerified ? "text-[#D8B4FE]" : "text-[#777B98]"}`}
                      />
                      <span className="mt-1 text-[10px] font-medium text-white/80">
                        Identity
                      </span>
                      <span className="text-[10px] text-[#A5A8C3]">
                        Verified
                      </span>
                    </div>

                    {/* Super Host */}
                    <div
                      className={`flex flex-col items-center rounded-xl border px-4 py-3 ${
                        form.isSuperHost
                          ? "border-amber-400 bg-amber-500/10"
                          : "border-white/10 bg-white/[0.04] opacity-40"
                      }`}
                    >
                      <LuStar
                        className={`h-6 w-6 ${form.isSuperHost ? "text-amber-400" : "text-[#777B98]"}`}
                      />
                      <span className="mt-1 text-[10px] font-medium text-white/80">
                        Super
                      </span>
                      <span className="text-[10px] text-[#A5A8C3]">Host</span>
                    </div>

                    {/* Community Champ */}
                    <div
                      className={`flex flex-col items-center rounded-xl border px-4 py-3 ${
                        form.isCommunityChamp
                          ? "border-purple-400 bg-purple-500/10"
                          : "border-white/10 bg-white/[0.04] opacity-40"
                      }`}
                    >
                      <LuUsers
                        className={`h-6 w-6 ${form.isCommunityChamp ? "text-purple-400" : "text-[#777B98]"}`}
                      />
                      <span className="mt-1 text-[10px] font-medium text-white/80">
                        Community
                      </span>
                      <span className="text-[10px] text-[#A5A8C3]">Champ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tip card */}
              <div className="rounded-xl bg-[#A020F0] p-5 text-white">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <LuBadgeCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">Pro Tip</h3>
                <p className="mt-1 text-sm text-white/80">
                  Hosts with a connected LinkedIn account and verified phone
                  number get 30% more booking inquiries on average.
                </p>
              </div>
            </div>
          </div>

          {/* Photos for guests' journeys, and the albums on the profile's
              Photos tab. */}
          {hostData && (
            <>
              <section className="mt-6 rounded-xl border border-white/10 bg-[#121426] p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-white">
                    Share photos with your guests
                  </h2>
                  <p className="mt-1 text-xs text-[#A5A8C3]">
                    Add photos to an experience you&apos;ve hosted. Everyone who
                    went will find them in their journey. Only share photos the
                    people in them are happy with.
                  </p>
                </div>
                <EventAlbums pastEvents={pastEvents} />
              </section>
              <section className="mt-6 rounded-xl border border-white/10 bg-[#121426] p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-white">
                    Albums on your profile
                  </h2>
                  <p className="mt-1 text-xs text-[#A5A8C3]">
                    The Photos tab of your public profile: past events,
                    credentials, your work.
                  </p>
                </div>
                <PhotoAlbums
                  owner={{ userId: validUserId }}
                  firstName={hostData.first_name}
                  isMe
                />
              </section>
            </>
          )}
        </main>
      )}
    </div>
  );
}
