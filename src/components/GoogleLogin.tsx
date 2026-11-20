"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import type { LoginHint } from "~/lib/savedAccounts";
import { auth } from "~/utils/firebase";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import {
  FiPhone,
  FiLock,
  FiArrowRight,
  FiEdit2,
  FiUser,
  FiX,
} from "react-icons/fi";
import { clearStoredAuth, setStoredUserId } from "~/lib/auth-storage";
import { sendLoginOTP, verifyLoginOTP, updateUserProfile } from "~/lib/api";

interface GoogleLoginProps {
  open: boolean;
  onClose: () => void;
  /** Optional context, e.g. why sign-in is being asked for here. */
  title?: string;
  subtitle?: string;
  /** Switching to a saved account: open its login method, prefilled. */
  hint?: LoginHint | null;
}

type LoginType = "google" | "phone";

export default function GoogleLogin({
  open,
  onClose,
  title = "Log in or sign up",
  subtitle = "Find events near you and book your spot in a tap.",
  hint = null,
}: GoogleLoginProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>("google");

  // Phone Login States
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [name, setName] = useState("");

  // Reset all states and auto-transition to name setup if current user has a Guest User profile
  useEffect(() => {
    if (open && hint) {
      setLoginType(hint.method);
      if (hint.method === "phone" && hint.phone)
        setPhone(hint.phone.replace(/^\+91/, "").replace(/\D/g, ""));
    }
  }, [open, hint]);

  useEffect(() => {
    if (open) {
      const storedId = localStorage.getItem("msm_user_id");
      if (storedId) {
        setCreatedUserId(storedId);
        // Fetch profile to see if name is Guest User
        // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me?user_id=${storedId}`)
          .then(
            (r) =>
              r.json() as Promise<{
                success: boolean;
                data?: { name: string };
              }>,
          )
          .then((res) => {
            if (res.success && res.data) {
              const u = res.data;
              if (u.name === "Guest User" || u.name === "") {
                setStep("name");
              }
            }
          })
          .catch((err) =>
            console.error("Error fetching current profile:", err),
          );
      }
    } else {
      setStep("phone");
      setPhone("");
      setOtp("");
      setSessionId(null);
      setName("");
      setCreatedUserId(null);
      setCountdown(0);
      setAgreed(false);
    }
  }, [open]);

  // Timer effect for Resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleGoogleLogin = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Always let people pick the Google account (needed to add a second
      // account); when switching, suggest the one they chose.
      provider.setCustomParameters({
        prompt: "select_account",
        ...(hint?.method === "google" && hint.email
          ? { login_hint: hint.email }
          : {}),
      });
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Always resolve the account from the Firebase UID just signed in with.
      // A stored msm_user_id may belong to whoever logged in on this browser
      // last, so trusting it would show one person another's account.
      let userId: string | null = null;
      try {
        const profileRes = await fetch(
          // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
          `${process.env.NEXT_PUBLIC_API_URL}/users/by-firebase/${firebaseUser.uid}`,
        );
        if (profileRes.ok) {
          const response = (await profileRes.json()) as {
            data?: { id?: string };
          };
          userId = response.data?.id ?? null;
        }
      } catch (fetchErr) {
        console.error("Error fetching user by Firebase UID:", fetchErr);
      }

      if (userId) {
        setStoredUserId(userId);
        toast.success("Welcome back!");
        onClose();
        return;
      }

      // No account for this UID yet. Drop the previous session's ids so the
      // signup page isn't skipped by its own "already signed up" guard.
      clearStoredAuth();
      onClose();
      router.push("/signup");
    } catch (err) {
      console.error("Google sign-in error:", err);
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please agree to the Terms & Privacy Policy to continue");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    const formattedPhone = `+91${cleanPhone}`;
    try {
      const res = await sendLoginOTP(formattedPhone);
      if (res.success) {
        setSessionId(res.data.session_id);
        setStep("otp");
        setCountdown(60);
        toast.success("Verification code sent to your phone");
      } else {
        toast.error(res.error ?? "Failed to send OTP. Try again.");
      }
    } catch (err) {
      console.error("OTP send error:", err);
      toast.error("An error occurred while sending OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    if (otp.length !== 4 && otp.length !== 6) {
      toast.error("Please enter a valid verification code");
      return;
    }

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = `+91${cleanPhone}`;
    try {
      const res = await verifyLoginOTP(formattedPhone, sessionId, otp);
      if (res.success) {
        const { user, token, firebase_custom_token } = res.data;

        // Save auth details
        localStorage.setItem("msm_auth_token", token);
        setStoredUserId(user.id);

        // Authenticate with Firebase if custom token is returned
        if (firebase_custom_token) {
          try {
            await signInWithCustomToken(auth, firebase_custom_token);
          } catch (fbErr) {
            console.error("Firebase custom token login failed:", fbErr);
            toast.warning("Signed in, but some features may need a re-login.");
          }
        }

        if (user.name === "Guest User" || user.name === "") {
          setCreatedUserId(user.id);
          setStep("name");
        } else {
          toast.success("Welcome back!");
          onClose();
        }
      } else {
        toast.error(res.error ?? "Incorrect verification code");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      toast.error("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdUserId) return;
    if (!name.trim()) {
      toast.error("Please enter your name to complete registration");
      return;
    }

    setLoading(true);
    try {
      const res = await updateUserProfile(createdUserId, { name: name.trim() });
      if (res.success) {
        toast.success("Account created successfully!");
        onClose();
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to save profile name");
      }
    } catch (err) {
      console.error("Name save error:", err);
      toast.error("Failed to save name. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const PRIMARY =
    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#A020F0] py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_-10px_rgb(160_32_240/0.7)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none";
  const INPUT =
    "w-full rounded-xl border border-white/10 bg-[#080914] py-3 pr-4 text-sm text-white placeholder-[#777B98] transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/25";
  const LABEL =
    "mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase";

  return (
    <div
      className="msm-modal fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== "name") onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-[28px] border border-white/10 bg-[#121426] px-6 pt-8 pb-7 font-[family-name:var(--font-inter)] text-white shadow-[0_40px_120px_-20px_rgb(0_0_0/0.9)] sm:px-8">
        {/* Violet glow behind the logo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#A020F0]/30 blur-3xl"
        />

        {step !== "name" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-[#A5A8C3] transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        )}

        {step !== "name" && (
          <div className="relative">
            <Image
              src="/assets/brand/logo-horizontal-white.png"
              alt="MySlotMate"
              width={1048}
              height={209}
              priority
              className="mx-auto h-8 w-auto"
            />
            <h2 className="font-outfit mt-7 text-center text-[26px] leading-tight font-medium tracking-[-0.01em]">
              {title}
            </h2>
            <p className="mx-auto mt-2 mb-7 max-w-[300px] text-center text-sm leading-relaxed text-[#A5A8C3]">
              {subtitle}
            </p>

            <div className="mb-6 flex rounded-full border border-white/10 bg-[#080914] p-1">
              {(
                [
                  ["google", "Google"],
                  ["phone", "Phone & OTP"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (!loading) setLoginType(key);
                  }}
                  className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition ${
                    loginType === key
                      ? "bg-[#241333] text-white ring-1 ring-[#652A91]"
                      : "text-[#A5A8C3] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Google */}
        {loginType === "google" && step !== "name" && (
          <button
            onClick={handleGoogleLogin}
            disabled={!agreed || loading}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-white py-3.5 text-base font-semibold text-[#080914] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
          >
            <FcGoogle className="h-5 w-5" />
            {loading ? "Signing in..." : "Continue with Google"}
          </button>
        )}

        {/* Phone */}
        {loginType === "phone" && (
          <div className="relative">
            {step === "phone" && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className={LABEL}>Phone number</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 items-center gap-1.5">
                      <FiPhone className="h-4 w-4 text-[#777B98]" />
                      <span className="text-sm font-semibold text-[#A5A8C3]">
                        +91
                      </span>
                      <div className="h-4 w-px bg-white/15" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) setPhone(val);
                      }}
                      placeholder="98765 43210"
                      maxLength={10}
                      className={`${INPUT} pl-[78px]`}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={phone.length !== 10 || loading || !agreed}
                  className={PRIMARY}
                >
                  {loading ? "Sending code..." : "Get verification code"}
                  {!loading && <FiArrowRight className="h-4 w-4" />}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#080914] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-[#A5A8C3]">
                    <FiPhone className="h-4 w-4 text-[#777B98]" />
                    <span>+91 {phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-[#D8B4FE] hover:underline"
                  >
                    <FiEdit2 className="h-3 w-3" /> Edit
                  </button>
                </div>
                <div>
                  <label className={LABEL}>Verification code</label>
                  <div className="relative">
                    <FiLock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
                    <input
                      type="text"
                      pattern="\d{4,6}"
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 6) setOtp(val);
                      }}
                      placeholder="0000 or 000000"
                      maxLength={6}
                      className={`${INPUT} pl-10 text-center font-semibold tracking-[0.5em]`}
                    />
                  </div>
                </div>
                <div className="text-xs text-[#777B98]">
                  {countdown > 0 ? (
                    <span>Resend code in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="font-semibold text-[#D8B4FE] hover:underline"
                    >
                      Resend verification code
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!(otp.length === 4 || otp.length === 6) || loading}
                  className={PRIMARY}
                >
                  {loading ? "Verifying..." : "Verify and log in"}
                </button>
              </form>
            )}

            {step === "name" && (
              <form onSubmit={handleFinishSignup} className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#241333] text-[#D8B4FE] ring-1 ring-[#652A91]">
                    <FiUser className="h-6 w-6" />
                  </div>
                  <h3 className="font-outfit text-xl font-medium text-white">
                    Almost there!
                  </h3>
                  <p className="mt-1 text-sm text-[#A5A8C3]">
                    Tell us your name to finish signing up.
                  </p>
                </div>
                <div>
                  <label className={LABEL}>Full name</label>
                  <div className="relative">
                    <FiUser className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={`${INPUT} pl-10`}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!name.trim() || loading}
                  className={PRIMARY}
                >
                  {loading ? "Saving..." : "Complete setup"}
                  {!loading && <FiArrowRight className="h-4 w-4" />}
                </button>
              </form>
            )}
          </div>
        )}

        {step !== "name" && (
          <>
            <label className="mt-6 flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#A5A8C3]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 accent-[#A020F0]"
              />
              <span>
                I agree to the{" "}
                <a
                  href="/support/terms-conditions"
                  className="font-semibold text-[#D8B4FE] hover:underline"
                >
                  User Agreement
                </a>{" "}
                and{" "}
                <a
                  href="/support/policies"
                  className="font-semibold text-[#D8B4FE] hover:underline"
                >
                  Privacy Policy
                </a>
              </span>
            </label>
            <p className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-[#777B98]">
              Having trouble logging in?{" "}
              <a
                href="/support"
                className="font-semibold text-white hover:underline"
              >
                Get help
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
