# Architecture CrousFlow

## Schéma des couches
Le flux de données suit une architecture stricte :
`src/app/` (Pages & Composants) 
  → `src/app/api/` (Handlers HTTP fins, parsing Zod) 
  → `src/server/` (Services métiers, logique, IA) 
  → `prisma/` (Base de données SQLite)

## Arborescence cible
```
crousflow/
├── .opencode/            agents/, rules/, commands/, hooks/, skills/, ownership.json
├── .github/workflows/    ci.yml
├── .husky/               pre-commit, pre-push
├── docs/                 adr/, reviews/, tasks/, PITCH.md, DEMO.md, architecture.md
├── prisma/               schema.prisma, seed.ts, migrations/
├── prisma.config.ts
├── scripts/              check-boundaries.ts, demo-reset.ts
├── src/
│   ├── app/              (routes frontend et api)
│   ├── components/       ui/ et features/
│   ├── config/           rules.ts, env.ts
│   ├── lib/              schemas/, ui/, hooks/
│   └── server/           services métier (reservations, kitchen, ia, etc.)
├── tests/                unitaires, intégration, e2e, chaos, data
└── screenshots/
```

## Pipeline d'orchestration
Le flux de développement est orchestré par l'agent `main` suivant :
1. `architect` → produit les plans et contrats (Zod, erreurs, routes).
2. `backend` / `data` / `ia` → développent en parallèle une fois les contrats mergés.
3. `frontend` → interface branchée sur les contrats.
4. `qa` + `chaos` → tests automatiques et scénarios de robustesse.
5. `ui-reviewer` + `security` → audits et verdicts.
6. `devops` → validation finale CI.
7. `docs` → mise à jour de la présentation.

## Portes de Qualité (Gates)
- **G1** : Plan et périmètre validés.
- **G2** : Contrats publiés (schémas Zod, codes d'erreur, routes).
- **G3** : `pnpm check` vert (lint, typecheck, test, build).
- **G4** : Verdicts UI et Sécurité sans bloqueur.
- **G5** : Démo prête (E2E verts, seed rejouable).
