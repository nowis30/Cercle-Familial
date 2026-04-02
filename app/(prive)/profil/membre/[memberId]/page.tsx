import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { MemberProfileForm } from "@/components/profile/member-profile-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateForInput(value?: Date | null) {
  if (!value) return "";

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const { memberId } = await params;

  const member = await prisma.managedFamilyMember.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    redirect("/profil");
  }

  // Permission check: only owner can access
  if (member.ownerUserId !== session.user.id) {
    redirect("/profil");
  }

  return (
    <AppShell title={`Fiche: ${member.firstName} ${member.lastName || ""}`}>
      <MemberProfileForm
        memberId={member.id}
        initialValues={{
          firstName: member.firstName,
          lastName: member.lastName || "",
          relationLabel: member.relationLabel || "Enfant",
          birthDate: formatDateForInput(member.birthDate),
          phone: member.phone || "",
          address: member.address || "",
          allergies: member.allergies || "",
          foodPreferences: member.foodPreferences || "",
          giftIdeas: member.giftIdeas || "",
        }}
      />
    </AppShell>
  );
}
