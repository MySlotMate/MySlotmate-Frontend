import { type Metadata } from "next";
import Link from "next/link";
import { SupportBreadcrumb, SupportPageShell } from "~/components/support";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description:
    "Request deletion of your MySlotMate account and personal data, and see exactly what is removed and what is kept.",
  alternates: { canonical: "/delete-account" },
  openGraph: {
    title: "Delete Your Account | MySlotMate",
    description:
      "Request deletion of your MySlotMate account and personal data.",
    url: "/delete-account",
  },
};

/**
 * Google Play requires apps with accounts to publish a reachable URL where a
 * user can request deletion of their account and data, stating what is deleted
 * and what is retained. This page is that URL — keep it in step with the
 * retention section of /privacy.
 */
const CONTACT_EMAIL = "myslotmate@gmail.com";
const RESPONSE_DAYS = 30;

const deleted = [
  "Your name, profile photo, bio, city and interests",
  "Your email address and phone number",
  "Photos you uploaded to your profile",
  "Your saved experiences and notification preferences",
  "Your host profile, if you have one, and its gallery and government ID",
];

const retained = [
  {
    what: "Booking and payment records",
    why: "Tax and accounting law requires us to keep transaction records for a set period. These are kept without your contact details attached where possible.",
  },
  {
    what: "Reviews you have written",
    why: "Reviews stay with the experience so they remain useful to other guests. Your name is removed from them.",
  },
  {
    what: "Records tied to an open dispute or safety report",
    why: "Kept until the matter is resolved, then deleted on the same terms as everything else.",
  },
];

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e6f6fd] text-sm font-bold text-[#0094CA]">
        {number}
      </span>
      <div className="pt-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="mt-1 text-gray-700">{children}</div>
      </div>
    </li>
  );
}

export default function DeleteAccountPage() {
  return (
    <SupportPageShell contentClassName="max-w-[760px]">
      <SupportBreadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Delete Account" }]}
      />

      <header className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
          Delete your account
        </h1>
        <p className="mt-3 text-gray-600">
          You can ask us to delete your MySlotMate account and the personal
          information attached to it. Here is how to do it, and exactly what
          happens afterwards.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900">How to request it</h2>
        <ol className="mt-5 space-y-5">
          <Step number={1} title="Email us from your registered address">
            Write to{" "}
            <a
              className="font-semibold text-[#0094CA] hover:underline"
              href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20MySlotMate%20account`}
            >
              {CONTACT_EMAIL}
            </a>{" "}
            with the subject &quot;Delete my MySlotMate account&quot;. Sending it
            from the email address on the account is how we confirm the request
            is really yours.
          </Step>
          <Step number={2} title="Tell us the phone number on the account">
            If you signed in by phone rather than Google, include that number so
            we can find the right account.
          </Step>
          <Step number={3} title="We confirm and delete">
            We reply to confirm, then delete within {RESPONSE_DAYS} days. You
            will get a final email when it is done.
          </Step>
        </ol>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">What is deleted</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {deleted.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="text-[#0094CA]">
                  &#10003;
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">What we keep</h2>
          <ul className="mt-3 space-y-3 text-sm text-gray-700">
            {retained.map((item) => (
              <li key={item.what}>
                <span className="font-semibold text-gray-900">{item.what}</span>
                <p className="mt-0.5 text-gray-600">{item.why}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-bold text-gray-900">
          Before you delete, please note
        </h2>
        <ul className="mt-3 space-y-2 text-gray-700">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-amber-500">
              &bull;
            </span>
            <span>
              Deletion is permanent. Your bookings, Journey history and saved
              experiences cannot be restored afterwards.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-amber-500">
              &bull;
            </span>
            <span>
              <strong>Withdraw your wallet balance first.</strong> Any remaining
              balance is forfeited when the account is deleted.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-amber-500">
              &bull;
            </span>
            <span>
              If you host, cancel or hand over any upcoming experiences before
              requesting deletion, so guests who have already booked are not left
              stranded.
            </span>
          </li>
        </ul>
      </section>

      <p className="mt-8 text-sm text-gray-500">
        For what we collect and why, see the{" "}
        <Link
          className="font-semibold text-[#0094CA] hover:underline"
          href="/privacy"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </SupportPageShell>
  );
}
