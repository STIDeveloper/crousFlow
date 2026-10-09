# Architecture CrousFlow

## Schéma des couches
Le flux de données suit une architecture stricte :
`src/app/` (Pages & Composants) 
  -> `src/app/api/` (Handlers HTTP fins, parsing Zod) 
  -> `src/server/` (Services métiers, logique, IA) 
  -> `prisma/` (Base de données SQLite)

## Les 12 Agents (Harness)
1. `main` : Orchestrateur central.
2. `architect` : Décisions d'architecture, conception des contrats.
3. `data` : Modélisation et accès base de données.
4. `backend` : Logique métier (réservations, tickets).
5. `ia` : Couche de prévision et analyse avec Gemini.
6. `frontend` : Composants UI, pages, intégration.
7. `ui-reviewer` : Audit du respect strict de DESIGN.md et de l'accessibilité.
8. `security` : Audit de la robustesse, rate limits, anti-IDOR.
9. `qa` : Tests Playwright, couverture Vitest.
10. `chaos` : Scénarios d'anomalies (C-01 à C-24).
11. `devops` : Intégration continue, lint, build.
12. `docs` : Documentation, Pitch, Démo.

## Portes de Qualité (Gates)
- **G1** : Plan et périmètre validés.
- **G2** : Contrats publiés (schémas Zod, codes d'erreur, routes).
- **G3** : `pnpm check` vert (lint, typecheck, test, build).
- **G4** : Verdicts UI et Sécurité sans bloqueur.
- **G5** : Démo prête (E2E verts, seed rejouable).

## Routes API Finales
- `POST /api/auth/demo`
- `GET /api/health`
- `POST /api/reservations`
- `DELETE /api/reservations/[id]`
- `GET /api/me/reservations`
- `POST /api/tickets/validate`
- `GET /api/slots`
- `GET /api/menu`
- `GET /api/kitchen/forecast`
- `GET /api/kitchen/batches`
- `PATCH /api/kitchen/batches`
- `GET /api/admin/stats`
- `GET /api/admin/export`
- `POST /api/admin/chaos/run`
