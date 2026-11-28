import { type Metadata } from "next";
import Link from "next/link";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { BreadcrumbTrail } from "~/components/Breadcrumbs";
import BookingFeeNote from "~/components/host-guide/BookingFeeNote";
import { SupportPageShell } from "~/components/support";
import { HOST_GUIDE } from "~/lib/hostGuide";

export const metadata: Metadata = {
  title: "Host Guide",
  description:
    "How to host on Myslotmate: create experiences, sell tickets, use codes, check guests in, get paid, boost your event and download your statements.",
  alternates: { canonical: "/host-guide" },
  openGraph: {
    title: "Host Guide | Myslotmate",
    description:
      "Everything a Myslotmate host needs, step by step: experiences, tickets, codes, check-in, payouts, Marketing Boost and invoices.",
    url: "/host-guide",
  },
};

export default function HostGuidePage() {
  return (
    <SupportPageShell contentClassName="max-w-[1120px]">
      <BreadcrumbTrail
        crumbs={[{ label: "Home", href: "/" }, { label: "Host Guide" }]}
        className="mb-6"
      />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Host Guide
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#A5A8C3] sm:text-base">
          Everything you can do as a Myslotmate host, step by step: from your
          first experience to getting paid, promoting your events and
          downloading your statements.
        </p>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <nav
          aria-label="Guide sections"
          className="-mx-4 mb-8 overflow-x-auto px-4 lg:sticky lg:top-28 lg:mx-0 lg:mb-0 lg:self-start lg:overflow-visible lg:px-0"
        >
          <ol className="flex gap-2 lg:flex-col lg:gap-1">
            {HOST_GUIDE.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-[#121426] px-3 py-1.5 text-sm whitespace-nowrap text-white/75 transition hover:border-[#A020F0] hover:text-[#D8B4FE] lg:rounded-lg lg:border-transparent lg:bg-transparent lg:px-2 lg:whitespace-normal"
                >
                  <span className="text-xs text-white/40 tabular-nums">
                    {i + 1}
                  </span>
                  {s.title.split(":")[0]}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-6">
          {HOST_GUIDE.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-28 rounded-[24px] border border-white/10 bg-[#121426] p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241333] text-xs font-semibold text-[#D8B4FE] tabular-nums">
                  {i + 1}
                </span>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {s.title}
                </h2>
                {s.badge && (
                  <span className="rounded-full bg-[#A020F0]/15 px-2.5 py-0.5 text-xs font-medium text-[#D8B4FE]">
                    {s.badge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#A5A8C3] sm:text-base">
                {s.summary}
              </p>
              {s.id === "create-event" && <BookingFeeNote />}

              <ol className="mt-5 space-y-4">
                {s.steps.map((step, n) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-xs text-white/60 tabular-nums">
                      {n + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white sm:text-base">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[#A5A8C3]">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {s.tips && (
                <ul className="mt-5 space-y-2 rounded-2xl bg-white/[0.03] p-4">
                  {s.tips.map((tip) => (
                    <li
                      key={tip}
                      className="flex gap-2 text-sm leading-6 text-white/75"
                    >
                      <FiCheckCircle className="mt-1 h-4 w-4 shrink-0 text-[#D8B4FE]" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}

              {s.where && (
                <Link
                  href={s.where.href}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-[#A020F0] hover:text-[#D8B4FE]"
                >
                  Open {s.where.label}
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              )}
            </section>
          ))}
        </div>
      </div>
    </SupportPageShell>
  );
}
