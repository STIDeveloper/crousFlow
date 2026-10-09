---
description: Porte G3 — lint, types, tests, build et frontières des agents
agent: devops
---

Lance `pnpm check` puis `pnpm check-boundaries`.

Résultat actuel :
!`pnpm check 2>&1 | tail -40`

Si une étape est rouge : identifie l'agent propriétaire du fichier fautif (voir `.opencode/ownership.json`), rédige une fiche `docs/tasks/` pour lui et ne corrige pas toi-même hors de ton périmètre.
