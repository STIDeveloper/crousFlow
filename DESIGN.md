# DESIGN.md — CrousFlow

> Source de vérité visuelle. Tous les agents (frontend, ui-reviewer, qa) lisent ce fichier AVANT de toucher à l'interface.
> Règle d'or : aucune nouvelle librairie UI sans justification écrite dans la PR.

## 1. Direction artistique : « Cantine éditoriale »

Un service public qui a le soin d'un produit premium. Chaleureux, appétissant, lisible, jamais « SaaS violet générique ».

- **Ton** : sérieux sur le fond (précarité, gaspillage), chaleureux sur la forme (papier crème, vert profond, orange plat chaud).
- **Deux ambiances** :
  - **Étudiant (clair, mobile-first)** : crème, cartes douces, gros boutons, une main suffit.
  - **Cuisine / Admin (sombre, grand écran)** : contraste élevé, gros chiffres, lisible à 2 mètres.
- **Mots-clés** : papier, ticket, plateau, vapeur, service.
- **À éviter** : dégradés violets, glassmorphism partout, emojis comme icônes, animations qui bloquent l'action.

## 2. Stack UI

| Couche           | Choix                                       | Rôle                                |
| ---------------- | ------------------------------------------- | ----------------------------------- |
| Framework        | Next.js 16.x (App Router, Turbopack)        | Rendu, routes, Server Actions       |
| UI runtime       | React 19 + React Compiler                   | Réactivité sans useMemo/useCallback |
| Style            | Tailwind CSS 4.x (config CSS-first, @theme) | Tokens de design                    |
| Composants       | shadcn/ui (Base UI par défaut)              | Base accessible                     |
| Animation        | motion                                      | Layout animations, transitions      |
| Effets signature | Magic UI + Aceternity (1-2 max)             | Number ticker, beams, 3D            |
| Graphiques       | shadcn/ui Charts (Recharts)                 | Prévisions, affluence, KPI          |
| Données          | TanStack Query v5 + Table v8                | Cache, refetch live                 |
| Formulaires      | React Hook Form + Zod                       | Validation unique                   |
| Feedback         | Sonner, Lucide                              | Toasts, icônes                      |
| Thème            | next-themes                                 | Clair / sombre                      |
| IA               | Vercel AI SDK + @ai-sdk/google              | Streaming, sorties Zod              |
| QR               | qrcode.react                                | Ticket de retrait                   |

## 3. Tokens (Tailwind v4, app/globals.css)

Couleurs en oklch. Le texte ne doit jamais utiliser l'orange (contraste insuffisant) : l'orange sert aux fonds.

@theme {
--color-paper: oklch(0.975 0.012 85);
--color-ink: oklch(0.22 0.03 150);
--color-forest: oklch(0.42 0.09 155);
--color-tomato: oklch(0.68 0.19 40);
--color-sage: oklch(0.90 0.04 150);
--color-ok: oklch(0.62 0.15 150);
--color-warn: oklch(0.80 0.15 85);
--color-danger: oklch(0.55 0.20 25);
--color-night: oklch(0.18 0.02 150);
--color-night-2: oklch(0.24 0.03 150);
--color-glow: oklch(0.80 0.17 75);
--radius-card: 1.25rem;
--font-display: "Fraunces", serif;
--font-sans: "Geist", system-ui, sans-serif;
--font-mono: "Geist Mono", ui-monospace, monospace;
}

Typographie via next/font : Fraunces (titres), Geist (interface), Geist Mono (ticket, logs).

## 4. Mouvement

- Librairie unique : motion. Envelopper l'app dans <MotionConfig reducedMotion="user">.
- Ressorts courts (stiffness ~300, damping ~30). Durées 150-350 ms.
- Transitions partagées (layoutId) pour plat → panier → ticket.
- Listes en cascade (stagger 40 ms), max 12 éléments animés.
- Chaque effet Magic UI / Aceternity désactivable avec prefers-reduced-motion.

## 5. Écrans et interactions signature

1. Planificateur de semaine : grille lundi-vendredi × créneaux. Tap = réserve, la carte vole vers le récap, total animé. Jauge d'affluence par créneau.
2. Ticket de retrait : carte billet, bord perforé, tilt 3D léger, QR code. État « consommé » clair.
3. Carte d'affluence : heatmap temps réel (TanStack Query).
4. Dashboard cuisine (sombre) : gros chiffres « à préparer », courbe réservé vs prévision IA, alertes gaspillage. Beam animé Réservations → Prévision → Production.
5. Console « Test de robustesse » : style terminal en direct. Chaque entrée absurde apparaît, puis badge « Rejeté proprement : raison ».
6. Bandeau d'impact : repas servis, gaspillage évité, minutes de file économisées.

## 6. États obligatoires

Chaque écran a : squelette de chargement, état vide illustré, état d'erreur avec action de reprise, état hors-ligne. Error boundaries par zone. Jamais d'écran blanc. Messages en français, qui disent quoi faire.

## 7. Accessibilité et performance

- Contraste WCAG AA minimum, focus visible, navigation clavier complète.
- Cibles tactiles ≥ 44 px, mobile-first.
- LCP < 2 s en local sur la page de réservation, aucun décalage de mise en page visible.
- Images optimisées (next/image), polices via next/font.

## 8. Definition of Done visuelle

- [ ] Conforme aux tokens, aucune couleur codée en dur
- [ ] Clair et sombre OK
- [ ] 4 états présents (chargement, vide, erreur, hors-ligne)
- [ ] prefers-reduced-motion respecté
- [ ] Testé à 375 px et 1440 px
- [ ] Capture d'écran ajoutée dans screenshots/
