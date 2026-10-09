# Cahier des charges — CrousFlow

> Version 1.0 — 8 octobre 2026. Source de vérité fonctionnelle et technique.
> Complète `DESIGN.md` (visuel) et `AGENTS.md` (carte des agents). En cas de conflit : ce fichier gagne sur le fonctionnel, `DESIGN.md` gagne sur le visuel.
> Les valeurs marquées **(hypothèse)** sont des choix raisonnables, modifiables dans `src/config/rules.ts` sans toucher au code métier.

---

## 1. Contexte et problème

Les restaurants universitaires du CROUS manquent de personnel. Conséquences observées :

- files d'attente longues entre 12 h et 13 h, qui font perdre du temps et découragent certains étudiants de manger ;
- cuisine qui ne sait pas combien de plats préparer : gaspillage ou rupture ;
- précarité étudiante : des repas sautés faute de temps ou d'argent.

**Idée centrale (à l'origine de l'étudiant) :** puisqu'on ne peut pas ajouter de personnel en cuisine, on change le flux. Les étudiants **réservent leurs plats chauds pour la semaine**, la cuisine produit ce qui est réservé, et le retrait se fait par ticket QR sans file.

## 2. Objectifs et non-objectifs

### Objectifs

1. Supprimer la file au retrait (parcours : réserver → recevoir un ticket → scanner → récupérer).
2. Donner à la cuisine une prévision fiable par plat et par créneau, pour réduire le gaspillage.
3. Rester utilisable par un étudiant en moins de 30 secondes sur téléphone.
4. Être **démontrablement solide** : un évaluateur qui essaie de casser l'app doit voir des refus propres, jamais un crash.
5. Livrer un harness d'agents complet et lisible (agents, règles, commandes, hooks, CI).

### Non-objectifs (volontairement exclus)

- Pas de vrai paiement (solde et crédits **simulés**).
- Pas de données réelles d'étudiants : tout est fictif (seed déterministe).
- Pas d'application mobile native (web responsive).
- Pas de profilage individuel des étudiants fragiles (voir §7.4).

### Indicateurs de succès (démo)

| Indicateur                                            | Cible                     |
| ----------------------------------------------------- | ------------------------- |
| Temps pour réserver un repas (parcours le plus court) | < 30 s                    |
| Surréservation d'un créneau (test de concurrence)     | 0, toujours               |
| Entrées absurdes refusées proprement (catalogue §10)  | 100 %                     |
| Erreur MAE de la prévision vs baseline naïve          | meilleure que la baseline |
| CI                                                    | verte sur `main`          |

## 3. Utilisateurs et rôles

| Rôle      | Qui                      | Peut                                                                                                    |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `STUDENT` | Étudiant                 | Voir les menus, réserver/annuler ses repas, voir ses tickets, ses stats perso                           |
| `KITCHEN` | Équipe cuisine           | Voir agrégats et prévisions, valider les tickets au retrait, saisir les quantités préparées             |
| `ADMIN`   | Responsable CROUS / démo | Tout ce que fait `KITCHEN` + statistiques d'usage, gestion des menus et créneaux, console de robustesse |

Règle d'accès : chaque requête vérifie le rôle **côté serveur**. L'interface masque, le serveur refuse.

Authentification : session par cookie signé, `httpOnly`, `SameSite=Lax`. Utiliser Auth.js (ou équivalent) en suivant sa documentation actuelle. Comptes de démo fournis par le seed (un par rôle).

## 4. Périmètre fonctionnel

Priorités : **MUST** = indispensable à la démo, **SHOULD** = fort impact, **COULD** = si le temps le permet.

| ID   | Exigence                                                                                            | Priorité |
| ---- | --------------------------------------------------------------------------------------------------- | -------- |
| F-01 | Consulter le menu de la semaine (plats, catégorie, prix, allergènes indicatifs)                     | MUST     |
| F-02 | Réserver un plat sur un créneau (Planificateur de semaine)                                          | MUST     |
| F-03 | Annuler une réservation dans la fenêtre autorisée                                                   | MUST     |
| F-04 | Ticket de retrait avec QR code signé                                                                | MUST     |
| F-05 | Validation du ticket par la cuisine (usage unique)                                                  | MUST     |
| F-06 | Dashboard cuisine : commandes agrégées par plat et créneau                                          | MUST     |
| F-07 | Prévision de demande par plat (baseline statistique)                                                | MUST     |
| F-08 | Console « Test de robustesse » (§10)                                                                | MUST     |
| F-09 | Carte d'affluence par créneau, étudiant guidé vers les créneaux calmes                              | SHOULD   |
| F-10 | Explications et alertes gaspillage rédigées par Gemini à partir des chiffres calculés               | SHOULD   |
| F-11 | Dashboard admin : statistiques d'usage, repas servis, gaspillage évité                              | SHOULD   |
| F-12 | Export CSV des commandes et des statistiques                                                        | SHOULD   |
| F-13 | Bandeau d'impact (repas servis, minutes de file économisées, gaspillage évité)                      | SHOULD   |
| F-14 | Scan du QR par caméra navigateur (sinon saisie manuelle du code)                                    | COULD    |
| F-15 | Mode « aide solidaire » : repas offerts réservés par l'admin, redistribués sans désigner d'étudiant | COULD    |
| F-16 | Export PDF du rapport de financement                                                                | COULD    |

### Critères d'acceptation des MUST

- **F-02** — _Étant donné_ un créneau avec places libres et la fenêtre ouverte, _quand_ l'étudiant réserve, _alors_ une réservation `CONFIRMED` est créée, `reservedCount` augmente de 1, un ticket est disponible, le total animé se met à jour.
- **F-02 (échec)** — _Étant donné_ un créneau complet, _quand_ l'étudiant réserve, _alors_ réponse `409 SLOT_FULL`, message humain, aucun changement en base.
- **F-03** — Annulation possible jusqu'à la limite des règles (§5) ; la place est rendue au créneau ; l'annulation est idempotente.
- **F-04** — Le QR encode un jeton signé (HMAC) lié à la réservation et à une date d'expiration ; un jeton falsifié ou expiré est refusé.
- **F-05** — Un ticket valide passe `CONSUMED` ; le présenter une seconde fois renvoie `409 ALREADY_CONSUMED`.
- **F-06** — Les totaux par plat et par créneau sont exacts, cohérents avec la base, et se rafraîchissent automatiquement.
- **F-07** — La prévision est calculée **en code** (pas par le LLM), accompagnée d'un intervalle ou d'un niveau de confiance.
- **F-08** — Chaque cas du catalogue §10 est rejouable en un clic et affiche son résultat attendu et son résultat réel.

## 5. Règles métier

Toutes configurables dans `src/config/rules.ts` **(hypothèses)** :

| Règle                                    | Valeur par défaut                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Fenêtre de réservation de la semaine N+1 | du jeudi 00:00 au dimanche 23:59 de la semaine N                                        |
| Annulation                               | jusqu'à la veille 18:00                                                                 |
| Quantité par réservation                 | 1 (un repas par réservation)                                                            |
| Réservations par étudiant et par jour    | 2 maximum                                                                               |
| Réservations par étudiant et par semaine | 10 maximum                                                                              |
| Durée d'un créneau                       | 15 minutes, capacité fixée par créneau                                                  |
| Retrait                                  | de l'heure de début jusqu'à 15 min après la fin du créneau ; passé ce délai : `NO_SHOW` |
| Prix                                     | champ `priceCents`, valeur de référence fictive en démo                                 |
| Paiement                                 | **simulé** (solde fictif)                                                               |

Invariants (à tester systématiquement) :

1. `0 ≤ reservedCount ≤ capacity` pour tout créneau, quelle que soit la concurrence.
2. Un étudiant ne peut pas avoir deux réservations actives sur le même créneau et le même plat.
3. Un ticket ne passe `CONSUMED` qu'une seule fois.
4. Aucune opération ne modifie la réservation d'un autre étudiant.

## 6. Modèle de données (Prisma)

| Entité         | Champs clés                                                                                                                                     | Contraintes                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `User`         | id, email, name, role (`STUDENT`/`KITCHEN`/`ADMIN`), createdAt                                                                                  | email unique                                                            |
| `Meal`         | id, name, description, category, priceCents, imageUrl, allergens[]                                                                              | prix ≥ 0                                                                |
| `MenuItem`     | id, mealId, date, available                                                                                                                     | unique (mealId, date)                                                   |
| `Slot`         | id, date, startTime, endTime, capacity, reservedCount                                                                                           | capacity > 0, reservedCount ≤ capacity                                  |
| `Reservation`  | id, userId, menuItemId, slotId, status (`PENDING`/`CONFIRMED`/`CONSUMED`/`CANCELLED`/`NO_SHOW`), qrToken, idempotencyKey, createdAt, consumedAt | unique (userId, slotId, menuItemId) quand actif ; unique idempotencyKey |
| `KitchenBatch` | id, date, mealId, predictedCount, preparedCount, status                                                                                         | unique (date, mealId)                                                   |
| `Forecast`     | id, date, mealId, predictedCount, lower, upper, method (`STAT`/`FALLBACK`), createdAt                                                           |                                                                         |
| `AuditLog`     | id, actorId, action, entity, entityId, requestId, createdAt                                                                                     | append-only                                                             |
| `ChaosRun`     | id, caseId, expected, actual, passed, durationMs, createdAt                                                                                     |                                                                         |

Notes de conception :

- La réservation d'une place est une **transaction** avec mise à jour conditionnelle (`reservedCount < capacity`), jamais « lire puis écrire ».
- Les montants sont en centimes (entiers).
- **On ne stocke pas les allergies des étudiants** (donnée de santé). Les allergènes ne sont affichés que sur les plats.
- Les dates sont stockées en UTC, affichées en `Europe/Paris`.

## 7. Exigences non fonctionnelles

### 7.1 Robustesse

- Validation Zod à **toutes** les frontières (API, Server Actions, variables d'environnement au démarrage).
- Contrat d'erreur unique : `{ code, message, details?, requestId }`, message en français, humain, qui dit quoi faire.
- Jamais de stack trace envoyée au client. Journalisation côté serveur avec `requestId`.
- Error boundaries par zone d'interface ; page d'erreur globale ; jamais d'écran blanc.
- Délais d'attente (timeout) sur tout appel externe (Gemini) avec repli.

### 7.2 Sécurité

- Contrôle d'accès par rôle et par propriétaire (anti-IDOR) sur chaque route.
- Limitation de débit (rate limiting) sur création de réservation, connexion, console de robustesse. Version en mémoire acceptable pour la démo, documentée comme telle.
- Taille maximale de payload (1 Mo) ; longueurs maximales par champ.
- En-têtes de sécurité (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`).
- Secrets uniquement côté serveur, `.env.example` fourni, aucun secret commité. Aucun appel Gemini depuis le client.
- Jetons QR signés avec un secret serveur, comparaison en temps constant.
- Dépendances : `pnpm audit` dans la CI.

### 7.3 Performance

- LCP < 2 s en local sur la page de réservation, aucun décalage de mise en page visible.
- Les requêtes de liste sont paginées ; index sur (date, mealId), (slotId), (userId, status).

### 7.4 Éthique et données personnelles

- Aucune donnée réelle. Bandeau « démonstration » visible.
- **Pas de détection individuelle d'étudiants en difficulté.** Ce que l'idée initiale appelait « repas sautés répétés » devient un indicateur **agrégé et anonyme** (taux de repas non retirés par site et par créneau) pour orienter l'aide. Marquer ou signaler des individus serait du profilage de personnes vulnérables, risqué et difficile à défendre.
- Minimisation : e-mail et nom fictifs uniquement, durée de conservation documentée.

### 7.5 Accessibilité

WCAG AA, navigation clavier, `prefers-reduced-motion`, cibles tactiles ≥ 44 px. Détails dans `DESIGN.md`.

### 7.6 Observabilité

- Journaux structurés (niveau, `requestId`, route, durée).
- Route `GET /api/health` (état app + base + disponibilité IA).
- Table `AuditLog` pour les actions sensibles.

## 8. Architecture technique

### 8.1 Stack (vérifiée octobre 2026)

| Couche             | Choix                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js **16.4** (App Router, Turbopack) — sorti le 6 oct. 2026                                                                               |
| UI runtime         | React fourni par Next 16.4 + React Compiler                                                                                                   |
| Style / composants | Tailwind 4.3+, shadcn/ui (Base UI), motion — voir `DESIGN.md`                                                                                 |
| Base de données    | SQLite via Prisma **7** : utiliser l'adaptateur `@prisma/adapter-better-sqlite3` et `prisma.config.ts`, en suivant la documentation Prisma v7 |
| Validation         | Zod, schémas partagés front/back dans `src/lib/schemas/`                                                                                      |
| IA                 | Vercel AI SDK (`ai`) + `@ai-sdk/google`, modèle **`gemini-3.8-flash`** (stable). Vérifier la liste officielle avant de coder la couche IA     |
| Tests              | Vitest + Testing Library, Playwright                                                                                                          |
| Qualité            | ESLint, Prettier, TypeScript strict, Husky + lint-staged                                                                                      |
| CI                 | GitHub Actions (Node 22, pnpm)                                                                                                                |

### 8.2 Point d'attention Next.js 16.4 : mise en cache

`create-next-app` active désormais les Cache Components par défaut. Règle projet : **aucune donnée de réservation, de capacité ou de ticket ne doit être mise en cache.** Seuls les menus de la semaine publiés peuvent l'être (avec invalidation explicite à la modification). Le rendu de ces données dynamiques passe par `Suspense` avec squelette.

### 8.3 Arborescence cible

```
crousflow/
├── .opencode/            agents/, rules/, commands/, hooks/, skills/, ownership.json
├── .github/workflows/    ci.yml
├── .husky/               pre-commit, pre-push
├── docs/                 adr/, reviews/, PITCH.md, DEMO.md, architecture.md
├── prisma/               schema.prisma, seed.ts, migrations/
├── prisma.config.ts
├── scripts/              check-boundaries.ts, demo-reset.ts
├── src/
│   ├── app/              pages ; (student), (kitchen), (admin) ; api/ (handlers fins)
│   ├── components/       ui/ (shadcn), features/
│   ├── config/           rules.ts, env.ts
│   ├── lib/              schemas/, ui/, hooks/
│   └── server/           reservations/, kitchen/, ia/, analytics/, chaos/, security/
├── tests/                unit/, integration/, e2e/, chaos/, data/
├── screenshots/
├── AGENTS.md  GEMINI.md  DESIGN.md  CAHIER_DES_CHARGES.md  README.md
└── .env.example
```

### 8.4 Principes

- **Handlers fins** : `src/app/api/**` ne contient que parsing + appel d'un service de `src/server/`.
- **Contract-first** : un endpoint commence par son schéma Zod, mergé avant le code front et back.
- **Pas de logique métier dans les composants.**
- Les erreurs métier sont des objets typés (`AppError` avec `code`) transformés en réponse HTTP à un seul endroit.

### 8.5 Surface d'API

| Méthode et route                  | Rôle                                 | Accès              |
| --------------------------------- | ------------------------------------ | ------------------ |
| `GET /api/menus?week=`            | Menu de la semaine                   | Authentifié        |
| `GET /api/slots?date=`            | Créneaux et affluence                | Authentifié        |
| `POST /api/reservations`          | Réserver (clé d'idempotence requise) | `STUDENT`          |
| `DELETE /api/reservations/:id`    | Annuler                              | Propriétaire       |
| `GET /api/me/reservations`        | Mes réservations et tickets          | `STUDENT`          |
| `POST /api/tickets/validate`      | Valider un QR                        | `KITCHEN`, `ADMIN` |
| `GET /api/kitchen/forecast?date=` | Prévision et agrégats                | `KITCHEN`, `ADMIN` |
| `GET/PATCH /api/kitchen/batches`  | Lots à préparer                      | `KITCHEN`, `ADMIN` |
| `GET /api/admin/stats`            | Statistiques d'usage                 | `ADMIN`            |
| `GET /api/admin/export?type=`     | Export CSV                           | `ADMIN`            |
| `POST /api/admin/chaos/run`       | Lancer un cas de robustesse          | `ADMIN`            |
| `GET /api/health`                 | Santé                                | Public             |

### 8.6 Pages

`/` accueil · `/menu` Planificateur · `/tickets` et `/tickets/[id]` · `/kitchen` · `/admin` · `/admin/chaos` · `/connexion`.

## 9. Intelligence artificielle

Principe : **les chiffres sont calculés par du code déterministe, Gemini les explique.** Un LLM n'est pas fiable pour produire des quantités ; il l'est pour reformuler et prioriser.

1. **Prévision (F-07)** : baseline statistique — moyenne mobile pondérée par jour de semaine sur l'historique (8 à 12 semaines), corrigée par les réservations déjà enregistrées pour la période. Sortie : prévision, borne basse, borne haute.
2. **Évaluation** : calcul de **MAE** et **MAPE** sur les dernières semaines, comparés à une baseline naïve (« même chose que la semaine dernière »). Résultat affiché dans le dashboard admin : la prévision doit battre la baseline.
3. **Explications et alertes (F-10)** : Gemini reçoit les chiffres calculés et renvoie un objet structuré (Zod) : alerte, niveau, explication courte en français, action suggérée.
4. **Repli** : si Gemini échoue, dépasse le délai ou renvoie un format invalide, la prévision statistique reste affichée avec un badge « Prévision de secours ». L'application ne dépend jamais de l'IA pour fonctionner.
5. **Données** : le seed génère 12 semaines d'historique fictif avec des motifs réalistes (pics mardi et jeudi, creux le vendredi, effet semaine d'examens, bruit contrôlé), graine fixe pour des démos reproductibles.

## 10. Console « Test de robustesse » (F-08)

Chaque cas : identifiant, entrée, résultat attendu, résultat réel, durée, verdict. Affichage en direct style terminal ; résultats enregistrés dans `ChaosRun`.

| ID   | Cas                                           | Résultat attendu                                           |
| ---- | --------------------------------------------- | ---------------------------------------------------------- |
| C-01 | Quantité négative                             | 422 `QTY_INVALID`                                          |
| C-02 | Quantité énorme (999 999)                     | 422 `QTY_INVALID`                                          |
| C-03 | Date en 3024                                  | 422 `DATE_OUT_OF_RANGE`                                    |
| C-04 | Date dans le passé                            | 422 `DATE_IN_PAST`                                         |
| C-05 | Réservation en double (même clé)              | 200 idempotent, aucune création                            |
| C-06 | Même réservation, autre clé                   | 409 `DUPLICATE_RESERVATION`                                |
| C-07 | Créneau complet                               | 409 `SLOT_FULL`                                            |
| C-08 | 50 requêtes simultanées sur 1 place           | exactement 1 succès, 49 refus, `reservedCount ≤ capacity`  |
| C-09 | Texte de 10 000 caractères                    | 422 `FIELD_TOO_LONG`                                       |
| C-10 | Balise `<script>` dans un champ texte         | 422 `CONTENT_NOT_ALLOWED` ; tout rendu reste échappé       |
| C-11 | Injection SQL (`'; DROP TABLE …`)             | traité comme du texte ou 422 ; base intacte                |
| C-12 | JSON malformé / corps vide                    | 400 `BAD_JSON`                                             |
| C-13 | Mauvais type (texte au lieu d'un nombre)      | 422 `VALIDATION_ERROR` avec détail du champ                |
| C-14 | Emojis, caractères RTL, caractères invisibles | accepté normalisé ou refusé, jamais de crash               |
| C-15 | Identifiant inexistant ou mal formé           | 404 `NOT_FOUND` ou 422                                     |
| C-16 | Accès à la réservation d'un autre étudiant    | 403 `FORBIDDEN`                                            |
| C-17 | Étudiant qui appelle une route cuisine        | 403 `FORBIDDEN`                                            |
| C-18 | Rafale de requêtes                            | 429 + `Retry-After`                                        |
| C-19 | QR falsifié ou expiré                         | 400 `QR_INVALID`                                           |
| C-20 | QR déjà consommé                              | 409 `ALREADY_CONSUMED`                                     |
| C-21 | Réservation hors fenêtre                      | 409 `WINDOW_CLOSED`                                        |
| C-22 | Corps > 1 Mo                                  | 413 `PAYLOAD_TOO_LARGE`                                    |
| C-23 | Gemini indisponible ou réponse invalide       | prévision de secours + badge, aucune erreur visible        |
| C-24 | Base indisponible (simulée)                   | 503 `SERVICE_UNAVAILABLE` + état d'erreur propre à l'écran |

## 11. Équipe d'agents (v2)

Dans Antigravity, un « agent » est un **rôle** que Gemini endosse quand on lui écrit « route vers l'agent X ». Les fichiers de `.opencode/agents/` ne s'exécutent pas seuls : ils servent de contrat. Pour que les droits soient réellement contrôlés, on ajoute (§11.4) un fichier de propriété des chemins et une vérification automatique.

### 11.1 Rôles

| Agent         | Mission                                                                                | Écrit dans                                                                                                                                     | Ne fait jamais                                                          |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `main`        | Orchestre : découpe, rédige les fiches de tâche, route, vérifie les portes de qualité  | `.opencode/`, `docs/tasks/`                                                                                                                    | Coder                                                                   |
| `architect`   | Plans par phases, décisions d'architecture (ADR), contrats d'API, revue des risques    | `docs/adr/`, `docs/architecture.md`                                                                                                            | Coder une fonctionnalité                                                |
| `backend`     | Prisma, services, handlers, schémas Zod, règles métier, transactions                   | `src/server/` (sauf `ia/`, `chaos/`, `security/`, `analytics/`), `src/app/api/`, `prisma/` (sauf `seed.ts`), `src/lib/schemas/`, `src/config/` | Toucher à l'UI                                                          |
| `data`        | Seed déterministe, historique fictif, analytique, jeux de données de test              | `prisma/seed.ts`, `src/server/analytics/`, `tests/data/`                                                                                       | Modifier le schéma Prisma                                               |
| `ia`          | Prévision, MAE/MAPE, appels Gemini, repli, schémas de sortie                           | `src/server/ia/`, `src/lib/schemas/ia.ts`                                                                                                      | Appeler Gemini depuis le client ; laisser le LLM calculer des quantités |
| `frontend`    | Écrans, composants, animations, états chargement/vide/erreur/hors-ligne                | `src/app/` (sauf `api/` et `(admin)/admin/chaos/`), `src/components/`, `src/lib/ui/`, `src/lib/hooks/`                                         | Logique métier ; couleur codée en dur                                   |
| `chaos`       | Catalogue C-01…C-24, exécuteur, console, tests de robustesse                           | `src/server/chaos/`, `src/app/(admin)/admin/chaos/`, `tests/chaos/`                                                                            | Affaiblir une validation pour faire passer un cas                       |
| `qa`          | Tests unitaires, intégration, e2e, seuils de couverture                                | `tests/` (sauf `chaos/`, `data/`), `vitest.config.ts`, `playwright.config.ts`                                                                  | Modifier le code testé                                                  |
| `ui-reviewer` | Conformité `DESIGN.md`, accessibilité, états, responsive, captures                     | `screenshots/`, `docs/reviews/ui-*.md`                                                                                                         | Corriger lui-même : il émet un verdict                                  |
| `security`    | Revue sécurité, en-têtes, limitation de débit, contrôle d'accès, audit des dépendances | `src/server/security/`, `docs/reviews/security-*.md`                                                                                           | Désactiver un contrôle                                                  |
| `devops`      | CI, hooks, scripts, outillage de lint/format, `scripts/check-boundaries.ts`            | `.github/`, `.husky/`, `scripts/`, `package.json`, configs ESLint/Prettier                                                                     | Toucher au code métier                                                  |
| `docs`        | README, pitch de 2 minutes, guide de démo, journal des décisions                       | `README.md`, `docs/PITCH.md`, `docs/DEMO.md`                                                                                                   | Inventer une fonctionnalité non livrée                                  |

### 11.2 Protocole d'orchestration

Pour chaque fonctionnalité, `main` suit ce pipeline :

```
1. architect  → plan + contrat (schémas Zod, erreurs, routes)          [Porte G1 : plan validé]
2. backend ┐
   data    ├→ en parallèle une fois le contrat mergé                    [Porte G2 : contrat mergé]
   ia      ┘
3. frontend   → écran branché sur le contrat
4. qa + chaos → tests, cas de robustesse
5. ui-reviewer + security → verdicts écrits dans docs/reviews/        [Porte G4 : zéro bloquant]
6. devops     → vérifie les portes automatiques                       [Porte G3 : check vert]
7. docs       → met à jour README / pitch / démo
```

Portes de qualité :

- **G1** plan validé (périmètre, risques, critères d'acceptation) ;
- **G2** contrat publié : schémas Zod, codes d'erreur, routes ;
- **G3** `pnpm check` vert (lint, typecheck, test, build) ;
- **G4** verdicts `ui-reviewer` et `security` sans point bloquant ;
- **G5** prêt pour la démo : parcours e2e verts, seed rejouable, captures à jour.

Règles :

- Un seul agent écrit dans un chemin donné (voir §11.1). Besoin d'un autre périmètre : on passe par `main`, qui crée une fiche de tâche pour le bon agent.
- Pas de merge si une porte est rouge.
- Un agent qui bloque (spécification ambiguë, conflit de périmètre) **s'arrête et remonte à `main`** ; il n'improvise pas.
- Un prompt = une tâche = une vérification.

### 11.3 Fiche de tâche (modèle `docs/tasks/<id>.md`)

```
# Tâche T-<n> — <titre>
Agent : <nom>            Priorité : MUST|SHOULD|COULD       Exigence : F-xx
Objectif : <une phrase>
Périmètre (fichiers autorisés) : <chemins>
Entrées : <contrats, schémas, fichiers à lire>
Critères d'acceptation : <liste testable>
Hors périmètre : <ce qu'on ne fait pas>
Risques : <liste>
Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
Handoff → <agent suivant> : <ce qu'il doit savoir>
```

### 11.4 Commandes, hooks, propriété des chemins

- **`.opencode/ownership.json`** : correspondance agent → chemins autorisés.
- **Convention de commit** : `type(agent): message` (ex. `feat(frontend): planificateur de semaine`).
- **`scripts/check-boundaries.ts`** : lit les commits d'une branche et échoue si le scope d'un commit touche des fichiers hors des chemins de l'agent. Lancé en `pre-push` et en CI. C'est ce qui rend les « droits » vérifiables, pas seulement déclarés.
- **Commandes** (`.opencode/commands/`) : `/plan`, `/reserve`, `/predict`, `/chaos`, `/review-ui`, `/review-sec`, `/audit`, `/demo`.
- **Hooks** : `pre-commit` = lint-staged (ESLint + Prettier) + typecheck ; `pre-push` = test + build + check-boundaries.

## 12. Qualité, tests et CI

### 12.1 Scripts `package.json`

`dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `check` (lint + typecheck + test + build), `seed`, `chaos` (exécute le catalogue en ligne de commande), `demo` (réinitialise la base et lance le seed).

### 12.2 Pyramide de tests

| Niveau      | Outil                        | À couvrir obligatoirement                                                                                          |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Unitaire    | Vitest                       | Règles métier, validations Zod, prévision, signature QR                                                            |
| Intégration | Vitest + base SQLite de test | Chaque route : succès, validation, accès, concurrence (C-08)                                                       |
| E2E         | Playwright                   | Parcours étudiant (réserver → ticket), parcours cuisine (valider un ticket, voir l'agrégat), console de robustesse |
| Robustesse  | Vitest                       | Les 24 cas C-01…C-24                                                                                               |

Seuils : couverture ≥ 80 % sur `src/server/` ; 3 parcours e2e verts minimum.

### 12.3 CI (GitHub Actions, Node 22, pnpm)

Déclenchement : `push` et `pull_request`. Jobs : installation (cache pnpm) → lint → typecheck → test → build → `pnpm audit` → check-boundaries → e2e (smoke). Un job rouge bloque la fusion.

## 13. Livrables

- Dépôt complet : code, `.opencode/` complet, `.github/`, `.husky/`.
- `README.md` : problème, solution, installation en 3 commandes, architecture, captures, lien vers la démo.
- `DESIGN.md`, `CAHIER_DES_CHARGES.md`, `AGENTS.md`, `GEMINI.md`.
- `docs/adr/` (décisions d'architecture), `docs/reviews/` (verdicts des agents).
- `docs/PITCH.md` (2 minutes) et `docs/DEMO.md` (déroulé, plan B).
- `screenshots/` (clair, sombre, mobile, desktop).

### Correspondance avec les critères d'évaluation

| Critère         | Réponse du projet                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Originalité     | Idée personnelle, problème réel : réservation hebdomadaire de plats chauds pour contourner le manque de personnel |
| Utilité         | Moins de file, moins de gaspillage, aide aux étudiants précaires, outil déployable                                |
| Style et beauté | `DESIGN.md` : « Cantine éditoriale », deux ambiances, mouvement soigné                                            |
| Crédibilité     | Rôles, règles métier, prévision évaluée par MAE/MAPE, audit, export                                               |
| Solidité        | Console de robustesse (24 cas), transactions, tests de concurrence, CI                                            |
| Harness complet | 12 agents, protocole d'orchestration, portes, hooks, propriété des chemins vérifiée                               |

## 14. Planning (durées indicatives pour un sprint de 24 h, à proportionner)

| Phase              | Contenu                                                       | Porte  |
| ------------------ | ------------------------------------------------------------- | ------ |
| 0. Fondation       | Dépôt, outillage, CI, hooks, schéma Prisma, config d'agents   | G3     |
| 1. Contrats        | Schémas Zod, codes d'erreur, `rules.ts`, seed d'historique    | G1, G2 |
| 2. Cœur métier     | Réservation transactionnelle, annulation, tickets, validation | G3     |
| 3. Étudiant        | Planificateur, ticket QR, affluence                           | G3, G4 |
| 4. Cuisine et IA   | Agrégats, prévision, MAE/MAPE, alertes Gemini + repli         | G3     |
| 5. Robustesse      | Catalogue C-01…C-24, console, tests                           | G3     |
| 6. Admin et export | Statistiques, bandeau d'impact, CSV                           | G4     |
| 7. Finition        | États, accessibilité, captures, README, pitch, répétition     | G5     |

Si le temps manque : couper dans l'ordre F-16, F-15, F-14, F-12, F-11. Ne jamais couper F-08 ni les tests de concurrence.

## 15. Risques et parades

| Risque                                               | Parade                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Gemini lent, indisponible ou hors quota              | Prévision statistique autonome, badge de repli, timeout                             |
| Surréservation                                       | Transaction à mise à jour conditionnelle, contrainte en base, test C-08             |
| Données mises en cache par erreur (Cache Components) | Règle §8.2, test e2e qui vérifie la fraîcheur des places restantes                  |
| Dérive de périmètre                                  | Priorités MUST/SHOULD/COULD, fiches de tâche, portes                                |
| Saturation du contexte de l'agent                    | Un prompt = une tâche, fichiers courts, lecture ciblée de ce fichier                |
| Démo qui échoue en direct                            | `pnpm demo` (reset en une commande), plan B documenté, captures et vidéo de secours |
| Incompatibilité de versions                          | Versions épinglées dans `package.json`, ADR pour tout changement                    |

## 16. Définition de « terminé » globale

- [ ] Toutes les exigences MUST livrées et testées
- [ ] `pnpm check` vert ; CI verte sur `main`
- [ ] 24 cas de robustesse passent ; test de concurrence vert
- [ ] Verdicts `ui-reviewer` et `security` sans point bloquant
- [ ] `pnpm demo` repart d'un état propre en une commande
- [ ] README, pitch, guide de démo et captures à jour
- [ ] Aucun secret dans le dépôt ; `.env.example` à jour
