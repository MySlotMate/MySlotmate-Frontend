import type { PublicHostProfileDTO } from "~/lib/api";
import { fetchPublic } from "~/lib/server-api";
import HostProfileClient from "./HostProfileClient";

export const revalidate = 300;

export default async function HostProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const initialHost = await fetchPublic<PublicHostProfileDTO>(`/hosts/${slug}`);
  return <HostProfileClient params={params} initialHost={initialHost} />;
}
