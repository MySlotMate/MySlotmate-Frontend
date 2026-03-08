"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { HostNavbar } from "~/components/host-dashboard";
import {
  FiUploadCloud,
  FiX,
  FiEdit2,
  FiPlus,
  FiCheck,
  FiExternalLink,
} from "react-icons/fi";
import {
  LuShieldCheck,
  LuMail,
  LuPhone,
  LuBadgeCheck,
  LuStar,
  LuUsers,
} from "react-icons/lu";
import { FaInstagram, FaLinkedin, FaGlobe } from "react-icons/fa";
import { toast } from "sonner";
import {
  useMyHost,
  useUpdateHostProfile,
  useUploadFiles,
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

  const [form, setForm] = useState<HostProfileData>(INITIAL);
  const [newTag, setNewTag] = useState("");
  const [hostId, setHostId] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  // Read userId from localStorage
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => {
    setStoredUserId(localStorage.getItem("msm_user_id"));
  }, []);

  const validUserId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;

  // React Query
  const { data: hostData, isLoading: loading } = useMyHost(validUserId);
  const updateMutation = useUpdateHostProfile();
  const uploadMutation = useUploadFiles();
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
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      update("avatarUrl", url);
      setPendingAvatarFile(file);
    },
    [],
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
        } catch (uploadErr) {
          console.warn("Avatar upload failed:", uploadErr);
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
    } catch (err) {
      console.error("Save host profile error:", err);
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
    <div className="min-h-screen bg-gray-50">
      <HostNavbar />

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
        </div>
      ) : (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/host-dashboard" className="hover:text-gray-700">
            Dashboard
          </Link>
          <span>›</span>
          <span className="font-medium text-gray-900">
            Profile &amp; Verification
          </span>
        </div>

        {/* Header row */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Host Profile
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your public persona and build trust with your guests.
            </p>
          </div>
          <button className="shrink-0 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50">
            Preview Public Profile
          </button>
        </div>

        {/* ── Profile completion bar ── */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LuShieldCheck className="h-5 w-5 text-[#0094CA]" />
              <span className="text-sm font-semibold text-gray-900">
                Profile Completion
              </span>
            </div>
            <span
              className={`text-sm font-bold ${completionPct === 100 ? "text-green-600" : "text-[#0094CA]"}`}
            >
              {completionPct}%
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#0094CA] transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {completionPct < 100 && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Almost there! Add a phone number to reach 100%.
              </p>
              <button className="text-xs font-semibold text-[#0094CA] hover:underline">
                Complete now
              </button>
            </div>
          )}
        </div>

        {/* ── Body: Two columns ── */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ─── LEFT: Basic Information (2/3) ─── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Basic Information
                </h2>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm font-semibold text-[#0094CA] hover:underline disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {/* Avatar */}
              <div className="mt-6 flex items-center gap-5">
                <img
                  src={form.avatarUrl}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full border-2 border-gray-200 object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Your Avatar
                  </p>
                  <p className="text-xs text-gray-500">
                    Recommended 500×500px, JPG or PNG
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-[#0094CA] hover:underline"
                    >
                      Upload New
                    </button>
                    <button
                      onClick={() => update("avatarUrl", "")}
                      className="text-xs font-medium text-red-500 hover:underline"
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
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    First Name
                  </label>
                  <input
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Last Name
                  </label>
                  <input
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                  />
                </div>
              </div>

              {/* Tagline */}
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tagline
                </label>
                <input
                  value={form.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                />
              </div>

              {/* Bio */}
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                />
              </div>

              {/* Expertise Tags */}
              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Expertise &amp; Vibe
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {form.expertiseTags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-[#0094CA] px-3 py-1.5 text-xs font-medium text-white"
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
                      className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-[#0094CA]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Social Presence ─── */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">
                Social Presence
              </h2>

              <div className="mt-5 space-y-4">
                {/* Instagram */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400">
                      <FaInstagram className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Instagram
                      </p>
                      <p className="text-xs text-gray-500">
                        {form.socialInstagram || "Not connected"}
                      </p>
                    </div>
                  </div>
                  {form.socialInstagram ? (
                    <button
                      onClick={() => update("socialInstagram", "")}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  ) : (
                    <button className="text-sm font-semibold text-[#0094CA] hover:underline">
                      Connect
                    </button>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2]">
                      <FaLinkedin className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        LinkedIn
                      </p>
                      <p className="text-xs text-[#0094CA]">
                        {form.socialLinkedin
                          ? `Connected as ${form.socialLinkedin}`
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {form.socialLinkedin ? (
                    <button
                      onClick={() => update("socialLinkedin", "")}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  ) : (
                    <button className="text-sm font-semibold text-[#0094CA] hover:underline">
                      Connect
                    </button>
                  )}
                </div>

                {/* Website */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
                      <FaGlobe className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Website
                      </p>
                      <p className="text-xs text-gray-500">
                        {form.socialWebsite || "Not set"}
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      const val = prompt(
                        "Enter your website URL:",
                        form.socialWebsite,
                      );
                      if (val !== null) update("socialWebsite", val);
                    }}
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Trust & Safety (1/3) ─── */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <span className="text-green-500">🛡️</span> Trust &amp; Safety
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Verification enhances trust.
              </p>

              <div className="mt-5 space-y-5">
                {/* Government ID */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Government ID
                    </p>
                    <p className="text-xs text-gray-500">
                      {form.isGovIdVerified
                        ? "Identity Verified"
                        : "Not verified"}
                    </p>
                  </div>
                  {form.isGovIdVerified ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <FiCheck className="h-4 w-4 text-green-600" />
                    </div>
                  ) : (
                    <button className="rounded-lg bg-[#0094CA] px-4 py-1.5 text-xs font-semibold text-white">
                      Verify Now
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Email Address
                    </p>
                    <p className="text-xs text-gray-500">
                      {form.email || "No email"}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Phone Number
                    </p>
                    <p className="text-xs text-gray-500">
                      {form.phone || "No phone number"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Earned Trust Badges */}
              <div className="mt-6 border-t border-gray-200 pt-5">
                <p className="mb-3 text-sm font-semibold text-gray-900">
                  Earned Trust Badges
                </p>
                <div className="flex gap-3">
                  {/* Identity Verified */}
                  <div
                    className={`flex flex-col items-center rounded-xl border px-4 py-3 ${
                      form.isIdentityVerified
                        ? "border-[#0094CA] bg-[#e6f8ff]"
                        : "border-gray-200 bg-gray-50 opacity-40"
                    }`}
                  >
                    <LuBadgeCheck
                      className={`h-6 w-6 ${form.isIdentityVerified ? "text-[#0094CA]" : "text-gray-400"}`}
                    />
                    <span className="mt-1 text-[10px] font-medium text-gray-700">
                      Identity
                    </span>
                    <span className="text-[10px] text-gray-500">Verified</span>
                  </div>

                  {/* Super Host */}
                  <div
                    className={`flex flex-col items-center rounded-xl border px-4 py-3 ${
                      form.isSuperHost
                        ? "border-amber-400 bg-amber-50"
                        : "border-gray-200 bg-gray-50 opacity-40"
                    }`}
                  >
                    <LuStar
                      className={`h-6 w-6 ${form.isSuperHost ? "text-amber-500" : "text-gray-400"}`}
                    />
                    <span className="mt-1 text-[10px] font-medium text-gray-700">
                      Super
                    </span>
                    <span className="text-[10px] text-gray-500">Host</span>
                  </div>

                  {/* Community Champ */}
                  <div
                    className={`flex flex-col items-center rounded-xl border px-4 py-3 ${
                      form.isCommunityChamp
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-200 bg-gray-50 opacity-40"
                    }`}
                  >
                    <LuUsers
                      className={`h-6 w-6 ${form.isCommunityChamp ? "text-purple-500" : "text-gray-400"}`}
                    />
                    <span className="mt-1 text-[10px] font-medium text-gray-700">
                      Community
                    </span>
                    <span className="text-[10px] text-gray-500">Champ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tip card */}
            <div className="rounded-xl bg-[#0094CA] p-5 text-white">
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
      </main>
      )}
    </div>
  );
}
