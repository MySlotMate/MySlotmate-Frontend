"use client";

import { useState, useEffect, useRef } from "react";
import { FiX, FiCheckCircle, FiShield } from "react-icons/fi";

interface OTPVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  onResend: () => Promise<void>;
  resending?: boolean;
  phoneNumber: string;
}

export function OTPVerificationModal({
  open,
  onClose,
  onVerify,
  onResend,
  resending,
  phoneNumber,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setTimer(30);
      setOtp(["", "", "", "", "", ""]);
      setError("");
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (open && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [open, timer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Clear error when user starts typing
    if (error) setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setVerifying(true);
    setError("");
    try {
      const success = await onVerify(code);
      if (!success) {
        setError("Invalid OTP. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Verification failed. Please check your connection.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="msm-modal fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
      <div className="animate-in fade-in zoom-in relative w-full max-w-md rounded-[24px] border border-white/10 bg-[#131328] p-8 text-white shadow-2xl duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white/70"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#9B30FF]/15 text-[#D8B4FE]">
            <FiShield className="h-8 w-8" />
          </div>
        </div>

        <h3 className="text-center text-2xl font-bold text-white">
          Verify Phone Number
        </h3>
        <p className="mt-2 text-center text-sm text-white/55">
          We&apos;ve sent a 6-digit code to <br />
          <span className="font-bold text-white">
            {phoneNumber.startsWith("+91")
              ? `+91 ${phoneNumber.slice(3, 5)}XXXXX${phoneNumber.slice(-3)}`
              : phoneNumber.length >= 10
                ? `${phoneNumber.slice(0, 2)}XXXXX${phoneNumber.slice(-3)}`
                : phoneNumber}
          </span>
        </p>

        <div className="mt-8 flex justify-between gap-2">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`h-14 w-full rounded-xl border-2 text-center text-xl font-bold transition outline-none ${
                error
                  ? "border-red-400 bg-red-500/10 text-red-300 focus:border-red-400"
                  : "border-white/10 bg-[#121426] text-white focus:border-[#9B30FF] focus:ring-4 focus:ring-[#9B30FF]/15"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm font-medium text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7038F5] to-[#B724EA] py-4 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {verifying ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <FiCheckCircle className="h-5 w-5" />
              Verify & Complete
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          {timer > 0 ? (
            <p className="text-xs text-white/45">
              Resend code in{" "}
              <span className="font-bold text-white/70">{timer}s</span>
            </p>
          ) : (
            <button
              onClick={onResend}
              disabled={resending}
              className="text-sm font-bold text-[#D8B4FE] hover:underline disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend Code"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
