# Confidentialité des photos d'événements

Les nouveaux fichiers passent par `/api/upload` avec `eventId`, `file` et une
légende facultative. Le serveur vérifie la session, l'origine, l'appartenance au
cercle, la taille réelle du formulaire et la signature du fichier. Il choisit le
nom et enregistre lui-même la photo ; une URL arbitraire ne peut plus être
associée à l'événement.

En production, connecter un **store Vercel Blob privé** et renseigner son
`BLOB_READ_WRITE_TOKEN` (requis par la version du SDK utilisée ici). Un store public existant ne doit
pas être utilisé pour les nouveaux envois : aucun repli vers un fichier public
n'est autorisé. Aucun store n'est créé et aucune variable distante n'est modifiée
par ce changement. En développement, les fichiers restent dans `.data/event-photos`,
hors de `public/` et ignorés par Git.

Chaque lecture de `/api/photos/[photoId]` revérifie la session et le cercle. Les
réponses sont `private, no-store`. La galerie désactive l'optimiseur d'images pour
que le navigateur transmette directement sa session à cette route.

## Fichiers historiques à migrer avant de déclarer l'album privé

Les anciennes URL publiques restent publiques tant que leurs fichiers existent.
Cette PR ne révoque pas ces URL et ne déplace aucun fichier distant. Les anciennes
photos locales et Blob dont le nom respecte le format généré restent lisibles
par la nouvelle route ; les chemins suspects et les URL externes sont refusés.

La migration doit être planifiée séparément : sauvegarder et inventorier les
références, copier les fichiers dans un store privé, vérifier leur intégrité,
remplacer les références en base, puis supprimer les anciens objets publics et
vérifier que leurs URL ne répondent plus. Sur un hébergement local, déplacer
également les anciens fichiers hors de `public/uploads/events`.

Une suppression normale efface le fichier avant la ligne en base. Si le stockage
échoue, la ligne reste présente pour permettre une nouvelle tentative. Les
références historiques dangereuses ne déclenchent aucune opération de fichier.

Validation locale : `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
Les tests couvrent les chemins de traversée, les URL étrangères, la signature MIME
et la taille réelle des requêtes. Le store privé réel et une session de famille
doivent être vérifiés dans un environnement de préproduction avant fusion.
