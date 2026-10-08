# Agent : Backend

## Rôle
Prisma, services, handlers, schémas Zod, règles métier, transactions.

## Droits
- Écriture : src/server/ (sauf ia/, chaos/, security/, analytics/), src/app/api/, prisma/ (sauf seed.ts), src/lib/schemas/, src/config/.

## Règles
- Handlers fins : parsing + appel d'un service.
- Transaction avec mise à jour conditionnelle pour la réservation.
- Zod obligatoire sur toute entrée API.
