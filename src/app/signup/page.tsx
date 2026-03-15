"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { useSignUp } from "~/hooks/useApi";
import { toast } from "sonner";
import { FiPhone, FiUser, FiMail, FiArrowRight } from "react-icons/fi";

export default function SignUpPage() {
  const router = useRouter();
  const [user, loadingAuth] = useAuthState(auth);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const signUpMutation = useSignUp();
  const submitting = signUpMutation.isPending;

  /* Pre-fill from Google profile */
  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
  }, [user?.displayName]);

  /* Guard: must be logged in via Google first */
  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace("/");
    }
  }, [loadingAuth, user, router]);

  /* If user already completed signup, redirect home */
  useEffect(() => {
    const id = localStorage.getItem("msm_user_id");
    if (id) router.replace("/");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.");
      return;
    }

    // Normalise phone → +91…
    let phn = phone.replace(/\D/g, "");
    if (phn.length === 10) phn = `+91${phn}`;
    else if (!phn.startsWith("+")) phn = `+${phn}`;

    try {
      const res = await signUpMutation.mutateAsync({
        auth_uid: user.uid,
        email: user.email ?? "",
        name: name.trim(),
        phn_number: phn,
      });
      // Save user id for future API calls
      localStorage.setItem("msm_user_id", res.data.id);
      toast.success("Account created successfully!");
      router.replace("/");
    } catch (err: unknown) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 409) {
        // User already exists — store flag and go home
        localStorage.setItem("msm_user_id", "existing");
        toast.info("Welcome back!");
        router.replace("/");
      } else {
        const msg = apiErr.message || "Something went wrong. Please try again.";
        setError(msg);
        toast.error(msg);
      }
    }
  };

  if (loadingAuth || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0094CA] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#e4f8ff] via-white to-[#d5f4ff] px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-100">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/navbar/roundlogo.png"
              alt="MySlotMate"
              className="h-16 w-16 object-contain"
            />
          </div>

          <h1 className="text-center text-2xl font-bold text-gray-900">
            Complete Your Profile
          </h1>
          <p className="mt-1 text-center text-sm text-gray-500">
            Just a few more details and you&apos;re all set!
          </p>

          {/* Google info preview */}
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#e6f8ff] px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.photoURL ?? "/assets/home/avatar-placeholder.png"}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-gray-900">
                {user.displayName}
              </p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ankit Sharma"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={user.email ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-500 outline-none"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Phone Number
              </label>
              <div className="relative">
                <FiPhone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  type="tel"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#0094CA] focus:ring-1 focus:ring-[#0094CA]"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                We&apos;ll use this to send you booking updates.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white transition disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #0094CA, #00b4ef)",
              }}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating account…
                </>
              ) : (
                <>
                  Get Started
                  <FiArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            By signing up you agree to our{" "}
            <a href="#" className="text-[#0094CA] hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-[#0094CA] hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
