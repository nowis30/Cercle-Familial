# Checklist fonctionnelle V1 - Cercle Familial

## Cas normaux

- [ ] Inscription valide: creation compte + redirection connexion.
- [ ] Creation cercle: le createur devient ADMIN automatiquement.
- [ ] Invitation valide: rejoindre le cercle via /invitation/[token].
- [ ] Creation evenement (adulte/admin): evenement visible dans le cercle et calendrier.
- [ ] RSVP: enregistrer puis modifier une reponse.
- [ ] Contribution: ajouter, reserver, modifier statut.
- [ ] Commentaire evenement: ajout et affichage immediat.
- [ ] Discussion cercle: message ajoute et visible.
- [ ] Upload photo valide (jpg/png/webp/gif): image visible dans la galerie.
- [ ] Profil: mise a jour prenom/nom/telephone/adresse/allergies/preferences/idees cadeaux.
- [ ] Parametres: sauvegarde des preferences notifications.
- [ ] Messagerie privee: creer/ouvrir conversation et envoyer un message.

## Cas limites

- [ ] Inscription invalide (courriel ou mot de passe invalide): erreur lisible.
- [ ] Invitation expiree: refus clair.
- [ ] Invitation invalide: refus clair.
- [ ] Invitation deja consommee: pas de doublon membership.
- [ ] Creation evenement par ENFANT: refusee.
- [ ] Acces URL cercle hors membership: redirection/refus.
- [ ] Acces URL evenement hors membership: redirection/refus.
- [ ] Suppression commentaire par non-admin: refusee.
- [ ] Suppression message cercle par non-admin: refusee.
- [ ] Upload photo invalide (type non image): refuse.
- [ ] Upload photo trop volumineuse (>8MB): refuse.

## Verification technique

- [ ] npm run lint
- [ ] npm run build
- [ ] Verification manuelle mobile (pages principales)
