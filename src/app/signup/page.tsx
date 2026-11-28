"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "~/utils/firebase";
import { useSignUp } from "~/hooks/useApi";
import { Breadcrumb, Navbar } from "~/components";
import { toast } from "sonner";
import { FiPhone, FiUser, FiMail, FiArrowRight } from "react-icons/fi";
import { setStoredUserId } from "~/lib/auth-storage";

export default function SignUpPage() {
  const router = useRouter();
  const [user, loadingAuth] = useAuthState(auth);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  // Set when an admin already registered this person (host onboarding). Their
  // number is on file and is what the host record uses, so it is shown and
  // locked rather than asked for a second time.
  const [prefilled, setPrefilled] = useState(false);

  const signUpMutation = useSignUp();
  const submitting = signUpMutation.isPending;

  /* Pre-fill from Google profile */
  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
  }, [user?.displayName]);

  /* Pre-fill from the record an admin created for this email, if any. The
     backend identifies the caller by the verified token, so no email is sent. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
          `${process.env.NEXT_PUBLIC_API_URL}/users/signup-prefill`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          data?: { name?: string; phn_number?: string };
        };
        const digits = (body.data?.phn_number ?? "")
          .replace(/\D/g, "")
          .slice(-10);
        if (cancelled || digits.length !== 10) return;
        setPhone(digits);
        setPrefilled(true);
        // Google's display name wins if it filled the field already.
        if (body.data?.name) setName((prev) => prev || body.data!.name!);
      } catch (err) {
        console.error("Signup prefill failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
        avatar_url: user.photoURL,
      });
      // Save user id for future API calls
      setStoredUserId(res.data.id);
      toast.success("Account created successfully!");
      router.replace("/");
    } catch (err: unknown) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 409) {
        // User already exists — fetch their ID from Firebase UID
        try {
          const profileRes = await fetch(
            // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
            `${process.env.NEXT_PUBLIC_API_URL}/users/by-firebase/${user.uid}`,
          );
          if (profileRes.ok) {
            const response = (await profileRes.json()) as {
              data?: { id?: string };
            };
            const userId = response.data?.id;
            if (userId) {
              setStoredUserId(userId);
              toast.info("Welcome back!");
              router.replace("/");
              return;
            } else {
              console.warn("No ID in response:", response);
            }
          } else {
            console.error("Fetch failed with status:", profileRes.status);
          }
        } catch (fetchErr) {
          console.error("Fetch error:", fetchErr);
        }
        // Fallback: redirect and let Navbar handle it
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
      <>
        <Navbar />
        <main className="flex min-h-[calc(100vh-var(--navbar-height))] items-center justify-center bg-white/[0.04]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-var(--navbar-height))] bg-[#080914]">
        <div className="site-x mx-auto w-full max-w-[1120px] py-6">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Sign Up" }]}
            className="mb-6"
          />
        </div>

        <div className="site-x flex items-center justify-center pb-10">
          <div className="w-full max-w-md">
            {/* Card */}
            <div className="rounded-2xl bg-[#121426] p-8 shadow-xl ring-1 ring-white/10">
              {/* Logo */}
              <div className="mb-6 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/brand/logo-horizontal-white.png"
                  alt="Myslotmate"
                  width={1048}
                  height={209}
                  className="h-8 w-auto"
                />
              </div>

              <h1 className="text-center text-2xl font-bold text-white">
                Complete Your Profile
              </h1>
              <p className="mt-1 text-center text-sm text-[#A5A8C3]">
                Just a few more details and you&apos;re all set!
              </p>

              {/* Google info preview */}
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#241333] px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.photoURL ?? "/assets/home/avatar-placeholder.svg"}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-[#A5A8C3]">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ankit Sharma"
                      className="w-full rounded-lg border border-white/15 py-3 pr-4 pl-10 text-sm text-white transition outline-none focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0]"
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                    Email
                  </label>
                  <div className="relative">
                    <FiMail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777B98]" />
                    <input
                      value={user.email ?? ""}
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.04] py-3 pr-4 pl-10 text-sm text-[#A5A8C3] outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[#A5A8C3] uppercase">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 items-center gap-1.5">
                      <FiPhone className="h-4 w-4 text-[#777B98]" />
                      <span className="text-sm font-medium text-[#A5A8C3]">
                        +91
                      </span>
                      <div className="h-4 w-[1px] bg-white/10" />
                    </div>
                    <input
                      value={phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length === 12 && val.startsWith("91")) {
                          val = val.slice(2);
                        }
                        if (val.length <= 10) setPhone(val);
                      }}
                      readOnly={prefilled}
                      placeholder="98765 43210"
                      type="tel"
                      maxLength={10}
                      className={`w-full rounded-lg border py-3 pr-4 pl-[78px] text-sm transition outline-none ${
                        prefilled
                          ? "cursor-not-allowed border-white/10 bg-white/[0.04] text-[#A5A8C3]"
                          : "border-white/15 text-white focus:border-[#A020F0] focus:ring-1 focus:ring-[#A020F0]"
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#777B98]">
                    {prefilled
                      ? "This is the number already on your record. Ask support to change it."
                      : "We'll use this to send you booking updates."}
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white transition disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #7B2FFF, #A020F0)",
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#121426] border-t-transparent" />
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

              <p className="mt-5 text-center text-xs text-[#777B98]">
                By signing up you agree to our{" "}
                <a href="#" className="text-[#D8B4FE] hover:underline">
                  Terms
                </a>{" "}
                and{" "}
                <a href="#" className="text-[#D8B4FE] hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
