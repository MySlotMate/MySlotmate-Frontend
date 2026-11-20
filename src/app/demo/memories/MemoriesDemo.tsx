"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Settings,
  CalendarDays,
  ImagePlus,
  Images,
  Loader2,
  MapPin,
  RotateCcw,
} from "lucide-react";
import AccountSheet from "~/components/AccountSheet";
import EventPhotos from "~/components/profile/EventPhotos";
import { ProfileIdentity } from "~/components/profile/ProfileKit";
import { MobileHero } from "~/components/home/HomeFeed";
import { useListHosts, useListPublicEvents } from "~/hooks/useApi";
import { AlbumFolder } from "~/components/profile/PhotoAlbums";
import { Lightbox } from "~/components/profile/PhotoKit";
import { CARD } from "~/components/profile/ProfileKit";

/**
 * Demo of "memories shared with the people who went", with the real guest
 * components (EventPhotos) and sample photos. Step 1 fakes the upload; steps
 * 2 and 3 are exactly what guests see on their profile and in their journey.
 */

const EVENT = {
  title: "Pinch of Soil – Pottery Workshop",
  date: "Sat, Oct 18 · 12:00 PM",
  place: "Clay Corner, Zoo Road, Guwahati",
  cover: "/assets/home/pottery.png",
  host: "Minu Katharpi",
};

const DEMO_ALBUMS = [
  {
    title: "Pottery workshops",
    urls: [
      "/assets/home/pottery.png",
      "/assets/home/creativity_thumb.jpg",
      "/assets/home/people1.webp",
      "/assets/home/heropic2.webp",
      "/assets/home/social_thumb.jpg",
      "/assets/home/heropic1.webp",
      "/assets/home/heropic3.webp",
    ],
  },
  {
    title: "Credentials",
    urls: ["/assets/home/creativity_thumb.jpg", "/assets/home/heropic3.webp"],
  },
  {
    title: "Behind the scenes",
    urls: [
      "/assets/home/heropic1.webp",
      "/assets/home/people1.webp",
      "/assets/home/social_thumb.jpg",
      "/assets/home/yoga_thumb.jpg",
    ],
  },
];

const SAMPLE = [
  "/assets/home/pottery.png",
  "/assets/home/creativity_thumb.jpg",
  "/assets/home/people1.webp",
  "/assets/home/heropic2.webp",
  "/assets/home/social_thumb.jpg",
  "/assets/home/heropic1.webp",
];

function Step({
  n,
  title,
  who,
  children,
}: {
  n: number;
  title: string;
  who: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7038F5] to-[#B724EA] text-sm font-bold">
          {n}
        </span>
        <div>
          <p className="font-outfit text-base font-semibold">{title}</p>
          <p className="text-xs text-white/50">{who}</p>
        </div>
      </div>
      <div className="flex-1 rounded-3xl border border-white/[0.06] bg-[#0E0F1F] p-4">
        {children}
      </div>
    </section>
  );
}

export default function MemoriesDemo() {
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openAlbum, setOpenAlbum] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const { data: liveEvents } = useListPublicEvents();
  const { data: liveHosts } = useListHosts();
  const hostMap = new Map((liveHosts ?? []).map((h) => [h.id, h]));
  const event = { title: EVENT.title, gallery_urls: gallery };
  const shared = gallery.length > 0;

  const addPhotos = () => {
    setUploading(true);
    // Stand-in for the real upload + PUT /events/{id} gallery_urls.
    setTimeout(() => {
      setGallery(SAMPLE);
      setUploading(false);
    }, 900);
  };

  return (
    <main className="min-h-screen bg-[#080914] font-[family-name:var(--font-inter)] text-white max-md:pb-28">
      <div className="mx-auto w-full max-w-[1210px] px-4 pt-6 pb-16 sm:px-6 md:px-10 md:pt-10">
        <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-bold tracking-wider text-amber-200 uppercase">
          Demo · sample data
        </span>
        <h1 className="font-outfit mt-3 text-[26px] leading-tight font-bold md:text-[32px]">
          Memories shared with the people who went
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
          A host adds photos to a past experience once. Everyone who booked it
          then finds them in their journey. Press{" "}
          <span className="font-semibold text-white">Add photos</span> in step 1
          to see it reach the guest.
        </p>

        <div className="mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
          {/* 1 — host */}
          <Step
            n={1}
            title="The host adds photos"
            who={`${EVENT.host} · Host dashboard → Host profile → Share photos with your guests`}
          >
            <div className={`overflow-hidden ${CARD}`}>
              <div className="relative aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={EVENT.cover}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
                  <Images className="h-3 w-3" /> {1 + gallery.length}
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-semibold">
                  {EVENT.title}
                </p>
                <p className="mt-0.5 text-[11px] text-white/50">
                  Oct 2026 · 14 went
                </p>
                <button
                  type="button"
                  disabled={uploading || shared}
                  onClick={addPhotos}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 py-2 text-xs font-semibold text-[#D8B4FE] transition hover:bg-white/[0.05] disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {uploading
                    ? "Uploading…"
                    : shared
                      ? `${gallery.length} photos added`
                      : "Add photos"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/45">
              Photos added here also show up for everyone who went. Only share
              photos the people in them are happy with.
            </p>
          </Step>

          {/* 2 — guest journey */}
          <Step
            n={2}
            title="In the guest's journey"
            who="Any guest who booked · My journey → Memories"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="h-3 w-3 rounded-full border-2 border-[#D8B4FE]" />
              <p className="font-outfit text-[15px] font-semibold text-white/80">
                October 2026
              </p>
            </div>
            <div className="ml-[5px] border-l border-dashed border-white/15 pl-4">
              <article className={`p-3 ${CARD}`}>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={EVENT.cover}
                    alt=""
                    className="aspect-[4/5] w-20 shrink-0 self-start rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
                      Arts &amp; Crafts
                    </span>
                    <p className="font-outfit mt-1.5 line-clamp-2 text-[14px] leading-5 font-semibold">
                      {EVENT.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/55">
                      <CalendarDays className="h-3 w-3" /> {EVENT.date}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/55">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{EVENT.place}</span>
                    </p>
                  </div>
                </div>
                {shared && (
                  <div className="mt-3 border-t border-white/[0.06] pt-3">
                    <EventPhotos event={event} variant="strip" />
                  </div>
                )}
              </article>
            </div>
          </Step>
        </div>

        {/* Profile → Photos: albums shown like Android folders */}
        <section className="mt-14 max-w-4xl">
          <h2 className="font-outfit text-xl font-bold">
            Profile → Photos: albums
          </h2>
          <p className="mt-1 text-sm text-white/55">
            Folder tiles with four small previews and &ldquo;+N&rdquo; for the
            rest. Tap one to open it.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {DEMO_ALBUMS.map((a, i) => (
              <AlbumFolder
                key={a.title}
                title={a.title}
                urls={a.urls}
                count={a.urls.length}
                onOpen={() => setOpenAlbum(i)}
              />
            ))}
          </div>
        </section>
        {openAlbum !== null && DEMO_ALBUMS[openAlbum] && (
          <Lightbox
            title={DEMO_ALBUMS[openAlbum].title}
            photos={DEMO_ALBUMS[openAlbum].urls}
            start={0}
            removable={new Set()}
            onClose={() => setOpenAlbum(null)}
          />
        )}

        {/* Phone home hero preview (live events). Visible at phone width. */}
        <section className="mt-14 max-w-sm">
          <h2 className="font-outfit text-xl font-bold">Home hero on phones</h2>
          <p className="mt-1 mb-4 text-sm text-white/55">
            Narrow the window to phone width to see it.
          </p>
          <div className="-mx-4">
            <MobileHero
              events={(liveEvents ?? []).slice(0, 6)}
              hostById={hostMap}
            />
          </div>
        </section>

        <section className="mt-14 max-w-[360px]">
          <h2 className="font-outfit mb-4 text-xl font-bold">
            Profile card + account sheet
          </h2>
          <ProfileIdentity
            avatar="/assets/home/people1.webp"
            name="Riya Sharma"
            verified
            role={{ label: "Community host", tone: "community" }}
            tagline="Pottery, chai and long walks"
            meta={["Guwahati", "Joined Oct 2026"]}
            stats={[
              { value: 6, label: "Attended" },
              { value: 3, label: "Hosted" },
              { value: 12, label: "Connections" },
            ]}
            actions={null}
            corner={
              <button
                type="button"
                aria-label="Account and settings"
                onClick={() => setSheet(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-[18px] w-[18px]" />
              </button>
            }
          />
          {sheet && (
            <AccountSheet
              user={{
                displayName: "Riya Sharma",
                email: "riya@example.com",
                phoneNumber: null,
                photoURL: "/assets/home/people1.webp",
              }}
              userId={null}
              hostStatus="approved"
              hasCoHostInvites={false}
              isAdmin={false}
              onClose={() => setSheet(false)}
              onLogout={() => setSheet(false)}
              city="Guwahati"
              onBecomeHost={() => undefined}
              onChangeCity={() => undefined}
              accounts={[
                {
                  id: "demo-2",
                  name: "MySlotMate Studio",
                  email: "studio@example.com",
                  phone: null,
                  photo: null,
                  method: "google",
                  lastUsed: 0,
                },
              ]}
              onSwitchAccount={() => setSheet(false)}
              onAddAccount={() => setSheet(false)}
              onForgetAccount={() => undefined}
            />
          )}
        </section>

        <section className="mt-14">
          <h2 className="font-outfit text-xl font-bold">Notifications</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                [
                  "Success",
                  () => toast.success("Album created. Now add some photos."),
                ],
                [
                  "Error",
                  () =>
                    toast.error("Couldn't add those photos. Please try again."),
                ],
                [
                  "Info",
                  () => toast.info("Photos from the host are in your journey."),
                ],
                [
                  "Warning",
                  () => toast.warning("An album holds up to 50 photos."),
                ],
                [
                  "With details",
                  () =>
                    toast.success("Connected with Dank", {
                      description:
                        "Their new experiences will show up first on your home.",
                    }),
                ],
              ] as [string, () => void][]
            ).map(([label, fire]) => (
              <button
                key={label}
                type="button"
                onClick={fire}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setGallery([])}
            className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" /> Reset demo
          </button>
          <p className="text-xs text-white/40">
            Local preview only: this page isn&apos;t available on the live site.
          </p>
        </div>
      </div>
    </main>
  );
}
