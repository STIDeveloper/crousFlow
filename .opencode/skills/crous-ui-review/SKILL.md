---
name: crous-ui-review
description: Revue d'un écran CrousFlow contre DESIGN.md (tokens, états obligatoires, accessibilité, reduced-motion) avec captures Playwright MCP. À utiliser par ui-reviewer avant la porte G4.
---

# Revue UI CrousFlow

1. Lire `DESIGN.md` (source de vérité visuelle).
2. Ouvrir l'écran avec le MCP Playwright (`pnpm dev` doit tourner), en 1280 px puis 375 px.
3. Vérifier, pour l'écran :
   - Les 4 états obligatoires : chargement, vide, erreur, hors-ligne (couper le réseau dans le navigateur).
   - Aucune couleur codée en dur : uniquement les tokens de `src/app/globals.css`.
   - Contraste WCAG AA, focus visible au clavier, libellés sur les boutons-icônes.
   - `prefers-reduced-motion` : animations désactivées.
   - Entrées absurdes dans chaque champ : message d'erreur humain en français, jamais d'écran blanc.
4. Enregistrer les captures dans `screenshots/` et écrire le verdict dans `docs/reviews/ui-<ecran>.md` :
   `Verdict : OK | OK avec réserves | BLOQUANT`, puis la liste des écarts avec le fichier concerné.
5. Ne jamais corriger le code : ouvrir une fiche pour `frontend` via `/new-task`.
