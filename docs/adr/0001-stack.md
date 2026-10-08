# ADR 0001 : Stack Technique

## Décisions de stack
- **Framework** : Next 16.4 + React 19.3 + React Compiler. 
  *Justification* : Offre les performances du rendu serveur et la réactivité native sans mémorisation manuelle (useMemo). 
  *Alternative écartée* : Remix (écosystème moins riche pour nos besoins spécifiques). 
  *Risque* : Turbopack et React Compiler sont récents, bugs possibles sur des cas complexes.
- **Style** : Tailwind 4.3 + shadcn Base UI + motion. 
  *Justification* : Configuration CSS-first rapide et UI accessible par défaut, animations fluides compatibles reduced-motion. 
  *Alternative écartée* : Material UI (trop lourd, difficile à personnaliser avec la DA souhaitée). 
  *Risque* : Complexité d'intégration si Tailwind v4 alpha/beta a des bugs.
- **Base de données** : Prisma 7 + better-sqlite3. 
  *Justification* : ORM typé de bout en bout, facile à déployer localement sans dépendance réseau pour la démo. 
  *Alternative écartée* : Drizzle (moins mature sur les migrations complexes). 
  *Risque* : SQLite limite certaines concurrences d'écriture, mais le pool de l'adaptateur gère la plupart des cas.
- **IA** : Vercel AI SDK + @ai-sdk/google (modèle gemini-3.8-flash). 
  *Justification* : Streaming unifié, sorties Zod garanties, modèle rapide et très compétitif. 
  *Alternative écartée* : Appels directs à l'API Google (plus de code boilerplate). 
  *Risque* : Indisponibilité réseau ou quota dépassé.
- **Qualité** : Zod + Vitest + Playwright. 
  *Justification* : Validation commune front/back, tests rapides, E2E robuste. 
  *Alternative écartée* : Jest + Cypress (plus lents, moins bonne DX). 
  *Risque* : Temps d'exécution des tests Playwright élevé en CI.
