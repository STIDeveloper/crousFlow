# CrousFlow — Plan fonctionnel et relais entre modèles

Établi le 9 octobre 2026. État examiné : branche `master`, HEAD `ad7aebe`, avec de nombreuses modifications et des fichiers non suivis. Ce plan porte sur **l'arbre de travail actuel**, pas uniquement sur ce commit.

Statut : analyse et plan terminés. L0 (isolation Playwright) est maintenant implémenté ; L1 et les lots métier restent à faire. Les constats de la préparation étaient statiques ; les vérifications L0 sont consignées dans `docs/RELAIS_IMPLEMENTATION.md`.

## 1. Le résultat attendu

L'application doit permettre cette chaîne, avec persistance et circulation des données entre les trois profils :

**Admin prépare et publie demain → étudiant réserve → personnel réceptionne → personnel remet le repas après paiement sur place → admin consulte le bilan.**

Demandes explicites de l'utilisateur : repas chauds préparés ailleurs et livrés ; composition par défaut **1 plat + 1 entrée + 1 dessert** ; réservation avant livraison ; profil `KITCHEN` chargé de réception, stocks et distribution ; QR CrousFlow puis paiement Izly sur place ; priorité aux fonctionnalités concrètes, particulièrement admin et personnel.

Les anciennes réservations sont fictives : leur récupération n'est pas un chantier. Préserver néanmoins la base et le travail existants pour éviter de casser la démonstration. L'origine des repas et les accords logistiques ne sont pas confirmés.

Choix proposés pour démarrer, à distinguer d'une décision officielle du CROUS :

- Un restaurant pilote : Montreuil ; conserver les entités multi-sites existantes sans développer une nouvelle plateforme multi-sites.
- Service midi activé par défaut ; soir configurable, sans le présenter comme un service local confirmé.
- Réservation pour une date explicite, notamment demain ; fermeture J-1 à 18 h, annulation J-1 à 18 h par défaut. Horaires modifiables depuis l'admin.
- Prix de démonstration initial : 100 centimes pour une formule configurée éligible ; suppléments séparés. Aucun tarif local ou national n'est certifié par ce plan.
- Trois choix obligatoires dans la formule initiale ; la possibilité de périphériques facultatifs relève ensuite des paramètres, pas d'une interprétation implicite des anciennes règles.
- Rupture : alerte et traitement explicite par le personnel ; aucune substitution automatique.

## 2. Ce qu'il faut réutiliser

| Présent dans le code                                    | Point d'appui                                                                       | Adaptation nécessaire                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Catalogue et offres datées                              | `prisma/schema.prisma` : `Meal`, `MenuItem`                                         | Gestion admin, catégorie entrée/dessert, offres par service                  |
| Capacité des créneaux et réservations transactionnelles | `src/server/reservations/create.ts`, `cancel.ts`                                    | Quotas pour chaque produit, fermeture J-1, isolation restaurant              |
| Formule, suppléments, prix enregistré                   | `src/lib/schemas/reservation.ts`, `ReservationItem`                                 | Actuellement 0–2 `SIDE` génériques ; appliquer la composition cible          |
| Menus, réservation et tickets étudiants                 | `WeekPlanner.tsx`, `MealCard.tsx`, `TicketCard.tsx` dans `src/components/features/` | Date explicite : `WeekPlanner` charge actuellement `week=1`                  |
| Quantités par produit côté cuisine                      | `src/app/api/kitchen/slots-summary/route.ts`                                        | Service/restaurant, réservés/reçus/servis/restants distincts                 |
| Lots de préparation et prévisions                       | `KitchenBatch`, `src/server/ia/`                                                    | `preparedCount` n'est pas du stock réceptionné ; conserver la séparation     |
| QR signé et retrait conditionnel                        | `src/server/security/qr.ts`, `reservations/validate.ts`                             | Le scan consomme actuellement immédiatement ; séparer consultation et remise |
| Sessions, rôles et erreurs                              | `src/server/auth/session.ts`, `errors.ts`, `http/body.ts`                           | Réutiliser ; contrôler restaurant et acteur côté serveur                     |
| Dashboard admin et CSV                                  | `AdminDashboard.tsx`, API `admin/stats`, `admin/export`                             | Ajouter exploitation ; corriger bilan et indicateurs estimés                 |

Deux anomalies à traiter dans les lots concernés : l'idempotence d'une réservation ne vérifie pas encore son propriétaire/contenu ; `validateTicket` reçoit un identifiant personnel mais ne l'utilise pas. Les accès de plusieurs listes ne filtrent pas le restaurant.

Le gaspillage évité est actuellement estimé avec un coefficient de 12 %. Le CSV statistiques assimile `total - consumed` aux absences. Ces valeurs ne constituent pas un bilan physique. Les `NO_SHOW` sont actualisés à la consultation étudiante : déplacer ce traitement vers une clôture explicite.

## 3. Contrat métier à fixer avant le relais

### Modèle minimal proposé

Conserver les modèles actuels ; migrations additives. Les noms ci-dessous fixent la direction pour éviter que chaque modèle réinvente les mêmes concepts.

| Élément                   | Rôle et champs structurants                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Meal` enrichi            | `active`, `sideCategory` = `STARTER` ou `DESSERT` pour les `SIDE` ; conserver `productType`, prix, image, allergènes et éligibilité explicite                                                                                                               |
| `ServiceSession`          | Restaurant obligatoire, `serviceDate` civile `YYYY-MM-DD`, clé midi/soir, statut `DRAFT/PUBLISHED/CLOSED`, instants UTC d'ouverture/fermeture, `reservationClosesAt`, `cancellationClosesAt`, `bookingClosedAt` facultatif ; unique restaurant/date/service |
| `ServiceOffer`            | Lien service + `MenuItem`, unique sur ces deux champs ; `plannedQuantity`, `expectedQuantity`, `committedQuantity`, `physicalQuantity`, `allocatedQuantity`, activation et version                                                                          |
| Réception + lignes        | Service, acteur, référence facultative, clé d'opération ; par produit : reçu, refusé, motif, lot/DLC facultatifs, observations. Quantité acceptée = reçu − refusé                                                                                           |
| `StockMovement`           | Journal immuable des entrées acceptées, remises, pertes et ajustements motivés ; quantité signée, offre, référence d'opération et acteur                                                                                                                    |
| `StockAllocation`         | Affectation de portions réelles à une réservation/offre ; allocation de la composition complète, suppléments compris, sans mouvement physique                                                                                                               |
| `Reservation` enrichie    | Liens service/offre principale, disponibilité physique `WAITING/READY/BLOCKED`, paiement déclaré `NOT_RECORDED/OBSERVED_ON_SITE`, acteur/date de remise et de constat ; conserver `status` et `consumedAt`                                                  |
| `ReservationItem` enrichi | Lien vers l'offre de service ; composition et prix/noms figés pour l'historique                                                                                                                                                                             |
| Paramètres restaurant     | Formule, prix, horaires, limites et activation des services ; valeurs serveur issues de la base                                                                                                                                                             |

`ServiceOffer` évite de confondre midi et soir : l'unicité actuelle de `MenuItem` est produit/date. Les `Slot` sont rattachés à un service, mais restent les créneaux de retrait ; leur capacité n'est jamais le quota d'un produit.

`CLOSED` désigne uniquement la fin du service après distribution. Fermer les nouvelles réservations avec `reservationClosesAt` ou `bookingClosedAt` laisse la réception et le retrait ouverts. Après clôture du service, refuser réception, ajustement et remise ; une réouverture administrative n'entre pas dans la première version.

Chaque mutation rejouable conserve une clé d'opération unique, `actorId`, `restaurantId`, une empreinte canonique du contenu et une référence au résultat. Pour les réservations, enrichir l'idempotence existante ; pour une réception, porter ces champs sur son enregistrement ; pour la remise, sur l'enregistrement lié à la réservation. Consulter ce résultat après contrôle d'accès et avant les contrôles d'horaire, puis comparer acteur et contenu. Créer résultat, mutations et audit dans la même transaction.

Compatibilité : nouveaux liens facultatifs pour les anciennes lignes, obligatoires dans le service serveur pour toute nouvelle opération. Ne pas requalifier silencieusement les anciennes catégories libres en entrée/dessert, ni convertir les anciens `preparedCount` en livraisons. Affecter un restaurant aux anciennes données uniquement avec une correspondance explicite. Garder l'historique consultable et signaler les données héritées non configurées.

### Quantités : une seule définition par nombre

- `plannedQuantity` : plafond prévisionnel réservable décidé par l'admin.
- `expectedQuantity` : réception attendue déclarée, initialement égale au plafond ; ce nombre n'est pas une commande envoyée à une cuisine centrale.
- `committedQuantity` : portions engagées par les réservations non annulées, y compris celles déjà remises et les absences. Sert au quota, pas au stock physique restant.
- `physicalQuantity` : portions acceptées présentes sur place, moins remises, pertes et sorties enregistrées. Mise à jour atomique avec le journal.
- `allocatedQuantity` : partie du physique réservée aux commandes complètes encore à remettre.
- Réservable = plafond − engagements, si offre/service ouverts. Physique libre = physique − allocations. Aucun résultat négatif masqué par `Math.max` pour corriger une erreur métier.

Exemple : plafond 50, réservations 40, réception acceptée 47 → 10 places prévisionnelles avant fermeture, 47 portions physiques et jusqu'à 40 affectées. Le bilan affiche un écart de livraison de −3, **pas trois réservations manquantes**. Si 50 sont réservées et 47 reçues, le déficit est de 3 et des commandes sont bloquées.

### Invariants obligatoires

1. Réservation : une transaction réserve le créneau **et chacun des produits**. Échec d'un produit = aucune création et aucun compteur modifié. Impossible de réduire un plafond sous ses engagements.
2. Annulation autorisée : libère une fois le créneau, les engagements et les allocations éventuelles ; ne crée aucune portion physique.
3. Réception : ajoute uniquement les quantités acceptées, jamais les refusées. Plusieurs réceptions partielles sont possibles ; rejouer la même opération n'ajoute rien. Une correction passe par un ajustement motivé, sans réécrire le journal.
4. Allocation : ordre stable `createdAt`, puis identifiant ; une commande reçoit toutes ses portions, suppléments compris, ou aucune. `READY` exige cette composition complète. Recalcul transactionnel après réception, annulation ou ajustement. Une commande incomplète est `BLOCKED` après constat d'écart ; avant réception, `WAITING`. Ne pas attribuer la même portion à deux commandes.
5. Toujours `0 ≤ allocatedQuantity ≤ physicalQuantity` et `0 ≤ committedQuantity ≤ plannedQuantity`. Un stock insuffisant conserve les réservations et crée un incident visible.
6. QR : consulter la commande ne change ni son statut ni le stock. Confirmer la remise est une transaction unique : paiement observé, décrément de toutes les portions déjà allouées à cette commande, libération des allocations, `CONSUMED`, acteur et audit. Ne pas compléter silencieusement depuis des portions libres. Réception, ajustement, annulation et clôture modifient également allocations, compteurs et journal concerné de façon atomique.
7. Le paiement déclaré signifie « constaté par le personnel sur le terminal externe ». Aucun appel, débit, solde ou justificatif bancaire Izly inventé ; le QR CrousFlow ne sert qu'à la réservation.
8. Même clé d'opération + même acteur + même contenu = même résultat, même après fermeture ; autre contenu = conflit. Tester deux confirmations simultanées : une seule remise comptée.
9. Contrôler rôle et restaurant de tous les objets manipulés. Une clé ou un QR provenant d'un autre restaurant ne suffit jamais à autoriser une action.
10. Date métier en `Europe/Paris`, instants techniques en UTC. Calculer J-1 en jours civils, pas en soustrayant aveuglément 24 heures. Tester limite horaire et changement d'heure.
11. Clôture explicite : non-retraits déterminés côté serveur, allocations libérées de façon tracée, sorties physiques inchangées. Les restes ne deviennent pas automatiquement du gaspillage ou des produits redistribuables.
12. Lots/DLC et refus servent au contrôle du personnel ; aucun contrôle sanitaire complet n'est prétendu. Un produit déclaré inutilisable est exclu des allocations et des remises.

## 4. Lots de développement dans l'ordre

Chaque lot contient son interface, ses validations serveur et sa persistance lorsque pertinente. Un lot terminé doit pouvoir être utilisé et rechargé. Ne pas ouvrir cinq écrans en parallèle.

### L0 — Démarrage et environnement de test sûrs

- Fichiers : `playwright.config.ts`, `prisma.config.ts`, `src/server/db.ts`, `scripts/demo-reset.cjs`, scripts de préparation et fixtures.
- Conserver Vitest sur `prisma/test.db`, avec ses protections existantes. Imposer une autre base dédiée au serveur Playwright et aux fixtures ; faire respecter le même chemin par Prisma et le runtime.
- `pnpm demo` reconstruit maintenant `prisma/demo.db`, rejoue toutes les migrations et affiche la commande de démarrage avec `CROUSFLOW_DATABASE_PATH`. Il interdit `dev.db`, `test.db` et `e2e.db`; aucune remise à zéro automatique d'une base existante.
- Préparer trois comptes connus et un scénario daté reproductible sur la base dédiée ; horloge injectable pour les tests de dates. Aucun secret affiché/copier dans les documents.
- Réussite : lancer le scénario de test ne modifie pas `dev.db`, et l'application démarre avec les trois rôles. Aucune recherche de récupération des 17 anciennes réservations.

### L1 — Fondation métier, migration et contrats

- Fichiers : `prisma/schema.prisma`, nouvelle migration, `src/lib/schemas/{service,stock,product}.ts`, `src/server/services/`, `src/server/errors.ts`.
- **L1a :** schéma et migration additive sur copie dédiée ; liens legacy facultatifs, contraintes et champs d'idempotence de la section 3. Réutiliser sessions, erreurs et QR.
- **L1b :** schémas Zod et DTO produit/service/réception/allocation/retrait/bilan. Conserver les codes existants ; ajouter `PRODUCT_QUOTA_EXHAUSTED`, `STOCK_SHORTAGE`, `IDEMPOTENCY_CONFLICT`, `SERVICE_CLOSED` en HTTP 409. Fixer les états de la section 3, sans codes métier différents dans chaque écran.
- **L1c :** fonctions de date Paris et tests J-1/heure limite/changement d'heure ; documenter les DTO dans leurs schémas, pas dans un nouveau rapport.
- Prix/formule/horaires figés au service ou à la réservation selon leur usage. Les paramètres futurs ne recalculent pas le prix des tickets existants.
- Réussite : migration essayée sur une copie dédiée, historique conservé, catégories non configurées identifiées ; tests ciblés des contraintes et de la date Paris.

### L2 — Catalogue administrable

- Fichiers : nouvelles API `admin/products`, `src/server/catalog/`, schéma produit, page `/admin/catalogue`, navigation admin.
- Créer, modifier, désactiver ; plat/entrée/dessert/supplément/vente individuelle, prix, description, image URL, allergènes déclarés et éligibilité. Désactivation au lieu de suppression des produits utilisés.
- Réussite : l'admin crée les trois produits, recharge et les retrouve ; étudiant/personnel ne peuvent pas modifier le catalogue.

### L3 — Publier demain et transmettre les besoins

- Fichiers : API `admin/services`, `src/server/services/`, page `/admin/menus`, `src/server/menus/query.ts`, API `menus`, `WeekPlanner.tsx`.
- Créer un brouillon par date/service, sélectionner les produits du catalogue, quantités prévisionnelles/attendues et créneaux ; prévisualiser, publier, fermer les nouvelles réservations sans passer le service en `CLOSED`.
- Menu étudiant par date/service, avec disponibilités produits ; compatibilité de la requête `week` conservée si encore utilisée. Brouillon invisible.
- Réussite : publication demain visible côté étudiant, pas de stock physique créé ; personnel voit les mêmes offres. Vue imprimable des besoins réservés avec date de consolidation, sans envoi automatique.

### L4 — Réserver et annuler la formule complète

- Fichiers : `src/server/reservations/{create,cancel,time,query}.ts`, schéma réservation, API existantes, `MealCard.tsx`, `WeekPlanner.tsx`, `TicketCard.tsx`.
- Un plat + une entrée + un dessert ; suppléments facultatifs. Contrôle serveur de service, restaurant, publication, horaire, formule et quotas ; prix figé.
- Étendre la transaction existante, réparer l'idempotence acteur/contenu et adapter explicitement les anciens tests des règles remplacées. L'annulation libère chaque produit une seule fois.
- Réussite : ticket complet ; dernière portion réservée une seule fois sous concurrence ; produit épuisé ne laisse aucune réservation partielle ; annulation restitue toutes les disponibilités.

### L5 — Réception réelle et poste personnel

- Fichiers : `src/server/stock/{receive,query}.ts`, schéma réception, API `kitchen/receptions`, composant `ServiceReception.tsx`, `KitchenDashboard.tsx`.
- Date/service cohérents, quantités attendues et réservées distinctes ; saisir reçu/refusé/observations/lot/DLC, recevoir partiellement, consulter l'historique. Écritures atomiques, journal et acteur.
- Isoler les sections : une panne de prévision Gemini n'empêche ni réception ni retrait.
- Réussite : 50 attendus et 47 acceptés affichent l'écart −3 ; une répétition de confirmation ne crée pas 94 portions ; aucun quota prévisionnel n'est décrémenté à la réception.

### L6 — Disponibilité physique, ruptures et ajustements

- Fichiers : `src/server/stock/{allocate,adjust}.ts`, API incidents/ajustements, `AvailabilityPanel.tsx`, affichage état dans tickets et cuisine.
- Allocations de repas complets suivant les invariants ; déficit par produit, commandes affectées, fermeture motivée d'une offre et ajustements tracés.
- Personnel peut résoudre un incident par réception complémentaire ou annulation motivée d'une commande non remise. Aucun remplacement silencieux. Une vente sur place ne peut prendre une portion déjà affectée.
- Réussite : 50 repas réservés, 47 portions d'un produit → au plus 47 repas complets prêts ; réception des 3 manquants débloque les autres. Un ajustement ne laisse aucun stock/allocation négatif.

### L7 — Identifier puis remettre après paiement constaté

- Fichiers : `src/server/reservations/{inspect,validate}.ts`, nouvelle API `tickets/inspect`, API `tickets/validate`, schéma ticket, `TicketWithdrawal.tsx`.
- Consultation du QR/token ou recherche par référence : composition, montant, créneau, disponibilité et statut. Recherche étudiant limitée au restaurant autorisé.
- Actions distinctes « paiement constaté sur place » et confirmation finale de remise ; sauvegarder le constat avec la remise atomique. Un ticket non distribuable n'est pas consommé.
- Réussite : consultation sans mutation ; paiement puis remise décrémentent chaque produit une fois ; double clic/rejeu/concurrence ne comptent qu'un retrait ; autre restaurant refusé.

### L8 — Scanner caméra et états d'utilisation

- Fichiers : `TicketWithdrawal.tsx`, composant scanner séparé, `TicketCard.tsx` et sections des dashboards.
- Lecture caméra sur appareils compatibles, gestion permission/refus, arrêt caméra à fermeture ; toujours une saisie/recherche manuelle exploitable. Vérifier le support réel avant d'affirmer que le scanner fonctionne ; justifier toute dépendance ajoutée.
- Réussite : QR réel lu sur un appareil vérifié, saisie manuelle utilisable sans caméra ; mobile étudiant et poste personnel au clavier ; chargement/vide/erreur/hors-ligne et mouvement réduit.

### L9 — Clôture et bilan exploitable

- Fichiers : `src/server/services/{close,report}.ts`, API service/bilan, page `/admin/services`, `ServiceReport.tsx`, API stats/export, `AdminDashboard.tsx`.
- Clôturer explicitement, figer le bilan, déterminer absences et commandes empêchées par incident séparément ; même données dans écran, impression et CSV.
- Par produit : prévisionnel, engagé, reçu, refusé, remis, pertes déclarées, restant, écarts. Par commande : annulée, remise, absence, incident.
- Remplacer ou étiqueter les indicateurs simulés ; exporter toute la composition et utiliser la date du service. Un reliquat physique n'est pas une perte mesurée.
- Réussite : bilan exact des opérations des lots précédents ; relancer la clôture ne compte rien deux fois ; lecture des tickets étudiants sans mutation.

### L10 — Paramètres et gestion des accès

- Fichiers : API/pages `/admin/parametres`, `/admin/utilisateurs`, services/schémas correspondants, layouts personnel.
- Horaires, limites, prix, formule, activation ; gestion des rôles et accès restaurant, audit et révocation cohérente. Pas de privilège admin obtenu via inscription publique ou simple adresse e-mail.
- Le login démo existant accepte une adresse connue sans mot de passe : le limiter explicitement à l'environnement démo dédié avant tout usage réel.
- Réussite : préparer le prochain service sans modifier le code ; changement de prix sans altérer un ticket existant ; rôle refusé par API et interface.

### L11 — Recette complète et démarrage documenté

- Ajouter un parcours Playwright déterministe **admin → étudiant → personnel → admin** sur base isolée, avec assertions obligatoires. Les tests actuels peuvent sauter la réservation et acceptent zéro QR ; remplacer ces conditions permissives.
- Vérifier fermeture J-1, concurrence dernière portion, annulation, réception courte, rupture, retrait répété et bilan. Réutiliser les tests existants ; ne pas multiplier les suites redondantes.
- Une fois les lots stabilisés : lint, typecheck, tests pertinents, build et parcours complet. Les exigences de contrôle finales du projet restent applicables ; pas de `pnpm check` complet après chaque petite modification.
- Réussite : les cinq étapes du scénario sont réalisables à l'écran, persistantes après rechargement, et les nombres concordent dans les trois profils. Donner une commande de lancement démo et les comptes utilisables.

## 5. Répartition entre modèles et économie de crédits

**Le modèle puissant reprend à L1a** : l'isolation Playwright, le reset de démo isolé, les dates L1c et les premiers contrats Zod sont déjà présents. Il doit faire la migration additive, terminer les DTO, puis avancer dans l'ordre. Lui réserver autant que possible les transactions de L4, allocations de L6 et remise de L7. S'il reste du budget après le parcours minimal, il poursuit l'admin et la recette.

Si le budget du modèle puissant est très court, finir un noyau utile : migration/contrats, dates et transaction de réservation avec quotas, plutôt que multiplier les écrans. Noter les sous-étapes restantes ; un relais ne doit pas confondre cette fondation avec un parcours complet déjà livré.

Ne pas consommer tout ce budget en planification : après ce document, lire uniquement les fichiers du lot, écrire le test critique qui échoue, puis coder. Privilégier un chemin complet à des abstractions génériques supplémentaires.

**Si Luna prend le relais tôt**, le travail continue sur le premier lot incomplet. Les décisions, schémas et critères sont déjà fixés ; un lot à la fois, et découpage local en sous-étapes si nécessaire. Luna peut coder le serveur : les lots sensibles demandent simplement des contrats et vérifications plus précis. Aucun nouveau choix architectural implicite.

**Si le relais passe à Antigravity avec Gemini Pro**, ouvrir le même dossier ou transférer l'arbre de travail complet. Un clone du seul commit `ad7aebe` perdrait les changements actuels. Lire `GEMINI.md`, `AGENTS.md`, `DESIGN.md`, ce plan et le journal de relais. Donner un lot par collage conformément à `GEMINI.md`.

À chaque relais, noter fichiers modifiés, contrat réellement implémenté, commandes et résultats, première sous-étape restante. Si un contrôle échoue, corriger avant de marquer le lot terminé. En Antigravity, respecter l'arrêt/rapport demandé par `GEMINI.md`, puis reprendre la correction dans le lot suivant autorisé.

## 6. Tests utiles et limites du périmètre

Respecter le TDD d'`AGENTS.md` avec les quelques scénarios qui protègent le métier : dates Paris, quota concurrent/rollback, annulation idempotente, réception répétée, allocation complète, retrait unique et accès restaurant. Ajouter ces cas aux suites pertinentes ; éviter les tests qui répètent simplement chaque champ d'un formulaire.

UI : composants et tokens de `DESIGN.md`, pas de refonte. Les erreurs restent centralisées ; quatre états par écran/section, clavier et mouvement réduit. Lire les guides Next locaux pertinents avant code : `node_modules/next/dist/docs/01-app/01-getting-started/`, notamment mutations, Route Handlers, cache, erreurs et composants serveur/client. Disponibilités, tickets et stocks ne doivent pas être servis depuis un cache périmé.

Après L11 seulement : gestion plus complète des ventes directes de produits froids (sorties de stock libres, aucune fausse caisse Izly), substitutions encadrées, workflow détaillé de lots/DLC, invitations avancées, amélioration IA et reporting secondaire. Ne pas supprimer le recours aux produits froids existants.

Validation CROUS restant nécessaire avant un pilote réel : disponibilité locale de la formule et tarifs, composition autorisée, heure limite, source/préparation/livraison, responsabilité sur les écarts, procédure de paiement constaté et règles sanitaires pour les restes. Ces points ne bloquent pas une démonstration clairement configurée comme telle.

Méthode du relais : conserver spécification, petits jalons et état réel dans les fichiers du dépôt. Cette approche est décrite dans la [documentation officielle OpenAI sur les travaux longs avec Codex](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex) ; le découpage et les choix métier ci-dessus sont propres à CrousFlow.
