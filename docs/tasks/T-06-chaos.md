# Tâche T-06 — chaos
Agent : chaos            Priorité : MUST       Exigence : F-08
Objectif : Console terminal et exécuteur de scénarios de robustesse C-01 à C-24.
Périmètre (fichiers autorisés) : src/server/chaos/, src/app/(admin)/admin/chaos/, tests/chaos/
Entrées : CAHIER_DES_CHARGES.md (Section 10)
Critères d'acceptation : 
- UI style terminal en direct.
- Rejouabilité des 24 cas avec verdict success/fail selon les codes attendus.
- Aucun crash (100% traités proprement).
Hors périmètre : Ajout de règles de validation métier.
Risques : Test C-08 de concurrence difficile à fiabiliser en CI.
Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
Handoff → qa : suite chaos intégrée.
