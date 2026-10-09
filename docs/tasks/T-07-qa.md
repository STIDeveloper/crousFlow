# Tâche T-07 — qa

Agent : qa Priorité : MUST Exigence : Qualité
Objectif : Configuration tests unitaire, intégration, E2E, et couverture de code.
Périmètre (fichiers autorisés) : tests/ (sauf chaos, data), vitest.config.ts, playwright.config.ts
Entrées : CAHIER_DES_CHARGES.md (Section 12.2)
Critères d'acceptation :

- Couverture >= 80% sur src/server.
- 3 parcours E2E verts (réserver, valider ticket, console robustesse).
  Hors périmètre : Implémentation des fonctionnalités.
  Risques : Flakiness (tests instables).
  Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
  Handoff → devops : CI prête.
