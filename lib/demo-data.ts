import { CircleRole } from "@prisma/client";

export const demoUser = {
  id: "u-admin",
  name: "Marie Tremblay",
  email: "admin@cerclefamilial.local",
};

export const demoCircles = [
  { id: "c-grand", name: "Grand Cercle Familial" },
  { id: "c-cousins", name: "Cousins du dimanche" },
];

export const demoEvents = [
  {
    id: "e-1",
    circleId: "c-grand",
    title: "Souper de Noel",
    type: "NOEL",
    startsAt: "2026-12-24 18:00",
    locationName: "Maison de Marie",
    missingResponses: 2,
  },
  {
    id: "e-2",
    circleId: "c-grand",
    title: "Anniversaire de Leo",
    type: "ANNIVERSAIRE",
    startsAt: "2026-04-03 13:00",
    locationName: "Parc municipal",
    missingResponses: 1,
  },
];

export const demoBirthdays = [
  { id: "b-1", name: "Leo Gagnon", date: "03 avril" },
  { id: "b-2", name: "Emma Roy", date: "19 juillet" },
];

export const demoMembers: Array<{ id: string; name: string; role: CircleRole; note?: string }> = [
  { id: "m-1", name: "Marie Tremblay", role: CircleRole.ADMIN, note: "Organisatrice principale" },
  { id: "m-2", name: "Luc Gagnon", role: CircleRole.ADULTE },
  { id: "m-3", name: "Julia Roy", role: CircleRole.ADULTE },
  { id: "m-4", name: "Leo Gagnon", role: CircleRole.ENFANT },
  { id: "m-5", name: "Emma Roy", role: CircleRole.ENFANT },
];

export const demoContributions = [
  { id: "i-1", name: "Tourtiere", quantity: 2, status: "CONFIRME", note: "Marie apporte" },
  { id: "i-2", name: "Salade", quantity: 2, status: "URGENT", note: "Encore manquant" },
  { id: "i-3", name: "Jus pour enfants", quantity: 4, status: "APPORTE", note: "Luc, Costco" },
];

export const demoMessages = [
  { id: "msg-1", author: "Marie", content: "Bienvenue dans le cercle!", at: "08:30" },
  { id: "msg-2", author: "Julia", content: "Qui peut venir dimanche?", at: "10:10" },
];

export const demoPhotos = [
  { id: "p-1", url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600", caption: "Table de Noel" },
  { id: "p-2", url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600", caption: "Gateau anniversaire" },
];
