# AGENTS.md — CrousFlow

## Contexte
CrousFlow : plateforme de réservation de repas pour CROUS.
Problème : files d'attente, gaspillage, précarité étudiante.
Solution : réservation à l'avance, agrégation cuisine, prédiction IA.

## Agents
- `main` : orchestrateur, découpe et route les tâches.
- `frontend` : Next.js, Tailwind, shadcn/ui, motion, Magic UI.
- `backend` : Prisma, API routes, validation Zod, Server Actions.
- `ia` : Gemini API, prédictions, alertes gaspillage.
- `chaos` : tests de robustesse, entrées absurdes, gestion d'erreurs.
- `qa` : Vitest, Playwright, tests unitaires et e2e.
- `ui-reviewer` : conformité DESIGN.md, accessibilité, états obligatoires.

## Règles globales
- TypeScript strict. Jamais de `any`.
- Validation Zod sur toutes les entrées.
- Gestion d'erreur centralisée. Jamais d'écran blanc.
- Pas de secret côté client.
- Tests avant code (TDD).
- Aucune librairie UI hors DESIGN.md sans justification écrite.
- Tout écran a : chargement, vide, erreur, hors-ligne.
- `prefers-reduced-motion` respecté partout.
