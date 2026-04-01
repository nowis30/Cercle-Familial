import { CircleRole, InvitePermission } from "@prisma/client";

export function canManageCircle(role: CircleRole) {
  return role === CircleRole.ADMIN;
}

export function canCreateEvent(role: CircleRole) {
  return role === CircleRole.ADMIN || role === CircleRole.ADULTE;
}

export function canAccessSensitiveSettings(role: CircleRole) {
  return role !== CircleRole.ENFANT;
}

export function canModerate(role: CircleRole) {
  return role === CircleRole.ADMIN;
}

export function canInviteMembers(role: CircleRole, invitePermission: InvitePermission) {
  return role === CircleRole.ADMIN || (invitePermission === InvitePermission.ADMINS_AND_ADULTS && role === CircleRole.ADULTE);
}
