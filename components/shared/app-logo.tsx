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
        src="/branding/cercle-familial-mark.svg"
        alt="Logo Cercle Familial"
        width={36}
        height={36}
        className={cn("h-9 w-9 rounded-xl", className)}
        priority
      />
    );
  }

  return (
    <Image
      src="/branding/cercle-familial-logo.svg"
      alt="Logo Cercle Familial"
      width={180}
      height={55}
      className={cn("h-[44px] w-auto", className)}
      priority
    />
  );
}
