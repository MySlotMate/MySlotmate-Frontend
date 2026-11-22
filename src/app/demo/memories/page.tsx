import { notFound } from "next/navigation";
import MemoriesDemo from "./MemoriesDemo";

export const metadata = {
  title: "Demo: shared memories",
  robots: { index: false },
};

/** Local preview of how event photos reach guests. Never served in production. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MemoriesDemo />;
}
