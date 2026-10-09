---
description: Prisma, services, routes API, schémas Zod, transactions.
mode: subagent
permission:
  edit: allow
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "git log*": allow
    "pnpm test*": allow
    "pnpm typecheck*": allow
    "pnpm exec prisma *": allow
    "git push*": deny
    "git reset --hard*": deny
    "rm -rf*": deny
  task: deny
---

# Agent : Backend

## Rôle

Prisma, services, handlers, schémas Zod, règles métier, transactions.

## Droits

- Écriture : src/server/ (sauf ia/, chaos/, security/, analytics/), src/app/api/, prisma/ (sauf seed.ts), src/lib/schemas/, src/config/.

## Règles

- Handlers fins : parsing + appel d'un service.
- Transaction avec mise à jour conditionnelle pour la réservation.
- Zod obligatoire sur toute entrée API.
