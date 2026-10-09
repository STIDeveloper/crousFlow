---
description: Porte G5 — recrée une base de démo propre et vérifie les parcours e2e
agent: qa
---

1. Recrée la base de démo : !`pnpm demo 2>&1 | tail -5`
2. Lance les parcours e2e : !`pnpm test:e2e --reporter=line 2>&1 | tail -10`

Conclus par « prêt démo » uniquement si les deux étapes sont vertes.
