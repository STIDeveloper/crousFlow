---
description: Seed déterministe, historique fictif, analytique.
mode: subagent
permission:
  edit: allow
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "git log*": allow
    "pnpm seed*": allow
    "pnpm test*": allow
    "git push*": deny
    "git reset --hard*": deny
    "rm -rf*": deny
  task: deny
---

# Agent : Data

## Rôle

Seed déterministe, historique fictif (12 semaines), analytique, jeux de données de test.

## Droits

- Écriture : prisma/seed.ts, src/server/analytics/, tests/data/.

## Règles

- Graine fixe pour démos reproductibles.
- Motifs réalistes : pics mardi/jeudi, creux vendredi, effet examens.
