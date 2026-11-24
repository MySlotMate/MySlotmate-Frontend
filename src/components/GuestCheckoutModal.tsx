"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signInWithCustomToken } from "firebase/auth";
import { toast } from "sonner";
import { FiX } from "react-icons/fi";
import { auth } from "~/utils/firebase";
import { setStoredUserId } from "~/lib/auth-storage";
import { sendLoginOTP, verifyLoginOTP } from "~/lib/api";

/**
 * Guest checkout for marketing landing pages: name, phone and email, then a
 * one-time code to the phone — no login screen. Under the hood it is the same
 * phone-OTP sign-in as GoogleLogin (find-or-create the user by phone), so the
 * rest of checkout (tickets → book → pay) runs unchanged. A verified phone that
 * already has an account books into that account; the name/email typed here
 * only fill its empty fields (server side, see service.LoginProfile).
 */
export default function GuestCheckoutModal({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  /** Called once the guest is signed in; continue to the booking step. */
  onVerified: () => void;
}) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (!open) return null;

  const digits = phone.replace(/\D/g, "");
  const formattedPhone = `+91${digits}`;
  // Email is optional; checked only when filled in.
  const emailOk =
    !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    if (digits.length !== 10)
      return toast.error("Please enter a valid 10-digit mobile number");
    if (!emailOk) return toast.error("Please enter a valid email");
    setLoading(true);
    try {
      const res = await sendLoginOTP(formattedPhone);
      if (!res.success) throw new Error(res.error ?? "Failed to send code");
      setSessionId(res.data.session_id);
      setStep("otp");
      setOtp("");
      setCountdown(60);
      toast.success("Verification code sent to your phone");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    if (otp.length !== 4)
      return toast.error("Please enter the 4-digit code we sent");
    setLoading(true);
    try {
      const res = await verifyLoginOTP(formattedPhone, sessionId, otp, {
        name: name.trim(),
        email: email.trim(),
      });
      if (!res.success) throw new Error(res.error ?? "Incorrect code");
      const { user, token, firebase_custom_token } = res.data;
      localStorage.setItem("msm_auth_token", token);
      setStoredUserId(user.id);
      if (firebase_custom_token) {
        try {
          await signInWithCustomToken(auth, firebase_custom_token);
        } catch (fbErr) {
          console.error("Firebase custom token sign-in failed:", fbErr);
        }
      }
      onVerified();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Incorrect code. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const INPUT =
    "w-full rounded-xl border border-white/10 bg-[#080914] px-4 py-3 text-sm text-white placeholder-[#777B98] outline-none transition focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/25";
  const LABEL =
    "mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase";
  const PRIMARY =
    "flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#A020F0] py-3.5 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

  return createPortal(
    <div
      className="msm-modal fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-[28px] border border-white/10 bg-[#121426] px-6 pt-8 pb-7 font-[family-name:var(--font-inter)] text-white sm:px-8">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-[#A5A8C3] transition hover:bg-white/10 hover:text-white"
        >
          <FiX className="h-5 w-5" />
        </button>

        <h2 className="font-outfit text-center text-[24px] leading-tight font-medium">
          {step === "details" ? "Your details" : "Verify your phone"}
        </h2>
        <p className="mx-auto mt-2 mb-6 max-w-[300px] text-center text-sm text-[#A5A8C3]">
          {step === "details"
            ? "No account needed — just your details and a one-time code."
            : `Enter the code sent to +91 ${digits}`}
        </p>

        {step === "details" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className={LABEL} htmlFor="guest-name">
                Name
              </label>
              <input
                id="guest-name"
                className={INPUT}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="guest-phone">
                Mobile number
              </label>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-white/10 bg-[#080914] px-3 py-3 text-sm text-[#A5A8C3]">
                  +91
                </span>
                <input
                  id="guest-phone"
                  className={INPUT}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit mobile"
                />
              </div>
            </div>
            <div>
              <label className={LABEL} htmlFor="guest-email">
                Email <span className="text-[#777B98]">(optional)</span>
              </label>
              <input
                id="guest-email"
                type="email"
                className={INPUT}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className={PRIMARY}>
              {loading ? "Sending code…" : "Continue"}
            </button>
            <p className="text-center text-xs text-[#777B98]">
              By continuing you agree to our{" "}
              <Link href="/support/terms-conditions" className="underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/support/policies" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <input
              aria-label="Verification code"
              className={`${INPUT} text-center text-lg tracking-[0.5em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              maxLength={4}
              placeholder="••••"
            />
            <button
              type="submit"
              disabled={loading || otp.length !== 4}
              className={PRIMARY}
            >
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
            <div className="flex justify-between text-xs text-[#A5A8C3]">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="hover:text-white"
              >
                Edit details
              </button>
              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={() => void sendCode()}
                className="hover:text-white disabled:opacity-50"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
