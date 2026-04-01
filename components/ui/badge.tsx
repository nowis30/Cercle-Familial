import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", {
  variants: {
    variant: {
      default: "border-emerald-200 bg-emerald-50 text-emerald-800",
      secondary: "border-zinc-200 bg-zinc-100 text-zinc-700",
      warning: "border-amber-200 bg-amber-50 text-amber-800",
      danger: "border-rose-200 bg-rose-50 text-rose-800",
      info: "border-sky-200 bg-sky-50 text-sky-800",
      birthday: "border-pink-200 bg-pink-50 text-pink-800",
      primary: "border-indigo-200 bg-indigo-50 text-indigo-700",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
