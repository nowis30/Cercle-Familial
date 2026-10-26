# Suivi des dépendances

Next.js est mis à jour vers 16.4.3, Zod vers une version corrigée >= 4.6.7 et les
correctifs compatibles du verrou npm sont appliqués, y compris NextAuth.
`npm audit` conserve 4 alertes : 0 critique, 3 élevées dans la chaîne Prisma 6 /
@prisma/config / deepmerge-ts et 1 faible dans esbuild. Le correctif Prisma proposé
nécessite une migration majeure vers Prisma 7, qui doit être préparée et testée
séparément. Aucun `audit fix --force` ni changement de schéma distant n'a été exécuté.

Les tests, les types, le lint et le build passent localement. Le risque de dépendance
est conditionnel ; aucune exploitation en production n'a été constatée. Le suivi
prioritaire des anciens fichiers publics est détaillé dans `photos-privees.md`.
