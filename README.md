# CrousFlow

Plateforme moderne de réservation de repas pour les CROUS.

## Le Problème
Chaque midi, les files d'attente s'allongent, du gaspillage alimentaire est généré par un manque de prévisibilité, et la précarité étudiante limite l'accès aux repas.

## La Solution
CrousFlow permet la réservation à l'avance, consolide les données pour la cuisine, et utilise l'IA (Gemini) pour prévoir avec précision la demande, tout en garantissant zéro gaspillage et zéro attente.

## Stack Technique
- **Framework** : Next.js 16.4 + React 19.3
- **Base de données** : Prisma 7 + SQLite (better-sqlite3)
- **UI** : Tailwind 4.3 + shadcn/ui + motion
- **IA** : Vercel AI SDK + @ai-sdk/google (gemini-3.8-flash)
- **QA** : Vitest + Playwright

## Installation en 3 commandes
```bash
pnpm install
pnpm seed
pnpm dev
```

## Comptes de démo
- Étudiant : `etudiant1@crousflow.test`
- Cuisine : `cuisine@crousflow.test`
- Administrateur : `admin@crousflow.test`

## Architecture
```text
CrousFlow/
├── src/
│   ├── app/           # App Router (Pages, Layouts, API Routes)
│   ├── components/    # UI (shadcn, features, layout)
│   ├── server/        # Services métiers, db, IA, sécurité
│   └── lib/           # Utils, Zod schemas
├── tests/             # Vitest (unit/integration), Playwright (e2e)
├── docs/              # ADRs, Tâches, Reviews, Pitch
└── screenshots/       # Captures d'écran de l'application
```

## Les Agents (Harness)
Ce projet a été développé en collaboration par 12 agents autonomes (voir `.opencode/` et `AGENTS.md`) : `main`, `frontend`, `backend`, `ia`, `chaos`, `qa`, `ui-reviewer`, `security`, `architect`, `data`, `docs`, `devops`. Les agents se coordonnent via des portes (G1 à G5).

## Captures
Visualisez les écrans dans le dossier [`screenshots/`](./screenshots).

> **Note :** Ceci est une application de démonstration. Toutes les données sont générées aléatoirement (fictives). Aucune donnée personnelle réelle n'est manipulée.
