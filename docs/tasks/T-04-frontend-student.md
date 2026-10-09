# Tâche T-04 — frontend

Agent : frontend Priorité : MUST Exigence : F-02, F-04
Objectif : Planificateur de semaine et affichage du ticket QR (côté étudiant).
Périmètre (fichiers autorisés) : src/app/(student)/, src/components/
Entrées : DESIGN.md, contrats (src/lib/schemas/reservation.ts)
Critères d'acceptation :

- Navigation clavier ok, responsive mobile-first.
- 4 états implémentés (chargement, erreur, vide, normal).
- Jauge d'affluence visible, animation au tap.
  Hors périmètre : Dashboard cuisine.
  Risques : Mauvaise gestion du cache des données dynamiques (Places restantes).
  Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
  Handoff → ui-reviewer : écrans étudiants prêts pour audit.
