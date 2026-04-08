"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "~/utils/firebase";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";

interface GoogleLoginProps {
  open: boolean;
  onClose: () => void;
}

export default function GoogleLogin({ open, onClose }: GoogleLoginProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

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
            const response = (await profileRes.json()) as { data?: { id?: string } };
            userId = response.data?.id ?? null;
          }
        } catch (fetchErr) {
          console.error("Error fetching user by Firebase UID:", fetchErr);
        }

        // If user exists in database, save ID and welcome back
        if (userId) {
          localStorage.setItem("msm_user_id", userId);
          toast.success("Welcome back!");
          onClose();
          return;
        } else {
          // User doesn't exist yet â€” redirect to signup
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white px-8 py-10 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Logo placeholder */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full">
            <Image
              src="/assets/home/logomyslotmate.jpeg"
              alt="MySlotMate"
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-1 text-center text-xl font-bold text-gray-900">
          Login or sign up to continue
        </h2>
        <p className="mb-8 text-center text-sm text-gray-500">
          Sign in with your Google account
        </p>

        {/* Google sign-in button */}
        <button
          onClick={handleGoogleLogin}
          disabled={!agreed || loading}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full py-3 text-base font-semibold text-white transition disabled:opacity-50"
          style={{
            background: agreed
              ? "linear-gradient(135deg, #0094CA, #00b4ef)"
              : "#b0b0b0",
          }}
        >
          <FcGoogle className="h-5 w-5 rounded-full bg-white p-0.5" />
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        {/* Agreement checkbox */}
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={() => setAgreed(!agreed)}
            className="mt-0.5 h-4 w-4 accent-[#0094CA]"
          />
          <span>
            I&apos;ve read and agreed to{" "}
            <a href="#" className="font-medium text-[#0094CA] hover:underline">
              User Agreement
            </a>{" "}
            and{" "}
            <a href="#" className="font-medium text-[#0094CA] hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>

        {/* Help link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Having trouble logging in?{" "}
          <a href="#" className="font-semibold text-gray-800 hover:underline">
            Get Help
          </a>
        </p>
      </div>
    </div>
  );
}




