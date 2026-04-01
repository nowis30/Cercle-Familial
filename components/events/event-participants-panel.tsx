"use client";

import { RsvpResponse } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createManagedFamilyMemberAction, respondRsvpAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FamilyMemberOption = {
  id: string;
  label: string;
  relationLabel?: string | null;
};

type ParticipantGroup = {
  responderName: string;
  response: RsvpResponse;
  includeSelf: boolean;
  linkedMembers: Array<{ id: string; label: string }>;
};

export function EventParticipantsPanel({
  eventId,
  myInitial,
  familyMembers,
  groups,
}: {
  eventId: string;
  myInitial?: {
    response: RsvpResponse;
    includeSelf: boolean;
    linkedMemberIds: string[];
    note?: string;
  };
  familyMembers: FamilyMemberOption[];
  groups: ParticipantGroup[];
}) {
  const router = useRouter();
  const [response, setResponse] = useState<RsvpResponse>(myInitial?.response ?? RsvpResponse.JE_VIENS);
  const [includeSelf, setIncludeSelf] = useState<boolean>(myInitial?.includeSelf ?? true);
  const [linkedMemberIds, setLinkedMemberIds] = useState<string[]>(myInitial?.linkedMemberIds ?? []);
  const [note, setNote] = useState(myInitial?.note ?? "");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRelation, setNewRelation] = useState("");

  const isComingLike = response === RsvpResponse.JE_VIENS || response === RsvpResponse.PEUT_ETRE;

  const confirmedGroups = useMemo(
    () => groups.filter((group) => group.response === RsvpResponse.JE_VIENS && (group.includeSelf || group.linkedMembers.length > 0)),
    [groups],
  );

  const totalConfirmed = useMemo(
    () =>
      confirmedGroups.reduce((sum, group) => {
        const selfCount = group.includeSelf ? 1 : 0;
        return sum + selfCount + group.linkedMembers.length;
      }, 0),
    [confirmedGroups],
  );

  return (
    <Card className="space-y-4" id="participants">
      <div className="flex items-center justify-between gap-2">
        <p className="font-serif text-lg font-bold text-zinc-900">Participants</p>
        <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">Confirmes: {totalConfirmed}</span>
      </div>

      <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
        <p className="text-sm font-semibold text-zinc-900">Ma reponse</p>
        <select
          className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          value={response}
          onChange={(event) => setResponse(event.target.value as RsvpResponse)}
        >
          <option value={RsvpResponse.JE_VIENS}>Je viens</option>
          <option value={RsvpResponse.JE_NE_VIENS_PAS}>Je ne viens pas</option>
          <option value={RsvpResponse.PEUT_ETRE}>Peut-etre</option>
        </select>

        {isComingLike ? (
          <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={includeSelf}
              onChange={(event) => setIncludeSelf(event.target.checked)}
              className="h-4 w-4"
            />
            Je viens moi-meme
          </label>
        ) : null}

        {isComingLike ? (
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Membres de ma famille</p>
            {familyMembers.length === 0 ? <p className="text-xs text-zinc-600">Aucun membre rattache pour le moment.</p> : null}
            {familyMembers.map((member) => {
              const checked = linkedMemberIds.includes(member.id);
              return (
                <label key={member.id} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setLinkedMemberIds((prev) => [...prev, member.id]);
                        return;
                      }
                      setLinkedMemberIds((prev) => prev.filter((id) => id !== member.id));
                    }}
                    className="h-4 w-4"
                  />
                  <span>{member.label}</span>
                  {member.relationLabel ? <span className="text-xs text-zinc-500">({member.relationLabel})</span> : null}
                </label>
              );
            })}
          </div>
        ) : null}

        <Input placeholder="Note (optionnel)" value={note} onChange={(event) => setNote(event.target.value)} />

        <Button
          disabled={isSaving}
          onClick={async () => {
            setIsSaving(true);
            setFeedback("");
            const result = await respondRsvpAction({
              eventId,
              response,
              includeSelf,
              linkedMemberIds: isComingLike ? linkedMemberIds : [],
              note,
            });
            setIsSaving(false);

            if (!result.success) {
              setFeedback(result.message ?? "Impossible d'enregistrer la reponse.");
              return;
            }

            setFeedback("Participation enregistree.");
            router.refresh();
          }}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer ma participation"}
        </Button>

        {feedback ? <p className="text-xs font-semibold text-indigo-700">{feedback}</p> : null}
      </div>

      <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3">
        <p className="text-sm font-semibold text-zinc-900">Ajouter un membre de famille (sans compte)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input placeholder="Prenom" value={newFirstName} onChange={(event) => setNewFirstName(event.target.value)} />
          <Input placeholder="Nom (optionnel)" value={newLastName} onChange={(event) => setNewLastName(event.target.value)} />
          <Input placeholder="Lien (enfant, conjoint...)" value={newRelation} onChange={(event) => setNewRelation(event.target.value)} />
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            const result = await createManagedFamilyMemberAction({
              firstName: newFirstName,
              lastName: newLastName,
              relationLabel: newRelation,
            });
            if (!result.success) {
              setFeedback(result.message ?? "Impossible d'ajouter ce membre.");
              return;
            }

            setNewFirstName("");
            setNewLastName("");
            setNewRelation("");
            setFeedback("Membre ajoute. Tu peux maintenant le cocher dans la reponse.");
            router.refresh();
          }}
        >
          Ajouter ce membre
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-900">Liste des participants confirmes</p>
        {confirmedGroups.length === 0 ? <p className="text-sm text-zinc-600">Aucun participant confirme pour le moment.</p> : null}
        {confirmedGroups.map((group) => (
          <div key={`${group.responderName}-${group.linkedMembers.map((member) => member.id).join("-")}`} className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-3">
            {group.includeSelf ? <p className="text-sm font-semibold text-zinc-900">{group.responderName}</p> : <p className="text-sm font-semibold text-zinc-900">(Sans parent present)</p>}
            {group.linkedMembers.map((member) => (
              <p key={member.id} className="pl-3 text-xs text-zinc-700">- {member.label}</p>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
