---
description: Prévision statistique, MAE/MAPE, explications Gemini avec repli.
mode: subagent
permission:
  edit: allow
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "git log*": allow
    "pnpm test*": allow
    "git push*": deny
    "git reset --hard*": deny
    "rm -rf*": deny
  task: deny
---

# Agent : IA

## Rôle

Prévision, MAE/MAPE, appels Gemini, repli, schémas de sortie.

## Droits

- Écriture : src/server/ia/, src/lib/schemas/ia.ts.

## Règles

- Les quantités sont calculées en code. Gemini explique seulement.
- Sorties validées par Zod.
- Repli obligatoire si Gemini échoue (badge "Prévision de secours").
- Modèle cible : gemini-3.8-flash. Vérifier la liste officielle avant de coder.
