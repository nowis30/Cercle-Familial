"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  title: string;
  description: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDialog({
  title,
  description,
  triggerLabel = "Supprimer",
  triggerVariant = "destructive",
  confirmLabel = "Confirmer",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-zinc-600">{description}</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="destructive"
                disabled={isConfirming}
                onClick={async () => {
                  setIsConfirming(true);
                  await onConfirm();
                  setIsConfirming(false);
                  setOpen(false);
                }}
              >
                {isConfirming ? "Confirmation..." : confirmLabel}
              </Button>
              <Button variant="secondary" disabled={isConfirming} onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
