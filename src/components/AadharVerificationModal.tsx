"use client";

import { useState } from "react";
import { useInitiateAadhar, useCompleteAadhar } from "~/hooks/useApi";
import { toast } from "sonner";
import { FiX, FiShield, FiArrowRight } from "react-icons/fi";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  onVerified: () => void;
}

export default function AadharVerificationModal({
  open,
  onClose,
  userId,
  onVerified,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [aadharNumber, setAadharNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState("");

  const initMutation = useInitiateAadhar();
  const completeMutation = useCompleteAadhar();

  const handleInitiate = async () => {
    setError("");
    const cleaned = aadharNumber.replace(/\s/g, "");
    if (cleaned.length !== 12) {
      setError("Enter a valid 12-digit Aadhaar number.");
      return;
    }
    try {
      const res = await initMutation.mutateAsync({
        user_id: userId,
        aadhar_number: cleaned,
      });
      setTransactionId(res.data.transaction_id);
      toast.success("OTP sent to your Aadhaar-linked mobile.");
      setStep(2);
    } catch (err) {
      const msg = (err as Error).message || "Failed to initiate verification.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleComplete = async () => {
    setError("");
    if (otp.length < 4) {
      setError("Enter a valid OTP.");
      return;
    }
    try {
      await completeMutation.mutateAsync({
        user_id: userId,
        transaction_id: transactionId,
        otp,
      });
      toast.success("Aadhaar verified successfully!");
      onVerified();
      onClose();
    } catch (err) {
      const msg = (err as Error).message || "Verification failed.";
      setError(msg);
      toast.error(msg);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white px-8 py-8 shadow-xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f8ff]">
            <FiShield className="h-7 w-7 text-[#0094CA]" />
          </div>
        </div>

        {step === 1 ? (
          <>
            <h2 className="text-center text-xl font-bold text-gray-900">
              Verify Aadhaar
            </h2>
            <p className="mt-1 text-center text-sm text-gray-500">
              Enter your 12-digit Aadhaar number to receive an OTP.
            </p>

            <div className="mt-6">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aadhaar Number
              </label>
              <input
                value={aadharNumber}
                onChange={(e) =>
                  setAadharNumber(e.target.value.replace(/[^0-9\s]/g, ""))
                }
                placeholder="1234 5678 9012"
                maxLength={14}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm tracking-widest text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleInitiate}
              disabled={initMutation.isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold text-white transition disabled:opacity-50"
              style={{ background: "#0094CA" }}
            >
              {initMutation.isPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Send OTP <FiArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-center text-xl font-bold text-gray-900">
              Enter OTP
            </h2>
            <p className="mt-1 text-center text-sm text-gray-500">
              We sent a one-time password to your Aadhaar-linked mobile.
            </p>

            <div className="mt-6">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                OTP
              </label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP"
                maxLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-[0.5em] text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold text-white transition disabled:opacity-50"
              style={{ background: "#0094CA" }}
            >
              {completeMutation.isPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Verify <FiArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              onClick={() => {
                setStep(1);
                setOtp("");
                setError("");
              }}
              className="mt-3 w-full text-center text-sm text-[#0094CA] hover:underline"
            >
              ← Change Aadhaar number
            </button>
          </>
        )}
      </div>
    </div>
  );
}
