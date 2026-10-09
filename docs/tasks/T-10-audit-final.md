# Tâche T-10 — Audit final et durcissement avant démo

Agent : main → ia, backend, security, qa, devops Priorité : MUST Exigence : solidité
Objectif : faire tenir l'application quand on tape dessus et rendre le dépôt lançable par n'importe qui.

## Constats (audit)

- `/api/slots`, `/api/kitchen/forecast`, `/batches` et `/slots-summary` renvoyaient 500 sur une date invalide.
- Guichet cuisine : recherche « de secours » par fragment de 3 caractères → un code bidon pouvait valider le ticket d'un autre étudiant ; tous les tickets affichaient le même identifiant (`EYJ…`).
- IA : modèle `gemini-1.5-flash` retiré, et tests de repli qui ne passaient jamais par le mock Gemini.
- CI : version pnpm incohérente, branche `master` ignorée, `check-boundaries` absent ; `.env.example` non suivi et secrets trop courts.

## Corrections

- ia : `GEMINI_MODEL` configurable (défaut `gemini-3.8-flash`), repli déterministe qui explique les chiffres (alerte si réservations > prévision), 9 tests dont chemins Gemini réels et entrées absurdes.
- backend : `parseDateQuery` (Zod) → 422 sur date invalide (`tests/unit/date-query.test.ts`).
- security : code court de ticket = hash FNV-1a de l'identifiant (6 caractères), recherche exacte uniquement (`tests/integration/ticket-lookup.test.ts`).
- devops : CI corrigée, `render.yaml` + `pnpm start:prod`, `postinstall: prisma generate`, `shadcn` en devDependency (audit prod propre).

## Vérification

- 105 tests Vitest, 3 parcours Playwright, lint, typecheck, build : verts.
- Script d'attaque (53 requêtes absurdes) : 0 réponse 5xx.

Handoff → docs : README (installation, IA optionnelle, déploiement).
