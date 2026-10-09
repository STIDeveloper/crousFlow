---
name: chaos-case
description: Ajouter un cas de robustesse C-xx (entrée absurde, concurrence, panne) au catalogue chaos, avec son test. À utiliser par l'agent chaos.
---

# Ajouter un cas chaos

1. Écrire d'abord le test dans `tests/chaos/` : il doit échouer (TDD).
2. Ajouter le cas dans `src/server/chaos/cases.ts` : identifiant `C-xx`, titre, fonction qui renvoie `true` si l'application résiste.
3. Critère de réussite : réponse 4xx avec message français, aucune 5xx, aucune donnée corrompue (vérifier en base).
4. Lancer `/chaos` : tous les cas doivent être verts.
5. Si le cas révèle un bug hors de `src/server/chaos/`, ne pas le corriger : créer une fiche via `/new-task` pour l'agent propriétaire.
