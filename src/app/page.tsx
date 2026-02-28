import * as components from "../components";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#e4f8ff] to-[rgba(0, 148, 202, 0)] text-white">
      <components.Home.Hero/>
    </main>
  );
}
