# Protocole d'orchestration — CrousFlow

## Pipeline

1. architect → plan + contrat (Zod, erreurs, routes). Porte G1.
2. backend + data + ia → en parallèle, une fois le contrat mergé. Porte G2.
3. frontend → écran branché sur le contrat.
4. qa + chaos → tests, cas de robustesse.
5. ui-reviewer + security → verdicts dans docs/reviews/. Porte G4.
6. devops → vérifie les portes automatiques. Porte G3.
7. docs → README, pitch, démo.

## Portes

- G1 : plan validé (périmètre, risques, critères d'acceptation).
- G2 : contrat publié (schémas Zod, codes d'erreur, routes).
- G3 : pnpm check vert (lint, typecheck, test, build).
- G4 : verdicts ui-reviewer et security sans bloquant.
- G5 : prêt démo (e2e verts, seed rejouable, captures à jour).

## Règles

- Un seul agent écrit dans un chemin (voir ownership.json).
- Pas de merge si une porte est rouge.
- Un agent bloqué s'arrête et remonte à main.
- Un prompt = une tâche = une vérification.

## Fiche de tâche (modèle docs/tasks/<id>.md)

# Tâche T-<n> — <titre>

Agent : <nom> Priorité : MUST|SHOULD|COULD Exigence : F-xx
Objectif : <une phrase>
Périmètre (fichiers autorisés) : <chemins>
Entrées : <contrats, schémas, fichiers à lire>
Critères d'acceptation : <liste testable>
Hors périmètre : <ce qu'on ne fait pas>
Risques : <liste>
Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
Handoff → <agent suivant> : <ce qu'il doit savoir>
