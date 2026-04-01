import { redirect } from "next/navigation";

export default async function InviteCircleAliasPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/invitation/${token}`);
}
