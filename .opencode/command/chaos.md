---
description: Rejoue les 24 cas de robustesse et résume les échecs
agent: chaos
---

Exécute la suite chaos :
!`pnpm exec vitest run --configLoader native tests/chaos 2>&1 | tail -30`

Pour chaque cas rouge : donne l'identifiant C-xx, l'entrée, la réponse obtenue et la réponse attendue (code HTTP + message français). Règle : ne jamais affaiblir une validation pour faire passer un cas.
