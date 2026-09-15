import { type Metadata } from "next";
import Link from "next/link";
import { SupportBreadcrumb, SupportPageShell } from "~/components/support";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How MySlotMate collects, uses, shares and protects your personal information across our website and mobile app.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | MySlotMate",
    description:
      "How MySlotMate collects, uses, shares and protects your personal information.",
    url: "/privacy",
  },
};

/**
 * Google Play requires a publicly reachable privacy policy URL, and the Data
 * safety form is audited against it — so every row below must match what the
 * app actually does. When a new SDK or data type is added, update this page and
 * the Data safety declaration together.
 */
const LAST_UPDATED = "15 September 2026";
const CONTACT_EMAIL = "myslotmate@gmail.com";

interface DataRow {
  data: string;
  why: string;
  required: string;
}

const collectedDirectly: DataRow[] = [
  {
    data: "Name",
    why: "Identifies you to hosts and other guests on a booking.",
    required: "Required",
  },
  {
    data: "Email address",
    why: "Sign-in with Google, booking confirmations and account notices.",
    required: "Required for Google sign-in",
  },
  {
    data: "Phone number",
    why: "Sign-in by OTP, and so a host can reach you about an experience.",
    required: "Required",
  },
  {
    data: "Profile photo and bio",
    why: "Shown on your public profile and to hosts you book with.",
    required: "Optional",
  },
  {
    data: "City",
    why: "Shows experiences near you.",
    required: "Optional",
  },
  {
    data: "Photos you upload",
    why: "Experience galleries and host profiles, where you add them.",
    required: "Optional",
  },
  {
    data: "Government ID (hosts only)",
    why: "Verifying the identity of people who run experiences.",
    required: "Required to host",
  },
];

const collectedAutomatically: DataRow[] = [
  {
    data: "Bookings and attendance",
    why: "Running the booking, check-in and your Journey history.",
    required: "Required",
  },
  {
    data: "Payment records",
    why: "Wallet balance, payouts to hosts, refunds and accounting.",
    required: "Required",
  },
  {
    data: "Approximate location",
    why: "Showing the map for an experience venue. Only used while you view it.",
    required: "Optional",
  },
  {
    data: "Device and app diagnostics",
    why: "Diagnosing crashes and abuse. Not used for advertising.",
    required: "Required",
  },
];

const processors = [
  {
    name: "Google Firebase",
    role: "Sign-in with Google, session tokens and push notifications.",
  },
  {
    name: "Razorpay",
    role: "Processing wallet top-ups. Card details go to Razorpay, never to us.",
  },
  {
    name: "Cashfree",
    role: "Paying hosts their earnings.",
  },
  {
    name: "Twilio / 2Factor",
    role: "Delivering the one-time codes used for phone sign-in.",
  },
  {
    name: "Amazon Web Services (S3)",
    role: "Storing images you and hosts upload.",
  },
  {
    name: "Supabase (PostgreSQL)",
    role: "Hosting the database that holds your account and bookings.",
  },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-4 text-gray-700">{children}</div>
    </section>
  );
}

function DataTable({ rows }: { rows: DataRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="w-full min-w-[540px] text-left text-sm">
        <thead className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">What</th>
            <th className="px-4 py-3 font-semibold">Why we need it</th>
            <th className="px-4 py-3 font-semibold">Required?</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.data}>
              <td className="px-4 py-3 font-semibold text-gray-900">
                {row.data}
              </td>
              <td className="px-4 py-3 text-gray-700">{row.why}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                {row.required}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <SupportPageShell contentClassName="max-w-[820px]">
      <SupportBreadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />

      <header className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-gray-600">
          This policy explains what MySlotMate collects, why, who we share it
          with, and the choices you have. It covers the MySlotMate website and
          the MySlotMate Android app.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <div className="space-y-10">
        <Section id="who-we-are" title="Who we are">
          <p>
            MySlotMate is a platform for discovering and booking local
            experiences, run by Myslotmate Private Limited. Where this policy
            says &quot;we&quot; or &quot;us&quot;, it means that company, which
            is the controller of the personal information described here.
          </p>
          <p>
            Questions about this policy or your data go to{" "}
            <a
              className="font-semibold text-[#0094CA] hover:underline"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section id="what-we-collect" title="What you give us">
          <DataTable rows={collectedDirectly} />
        </Section>

        <Section
          id="what-we-record"
          title="What we record as you use MySlotMate"
        >
          <DataTable rows={collectedAutomatically} />
          <p>
            We do not sell your personal information, and we do not use it to
            serve advertising. We do not collect your precise GPS location in the
            background.
          </p>
        </Section>

        <Section id="payments" title="Payments">
          <p>
            Card, UPI and bank details are entered directly with our payment
            providers and never reach MySlotMate&apos;s servers. What we store is
            the outcome: the amount, the status, and a reference number from the
            provider, which we need for your wallet balance, host payouts,
            refunds and our own accounting obligations.
          </p>
        </Section>

        <Section id="sharing" title="Who else sees your information">
          <p>
            <strong>Hosts and other guests.</strong> When you book, the host sees
            your name, profile photo and the contact details needed to run the
            experience. Your public profile is visible to other people on the
            platform.
          </p>
          <p>
            <strong>Service providers.</strong> We share only what each one needs
            to do its job:
          </p>
          <ul className="ml-1 space-y-2">
            {processors.map((p) => (
              <li key={p.name} className="flex gap-2">
                <span aria-hidden="true" className="text-gray-300">
                  &bull;
                </span>
                <span>
                  <strong className="text-gray-900">{p.name}</strong> &mdash;{" "}
                  {p.role}
                </span>
              </li>
            ))}
          </ul>
          <p>
            <strong>Legal reasons.</strong> We may disclose information where the
            law requires it, or to investigate fraud, safety incidents or abuse
            of the platform.
          </p>
        </Section>

        <Section id="retention" title="How long we keep it">
          <p>
            We keep your account information for as long as your account exists.
            When you delete your account we remove your profile and personal
            details, but we retain booking and payment records for as long as tax
            and accounting law requires, and we keep a minimal record where one
            is needed to resolve a dispute or enforce a safety decision.
          </p>
        </Section>

        <Section id="your-rights" title="Your choices">
          <ul className="ml-1 space-y-2">
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-gray-300">
                &bull;
              </span>
              <span>
                <strong className="text-gray-900">Access and correction.</strong>{" "}
                Edit your name, photo, bio and city from your profile at any
                time.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-gray-300">
                &bull;
              </span>
              <span>
                <strong className="text-gray-900">Deletion.</strong> Request
                deletion of your account and data at{" "}
                <Link
                  className="font-semibold text-[#0094CA] hover:underline"
                  href="/delete-account"
                >
                  myslotmate.com/delete-account
                </Link>
                .
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-gray-300">
                &bull;
              </span>
              <span>
                <strong className="text-gray-900">Notifications.</strong> Turn
                booking, community and new-experience notifications on or off in
                your profile settings.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-gray-300">
                &bull;
              </span>
              <span>
                <strong className="text-gray-900">Location.</strong> Revoke the
                app&apos;s location permission in your device settings; only maps
                stop working.
              </span>
            </li>
          </ul>
        </Section>

        <Section id="security" title="How we protect it">
          <p>
            Traffic between the apps and our servers is encrypted in transit.
            Sign-in uses Google or a one-time code sent to your phone, and
            session tokens are held in your device&apos;s secure storage. Access
            to production data is limited to staff who need it. No system is
            perfectly secure, so we ask you to keep control of the email address
            and phone number you sign in with.
          </p>
        </Section>

        <Section id="children" title="Children">
          <p>
            MySlotMate is not intended for anyone under 18, and we do not
            knowingly collect information from children. If you believe a child
            has created an account, write to us and we will remove it.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            If we change how we use your information we will update this page and
            revise the date above. Material changes will also be announced in the
            app.
          </p>
        </Section>
      </div>

      <footer className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900">Contact us</h2>
        <p className="mt-2 text-gray-700">
          Myslotmate Private Limited, Guwahati, Assam, India &middot;{" "}
          <a
            className="font-semibold text-[#0094CA] hover:underline"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </SupportPageShell>
  );
}
