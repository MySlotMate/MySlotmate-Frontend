import type { PublicHostProfileDTO } from "~/lib/api";
import { fetchPublic } from "~/lib/server-api";
import HostProfileClient from "./HostProfileClient";

export const revalidate = 300;

export default async function HostProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialHost = await fetchPublic<PublicHostProfileDTO>(`/hosts/${id}`);
  return <HostProfileClient params={params} initialHost={initialHost} />;
}
