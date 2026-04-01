import { CircleRole, ContributionStatus, EventType, InvitePermission, NotificationChannel, RsvpResponse } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";

async function main() {
  await prisma.giftExchangeAssignment.deleteMany();
  await prisma.giftExchangeParticipant.deleteMany();
  await prisma.giftExchange.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.directConversationParticipant.deleteMany();
  await prisma.directConversation.deleteMany();
  await prisma.circleMessage.deleteMany();
  await prisma.eventComment.deleteMany();
  await prisma.eventContributionItem.deleteMany();
  await prisma.eventAttendance.deleteMany();
  await prisma.eventInvite.deleteMany();
  await prisma.eventPhoto.deleteMany();
  await prisma.event.deleteMany();
  await prisma.familyRelation.deleteMany();
  await prisma.personProfile.deleteMany();
  await prisma.circleInvite.deleteMany();
  await prisma.circleMembership.deleteMany();
  await prisma.userNotificationPreference.deleteMany();
  await prisma.circle.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Famille123!", 10);

  const users = await Promise.all([
    prisma.user.create({ data: { email: "admin@cerclefamilial.local", name: "Marie Tremblay", passwordHash, isAdult: true } }),
    prisma.user.create({ data: { email: "luc@cerclefamilial.local", name: "Luc Gagnon", passwordHash, isAdult: true } }),
    prisma.user.create({ data: { email: "julia@cerclefamilial.local", name: "Julia Roy", passwordHash, isAdult: true } }),
    prisma.user.create({ data: { email: "leo@cerclefamilial.local", name: "Leo Gagnon", passwordHash, isAdult: false } }),
    prisma.user.create({ data: { email: "emma@cerclefamilial.local", name: "Emma Roy", passwordHash, isAdult: false } }),
  ]);

  const [admin, luc, julia, leo, emma] = users;

  const grandCercle = await prisma.circle.create({
    data: {
      name: "Grand Cercle Familial",
      slug: "grand-cercle-familial",
      description: "Cercle principal de la grande famille",
      rules: "Respect, entraide et ponctualite.",
      invitePermission: InvitePermission.ADMINS_AND_ADULTS,
      defaultInviteRole: CircleRole.ADULTE,
    },
  });

  const sousCercle = await prisma.circle.create({
    data: {
      name: "Cousins du dimanche",
      slug: "cousins-dimanche",
      description: "Sous-cercle pour les activites du dimanche",
      rules: "On confirme sa presence 48h avant.",
      invitePermission: InvitePermission.ADMINS_ONLY,
      defaultInviteRole: CircleRole.ENFANT,
    },
  });

  await prisma.circleMembership.createMany({
    data: [
      { circleId: grandCercle.id, userId: admin.id, role: CircleRole.ADMIN },
      { circleId: grandCercle.id, userId: luc.id, role: CircleRole.ADULTE },
      { circleId: grandCercle.id, userId: julia.id, role: CircleRole.ADULTE },
      { circleId: grandCercle.id, userId: leo.id, role: CircleRole.ENFANT },
      { circleId: grandCercle.id, userId: emma.id, role: CircleRole.ENFANT },
      { circleId: sousCercle.id, userId: admin.id, role: CircleRole.ADMIN },
      { circleId: sousCercle.id, userId: luc.id, role: CircleRole.ADULTE },
      { circleId: sousCercle.id, userId: leo.id, role: CircleRole.ENFANT },
    ],
  });

  await prisma.circleInvite.create({
    data: {
      circleId: grandCercle.id,
      token: "invite-grand-cercle-2026",
      createdById: admin.id,
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
      maxUses: 50,
      defaultRole: CircleRole.ADULTE,
    },
  });

  const profiles = await Promise.all([
    prisma.personProfile.create({
      data: { userId: admin.id, firstName: "Marie", lastName: "Tremblay", birthDate: new Date("1984-05-15"), familyRoleLabel: "Maman" },
    }),
    prisma.personProfile.create({
      data: { userId: luc.id, firstName: "Luc", lastName: "Gagnon", birthDate: new Date("1982-09-21"), familyRoleLabel: "Papa" },
    }),
    prisma.personProfile.create({
      data: { userId: julia.id, firstName: "Julia", lastName: "Roy", birthDate: new Date("1989-11-02"), familyRoleLabel: "Tante" },
    }),
    prisma.personProfile.create({
      data: {
        userId: leo.id,
        firstName: "Leo",
        lastName: "Gagnon",
        birthDate: new Date("2014-04-03"),
        familyRoleLabel: "Enfant",
        responsibleParentId: luc.id,
        allergies: "Arachides",
      },
    }),
    prisma.personProfile.create({
      data: {
        userId: emma.id,
        firstName: "Emma",
        lastName: "Roy",
        birthDate: new Date("2016-07-19"),
        familyRoleLabel: "Enfant",
        responsibleParentId: julia.id,
        foodPreferences: "Vegetarien",
      },
    }),
  ]);

  await prisma.familyRelation.createMany({
    data: [
      { fromProfileId: profiles[1].id, toProfileId: profiles[3].id, type: "PARENT_DE" },
      { fromProfileId: profiles[3].id, toProfileId: profiles[1].id, type: "ENFANT_DE" },
      { fromProfileId: profiles[2].id, toProfileId: profiles[4].id, type: "PARENT_DE" },
      { fromProfileId: profiles[4].id, toProfileId: profiles[2].id, type: "ENFANT_DE" },
    ],
  });

  const eventNoel = await prisma.event.create({
    data: {
      circleId: grandCercle.id,
      hostId: admin.id,
      title: "Souper de Noel",
      type: EventType.NOEL,
      description: "Souper traditionnel de la famille",
      startsAt: new Date("2026-12-24T18:00:00.000Z"),
      endsAt: new Date("2026-12-24T23:00:00.000Z"),
      locationName: "Maison de Marie",
      address: "123 rue des Erables, Quebec",
    },
  });

  const eventAnniv = await prisma.event.create({
    data: {
      circleId: grandCercle.id,
      hostId: luc.id,
      title: "Anniversaire de Leo",
      type: EventType.ANNIVERSAIRE,
      description: "Fete d'enfant avec gateau et jeux",
      startsAt: new Date("2026-04-03T13:00:00.000Z"),
      endsAt: new Date("2026-04-03T17:00:00.000Z"),
      locationName: "Parc municipal",
    },
  });

  await prisma.eventInvite.createMany({
    data: [
      { eventId: eventNoel.id, userId: admin.id },
      { eventId: eventNoel.id, userId: luc.id },
      { eventId: eventNoel.id, userId: julia.id },
      { eventId: eventNoel.id, userId: leo.id },
      { eventId: eventNoel.id, userId: emma.id },
      { eventId: eventAnniv.id, userId: luc.id },
      { eventId: eventAnniv.id, userId: leo.id },
      { eventId: eventAnniv.id, userId: admin.id },
    ],
  });

  await prisma.eventAttendance.createMany({
    data: [
      {
        eventId: eventNoel.id,
        userId: admin.id,
        response: RsvpResponse.JE_VIENS,
        adultsCount: 1,
        childrenCount: 0,
        totalCount: 1,
      },
      {
        eventId: eventNoel.id,
        userId: luc.id,
        response: RsvpResponse.JE_VIENS,
        adultsCount: 1,
        childrenCount: 1,
        totalCount: 2,
        guestsDisplayName: "Luc + Leo",
      },
      {
        eventId: eventNoel.id,
        userId: julia.id,
        response: RsvpResponse.PEUT_ETRE,
        adultsCount: 1,
        childrenCount: 1,
        totalCount: 2,
        guestsDisplayName: "Julia + Emma",
        note: "Confirme vendredi",
      },
    ],
  });

  await prisma.eventContributionItem.createMany({
    data: [
      { eventId: eventNoel.id, name: "Tourtiere", quantity: 2, status: ContributionStatus.CONFIRME, reservedById: admin.id },
      { eventId: eventNoel.id, name: "Salade", quantity: 2, status: ContributionStatus.URGENT },
      {
        eventId: eventNoel.id,
        name: "Jus pour enfants",
        quantity: 4,
        status: ContributionStatus.APPORTE,
        reservedById: luc.id,
        reservedNote: "Je prends ca au Costco",
      },
      { eventId: eventAnniv.id, name: "Assiettes jetables", quantity: 20, status: ContributionStatus.MANQUANT },
    ],
  });

  await prisma.eventComment.createMany({
    data: [
      { eventId: eventNoel.id, authorId: admin.id, content: "On se stationne dans la rue voisine." },
      { eventId: eventNoel.id, authorId: luc.id, content: "J'apporte aussi des desserts." },
    ],
  });

  await prisma.circleMessage.createMany({
    data: [
      { circleId: grandCercle.id, authorId: admin.id, content: "Bienvenue dans le Cercle Familial." },
      { circleId: grandCercle.id, authorId: julia.id, content: "Qui est dispo pour un souper dimanche?" },
    ],
  });

  const convo = await prisma.directConversation.create({ data: {} });
  await prisma.directConversationParticipant.createMany({
    data: [
      { conversationId: convo.id, userId: admin.id },
      { conversationId: convo.id, userId: luc.id },
    ],
  });

  await prisma.directMessage.createMany({
    data: [
      { conversationId: convo.id, senderId: admin.id, content: "Peux-tu arriver 30 min plus tot?" },
      { conversationId: convo.id, senderId: luc.id, content: "Oui, parfait pour moi." },
    ],
  });

  const gift = await prisma.giftExchange.create({
    data: {
      circleId: grandCercle.id,
      title: "Pige de Noel 2026",
      description: "Parents pigent uniquement leurs enfants.",
      drawDate: new Date("2026-11-20T20:00:00.000Z"),
      isDrawn: true,
    },
  });

  await prisma.giftExchangeParticipant.createMany({
    data: [
      { giftExchangeId: gift.id, userId: luc.id },
      { giftExchangeId: gift.id, userId: julia.id },
      { giftExchangeId: gift.id, userId: leo.id },
      { giftExchangeId: gift.id, userId: emma.id },
    ],
  });

  await prisma.giftExchangeAssignment.createMany({
    data: [
      { giftExchangeId: gift.id, giverUserId: luc.id, receiverUserId: leo.id },
      { giftExchangeId: gift.id, giverUserId: julia.id, receiverUserId: emma.id },
      { giftExchangeId: gift.id, giverUserId: leo.id, receiverUserId: leo.id },
      { giftExchangeId: gift.id, giverUserId: emma.id, receiverUserId: emma.id },
    ],
  });

  await prisma.userNotificationPreference.createMany({
    data: [
      {
        userId: admin.id,
        birthdaysChannel: NotificationChannel.APP,
        upcomingEventsChannel: NotificationChannel.EMAIL,
      },
      {
        userId: luc.id,
        birthdaysChannel: NotificationChannel.EMAIL,
        upcomingEventsChannel: NotificationChannel.APP,
      },
    ],
  });

  await prisma.eventPhoto.createMany({
    data: [
      { eventId: eventNoel.id, uploadedBy: admin.id, url: "/uploads/noel-1.jpg", caption: "Decoration de table" },
      { eventId: eventAnniv.id, uploadedBy: luc.id, url: "/uploads/anniv-leo-1.jpg", caption: "Gateau d'anniversaire" },
    ],
  });

  console.log("Seed terminee avec succes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
