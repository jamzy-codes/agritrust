import { redirect } from "next/navigation";

export default async function TraceBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  redirect("/verify/" + encodeURIComponent(batchId));
}