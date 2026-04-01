import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilPage() {
  const session = await auth();
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

  return (
    <AppShell title="Mon profil">
      <ProfileForm
        initialValues={{
          firstName: user.profile?.firstName ?? user.name.split(" ")[0] ?? "",
          lastName: user.profile?.lastName ?? user.name.split(" ").slice(1).join(" ") ?? "",
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
