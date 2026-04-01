"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ConfirmDestructiveDialogProps = {
  /** Libellé exact que l'utilisateur doit retaper pour débloquer la suppression */
  confirmValue: string;
  /** Type d'objet, ex: "cercle", "événement", "membre" */
  itemType: string;
  /** Message d'avertissement affiché dans la modale */
  warningMessage?: string;
  /** Label du bouton déclencheur */
  triggerLabel?: string;
  /** Variant du bouton déclencheur */
  triggerVariant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  /** Callback async exécuté à la confirmation */
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDestructiveDialog({
  confirmValue,
  itemType,
  warningMessage,
  triggerLabel = "Supprimer",
  triggerVariant = "destructive",
  onConfirm,
}: ConfirmDestructiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  const isMatch = typed.trim() === confirmValue.trim();

  function handleClose() {
    setOpen(false);
    setTyped("");
    setError("");
  }

  async function handleConfirm() {
    if (!isMatch) return;
    setIsConfirming(true);
    setError("");
    try {
      await onConfirm();
      handleClose();
    } catch {
      setError("Une erreur est survenue. Réessaie.");
      setIsConfirming(false);
    }
  }

  return (
    <div>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            {/* En-tête danger */}
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-base">
                ⚠
              </span>
              <p className="text-base font-bold text-zinc-900">
                Supprimer {itemType === "cercle" ? "le cercle" : itemType === "événement" ? "l'événement" : itemType === "membre" ? "le membre" : `ce ${itemType}`}
              </p>
            </div>

            {/* Avertissement */}
            <p className="mb-1 text-sm font-semibold text-rose-700">
              ⚡ Cette action est irréversible.
            </p>
            {warningMessage && (
              <p className="mb-3 text-sm text-zinc-600">{warningMessage}</p>
            )}

            {/* Instruction */}
            <p className="mb-1 text-sm text-zinc-700">
              Pour confirmer, tape exactement&nbsp;:
            </p>
            <p className="mb-3 rounded-lg bg-zinc-100 px-3 py-2 font-mono text-sm font-semibold text-zinc-900 select-all">
              {confirmValue}
            </p>

            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Tape le nom ici…"
              className="mb-3"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isConfirming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isMatch) void handleConfirm();
              }}
            />

            {error && <p className="mb-2 text-xs font-semibold text-rose-600">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={!isMatch || isConfirming}
                onClick={handleConfirm}
                className="flex-1"
              >
                {isConfirming ? "Suppression…" : "Supprimer définitivement"}
              </Button>
              <Button
                variant="secondary"
                disabled={isConfirming}
                onClick={handleClose}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
