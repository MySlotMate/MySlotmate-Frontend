"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from "firebase/auth";
import { auth } from "~/utils/firebase";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { FiPhone, FiLock, FiArrowRight, FiEdit2 } from "react-icons/fi";
import { setStoredUserId } from "~/lib/auth-storage";
import { sendLoginOTP, verifyLoginOTP } from "~/lib/api";

interface GoogleLoginProps {
  open: boolean;
  onClose: () => void;
}

type LoginType = "google" | "phone";

export default function GoogleLogin({ open, onClose }: GoogleLoginProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>("google");

  // Phone Login States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user ID is already in localStorage
      let userId = localStorage.getItem("msm_user_id");

      // If not in localStorage, check if user exists in database by Firebase UID
      if (!userId) {
        try {
          const profileRes = await fetch(
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

        // If user exists in database, save ID and welcome back
        if (userId) {
          setStoredUserId(userId);
          toast.success("Welcome back!");
          onClose();
          return;
        } else {
          // User doesn't exist yet — redirect to signup
          onClose();
          router.push("/signup");
          return;
        }
      }

      // User already has ID in localStorage, close modal
      onClose();
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
        setOtpSent(true);
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
          }
        }
        
        toast.success(user.name === "Guest User" ? "Account created successfully!" : "Welcome back!");
        onClose();
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white px-6 py-8 shadow-2xl sm:px-8 sm:py-10 ring-1 ring-gray-100">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Logo */}
        <div className="mb-4 flex justify-center">
          <Image
            src="/assets/home/logomyslotmate.png"
            alt="MySlotMate"
            width={72}
            height={72}
            priority
            className="h-18 w-18 object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="mb-1 text-center text-xl font-bold text-gray-900">
          Login or sign up
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          Choose your preferred verification method
        </p>

        {/* Tab selection */}
        <div className="mb-6 flex rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              if (!loading) setLoginType("google");
            }}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
              loginType === "google"
                ? "bg-white text-[#0094CA] shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Google Sign-in
          </button>
          <button
            type="button"
            onClick={() => {
              if (!loading) setLoginType("phone");
            }}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
              loginType === "phone"
                ? "bg-white text-[#0094CA] shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Phone &amp; OTP
          </button>
        </div>

        {/* Google Authentication Form */}
        {loginType === "google" && (
          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              disabled={!agreed || loading}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full py-3.5 text-base font-semibold text-white transition disabled:opacity-50 hover:opacity-95"
              style={{
                background: agreed
                  ? "linear-gradient(135deg, #0094CA, #00b4ef)"
                  : "#b0b0b0",
              }}
            >
              <FcGoogle className="h-5 w-5 rounded-full bg-white p-0.5" />
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
          </div>
        )}

        {/* Phone Authentication Form */}
        {loginType === "phone" && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 items-center gap-1.5">
                      <FiPhone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-500">
                        +91
                      </span>
                      <div className="h-4 w-[1px] bg-gray-200" />
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
                      className="w-full rounded-xl border border-gray-200 py-3 pr-4 pl-[78px] text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={phone.length !== 10 || loading || !agreed}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white transition disabled:opacity-50 hover:opacity-95"
                  style={{
                    background: agreed && phone.length === 10
                      ? "linear-gradient(135deg, #0094CA, #00b4ef)"
                      : "#b0b0b0",
                  }}
                >
                  {loading ? "Sending code..." : "Get Verification Code"}
                  {!loading && <FiArrowRight className="h-4 w-4" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiPhone className="h-4 w-4 text-gray-400" />
                    <span>+91 {phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0094CA] hover:underline"
                  >
                    <FiEdit2 className="h-3 w-3" /> Edit
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">
                    Verification Code
                  </label>
                  <div className="relative">
                    <FiLock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                      className="w-full rounded-xl border border-gray-200 py-3 pr-4 pl-10 text-center text-sm font-semibold tracking-[0.5em] text-gray-900 placeholder-gray-300 outline-none transition focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  {countdown > 0 ? (
                    <span>Resend code in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="font-semibold text-[#0094CA] hover:underline"
                    >
                      Resend Verification Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!(otp.length === 4 || otp.length === 6) || loading}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white transition disabled:opacity-50 hover:opacity-95"
                  style={{
                    background: (otp.length === 4 || otp.length === 6)
                      ? "linear-gradient(135deg, #0094CA, #00b4ef)"
                      : "#b0b0b0",
                  }}
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Agreement checkbox (always visible below fields) */}
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={() => setAgreed(!agreed)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0094CA] accent-[#0094CA]"
          />
          <span>
            I agree to the{" "}
            <a
              href="/support/terms-conditions"
              className="font-semibold text-[#0094CA] hover:underline"
            >
              User Agreement
            </a>{" "}
            and{" "}
            <a
              href="/support/policies"
              className="font-semibold text-[#0094CA] hover:underline"
            >
              Privacy Policy
            </a>
          </span>
        </label>

        {/* Help link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Having trouble logging in?{" "}
          <a
            href="/support"
            className="font-semibold text-gray-800 hover:underline"
          >
            Get Help
          </a>
        </p>
      </div>
    </div>
  );
}
