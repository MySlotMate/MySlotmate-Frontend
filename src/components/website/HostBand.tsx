import HostInvite from "./HostInvite";

/** "Didn't find it? Host it." band, after the slot grid. */
export default function HostBand() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-10">
      <HostInvite
        eyebrow="Can’t find it?"
        title="Host the event you wish existed."
        body="Start a community, run a workshop or offer one-on-one time. Set your own date and price. Hosting is free."
        image={{
          src: "/assets/illustrations/approved/host-setting-the-stage.webp",
          alt: "A host hanging string lights over a pottery table as her first guest arrives with a plant",
        }}
      />
    </section>
  );
}
