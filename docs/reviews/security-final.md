# Review Sécurité

## Verdict global : non conforme

### Tableau des routes

| Route | Rôle vérifié (Côté Serveur) | Anti-IDOR | Rate Limit | Validation Zod |
|---|---|---|---|---|
| POST /api/reservations | Oui (User) | N/A | Oui (10/min) | Oui |
| DELETE /api/reservations/[id] | Oui (User) | Oui | **Non** | **Non** (vérif manuelle ID) |
| GET /api/me/reservations | Oui (User) | Oui | **Non** | N/A |
| POST /api/tickets/validate | Oui (KITCHEN/ADMIN) | N/A | Oui (30/min) | Oui |
| GET /api/slots | Non (Publique) | N/A | N/A | N/A |
| GET /api/menu | Non (Publique) | N/A | N/A | N/A |
| POST /api/auth/demo | **Non** | N/A | **Non** | **Non** |
| GET /api/kitchen/forecast | Oui (KITCHEN/ADMIN) | N/A | **Non** | **Non** |
| GET /api/kitchen/batches | Oui (KITCHEN/ADMIN) | N/A | **Non** | **Non** |
| PATCH /api/kitchen/batches | Oui (KITCHEN/ADMIN) | N/A | **Non** | Oui |
| GET /api/admin/stats | Oui (ADMIN) | N/A | **Non** | N/A |
| GET /api/admin/export | Oui (ADMIN) | N/A | **Non** | Oui |
| POST /api/admin/chaos/run | Oui (ADMIN) | N/A | **Non** | Oui |
| GET /api/health | Non (Publique) | N/A | N/A | N/A |

### Liste des failles trouvées
1. **Absence de rate limit sur l'authentification** : `src/app/api/auth/demo/route.ts` ligne 6.
2. **Vulnérabilité HIGH pnpm audit (braces)** : Dû au package `micromatch` utilisé par `fast-glob` / `@shadcn/registry`.
3. **Absence de rate limit sur plusieurs routes mutatives/lourdes** : `DELETE /api/reservations/[id]`, `PATCH /api/kitchen/batches`, etc.
4. **Validation Zod absente** : `POST /api/auth/demo/route.ts` ligne 7.
5. **Payload Max 1 Mo manquant** : La taille du body n'est pas vérifiée explicitement avant le parsing JSON (reposant sur la limite par défaut de Next.js, qui est de 2 Mo).

### Recommandations
- Ajouter le validateur Zod sur la route d'authentification.
- Étendre le helper `checkRateLimit` à toutes les routes, en particulier l'authentification et les suppressions.
- Mettre à jour les dépendances pour corriger la vulnérabilité `braces`.
- Implémenter un middleware pour bloquer les payloads > 1 Mo.
