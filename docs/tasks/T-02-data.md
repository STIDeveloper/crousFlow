# Tâche T-02 — data

Agent : data Priorité : MUST Exigence : F-07, F-11
Objectif : Générer un seed de 12 semaines et créer les services d'analytique (agrégats).
Périmètre (fichiers autorisés) : prisma/seed.ts, src/server/analytics/, tests/data/
Entrées : CAHIER_DES_CHARGES.md
Critères d'acceptation :

- Seed répétable générant 12 semaines d'historique avec pics et creux (mardi/jeudi hauts, vendredi bas).
- Fonctions d'agrégats correctes par plat/créneau/jour.
  Hors périmètre : Appels Gemini.
  Risques : Seed trop lent ou aléatoire (doit être déterministe).
  Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
  Handoff → ia : historique prêt pour calculer la prévision.
