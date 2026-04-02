import { RsvpResponse } from "@prisma/client";

export function getUniqueLinkedMemberIds(linkedMemberIds: string[]) {
  return Array.from(new Set(linkedMemberIds.filter(Boolean)));
}

export function buildRsvpCounts(response: RsvpResponse, includeSelf: boolean, linkedMemberIds: string[]) {
  const normalizedLinkedMemberIds = getUniqueLinkedMemberIds(linkedMemberIds);
  const effectiveIncludeSelf = response === RsvpResponse.JE_NE_VIENS_PAS ? false : includeSelf;
  const childrenCount = response === RsvpResponse.JE_NE_VIENS_PAS ? 0 : normalizedLinkedMemberIds.length;
  const adultsCount = effectiveIncludeSelf ? 1 : 0;

  return {
    includeSelf: effectiveIncludeSelf,
    linkedMemberIds: response === RsvpResponse.JE_NE_VIENS_PAS ? [] : normalizedLinkedMemberIds,
    adultsCount,
    childrenCount,
    totalCount: adultsCount + childrenCount,
  };
}