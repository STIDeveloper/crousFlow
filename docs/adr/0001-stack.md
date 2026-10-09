# ADR 0001 : Stack Technique

## Décisions de stack

- **Framework** : Next 16.4 + React 19.3 + React Compiler.
  _Justification_ : Offre les performances du rendu serveur et la réactivité native sans mémorisation manuelle (useMemo).
  _Alternative écartée_ : Remix (écosystème moins riche pour nos besoins spécifiques).
  _Risque_ : Turbopack et React Compiler sont récents, bugs possibles sur des cas complexes.
- **Style** : Tailwind 4.3 + shadcn Base UI + motion.
  _Justification_ : Configuration CSS-first rapide et UI accessible par défaut, animations fluides compatibles reduced-motion.
  _Alternative écartée_ : Material UI (trop lourd, difficile à personnaliser avec la DA souhaitée).
  _Risque_ : Complexité d'intégration si Tailwind v4 alpha/beta a des bugs.
- **Base de données** : Prisma 7 + better-sqlite3.
  _Justification_ : ORM typé de bout en bout, facile à déployer localement sans dépendance réseau pour la démo.
  _Alternative écartée_ : Drizzle (moins mature sur les migrations complexes).
  _Risque_ : SQLite limite certaines concurrences d'écriture, mais le pool de l'adaptateur gère la plupart des cas.
- **IA** : Vercel AI SDK + @ai-sdk/google (modèle gemini-3.8-flash).
  _Justification_ : Streaming unifié, sorties Zod garanties, modèle rapide et très compétitif.
  _Alternative écartée_ : Appels directs à l'API Google (plus de code boilerplate).
  _Risque_ : Indisponibilité réseau ou quota dépassé.
- **Qualité** : Zod + Vitest + Playwright.
  _Justification_ : Validation commune front/back, tests rapides, E2E robuste.
  _Alternative écartée_ : Jest + Cypress (plus lents, moins bonne DX).
  _Risque_ : Temps d'exécution des tests Playwright élevé en CI.
