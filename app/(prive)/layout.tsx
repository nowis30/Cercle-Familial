import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }

  return children;
}
