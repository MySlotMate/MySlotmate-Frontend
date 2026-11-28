/**
 * The Host Guide: how hosts use Myslotmate, step by step. One source for the
 * /host-guide page and, later, the dashboard tour and the onboarding deck, so
 * the three never disagree.
 *
 * Every feature is listed, including ones still rolling out (Marketing Boost,
 * statements and invoices): hosts should know about them up front. The guest
 * booking fee is never written here; the page reads it live from the server.
 *
 * Boost has two versions. Today's (commission only, invited pilot hosts) is
 * what live hosts use. The paid-budget Boost for Premium hosts (PRD: Premium
 * Hosts and paid Boost marketing) replaces it once NEXT_PUBLIC_ENABLE_BOOST_PLAN
 * is on, and the guide follows the same switch so it never describes a Boost
 * hosts can't use yet.
 */
import { env } from "~/env";

export interface GuideStep {
  /** Bold lead-in, e.g. "Pick who can book". */
  title: string;
  body: string;
}

export interface GuideSection {
  /** URL anchor: /host-guide#boost */
  id: string;
  title: string;
  /** One line under the title. */
  summary: string;
  /** Where it lives in the dashboard. */
  where?: { label: string; href: string };
  steps: GuideStep[];
  tips?: string[];
  /** Shown as a small badge while a feature is still rolling out. */
  badge?: string;
}

const CURRENT_GUIDE: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    summary:
      "Hosting on Myslotmate is free. Get verified to sell tickets and get paid.",
    where: { label: "Host dashboard", href: "/host-dashboard" },
    steps: [
      {
        title: "Apply as a host",
        body: "Apply as a community or a professional host. While we review your application you can already host free events.",
      },
      {
        title: "Get verified",
        body: "Once approved you can sell tickets, ticket types and monthly passes, get paid to your bank, and show a Verified host badge guests trust. If an application isn't approved, you'll see why and can send it again.",
      },
      {
        title: "Add how you get paid",
        body: "In Earnings → Payout settings, add a bank account or UPI ID, and your PAN and GST details if you have them.",
      },
    ],
    tips: [
      "Your dashboard's left menu has everything: Today, Events, Calendar, Bookings, Check-in, Messages, Requests, Earnings, Promote, Host profile and Co-hosts.",
    ],
  },
  {
    id: "create-event",
    title: "Create an experience",
    summary:
      "One form, in a few short sections. Good defaults are already set.",
    where: {
      label: "Events → Create",
      href: "/host-dashboard/experiences/new",
    },
    steps: [
      {
        title: "Location",
        body: "In person (pick it on the map) or online (add the meeting link).",
      },
      {
        title: "About the event",
        body: "Title, a short tagline, description, photos, date and time. It can be one date, repeat on a schedule, or run in time windows guests pick from.",
      },
      {
        title: "How do guests pay?",
        body: "Free, one price per person, or several ticket types (for example Regular and VIP). Each ticket type can have its own seat limit per session (for example 10 VIP seats); leave it blank for no limit. You can also sell a monthly pass: a set number of sessions for one price.",
      },
      {
        title: "Who can book?",
        body: "Anyone; People I approve (guests send a request and you accept it); or People with a code. With a code, pick one code for everyone (type it or generate it), or single-use codes, one per guest, made right there once the experience is saved. These codes only let guests in; they pay the normal price.",
      },
      {
        title: "Refunds & payout",
        body: "Pick how refunds work for guests: Flexible, Moderate, Strict or No refunds. Guests see it before they book. If you cancel an event, every guest is refunded in full.",
      },
      {
        title: "Language & level",
        body: "Tell guests which languages you'll use and who it suits, from beginners up.",
      },
    ],
    tips: [
      "Guests pay your ticket price plus Myslotmate's booking fee. Hosts pay nothing to list.",
      "Changed a ticket's price after people booked? Their bookings keep the price they paid.",
    ],
  },
  {
    id: "codes",
    title: "Codes: % off and free",
    summary:
      "Codes that change the price: a discount, or a free booking. Codes that only let guests in are set in Who can book?.",
    where: {
      label: "Events → your event → Codes",
      href: "/host-dashboard/experiences",
    },
    steps: [
      {
        title: "% off",
        body: "Takes a share off the tickets (1 to 99%). You absorb the discount.",
      },
      {
        title: "Free",
        body: "The guest books at ₹0. You comp the guest. A code shared with many guests needs a maximum number of uses.",
      },
      {
        title: "Share it or make one per guest",
        body: "One code to share with everyone, or single-use codes, one per guest, which you can download as a list.",
      },
      {
        title: "Set limits",
        body: "Give a code a start and end date and a maximum number of uses, or leave them blank.",
      },
    ],
    tips: [
      "On a People with a code experience, a % off or free code also lets the guest in.",
      "Your event's Needs attention list warns you when a shared code is nearly used up or about to end.",
    ],
  },
  {
    id: "run-event",
    title: "Run your event",
    summary: "Everything you need on the day and in between.",
    where: { label: "Today", href: "/host-dashboard" },
    steps: [
      {
        title: "Needs attention",
        body: "Each event page shows what needs you: requests to join waiting, codes used up or ending soon, and monthly passes about to end.",
      },
      {
        title: "Requests",
        body: "For People I approve events, accept or decline requests to join.",
      },
      {
        title: "Bookings and Calendar",
        body: "See who's coming to each session, and all your sessions on a calendar.",
      },
      {
        title: "Check-in",
        body: "Scan each guest's ticket QR code at the door. It works from your phone.",
      },
      {
        title: "Walk-ins",
        body: "In Events, use On-spot booking to book a guest at the door. They get their ticket on WhatsApp, or you can download it and share it.",
      },
      {
        title: "Messages and Co-hosts",
        body: "Talk to your guests, and invite co-hosts to help run an event from its edit page, by email. Co-hosts can manage the event; earnings stay with you unless you let them withdraw. Not on Myslotmate yet? They get an email, and the invite waits until they become a host with that email.",
      },
    ],
  },
  {
    id: "earnings",
    title: "Earnings and payouts",
    summary: "What you sold, what's on its way, and how you get paid.",
    where: { label: "Earnings", href: "/host-dashboard/earnings" },
    steps: [
      {
        title: "Sales",
        body: "Every booking with what the guest paid and what you earn from it.",
      },
      {
        title: "Payouts",
        body: "Money sent to your bank or UPI, and what you can withdraw now.",
      },
      {
        title: "Payout settings",
        body: "Your bank account or UPI, your PAN and GST details, your monthly statement and your Marketing Boost invoices.",
      },
    ],
    tips: [
      "You keep your full ticket price. Where the law requires it, tax (TCS/TDS) is withheld and shown in your statement.",
      "When a guest is refunded, that booking's earnings are taken back.",
    ],
  },
  {
    id: "boost",
    title: "Marketing Boost: let us promote your event",
    summary:
      "Our team runs ads for your event. Nothing upfront: you pay a commission only on tickets sold while the Boost is live.",
    where: {
      label: "Promote",
      href: "/host-dashboard/promote",
    },
    badge: "Pilot",
    steps: [
      {
        title: "Check your event qualifies",
        body: "A paid, published event whose next date is at least 10 days away, with a Moderate, Strict or No refunds policy (not Flexible), with at least 20 unsold tickets (50 if every ticket is under ₹500). You need to be a verified host with a payout method added. Boost is in a pilot with invited hosts; ask our team to add you.",
      },
      {
        title: "Request a Boost",
        body: "Pick where to advertise (Instagram, Facebook, Google, WhatsApp or influencers), and optionally your goal and who should see it. We review it within 24 hours.",
      },
      {
        title: "Review our proposal",
        body: "We send the commission for each ticket type, with a note on the plan. Nothing is charged until you accept.",
      },
      {
        title: "Accept, and we go live",
        body: "Once you accept, our team sets up the ads and switches the Boost live. Commission applies only to tickets sold from then until it ends.",
      },
      {
        title: "Track it, or stop it any time",
        body: "The card shows tickets sold, commission, reach and clicks. Stop it whenever you like; a one-time event's Boost ends when the event starts.",
      },
    ],
    tips: [
      "The commission comes out of your share of each ticket. The guest pays the same price.",
      "If a guest cancels in time for a full refund, that ticket's commission is returned. A late cancellation with no refund keeps it.",
      "If you cancel the event or pause a session, your guests are refunded in full, but the commission on their tickets is still charged: the ads already ran. It comes off what you can withdraw.",
      "While a Boost is open or live, the refund policy can't be changed to Flexible.",
      "Change a ticket price after accepting and we'll send a new proposal.",
    ],
  },
  {
    id: "documents",
    title: "Statements and invoices",
    summary: "Download your monthly statement and Boost invoices any time.",
    where: {
      label: "Earnings → Payout settings",
      href: "/host-dashboard/earnings",
    },
    badge: "Rolling out",
    steps: [
      {
        title: "Monthly statement",
        body: "Pick a month and download a PDF: every sale, refunds, tax withheld, what you earned and the payouts sent to you. Handy for your accounts.",
      },
      {
        title: "Marketing Boost invoices",
        body: "If you used Boost, you get a GST invoice each month for the commission, and a credit note if boosted bookings were refunded later. If you're GST-registered, you can claim that GST back.",
      },
      {
        title: "Your guests' receipts",
        body: "Guests get a receipt for Myslotmate's booking fee with their booking, by email and in their bookings. You don't need to issue anything for it.",
      },
    ],
  },
  {
    id: "help",
    title: "Need help?",
    summary: "We're here if something isn't covered.",
    where: { label: "Support", href: "/support" },
    steps: [
      {
        title: "Technical support",
        body: "Report a problem with bookings, payouts, your dashboard or a session, and track your tickets.",
      },
      {
        title: "Urgent help during a session",
        body: "Use Emergency SOS on the Support page to reach our Trust & Safety team.",
      },
    ],
  },
];

// ─── Premium Hosts and the paid-budget Boost ────────────────────────────────

const PREMIUM_SECTION: GuideSection = {
  id: "premium",
  title: "Premium Hosts: Myslotmate as your marketing partner",
  summary:
    "Free to join, by approval. Premium unlocks Boost and gives you a named campaign manager.",
  where: { label: "Premium", href: "/host-dashboard/premium" },
  badge: "New",
  steps: [
    {
      title: "Apply, free",
      body: "Open Premium in your dashboard and tell us a little about your events. Any approved host can apply.",
    },
    {
      title: "We review it",
      body: "Our team usually replies within a day. Once approved, you get a named campaign manager, shown on your Premium page with their contact.",
    },
    {
      title: "What you get",
      body: "Boost for your events, same-day review of your Boost plans, up to 2 posters or reels a month made by our team, a Premium host badge and a featured slot on the home page.",
    },
  ],
  tips: [
    "Premium itself costs nothing. With Boost you pay only the ad budget you choose and a fee on the tickets it sells.",
    "If Premium is removed from your account, we tell you why. A Boost that's already live runs to its end date.",
  ],
};

const PLAN_BOOST_SECTION: GuideSection = {
  id: "boost",
  title: "Marketing Boost: ads that sell your tickets",
  summary:
    "For Premium hosts. You pay the ad budget upfront and all of it goes into your ads; we take a fee only on tickets sold while the Boost runs.",
  where: { label: "Promote", href: "/host-dashboard/promote" },
  badge: "Premium",
  steps: [
    {
      title: "Check your event qualifies",
      body: "You're a Premium host, verified, with a payout method added. The event is paid and published, its next date is at least 10 days away, its refund policy is Moderate, Strict or No refunds (not Flexible), and it has at least 20 unsold tickets (50 if every ticket is under ₹500).",
    },
    {
      title: "Plan it",
      body: "On the event's Boost card, pick a daily ad budget (from ₹500, in steps of ₹100) and the dates: at least 3 days, ending by the event's date. Choose where to advertise and, if you like, your goal and who should see it. You see the total with 18% GST and our fee per ticket type before you send it.",
    },
    {
      title: "Review our proposal",
      body: "Your manager confirms the plan and the fee for each ticket type, with a note. If they propose a fee different from the guide, they say why. Nothing is charged yet.",
    },
    {
      title: "Accept and pay the ad budget",
      body: "Accept and pay the budget with GST right away, or within 7 days; after that the plan expires. The budget isn't refundable: all of it is spent on your ads, and the reports show how.",
    },
    {
      title: "Share your creatives",
      body: "Upload what the ads should use: reels (vertical 9:16, up to 90 seconds), posts (1:1 or 4:5 images, a carousel of up to 10, or a video up to 60 seconds), stories (vertical 9:16) and brand material such as your logo. Your manager marks each one In use or asks for changes. Posters or reels made by our team wait for your approval. The ads need at least one creative in use.",
    },
    {
      title: "We go live",
      body: "Your manager starts the ads. The fee applies to tickets sold from then until the Boost ends.",
    },
    {
      title: "Track it, top it up, or stop it",
      body: "The Boost card shows the budget spent, reach, clicks, tickets sold and cost per ticket, day by day, plus the reports your manager shares from the ad platforms. Add days at the same daily budget, or stop it any time.",
    },
    {
      title: "Get the final report",
      body: "Within 2 days of the end, your manager shares the final report on the Boost card, with everything the budget did.",
    },
  ],
  tips: [
    "Our fee per ticket: 10% under ₹500, 8% for ₹500–999, 7% for ₹1,000–1,999, 6% for ₹2,000–4,999 and 5% from ₹5,000. The higher the price, the lower the fee.",
    "The fee comes out of your share of each ticket. Guests pay the same price.",
    "If a guest cancels in time for a full refund, that ticket's fee is returned. A late cancellation with no refund keeps it.",
    "If you stop the Boost early or cancel the event, the ad budget isn't refunded, and the fee on tickets already sold is still charged.",
    "While a Boost is open or live, the refund policy can't be changed to Flexible.",
    "Change a ticket price after the proposal and we send a new one. A budget you've already paid carries over.",
    "If you're GST-registered, you can usually claim back the GST on the ad budget.",
  ],
};

const PLAN_INVOICES_STEP: GuideStep = {
  title: "Marketing Boost invoices",
  body: "You get a tax invoice for each ad budget payment, on the event's Boost card. The Boost fee is on a GST invoice each month, with a credit note if boosted bookings were refunded later. If you're GST-registered, you can claim that GST back.",
};

const isProd = process.env.NODE_ENV === "production";
const BOOST_PLAN_ON =
  env.NEXT_PUBLIC_ENABLE_BOOST_PLAN === "true" ||
  (env.NEXT_PUBLIC_ENABLE_BOOST_PLAN === undefined && !isProd);

/** The guide with Premium and the paid-budget Boost in place of today's Boost. */
function withBoostPlan(guide: GuideSection[]): GuideSection[] {
  return guide.flatMap((s) => {
    if (s.id === "boost") return [PREMIUM_SECTION, PLAN_BOOST_SECTION];
    if (s.id === "documents")
      return [
        {
          ...s,
          summary:
            "Download your monthly statement and Boost invoices any time.",
          steps: s.steps.map((st) =>
            st.title === "Marketing Boost invoices" ? PLAN_INVOICES_STEP : st,
          ),
        },
      ];
    return [s];
  });
}

export const HOST_GUIDE: GuideSection[] = BOOST_PLAN_ON
  ? withBoostPlan(CURRENT_GUIDE)
  : CURRENT_GUIDE;
