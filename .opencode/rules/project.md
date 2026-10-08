# Règles projet — CrousFlow

## Sécurité
- Jamais de secret dans le code client.
- Validation Zod obligatoire sur toutes les entrées API.
- Rate limiting sur les routes sensibles.

## Qualité
- ESLint + Prettier obligatoires.
- Tests avant merge.
- CI verte obligatoire.

## Design
- DESIGN.md est la source de vérité visuelle.
- Aucune couleur codée en dur.
- Accessibilité WCAG AA minimum.

## IA
- Sorties structurées validées par Zod.
- Pas d'appel Gemini depuis le client.
