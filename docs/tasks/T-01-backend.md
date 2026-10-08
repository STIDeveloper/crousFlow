# Tâche T-01 — backend
Agent : backend            Priorité : MUST       Exigence : F-02, F-04, F-05
Objectif : Implémenter la réservation transactionnelle et les tickets QR signés HMAC.
Périmètre (fichiers autorisés) : src/server/reservations/, src/app/api/, src/config/
Entrées : docs/adr/0002-reservation-transactionnelle.md, src/lib/schemas/reservation.ts
Critères d'acceptation : 
- La réservation décrémente correctement la capacité via update conditionnel.
- L'activeKey assure l'unicité.
- Un token QR signé est généré.
- La validation empêche le double scan.
Hors périmètre : UI, prévisions IA.
Risques : Surréservation si transaction mal isolée.
Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
Handoff → frontend : API routes disponibles pour la réservation.
