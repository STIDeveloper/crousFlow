# Tâche T-03 — ia
Agent : ia            Priorité : MUST       Exigence : F-07, F-10
Objectif : Prévision statistique, MAE/MAPE, et appel Gemini explicatif avec repli.
Périmètre (fichiers autorisés) : src/server/ia/, src/lib/schemas/ia.ts
Entrées : docs/adr/0003-ia-explicative.md
Critères d'acceptation : 
- Calcul statistique robuste (moyenne mobile pondérée).
- Explication LLM structurée Zod (alerte, action).
- En cas de timeout (5s) ou panne, fallback sur stat sans planter.
Hors périmètre : UI cuisine.
Risques : Dépendance réseau instable, hallucination JSON.
Définition de terminé : tests écrits et verts, pnpm check vert, notes de handoff
Handoff → frontend : Endpoints IA avec fallback prêts.
