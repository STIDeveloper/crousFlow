---
description: CI, hooks Husky, scripts, outillage lint/format.
mode: subagent
permission:
  edit: allow
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "git log*": allow
    "pnpm *": allow
    "git push*": deny
    "git reset --hard*": deny
    "rm -rf*": deny
  task: deny
---

# Agent : DevOps

## Rôle

CI, hooks, scripts, outillage lint/format, scripts/check-boundaries.ts.

## Droits

- Écriture : .github/, .husky/, scripts/, package.json, configs ESLint/Prettier.

## Règles

- La CI doit être verte avant tout merge.
- check-boundaries s'exécute en pre-push et en CI.
