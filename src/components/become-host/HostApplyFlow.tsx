"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { toast } from "sonner";
import {
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiEdit2,
  FiInfo,
  FiLink,
  FiUpload,
  FiX,
} from "react-icons/fi";
import {
  Briefcase,
  BookOpen,
  Brain,
  Camera,
  Cpu,
  Dumbbell,
  Landmark,
  Music,
  Salad,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { auth } from "~/utils/firebase";
import { GoogleLogin } from "~/components";
import { OTPVerificationModal } from "./OTPVerificationModal";
import {
  useMyProfile,
  useSaveHostDraft,
  useSendPhoneOTP,
  useSubmitHostApplication,
  useUploadFiles,
  useVerifyPhoneOTP,
} from "~/hooks/useApi";
import type { HostApplicationPayload, UploadFolder } from "~/lib/api";
import { setStoredHostId } from "~/lib/auth-storage";

/* ------------------------------------------------------------------ */
/*  Options                                                            */
/* ------------------------------------------------------------------ */

type Path = "community" | "pro";

/** Community categories, keyed by the mood the backend already stores. */
const CATEGORIES: { mood: string; label: string }[] = [
  { mood: "social", label: "Social & meetups" },
  { mood: "adventurous", label: "Adventure & outdoors" },
  { mood: "wellness", label: "Wellness" },
  { mood: "creative", label: "Arts & crafts" },
  { mood: "educational", label: "Learning" },
  { mood: "culinary", label: "Food & drink" },
  { mood: "cultural", label: "Culture" },
  { mood: "relaxing", label: "Chill" },
];

const PROFESSIONS: {
  key: string;
  label: string;
  icon: LucideIcon;
  mood: string;
}[] = [
  { key: "fitness", label: "Fitness", icon: Dumbbell, mood: "wellness" },
  { key: "nutrition", label: "Nutrition", icon: Salad, mood: "wellness" },
  { key: "yoga", label: "Yoga", icon: Wind, mood: "wellness" },
  { key: "photography", label: "Photography", icon: Camera, mood: "creative" },
  { key: "music", label: "Music", icon: Music, mood: "creative" },
  { key: "business", label: "Business", icon: Briefcase, mood: "educational" },
  { key: "finance", label: "Finance", icon: Landmark, mood: "educational" },
  { key: "legal", label: "Legal", icon: Scale, mood: "educational" },
  { key: "therapy", label: "Therapy", icon: Brain, mood: "wellness" },
  { key: "education", label: "Education", icon: BookOpen, mood: "educational" },
  { key: "career", label: "Career", icon: TrendingUp, mood: "educational" },
  { key: "technology", label: "Technology", icon: Cpu, mood: "educational" },
];

const YEARS = [
  "Just starting",
  "Under 1 year",
  "1–3 years",
  "3–5 years",
  "5+ years",
];
const EVENT_COUNTS = ["None yet", "1–5", "6–20", "20+"];
const LANGUAGES = ["English", "Hindi", "Assamese", "Bengali"];

const PATHS: Record<
  Path,
  {
    title: string;
    review: string;
    blurb: string;
    perks: string[];
    note?: string;
    steps: string[];
  }
> = {
  community: {
    title: "Community host",
    review: "Reviewed in 24–48 hours",
    blurb: "Bring people together through events, clubs and shared interests.",
    perks: [
      "Host paid and free events",
      "Sell tickets and collect RSVPs",
      "Run your community's group chat",
    ],
    steps: ["About you", "Your community", "Past events", "Review"],
  },
  pro: {
    title: "Verified professional",
    review: "Reviewed in 2–5 days",
    blurb: "Offer private sessions, classes and expert guidance.",
    perks: [
      "Offer 1-on-1 sessions",
      "Run ticketed workshops and masterclasses",
      "A Verified Professional badge on your profile",
    ],
    note: "We may ask for credentials, depending on your field.",
    steps: ["About you", "Profession", "Credentials", "Experience", "Review"],
  },
};

/* ------------------------------------------------------------------ */
/*  Form state                                                         */
/* ------------------------------------------------------------------ */

interface Form {
  fullName: string;
  city: string;
  // community
  communityName: string;
  category: string;
  about: string;
  years: string;
  events: string;
  social: string;
  portfolioUrl: string;
  // professional
  profession: string;
  licenseNumber: string;
  membership: string;
  linkedin: string;
  specialization: string;
  workHistory: string;
  languages: string[];
  achievements: string;
}

const EMPTY: Form = {
  fullName: "",
  city: "",
  communityName: "",
  category: "",
  about: "",
  years: "",
  events: "",
  social: "",
  portfolioUrl: "",
  profession: "",
  licenseNumber: "",
  membership: "",
  linkedin: "",
  specialization: "",
  workHistory: "",
  languages: ["English"],
  achievements: "",
};

/** Files stay in memory and upload only at submit, after sign-in. */
interface Files {
  govId: File | null;
  selfie: File | null;
  photos: File[];
  certificate: File | null;
  degree: File | null;
  testimonial: File | null;
}

const NO_FILES: Files = {
  govId: null,
  selfie: null,
  photos: [],
  certificate: null,
  degree: null,
  testimonial: null,
};

const DRAFT_KEY = "msm_host_apply_v2";
const MAX_MB = 10;

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

const INPUT =
  "w-full rounded-xl border border-white/10 bg-[#0D0F1E] px-4 py-3 text-sm text-white placeholder-white/35 outline-none transition focus:border-[#A020F0]";

function Field({
  label,
  hint,
  optional,
  error,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span
          className={`text-sm font-medium ${error ? "text-red-300" : "text-white"}`}
        >
          {label}
          {optional && (
            <span className="ml-1.5 text-xs font-normal text-white/40">
              Optional
            </span>
          )}
        </span>
        {hint && <span className="text-xs text-white/40">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
            value === o
              ? "border-[#A020F0] bg-[#A020F0]/15 text-white"
              : "border-white/10 text-white/70 hover:text-white"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** A file picker that shows the chosen file's name, with a remove button. */
function FilePick({
  file,
  onPick,
  label,
  accept = "image/*,application/pdf",
  capture,
  error,
  icon = "upload",
}: {
  file: File | null;
  onPick: (f: File | null) => void;
  label: string;
  accept?: string;
  capture?: "user";
  error?: boolean;
  icon?: "upload" | "camera";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const Icon = icon === "camera" ? FiCamera : FiUpload;
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (f && f.size > MAX_MB * 1024 * 1024) {
            toast.error(`Please choose a file under ${MAX_MB} MB.`);
            return;
          }
          onPick(f);
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#A020F0]/40 bg-[#A020F0]/10 px-4 py-3">
          <FiCheck className="h-4 w-4 shrink-0 text-[#D8B4FE]" />
          <span className="min-w-0 flex-1 truncate text-sm text-white">
            {file.name}
          </span>
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label={`Remove ${file.name}`}
            className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-sm transition ${
            error
              ? "border-red-400/60 text-red-200"
              : "border-white/15 text-white/60 hover:border-[#A020F0] hover:text-white"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The flow                                                           */
/* ------------------------------------------------------------------ */

/**
 * Host application, two paths. A community host and a verified professional
 * answer different questions, so after choosing a path each gets its own
 * short set of steps, then one review screen and the phone-code check.
 */
export default function HostApplyFlow() {
  const router = useRouter();
  const [user] = useAuthState(auth);

  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  useEffect(() => setStoredUserId(localStorage.getItem("msm_user_id")), []);
  const userId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;
  const { data: profile } = useMyProfile(userId);

  const [path, setPath] = useState<Path | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [files, setFiles] = useState<Files>(NO_FILES);
  const [showErrors, setShowErrors] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const restored = useRef(false);

  const submitMutation = useSubmitHostApplication();
  const draftMutation = useSaveHostDraft();
  const sendOtp = useSendPhoneOTP();
  const verifyOtp = useVerifyPhoneOTP();
  const upload = useUploadFiles();

  // Answers survive a sign-in round trip (files can't, and are re-asked).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          path: Path | null;
          step: number;
          form: Partial<Form>;
        };
        setPath(saved.path);
        setStep(saved.step ?? 0);
        setForm((f) => ({ ...f, ...saved.form }));
      }
    } catch {
      /* storage blocked or bad JSON: start blank */
    }
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ path, step, form }));
    } catch {
      /* storage blocked: the form still works */
    }
  }, [path, step, form]);

  // Fill name and city from the account once it loads.
  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      fullName: f.fullName || (profile.name ?? ""),
      city: f.city || (profile.city ?? ""),
    }));
  }, [profile]);
  useEffect(() => {
    if (user?.displayName)
      setForm((f) => ({ ...f, fullName: f.fullName || user.displayName! }));
  }, [user?.displayName]);

  const phone = profile?.phn_number ?? user?.phoneNumber ?? "";
  const email = user?.email ?? profile?.email ?? "";

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setFile = <K extends keyof Files>(k: K, v: Files[K]) =>
    setFiles((f) => ({ ...f, [k]: v }));

  // One preview URL per chosen photo, released when the photos change.
  const photoUrls = useMemo(
    () => files.photos.map((f) => URL.createObjectURL(f)),
    [files.photos],
  );
  useEffect(
    () => () => photoUrls.forEach((u) => URL.revokeObjectURL(u)),
    [photoUrls],
  );

  const steps = path ? PATHS[path].steps : [];
  const stepName = steps[step] ?? "";
  const isReview = stepName === "Review";

  /* ---- validation, per step ---- */
  const problems = useMemo(() => {
    const p: Record<string, boolean> = {};
    if (stepName === "About you") {
      p.fullName = !form.fullName.trim();
      p.city = !form.city.trim();
      p.govId = !files.govId;
    }
    if (stepName === "Your community") {
      p.category = !form.category;
      p.about = form.about.trim().length < 20;
    }
    if (stepName === "Profession") p.profession = !form.profession;
    if (stepName === "Credentials")
      p.credentials =
        !files.certificate &&
        !form.licenseNumber.trim() &&
        !form.portfolioUrl.trim() &&
        !form.linkedin.trim();
    if (stepName === "Experience") {
      p.years = !form.years;
      p.specialization = !form.specialization.trim();
    }
    return p;
  }, [stepName, form, files]);
  const stepOk = !Object.values(problems).some(Boolean);

  const next = () => {
    if (!stepOk) {
      setShowErrors(true);
      toast.warning("Please fill in the highlighted fields.");
      return;
    }
    setShowErrors(false);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setShowErrors(false);
    if (step === 0) setPath(null);
    else setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goTo = (name: string) => {
    const i = steps.indexOf(name);
    if (i >= 0) setStep(i);
  };
  const err = (k: string) => showErrors && !!problems[k];

  /* ---- account ---- */
  const requireAccount = () => {
    if (userId) return true;
    if (user) {
      toast.info("Finish creating your profile, then come back to submit.");
      router.push("/signup");
      return false;
    }
    toast.info("Sign in to send your application. Your answers are saved.");
    setShowLogin(true);
    return false;
  };

  /* ---- payload ---- */
  const profLabel =
    PROFESSIONS.find((x) => x.key === form.profession)?.label ?? "";
  const categoryLabel =
    CATEGORIES.find((c) => c.mood === form.category)?.label ?? "";

  const basePayload = (): HostApplicationPayload => {
    const [first, ...rest] = form.fullName.trim().split(/\s+/);
    const mood =
      path === "pro"
        ? (PROFESSIONS.find((x) => x.key === form.profession)?.mood ??
          "educational")
        : form.category;
    const social = form.social.trim();
    return {
      user_id: userId!,
      first_name: first ?? "",
      last_name: rest.join(" "),
      city: form.city.trim(),
      phn_number: phone,
      is_professional: path === "pro",
      moods: mood ? [mood] : [],
      tagline:
        (path === "pro" ? form.specialization : form.communityName).trim() ||
        undefined,
      description:
        (path === "pro" ? form.workHistory : form.about).trim() || undefined,
      social_instagram: /instagram\.com/i.test(social) ? social : null,
      social_linkedin: form.linkedin.trim() || null,
      social_website:
        form.portfolioUrl.trim() ||
        (social && !/instagram\.com/i.test(social) ? social : null),
      // Each answer in its own field; the admin review page shows them as is.
      host_type:
        path === "pro" ? "professional" : path ? "community" : undefined,
      community_name: form.communityName.trim() || undefined,
      community_category: path === "community" ? form.category : undefined,
      years_experience: form.years || undefined,
      events_hosted: form.events || undefined,
      portfolio_url: form.portfolioUrl.trim() || undefined,
      profession: path === "pro" ? form.profession : undefined,
      license_number: form.licenseNumber.trim() || undefined,
      professional_body: form.membership.trim() || undefined,
      specialization: form.specialization.trim() || undefined,
      work_history: form.workHistory.trim() || undefined,
      languages: path === "pro" ? form.languages : undefined,
      achievements: form.achievements.trim() || undefined,
    };
  };

  const uploadOne = async (f: File | null, folder: UploadFolder) => {
    if (!f) return undefined;
    const res = await upload.mutateAsync({ files: [f], folder });
    return res.data[0]?.url;
  };

  const submit = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const [govId, selfie, certificate, degree, testimonial] =
        await Promise.all([
          uploadOne(files.govId, "hosts/government-ids"),
          uploadOne(files.selfie, "hosts/government-ids"),
          uploadOne(files.certificate, "hosts/government-ids"),
          uploadOne(files.degree, "hosts/government-ids"),
          uploadOne(files.testimonial, "general"),
        ]);
      const photos = files.photos.length
        ? (
            await upload.mutateAsync({ files: files.photos, folder: "general" })
          ).data.map((r) => r.url)
        : [];

      const payload: HostApplicationPayload = {
        ...basePayload(),
        government_id_url: govId,
        selfie_url: selfie,
        certificate_url: certificate,
        degree_url: degree,
        portfolio_photo_urls: photos.length ? photos : undefined,
        testimonial_url: testimonial,
      };

      const res = await submitMutation.mutateAsync(payload);
      setStoredHostId(res.data.id);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing to clear */
      }
      setShowOtp(false);
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      console.error("Host application failed:", e);
      // A 400 carries the check that failed, written for the applicant.
      const status = (e as { status?: number }).status;
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        status === 400 && msg
          ? msg
          : "We couldn't send your application. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startSubmit = async () => {
    if (!requireAccount() || !userId) return;
    if (!files.govId) {
      toast.warning("Please add your government ID again before submitting.");
      goTo("About you");
      setShowErrors(true);
      return;
    }
    try {
      await sendOtp.mutateAsync(userId);
      setShowOtp(true);
    } catch {
      toast.error(
        "We couldn't text you a code. Check the phone number on your account and try again.",
      );
    }
  };

  const saveDraft = async () => {
    if (!requireAccount() || !userId) return;
    try {
      await draftMutation.mutateAsync(basePayload());
      toast.success("Saved. You can finish this later.");
    } catch {
      toast.error("Couldn't save. Please try again.");
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Screens                                                          */
  /* ---------------------------------------------------------------- */

  if (done && path) {
    const firstName = form.fullName.trim().split(/\s+/)[0];
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#B724EA] shadow-[0_0_60px_-10px_rgb(160_32_240/0.8)]">
          <FiCheck className="h-9 w-9 text-white" />
        </span>
        <h1 className="font-outfit mt-8 text-3xl font-semibold text-white">
          Application sent
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Thanks{firstName ? `, ${firstName}` : ""}. Our team will review it and
          let you know. We usually reply{" "}
          {path === "pro" ? "within 2–5 days" : "within 24–48 hours"}.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/host-dashboard"
            className="rounded-full bg-[#A020F0] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0]"
          >
            Go to host dashboard
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  /* ---- choose a path ---- */
  if (!path) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-12">
        <h1 className="font-outfit text-[28px] leading-tight font-semibold text-white sm:text-[36px]">
          Become a host
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/60">
          Choose how you want to host. You can run free community events on
          either path.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(Object.keys(PATHS) as Path[]).map((key) => {
            const p = PATHS[key];
            const Icon = key === "pro" ? Sparkles : Users;
            return (
              <div
                key={key}
                className="flex flex-col rounded-2xl border border-white/10 bg-[#121426] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A020F0]/15 text-[#D8B4FE]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/60">
                    {p.review}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">
                  {p.title}
                </h2>
                <p className="mt-1 text-sm text-white/55">{p.blurb}</p>
                <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                  {p.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2 text-sm text-white/80"
                    >
                      <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D8B4FE]" />
                      {perk}
                    </li>
                  ))}
                </ul>
                {p.note && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-white/55">
                    <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {p.note}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPath(key);
                    setStep(0);
                    window.scrollTo({ top: 0 });
                  }}
                  className="mt-5 rounded-full bg-[#A020F0] py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] md:mt-auto"
                >
                  Apply as{" "}
                  {key === "pro" ? "a professional" : "a community host"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Verification keeps Myslotmate safe and trusted for everyone.
        </p>
      </div>
    );
  }

  /* ---- step screens ---- */
  const total = steps.length;
  const pct = Math.round(((step + 1) / total) * 100);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 md:py-10">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/80 transition hover:bg-white/[0.06]"
        >
          <FiArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50">{PATHS[path].title}</p>
          <h1 className="font-outfit truncate text-xl font-semibold text-white">
            {stepName}
          </h1>
        </div>
        <span className="shrink-0 text-xs text-[#D8B4FE]">
          {step + 1} of {total}
        </span>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#B724EA] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {!userId && step === 0 && (
        <p className="mt-4 text-xs text-white/50">
          Fill it in now. You&apos;ll sign in when you submit.
        </p>
      )}

      <div className="mt-6 space-y-5">
        {/* About you (both paths) */}
        {stepName === "About you" && (
          <>
            <Field
              label="Full name"
              hint="As on your ID"
              error={err("fullName")}
            >
              <input
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                placeholder="e.g. Ananya Dutta"
                className={INPUT}
              />
            </Field>
            <Field label="City" error={err("city")}>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Guwahati"
                className={INPUT}
              />
            </Field>
            <Field
              label="Government ID"
              hint="Aadhaar, PAN, passport or driving licence"
              error={err("govId")}
            >
              <FilePick
                file={files.govId}
                onPick={(f) => setFile("govId", f)}
                label="Upload a photo or PDF"
                error={err("govId")}
              />
            </Field>
            <Field
              label="Selfie"
              optional
              hint="Helps us match you to your ID faster"
            >
              <FilePick
                file={files.selfie}
                onPick={(f) => setFile("selfie", f)}
                label="Take or upload a selfie"
                accept="image/*"
                capture="user"
                icon="camera"
              />
            </Field>
            {(phone || email) && (
              <p className="rounded-xl bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/55">
                We&apos;ll contact you at{" "}
                <span className="text-white/80">
                  {[email, phone].filter(Boolean).join(" · ")}
                </span>
                . We text a code to your phone when you submit.
              </p>
            )}
          </>
        )}

        {/* Community path */}
        {stepName === "Your community" && (
          <>
            <Field label="Community name" optional>
              <input
                value={form.communityName}
                onChange={(e) => set("communityName", e.target.value)}
                placeholder="e.g. Guwahati Weekend Hikers"
                className={INPUT}
              />
            </Field>
            <Field label="What kind of events?" error={err("category")}>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.mood}
                    type="button"
                    onClick={() => set("category", c.mood)}
                    aria-pressed={form.category === c.mood}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                      form.category === c.mood
                        ? "border-[#A020F0] bg-[#A020F0]/15 text-white"
                        : "border-white/10 text-white/70 hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              label="Tell us about it"
              hint={`${form.about.length}/500`}
              error={err("about")}
            >
              <textarea
                value={form.about}
                onChange={(e) => set("about", e.target.value.slice(0, 500))}
                rows={4}
                placeholder="Who comes, what you do together, and how often."
                className={`${INPUT} resize-none`}
              />
            </Field>
            <Field label="How long have you been hosting?" optional>
              <Chips
                options={YEARS}
                value={form.years}
                onChange={(v) => set("years", v)}
              />
            </Field>
            <Field label="Events hosted so far" optional>
              <Chips
                options={EVENT_COUNTS}
                value={form.events}
                onChange={(v) => set("events", v)}
              />
            </Field>
            <Field label="Instagram or social link" optional>
              <div className="relative">
                <FiLink className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={form.social}
                  onChange={(e) => set("social", e.target.value)}
                  placeholder="instagram.com/yourcommunity"
                  inputMode="url"
                  className={`${INPUT} pl-11`}
                />
              </div>
            </Field>
          </>
        )}

        {stepName === "Past events" && (
          <>
            <Field
              label="Photos or posters from past events"
              optional
              hint={`${files.photos.length}/3`}
            >
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => {
                  const f = files.photos[i];
                  return f ? (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-xl border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrls[i]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFile(
                            "photos",
                            files.photos.filter((_, j) => j !== i),
                          )
                        }
                        aria-label="Remove photo"
                        className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      key={i}
                      className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 text-xs text-white/50 transition hover:border-[#A020F0] hover:text-white"
                    >
                      <FiCamera className="h-4 w-4" />
                      Add
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (!f) return;
                          if (f.size > MAX_MB * 1024 * 1024) {
                            toast.error(
                              `Please choose a file under ${MAX_MB} MB.`,
                            );
                            return;
                          }
                          setFile("photos", [...files.photos, f].slice(0, 3));
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Website or portfolio" optional>
              <div className="relative">
                <FiLink className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={form.portfolioUrl}
                  onChange={(e) => set("portfolioUrl", e.target.value)}
                  placeholder="https://"
                  inputMode="url"
                  className={`${INPUT} pl-11`}
                />
              </div>
            </Field>
            <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#D8B4FE]" />
              <div>
                <p className="text-sm font-medium text-white">
                  No past events? That&apos;s okay.
                </p>
                <p className="mt-0.5 text-xs text-white/55">
                  Everyone starts somewhere. We support new hosts too.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Professional path */}
        {stepName === "Profession" && (
          <Field
            label="What's your field?"
            hint="This decides what we check"
            error={err("profession")}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROFESSIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("profession", key)}
                  aria-pressed={form.profession === key}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${
                    form.profession === key
                      ? "border-[#A020F0] bg-[#A020F0]/15 text-white"
                      : "border-white/10 bg-[#121426] text-white/70 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {stepName === "Credentials" && (
          <>
            <p
              className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
                err("credentials")
                  ? "bg-red-500/10 text-red-200"
                  : "bg-white/[0.03] text-white/55"
              }`}
            >
              Add at least one: a certificate, a license number, a portfolio or
              your LinkedIn. Verified credentials help guests trust you.
            </p>
            <Field label="Professional certificate">
              <FilePick
                file={files.certificate}
                onPick={(f) => setFile("certificate", f)}
                label="Upload a photo or PDF"
              />
            </Field>
            <Field label="Degree or diploma" optional>
              <FilePick
                file={files.degree}
                onPick={(f) => setFile("degree", f)}
                label="Upload a photo or PDF"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="License or registration no." optional>
                <input
                  value={form.licenseNumber}
                  onChange={(e) => set("licenseNumber", e.target.value)}
                  placeholder="e.g. LIC-123456"
                  className={INPUT}
                />
              </Field>
              <Field label="Professional body" optional>
                <input
                  value={form.membership}
                  onChange={(e) => set("membership", e.target.value)}
                  placeholder="e.g. Yoga Alliance"
                  className={INPUT}
                />
              </Field>
            </div>
            <Field label="Portfolio or website" optional>
              <input
                value={form.portfolioUrl}
                onChange={(e) => set("portfolioUrl", e.target.value)}
                placeholder="https://"
                inputMode="url"
                className={INPUT}
              />
            </Field>
            <Field label="LinkedIn" optional>
              <input
                value={form.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
                placeholder="linkedin.com/in/yourname"
                inputMode="url"
                className={INPUT}
              />
            </Field>
          </>
        )}

        {stepName === "Experience" && (
          <>
            <Field label="Years of experience" error={err("years")}>
              <Chips
                options={YEARS.slice(1)}
                value={form.years}
                onChange={(v) => set("years", v)}
              />
            </Field>
            <Field
              label="What do you specialise in?"
              error={err("specialization")}
            >
              <input
                value={form.specialization}
                onChange={(e) => set("specialization", e.target.value)}
                placeholder="e.g. Strength training for beginners"
                className={INPUT}
              />
            </Field>
            <Field label="Brief work history" optional>
              <textarea
                value={form.workHistory}
                onChange={(e) =>
                  set("workHistory", e.target.value.slice(0, 500))
                }
                rows={3}
                placeholder="Where you've worked and what you did."
                className={`${INPUT} resize-none`}
              />
            </Field>
            <Field label="Languages you teach in">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => {
                  const on = form.languages.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set(
                          "languages",
                          on
                            ? form.languages.filter((x) => x !== l)
                            : [...form.languages, l],
                        )
                      }
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                        on
                          ? "border-[#A020F0] bg-[#A020F0]/15 text-white"
                          : "border-white/10 text-white/70 hover:text-white"
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Key achievements" optional>
              <input
                value={form.achievements}
                onChange={(e) => set("achievements", e.target.value)}
                placeholder="Awards, publications or milestones"
                className={INPUT}
              />
            </Field>
            <Field label="Client testimonials" optional>
              <FilePick
                file={files.testimonial}
                onPick={(f) => setFile("testimonial", f)}
                label="Upload a photo or PDF"
              />
            </Field>
          </>
        )}

        {/* Review */}
        {isReview && (
          <>
            <ReviewCard
              title="About you"
              onEdit={() => goTo("About you")}
              lines={[
                form.fullName,
                form.city,
                [email, phone].filter(Boolean).join(" · "),
                files.govId ? "Government ID added" : "Government ID missing",
                files.selfie ? "Selfie added" : "",
              ]}
              warn={!files.govId}
            />
            {path === "community" ? (
              <>
                <ReviewCard
                  title="Your community"
                  onEdit={() => goTo("Your community")}
                  lines={[
                    form.communityName,
                    categoryLabel,
                    form.about,
                    [form.years, form.events && `${form.events} events`]
                      .filter(Boolean)
                      .join(" · "),
                    form.social,
                  ]}
                />
                <ReviewCard
                  title="Past events"
                  onEdit={() => goTo("Past events")}
                  lines={[
                    files.photos.length
                      ? `${files.photos.length} photo${files.photos.length > 1 ? "s" : ""}`
                      : "No photos",
                    form.portfolioUrl,
                  ]}
                />
              </>
            ) : (
              <>
                <ReviewCard
                  title="Profession"
                  onEdit={() => goTo("Profession")}
                  lines={[profLabel]}
                />
                <ReviewCard
                  title="Credentials"
                  onEdit={() => goTo("Credentials")}
                  lines={[
                    files.certificate ? "Certificate added" : "",
                    files.degree ? "Degree added" : "",
                    form.licenseNumber && `License: ${form.licenseNumber}`,
                    form.membership,
                    form.portfolioUrl,
                    form.linkedin,
                  ]}
                />
                <ReviewCard
                  title="Experience"
                  onEdit={() => goTo("Experience")}
                  lines={[
                    `${form.years} · ${form.languages.join(", ")}`,
                    form.specialization,
                    form.workHistory,
                    form.achievements,
                  ]}
                />
              </>
            )}
            <p className="text-xs leading-relaxed text-white/45">
              By submitting, you confirm these details are true. We&apos;ll text
              a code to your phone to finish.
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3">
        {userId && (
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={draftMutation.isPending}
            className="text-sm text-white/55 transition hover:text-white disabled:opacity-50"
          >
            Save for later
          </button>
        )}
        <button
          type="button"
          onClick={isReview ? () => void startSubmit() : next}
          disabled={submitting || sendOtp.isPending}
          className="ml-auto rounded-full bg-[#A020F0] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:opacity-50"
        >
          {isReview
            ? sendOtp.isPending
              ? "Sending code…"
              : submitting
                ? "Submitting…"
                : "Submit application"
            : "Continue"}
        </button>
      </div>

      <GoogleLogin
        open={showLogin}
        onClose={() => {
          setShowLogin(false);
          const id = localStorage.getItem("msm_user_id");
          if (id && id !== "existing") setStoredUserId(id);
        }}
      />
      <OTPVerificationModal
        open={showOtp}
        onClose={() => setShowOtp(false)}
        resending={sendOtp.isPending}
        phoneNumber={phone || "your phone"}
        onVerify={async (code) => {
          if (!userId) return false;
          try {
            await verifyOtp.mutateAsync({ userId, otp: code });
            await submit();
            return true;
          } catch {
            toast.error("That code didn't work. Please try again.");
            return false;
          }
        }}
        onResend={async () => {
          if (!userId || sendOtp.isPending) return;
          try {
            await sendOtp.mutateAsync(userId);
            toast.success("Code sent again.");
          } catch {
            toast.error("Couldn't resend the code.");
          }
        }}
      />
    </div>
  );
}

function ReviewCard({
  title,
  lines,
  onEdit,
  warn,
}: {
  title: string;
  lines: (string | false | undefined)[];
  onEdit: () => void;
  warn?: boolean;
}) {
  const shown = lines.filter((l): l is string => !!l && !!l.trim());
  return (
    <div
      className={`rounded-2xl border bg-[#121426] p-4 ${warn ? "border-red-400/40" : "border-white/10"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/50">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-semibold text-[#D8B4FE] hover:text-white"
        >
          <FiEdit2 className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="mt-2 space-y-0.5">
        {shown.length === 0 ? (
          <p className="text-sm text-white/40">Nothing added</p>
        ) : (
          shown.map((l, i) => (
            <p
              key={i}
              className={`${i === 0 ? "text-sm font-medium text-white" : "text-xs text-white/55"} line-clamp-2`}
            >
              {l}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
