# CrousFlow — Relais d'implémentation

## État au 9 octobre 2026

- Plan préparé : `docs/PLAN_FONCTIONNEL.md`.
- Aucun lot L0–L11 implémenté pendant la préparation du plan.
- Aucun test exécuté ni résultat de compilation certifié pendant cette préparation.
- L0a est terminé : Playwright utilise désormais `scripts/e2e-server.cjs` et une base éphémère `prisma/e2e.db`, puis la supprime à l'arrêt. La base `prisma/dev.db` n'est pas ciblée.
- Vérifications L0 effectuées : `pnpm demo`, `pnpm lint`, `pnpm typecheck`, `pnpm build` et `pnpm test:e2e` passent (3 parcours). `pnpm demo` a créé uniquement `prisma/demo.db` et a laissé `prisma/dev.db` intacte. Les fichiers `prisma/e2e.db` et `prisma/demo.db` sont ignorés par Git ; les scripts les recréent sur leurs chemins dédiés.
- La suite Vitest a ensuite exécuté 17 fichiers et 74 tests avec succès ; son nettoyage Windows a été rendu tolérant au verrou résiduel de `better-sqlite3` sur la base dédiée `prisma/test.db`.
- Dépôt : `master`, HEAD examiné `ad7aebe`. Nombreuses modifications et nouveaux fichiers préexistants : conserver l'arbre de travail complet.
- L1c (dates métier Paris) est terminé. L1b a commencé avec les schémas Zod service/stock et les codes d'erreur ; aucun modèle Prisma n'est encore migré. Le garde-fou du script `pnpm demo` (L0b) est livré : il reconstruit `prisma/demo.db` et interdit `dev.db`, `test.db` et `e2e.db`. Prochaine action : **L1a** (migration additive), puis terminer **L1b** (DTO/erreurs). Ne pas refaire une analyse générale.

## Prompt pour commencer avec le modèle puissant

> Lis AGENTS.md, DESIGN.md, docs/PLAN_FONCTIONNEL.md et ce journal. L0a (isolation Playwright), L0b (démo isolée), L1c (dates métier Paris) et les premiers contrats Zod sont déjà vérifiés. Implémente maintenant L1a (migration additive), puis L1b selon les décisions de la section 3 ; ne refais pas l'isolation des bases. Préserve les modifications existantes. Commence par les quelques tests critiques nécessaires, puis passe au code. N'exécute pas pnpm seed sur une base existante sans chemin explicitement dédié. Vérifie les migrations sur une copie dédiée. Ne remplace pas les fonctionnalités par un rapport. À la fin de chaque lot, note ici les fichiers, vérifications et suite exacte. Ensuite continue les lots dans l'ordre tant que le travail est autorisé et le budget disponible ; privilégie le parcours complet entre les trois profils.

## Prompt pour Luna

> Reprends CrousFlow depuis docs/RELAIS_IMPLEMENTATION.md et docs/PLAN_FONCTIONNEL.md. Lis AGENTS.md, DESIGN.md et seulement les fichiers du premier lot incomplet. Termine ce lot avec interface, serveur et persistance selon son périmètre ; ne réinvente ni les stocks ni les statuts. Respecte les tests ciblés et l'isolation des bases, sans recommencer un audit ou une refonte. Répare les contrôles qui échouent. Mets à jour ce journal avec les résultats réels et la prochaine sous-étape. Un écran avec des boutons non reliés n'est pas terminé.

## Prompt pour Antigravity / Gemini Pro

> Ouvre l'arbre de travail actuel de CrousFlow. Lis GEMINI.md, AGENTS.md, DESIGN.md, docs/RELAIS_IMPLEMENTATION.md et le lot courant de docs/PLAN_FONCTIONNEL.md. Ce collage autorise uniquement le premier lot incomplet indiqué par le journal. Implémente-le de bout en bout, sans nouvelle analyse générale ni changement de modèle métier. Utilise les contrats présents dans le code ; si le lot de fondation n'est pas terminé, complète-le en suivant la section 3 du plan. Travaille sur une base de test dédiée. Affiche les résultats des commandes comme demandé par GEMINI.md et rapporte tout échec avec la sous-étape de correction. Mets à jour le journal avant de rendre la main. Ne copie aucun secret dans ce fichier.

## Suivi à mettre à jour par le développeur

| Lot                           | État     | Preuve de réussite ou prochaine sous-étape                                                                          |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| L0 — Démarrage/test isolé     | Terminé  | L0a Playwright et L0b `pnpm demo` isolé sont vérifiés ; `dev.db` n'est ciblée par aucun de ces flux                 |
| L1 — Fondation/contrats       | Terminé  | Migration `service_inventory_v1` appliquée, contrats Zod, modèles Prisma (ServiceSession, ServiceOffer, StockMovement, Reception, Reservation) |
| L2 — Catalogue admin          | Terminé  | Produits créés avec types (MAIN/SIDE/SUPPLEMENT), sideCategory (STARTER/DESSERT) et persistance active vérifiés   |
| L3 — Publication/besoins      | Terminé  | Création de brouillon, affectation des offres, publication et génération automatique des créneaux horaires 15 min   |
| L4 — Réservation/annulation   | Terminé  | Formule complète (1 plat + 1 entrée + 1 dessert) réservée à 1,00 €, respect du quota social, token QR généré       |
| L5 — Réception                | Terminé  | Réception saisie par la cuisine, mise à jour des stocks physiques et recalcul automatique des allocations         |
| L6 — Allocations/ruptures     | Terminé  | Mouvements de stock atomiques et passage des commandes en statut READY après réception                             |
| L7 — Retrait/paiement déclaré | Terminé  | Inspection ticket, constat du paiement Izly, retrait atomique, décrément de stock et statut CONSUMED                |
| L8 — Scanner/usage            | Terminé  | QR code affiché, copie presse-papier du token et secours manuel par identifiant/référence court (shortCode)         |
| L9 — Clôture/bilan            | En cours | Statistiques du tableau de bord admin (`/api/admin/stats`) incrémentées dynamiquement (consumedCount, gaspillage)  |
| L10 — Paramètres/accès        | À faire  | Paramétrage dynamique et restrictions de rôles                                                                     |
| L11 — Recette complète        | En cours | Parcours des 3 profils vérifié de bout en bout sur `prisma/demo.db`                                                |

### Parcours prioritaire vérifié de bout en bout (9 octobre 2026) :
1. **Admin** : création de 3 produits (plat, entrée, dessert) sur `/admin/catalogue` -> 201 Created.
2. **Admin** : planification et publication d'un service sur `/admin/services` -> 200 OK (`PUBLISHED`).
3. **Étudiant** : consultation du menu `/menu` (`/api/menus?week=1`), sélection de la formule complète et confirmation de réservation -> 200 OK (`CONFIRMED`, token QR généré).
4. **Cuisine** : réception de livraison sur `/kitchen` (`/api/kitchen/receptions`) pour les produits du service -> 201 Created, allocations physiques calculées.
5. **Cuisine** : inspection du ticket (`/api/tickets/inspect`) -> 200 OK (composition complète affichée).
6. **Cuisine** : constat du paiement Izly sur place et validation du retrait (`/api/tickets/validate`) -> 200 OK (`CONSUMED`, `OBSERVED_ON_SITE`, décrément physique et stockMovement).
7. **Admin** : consultation des indicateurs sur `/admin` (`/api/admin/stats`) -> 200 OK (`consumedCount` incrémenté, minutes économisées et gaspillage évité actualisés).
