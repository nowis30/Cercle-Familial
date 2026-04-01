import { PersonProfile } from "@prisma/client";

// TODO V2: ajouter contraintes avancees (rotation annuelle, exclusions dynamiques, conjoints, beaux-freres/belles-soeurs).
export function buildGiftAssignmentsForParentsAndChildren(profiles: Array<PersonProfile & { userId: string }>) {
  const parentToChildren = new Map<string, string[]>();

  for (const profile of profiles) {
    if (!profile.responsibleParentId) continue;
    const current = parentToChildren.get(profile.responsibleParentId) ?? [];
    current.push(profile.userId);
    parentToChildren.set(profile.responsibleParentId, current);
  }

  const assignments: Array<{ giverUserId: string; receiverUserId: string }> = [];
  for (const [parentUserId, childrenUserIds] of parentToChildren) {
    if (childrenUserIds.length === 0) continue;
    assignments.push({ giverUserId: parentUserId, receiverUserId: childrenUserIds[0] });
  }

  return assignments;
}
