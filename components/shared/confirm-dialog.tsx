"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, description, confirmLabel = "Confirmer", onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Ouvrir la confirmation
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-zinc-600">{description}</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
              >
                {confirmLabel}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
