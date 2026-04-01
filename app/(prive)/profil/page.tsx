import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateForInput(value?: Date | null) {
  if (!value) return "";

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ birthDate?: string }>;
}) {
  const session = await auth();
  const { birthDate } = await searchParams;

  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    redirect("/connexion");
  }

  const hasValidBirthDatePrefill = Boolean(birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate));
  const prefilledBirthDate = hasValidBirthDatePrefill ? birthDate ?? "" : "";

  return (
    <AppShell title="Mon profil">
      <ProfileForm
        initialValues={{
          firstName: user.profile?.firstName ?? user.name.split(" ")[0] ?? "",
          lastName: user.profile?.lastName ?? user.name.split(" ").slice(1).join(" ") ?? "",
          birthDate: prefilledBirthDate || formatDateForInput(user.profile?.birthDate),
          phone: user.phone ?? "",
          address: user.address ?? "",
          allergies: user.profile?.allergies ?? "",
          foodPreferences: user.profile?.foodPreferences ?? "",
          giftIdeas: user.profile?.giftIdeas ?? "",
        }}
      />
    </AppShell>
  );
}
