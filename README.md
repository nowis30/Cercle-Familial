# Cercle Familial (V1)

Application web mobile-first privee pour grande famille quebecoise, en francais.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth (courriel/mot de passe + Google si configure)
- Zod + React Hook Form
- Lucide React

## Objectif V1

- Gestion de cercles (multi-cercles)
- Evenements familiaux (dont anniversaires)
- RSVP detaille
- Contributions "qui apporte quoi"
- Discussion de cercle + commentaires d'evenement + messages prives simples
- Pige de cadeaux V1
- Photos souvenirs d'evenement (upload local simple)
- Preferences de notifications

## Architecture

- app: routes publiques, privees, API
- components: UI reusable + composants metier
- actions: server actions (inscription, invitations, evenements, RSVP)
- features: logique metier isolable (ex: pige)
- lib: auth, Prisma, permissions, constantes, utilitaires
- prisma: schema + seed
- types: extensions de types globaux

## Routes principales

### Public

- /
- /connexion
- /inscription

### Prive

- /tableau-de-bord
- /cercles
- /cercles/[circleId]
- /cercles/[circleId]/calendrier
- /cercles/[circleId]/membres
- /cercles/[circleId]/discussion
- /cercles/[circleId]/evenements/nouveau
- /cercles/[circleId]/evenements/[eventId]
- /messages
- /messages/[conversationId]
- /profil
- /parametres
- /cercles/[circleId]/cadeaux
- /cercles/[circleId]/cadeaux/[drawId]

## Prisma

Le schema contient les entites suivantes:

- User, Account, Session, VerificationToken
- Circle, CircleMembership, CircleInvite
- PersonProfile, FamilyRelation
- Event, EventInvite, EventAttendance
- EventContributionItem, EventComment, EventPhoto
- CircleMessage
- DirectConversation, DirectConversationParticipant, DirectMessage
- GiftExchange, GiftExchangeParticipant, GiftExchangeAssignment
- UserNotificationPreference

## Seed

Le seed installe:

- 1 admin principal
- adultes + enfants
- 1 grand cercle + 1 sous-cercle
- evenements, RSVP, contributions, messages
- pige exemple

Compte demo credentials:

- courriel: admin@cerclefamilial.local
- mot de passe: Famille123!

## Commandes utiles

- npm run dev
- npm run lint
- npm run prisma:generate
- npm run prisma:migrate:dev
- npm run prisma:migrate:deploy
- npm run prisma:migrate:status
- npm run prisma:migrate:reset
- npm run prisma:push (exception locale uniquement, avec garde-fou)
- npm run db:seed
- npm run build

## Workflow Prisma versionne

Regle principale:

- Utiliser des migrations versionnees (`prisma migrate`) pour toute evolution de schema.
- Eviter `prisma db push` sauf cas exceptionnel local.

Workflow dev (schema change):

1. Modifier `prisma/schema.prisma`.
2. Lancer `npm run prisma:migrate:dev -- --name <nom_migration>`.
3. Verifier `npm run prisma:migrate:status`.
4. Committer `prisma/schema.prisma` + `prisma/migrations/**`.

Workflow production:

1. Deployer le code (avec les migrations versionnees committees).
2. Executer `npm run prisma:migrate:deploy`.
3. Verifier l'etat avec `npm run prisma:migrate:status`.

Garde-fous integres:

- `npm run prisma:migrate:dev` bloque en CI/prod.
- `npm run prisma:migrate:reset` bloque par defaut (autoriser seulement localement via `ALLOW_PRISMA_RESET=1`).
- `npm run prisma:push` bloque par defaut (autoriser seulement localement via `ALLOW_PRISMA_DB_PUSH=1`).
- En production, ne pas utiliser `prisma migrate reset` ni `prisma db push`.

## Securite V1

- Middleware de protection des routes privees
- Validation Zod cote serveur et client
- Role helpers (ADMIN, ADULTE, ENFANT)
- Liens d'invitation de cercle avec expiration et max usages

## Variables d'environnement auth

Variables minimales recommandees:

- `DATABASE_URL`
- `NEXTAUTH_SECRET` (ou `AUTH_SECRET`)
- `NEXTAUTH_URL` (ou `AUTH_URL`) en production

Google OAuth:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Regles appliquees par le code:

- En production, l'application echoue au demarrage si `NEXTAUTH_SECRET`/`AUTH_SECRET` manque.
- En production, l'application echoue au demarrage si `NEXTAUTH_URL`/`AUTH_URL` manque.
- `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` doivent etre definis ensemble.
- Hors production, un fallback de secret reste autorise uniquement pour le developpement local.

## TODO V2

- Geolocalisation en direct
- Videos souvenirs
- Notifications enrichies en file d'attente
- Login Facebook
- Regles de pige avancees (exclusions dynamiques, rotation)
- Calendrier avance (recurrence, drag-drop, fuseaux)

## Notes implementation

- Les pages critiques V1 sont branchees sur Prisma et server actions.
- Le schema Prisma et les actions sont valides pour une evolution V2 sans refonte.
- L'upload photo actuel est local (public/uploads/events) et pret a etre remplace par stockage externe.

## Etat reel V1 (stabilisation)

Fonctionnel et persistant:

- Inscription + profil minimal auto
- Creation de cercle + adhesion auto ADMIN
- Invitation par lien (token, expiration, max usages)
- Creation evenement (permissions adultes/admin)
- RSVP persistant modifiable
- Contributions (ajout, reservation, statut)
- Discussion cercle + commentaires evenement
- Upload photo evenement + suppression selon role
- Tableau de bord alimente par Prisma
- Profil et preferences notifications persistes
- Calendrier mensuel simple exploitable
- Messagerie privee minimale (liste, ouverture, envoi)

Reste simplifie:

- Calendrier sans recurrence avancee ni drag-drop
- Messagerie sans temps reel
- Moderation UI volontairement sobre

Limites connues V1:

- Jours feries/fetes partiellement integres via logique simple locale
- Upload media limite aux images (8MB max)
- Pas de geolocalisation ni video

## Comment tester rapidement

1. Configurer `.env` depuis `.env.example`.
2. Lancer `npm run prisma:generate` puis `npm run prisma:migrate:dev -- --name init_local` (premier setup local).
3. Charger les donnees de test: `npm run db:seed`.
4. Demarrer l'app: `npm run dev`.
5. Suivre la checklist: `docs/checklist-fonctionnelle-v1.md`.

## Checklist fonctionnelle manuelle V1

- Inscription: creer un compte via /inscription puis se connecter via /connexion.
- Creation cercle: depuis /cercles, creer un cercle et verifier l'ajout auto du createur en ADMIN.
- Invitation: depuis le detail cercle, generer un lien puis ouvrir /invitation/[token] avec un autre compte.
- Creation evenement: ouvrir /cercles/[circleId]/evenements/nouveau, creer un evenement et verifier l'apparition dans le cercle.
- RSVP: sur /cercles/[circleId]/evenements/[eventId], envoyer un RSVP puis modifier la reponse et verifier les totaux.
- Contribution: ajouter un item, reserver un item, changer son statut (MANQUANT/URGENT/CONFIRME/APPORTE).
- Commentaire: ajouter un commentaire evenement et verifier la suppression admin.
- Discussion cercle: envoyer un message dans /cercles/[circleId]/discussion puis tester la suppression admin.
- Upload photo: sur la fiche evenement, televerser une image puis verifier l'affichage galerie et suppression autorisee.
