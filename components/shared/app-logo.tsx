import Image from "next/image";

import { cn } from "@/lib/utils";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
};

export function AppLogo({ compact = false, className }: AppLogoProps) {
  if (compact) {
    return (
      <Image
        src="/branding/logo-cercle-familial.png"
        alt="Logo Cercle Familial"
        width={36}
        height={36}
        className={cn("h-9 w-9 rounded-xl object-contain", className)}
        priority
      />
    );
  }

  return (
    <Image
      src="/branding/logo-cercle-familial.png"
      alt="Logo Cercle Familial"
      width={148}
      height={148}
      className={cn("h-[74px] w-[74px] object-contain", className)}
      priority
    />
  );
}
