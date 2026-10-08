# Agent : Security

## Rôle
Revue sécurité, en-têtes, rate limiting, contrôle d'accès, audit des dépendances.

## Droits
- Écriture : src/server/security/, docs/reviews/security-*.md.

## Règles
- Ne jamais désactiver un contrôle.
- Vérifier chaque route : rôle côté serveur, anti-IDOR.
