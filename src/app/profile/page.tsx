"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  CalendarHeart,
  ChevronRight,
  Compass,
  Mail,
  Settings,
  Pencil,
  Phone,
  Plus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "~/utils/firebase";
import * as components from "~/components";
import { BecomeHostModal } from "~/components/become-host";
import SlotCard from "~/components/website/SlotCard";
import PhotoAlbums from "~/components/profile/PhotoAlbums";
import Milestones from "~/components/profile/Milestones";
import {
  CARD,
  EmptyCard,
  GRADIENT_BTN,
  InfoBlock,
  ProfileIdentity,
  SkeletonGrid,
  TagList,
  ProfileTabs,
  SecondaryButton,
  type RoleTone,
} from "~/components/profile/ProfileKit";
import {
  useApplicationStatus,
  useEventsByHost,
  useListHosts,
  useMyHost,
  useUpdateUserProfile,
  useUserProfile,
} from "~/hooks/useApi";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { useMoments } from "~/hooks/useMoments";
import { useStoredAuth } from "~/hooks/useStoredAuth";
import { computeBadges } from "~/lib/badges";
import { categoryOf } from "~/lib/categories";
import { useConnections } from "~/lib/connections";
import { formatIST } from "~/lib/datetime";
import type { HostDTO } from "~/lib/api";
import EventCover from "~/components/EventCover";

type Tab = "experiences" | "hosting" | "photos" | "milestones";

// Settings (the sheet in Navbar): wallet, hosting, account, help and logout.
const openMenu = () => window.dispatchEvent(new Event("msm:open-profile"));

function roleFor(
  host: HostDTO | undefined,
  hostedCount: number,
): { label: string; tone: RoleTone } {
  if (host?.application_status === "approved") {
    if (host.is_professional)
      return { label: "Professional host", tone: "pro" };
    if (host.is_super_host) return { label: "Super host", tone: "host" };
    return { label: "Community host", tone: "community" };
  }
  if (
    host?.application_status === "pending" ||
    host?.application_status === "under_review"
  )
    return { label: "Explorer · Host in review", tone: "explorer" };
  if (hostedCount > 0)
    return { label: "Explorer · Free events", tone: "explorer" };
  return { label: "Explorer", tone: "explorer" };
}

/** The hosts you're connected with, opened from the Connections stat. */
function ConnectionsSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="animate-in fade-in msm-modal fixed inset-0 z-[320] flex items-end justify-center bg-black/60 backdrop-blur-sm duration-200 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connections"
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0E0F1F] text-white sm:animate-none sm:rounded-[28px]"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="font-outfit text-lg font-bold">Connections</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Explorers edit name and city here; hosts use the host dashboard editor. */
function EditSheet({
  userId,
  name,
  city,
  onClose,
}: {
  userId: string;
  name: string;
  city: string;
  onClose: () => void;
}) {
  const [n, setN] = useState(name);
  const [c, setC] = useState(city);
  const update = useUpdateUserProfile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (!n.trim()) return toast.error("Please add your name.");
    try {
      await update.mutateAsync({
        userId,
        body: { name: n.trim(), city: c.trim() || null },
      });
      toast.success("Profile updated");
      onClose();
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
    }
  };

  const field =
    "mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-[#080914] px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#A020F0]/60";

  return (
    <div
      className="msm-modal fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#121426] p-6 text-white sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-outfit text-xl font-bold">Edit profile</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mt-5 block text-sm text-white/70">
          Name
          <input
            value={n}
            onChange={(e) => setN(e.target.value)}
            className={field}
            maxLength={60}
          />
        </label>
        <label className="mt-4 block text-sm text-white/70">
          City
          <input
            value={c}
            onChange={(e) => setC(e.target.value)}
            placeholder="e.g. Guwahati"
            className={field}
            maxLength={60}
          />
        </label>
        <p className="mt-3 text-xs text-white/45">
          A bio, interests and photos come with hosting. Start a free experience
          and your profile grows with it.
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={update.isPending}
          className={`mt-6 h-12 w-full rounded-full text-sm font-semibold disabled:opacity-60 ${GRADIENT_BTN}`}
        >
          {update.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId: storedUserId } = useStoredAuth();
  const userId =
    storedUserId && storedUserId !== "existing" ? storedUserId : null;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [firebaseUser, firebaseLoading] = useAuthState(auth);
  const loggedIn = Boolean(userId) || Boolean(firebaseUser);
  const { closeBecomeHostModal, handleListTimeClick, showBecomeHostModal } =
    useListTimeAction();
  const [tab, setTab] = useState<Tab>("experiences");
  const [editing, setEditing] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  // Settings links here with ?edit=1 or ?view=connections (or, when you're
  // already on this page, sends the same query as an event).
  useEffect(() => {
    const apply = (q: string) => {
      const p = new URLSearchParams(q);
      if (p.get("edit") === "1") setEditing(true);
      if (p.get("view") === "connections") setShowConnections(true);
    };
    const onAction = (e: Event) => apply(String((e as CustomEvent).detail));
    window.addEventListener("msm:profile-action", onAction);
    return () => window.removeEventListener("msm:profile-action", onAction);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") === "1") setEditing(true);
    if (params.get("view") === "connections") setShowConnections(true);
    if (!params.has("edit") && !params.has("view")) return;
    params.delete("edit");
    params.delete("view");
    const q = params.toString();
    window.history.replaceState(null, "", `/profile${q ? `?${q}` : ""}`);
  }, []);

  const { data: user } = useUserProfile(userId);
  const { data: application } = useApplicationStatus(userId);
  const hasHostRecord = Boolean(application?.status?.application_status);
  const { data: host, isLoading: hostLoading } = useMyHost(
    hasHostRecord ? userId : null,
  );
  // Role and edit target depend on the host record; wait for it.
  const roleReady =
    application !== undefined && (!hasHostRecord || !hostLoading);
  const { data: hostEvents } = useEventsByHost(host?.id ?? null);
  const { moments, ready: momentsReady } = useMoments(userId);
  const { data: hosts } = useListHosts();
  const { hostIds: connectedIds, toggle } = useConnections();

  const hosting = useMemo(
    () =>
      (hostEvents ?? [])
        .filter((e) => e.status !== "draft" && e.status !== "cancelled")
        .sort(
          (a, b) =>
            new Date(b.next_available_date ?? b.time).getTime() -
            new Date(a.next_available_date ?? a.time).getTime(),
        ),
    [hostEvents],
  );
  const badges = useMemo(() => computeBadges(moments), [moments]);
  const earned = badges.filter((b) => b.earned);
  const connected = useMemo(
    () => (hosts ?? []).filter((h) => connectedIds.includes(h.id)),
    [hosts, connectedIds],
  );
  const hostsMet = new Set(moments.map((m) => m.event.host_id)).size;

  const displayName = user?.name ?? firebaseUser?.displayName ?? null;
  const email = user?.email ?? firebaseUser?.email ?? null;
  const phone = user?.phn_number ?? firebaseUser?.phoneNumber ?? null;
  // Some accounts store avatar_url = "" — treat it as missing.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const avatar = host?.avatar_url || user?.avatar_url || firebaseUser?.photoURL;
  const city = user?.city ?? host?.city ?? null;
  const role = roleReady ? roleFor(host, hosting.length) : null;
  const isApproved = host?.application_status === "approved";

  const showHosted = hosting.length > 0 || isApproved;
  // Four at most, so the bar fits a phone. Connections opens from its stat.
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "experiences", label: "Attended", count: moments.length },
    ...(showHosted
      ? [{ key: "hosting" as const, label: "Hosted", count: hosting.length }]
      : []),
    { key: "photos", label: "Photos" },
    { key: "milestones", label: "Milestones", count: earned.length },
  ];

  // Desktop only, under the card. Phones reach these through Settings.
  const about = (
    <>
      {roleReady && !isApproved && (
        <div className="rounded-2xl border border-[#A020F0]/30 bg-gradient-to-br from-[#3B1772]/60 to-transparent p-4">
          <p className="text-sm font-semibold">
            {hosting.length ? "Get verified to earn" : "Share what you love"}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/60">
            {hosting.length
              ? "Verified hosts sell tickets, get paid out and earn a host badge."
              : "Host a free experience and your profile shows it up front."}
          </p>
          <button
            type="button"
            onClick={handleListTimeClick}
            className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#1D1140] transition hover:bg-white/90"
          >
            {hosting.length ? "Start earning" : "Host for free"}
          </button>
        </div>
      )}
      {(host?.expertise_tags?.length ?? 0) > 0 && (
        <InfoBlock title="Interests">
          <TagList tags={host!.expertise_tags} />
        </InfoBlock>
      )}
      <InfoBlock title="Only you can see this">
        <ul className="flex flex-col gap-2 text-[13px] text-white/65">
          {email && (
            <li className="flex items-center gap-2.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-white/35" />
              <span className="truncate">{email}</span>
            </li>
          )}
          {phone && (
            <li className="flex items-center gap-2.5">
              <Phone className="h-3.5 w-3.5 shrink-0 text-white/35" />
              {phone}
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-white/35" />
            {hostsMet} host{hostsMet === 1 ? "" : "s"} met
          </li>
        </ul>
      </InfoBlock>
    </>
  );

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip bg-[#080914] text-white max-md:pb-28">
      <components.Navbar dark />

      <div className="mx-auto w-full max-w-[1210px] px-4 pt-5 pb-16 font-[family-name:var(--font-inter)] sm:px-6 md:px-10 md:pt-8">
        {hydrated && !firebaseLoading && !loggedIn ? (
          <div className="mx-auto mt-10 max-w-md">
            <EmptyCard
              icon={<Users className="h-6 w-6" />}
              title="Log in to see your profile"
              text="Your experiences, milestones, hosting and connections all live here."
            >
              <button
                type="button"
                onClick={openMenu}
                className={`mt-5 rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
              >
                Log in
              </button>
            </EmptyCard>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10">
              <ProfileIdentity
                avatar={avatar}
                name={displayName}
                verified={user?.is_verified ?? host?.is_identity_verified}
                role={role}
                tagline={host?.tagline}
                meta={[
                  ...(city ? [city] : []),
                  ...(user?.created_at
                    ? [`Joined ${formatIST(user.created_at, "MMM yyyy")}`]
                    : []),
                ]}
                bio={host?.bio}
                stats={[
                  { value: moments.length, label: "Attended" },
                  hosting.length > 0 || isApproved
                    ? { value: hosting.length, label: "Hosted" }
                    : { value: earned.length, label: "Milestones" },
                  {
                    value: connectedIds.length,
                    label: "Connections",
                    onClick: () => setShowConnections(true),
                  },
                ]}
                actions={
                  roleReady ? (
                    <>
                      {host ? (
                        <SecondaryButton href="/host-dashboard/profile">
                          <Pencil className="h-4 w-4" /> Edit profile
                        </SecondaryButton>
                      ) : (
                        <SecondaryButton onClick={() => setEditing(true)}>
                          <Pencil className="h-4 w-4" /> Edit profile
                        </SecondaryButton>
                      )}
                      {host?.slug && (
                        <SecondaryButton href={`/host/${host.slug}`}>
                          Public view
                        </SecondaryButton>
                      )}
                    </>
                  ) : (
                    <span className="h-11 w-full animate-pulse rounded-full bg-white/[0.06]" />
                  )
                }
                extra={about}
                corner={
                  <button
                    type="button"
                    aria-label="Settings"
                    title="Settings"
                    onClick={openMenu}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    <Settings className="h-[18px] w-[18px]" />
                  </button>
                }
              />

              <div className="min-w-0">
                {/* Phones: interests sit above the tabs (desktop has them in the card's side). */}
                {(host?.expertise_tags?.length ?? 0) > 0 && (
                  <div className="mb-4 lg:hidden">
                    <TagList tags={host!.expertise_tags} />
                  </div>
                )}
                <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />

                <div className="mt-5">
                  {tab === "experiences" ? (
                    !momentsReady ? (
                      <SkeletonGrid />
                    ) : moments.length ? (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                        {moments.slice(0, 9).map(({ booking, event, at }) => (
                          <Link
                            key={booking.id}
                            href={`/experience/${event.slug}`}
                            className={`group overflow-hidden ${CARD}`}
                          >
                            <div className="aspect-[4/5] overflow-hidden">
                              <EventCover
                                src={event.cover_image_url}
                                alt={event.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>
                            <div className="p-3">
                              <p className="text-[10px] font-bold tracking-wider text-[#C9A7FF] uppercase">
                                {categoryOf(event).label}
                              </p>
                              <p className="mt-0.5 truncate text-[13px] font-semibold">
                                {event.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-white/50">
                                {formatIST(at, "MMM d, yyyy")}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <EmptyCard
                        icon={<Compass className="h-6 w-6" />}
                        title="Nothing attended yet"
                        text="Experiences you go to as a guest show up here."
                      >
                        <Link
                          href="/explore"
                          className={`mt-5 rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
                        >
                          Explore experiences
                        </Link>
                      </EmptyCard>
                    )
                  ) : tab === "hosting" ? (
                    !roleReady || (host && !hostEvents) ? (
                      <SkeletonGrid />
                    ) : hosting.length ? (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                        {hosting.map((e, i) => (
                          <SlotCard key={e.id} event={e} index={i} />
                        ))}
                      </div>
                    ) : (
                      <EmptyCard
                        icon={<CalendarHeart className="h-6 w-6" />}
                        title={
                          isApproved
                            ? "No experiences published yet"
                            : "Host something, free"
                        }
                        text={
                          isApproved
                            ? "Publish your first experience from the host dashboard."
                            : "Anyone can host a free experience: a walk, a jam, a study circle. People who connect with you will see it first."
                        }
                      >
                        <button
                          type="button"
                          onClick={handleListTimeClick}
                          className={`mt-5 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
                        >
                          <Plus className="h-4 w-4" /> Host an experience
                        </button>
                      </EmptyCard>
                    )
                  ) : tab === "photos" ? (
                    <PhotoAlbums
                      owner={{ userId }}
                      firstName={displayName?.split(" ")[0] ?? "You"}
                      isMe
                    />
                  ) : tab === "milestones" ? (
                    <div>
                      <Milestones states={badges} heading={false} />
                      <Link
                        href="/activities"
                        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#D8B4FE] hover:text-white"
                      >
                        See your journey <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <components.Home.Footer dark />
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
      {showConnections && (
        <ConnectionsSheet onClose={() => setShowConnections(false)}>
          {connected.length ? (
            <div className="grid gap-2.5">
              {connected.map((h) => (
                <div
                  key={h.id}
                  className={`flex items-center gap-3 p-3 ${CARD}`}
                >
                  <Link
                    href={`/host/${h.slug}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                      src={h.avatar_url || "/assets/home/profile1.png"}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {h.first_name} {h.last_name}
                      </span>
                      <span className="block truncate text-xs text-white/50">
                        {h.tagline ?? h.city}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      toggle(h.id);
                      toast(`Disconnected from ${h.first_name}`);
                    }}
                    className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-white/25 hover:text-white"
                  >
                    Connected
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard
              icon={<UserPlus className="h-6 w-6" />}
              title="No connections yet"
              text="Connect with hosts you like from their profile. Their new experiences then show up first on your home."
            >
              <Link
                href="/explore?type=hosts"
                className={`mt-5 rounded-full px-6 py-2.5 text-sm font-semibold ${GRADIENT_BTN}`}
              >
                Find hosts
              </Link>
            </EmptyCard>
          )}
        </ConnectionsSheet>
      )}
      {editing && userId && (
        <EditSheet
          userId={userId}
          name={displayName ?? ""}
          city={city ?? ""}
          onClose={() => setEditing(false)}
        />
      )}
    </main>
  );
}
