# Déroulé de la Démo

- **0:00 - 0:30** : Pitch court (Hook, problème, solution).
- **0:30 - 1:30** : Parcours étudiant.
  - Connexion avec `etudiant1@crousflow.test`.
  - Réservation d'un plat sur un créneau.
  - Affichage et explication du ticket QR Code.
- **1:30 - 2:30** : Dashboard cuisine.
  - Bascule sur `cuisine@crousflow.test`.
  - Présentation des gros chiffres (mode sombre).
  - Explication du faisceau d'IA et de la jauge "préparé / prévu".
- **2:30 - 4:00** : Console Chaos (Robustesse).
  - Bascule sur `admin@crousflow.test` (écran `/admin/chaos`).
  - Passage du clavier au professeur.
  - Clic sur "Tout lancer", observation du terminal 24/24 en direct.
- **4:00 - 5:00** : Dashboard Admin.
  - Écran d'accueil Admin.
  - Impact social et écologique (minutes économisées, gaspillage évité).
  - Téléchargement du CSV d'export.
- **5:00 - 10:00** : Questions du professeur.

### PLAN B (Secours)

- Si l'API Gemini tombe : Aucun crash. Les prévisions passent en "repli STAT" (moyenne mobile), clairement indiqué dans le dashboard cuisine.
- Pour préparer une démo isolée : lancer `pnpm demo`. Le script reconstruit `prisma/demo.db` et affiche la commande de démarrage avec `CROUSFLOW_DATABASE_PATH`; `prisma/dev.db` n'est jamais supprimée par défaut.
- Si le port ou le réseau tombe complètement : Dossier `screenshots/` pour des captures fonctionnelles, et `docs/video/` pour les enregistrements locaux.
