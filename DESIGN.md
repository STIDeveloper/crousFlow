# DESIGN.md — CrousFlow

> Source de vérité visuelle. Tous les agents (frontend, ui-reviewer, qa) lisent ce fichier AVANT de toucher à l'interface.
> Règle d'or : aucune nouvelle librairie UI sans justification écrite dans la PR.

## 1. Direction artistique : « Campus cyan »

CrousFlow parle la même langue visuelle que l'écosystème de paiement étudiant déjà familier des usagers des restaurants universitaires : cyan lumineux, grands cercles, boutons en pilule, typographie Raleway. L'étudiant ne change pas d'univers entre le paiement au comptoir et la réservation.

CrousFlow garde **sa propre identité** : son nom, son logo (un bol dont la vapeur dessine le « flow ») et ses illustrations. Aucun logo, nom ou élément graphique d'un tiers n'est repris.

- **Ton** : sérieux sur le fond (précarité, gaspillage), simple et rassurant sur la forme.
- **Deux ambiances** :
  - **Étudiant (clair, mobile-first)** : fond glacier, bandeaux ciel → cyan, cartes blanches, une main suffit.
  - **Espace personnel — cuisine, administration (sombre, grand écran)** : bleu nuit, accents cyan et lime, gros chiffres lisibles à deux mètres.
- **Signatures** :
  - le **grand cercle blanc** qui porte le chiffre clé (formule à 1,00 €, QR code du ticket, code 404) ;
  - les **ondes concentriques** en filigrane (`.ripple`), comme un paiement sans contact ;
  - les **pastilles rondes** (créneaux de retrait, étapes numérotées, icônes) ;
  - le **vert lime** pour les actions « + » et les confirmations ;
  - la **barre d'onglets bleu nuit** en bas de l'écran mobile, icônes dans des cercles, onglet actif plein.
- **À éviter** : dégradés violets, glassmorphism partout, emojis comme icônes, texte blanc sur cyan clair, animations qui bloquent l'action.

## 2. Stack UI

| Couche     | Choix                                       | Rôle                                  |
| ---------- | ------------------------------------------- | ------------------------------------- |
| Framework  | Next.js 16.x (App Router, Turbopack)        | Rendu, routes, Server Actions         |
| UI runtime | React 19 + React Compiler                   | Réactivité sans useMemo/useCallback   |
| Style      | Tailwind CSS 4.x (config CSS-first, @theme) | Tokens de design                      |
| Composants | shadcn/ui (Base UI par défaut)              | Base accessible                       |
| Animation  | motion                                      | Transitions, tilt du ticket           |
| Graphiques | Recharts                                    | Prévisions, affluence, non-retraits   |
| Données    | TanStack Query v5                           | Cache, refetch                        |
| Feedback   | Sonner, Lucide                              | Toasts (en haut, couleurs d'état)     |
| Thème      | next-themes (forcé clair) + `.theme-staff`  | Clair étudiant / sombre espace perso. |
| IA         | Vercel AI SDK + @ai-sdk/google              | Explications structurées (Zod)        |
| QR         | qrcode.react                                | Ticket de retrait                     |

## 3. Tokens (Tailwind v4, `src/app/globals.css`)

Aucune couleur codée en dur dans les composants : uniquement ces tokens (`bg-primary`, `text-ink-soft`, `border-line`…). Les illustrations SVG (plat, icône d'application) sont la seule exception.

| Token              | Clair (étudiant) | Sombre (`.theme-staff`) | Usage                                         |
| ------------------ | ---------------- | ----------------------- | --------------------------------------------- |
| `brand`            | `#01ABD5`        | —                       | Grands aplats, cercles, pictogramme           |
| `brand-light`      | `#45CEF8`        | —                       | Accents, onglet actif mobile                  |
| `brand-soft`       | `#D9F2FB`        | —                       | Fonds doux, puces, survols                    |
| `brand-deep`       | `#006580`        | —                       | Survol des boutons, mots accentués des titres |
| `leaf`             | `#91C448`        | —                       | Actions « + », confirmations (fond)           |
| `canvas`           | `#F3F9FC`        | —                       | Fond de page                                  |
| `surface`          | `#FFFFFF`        | `#FFFFFF`               | Cartes ; texte clair sur fond sombre          |
| `ink` / `ink-soft` | `#10242D` / `#4F6370` | —                  | Texte principal / secondaire                  |
| `line`             | `#D8E8F0`        | `#1F4655`               | Bordures                                      |
| `primary`          | `#007F9F`        | `#45CEF8`               | Boutons, liens, onglet actif                  |
| `highlight`        | `#01ABD5`        | `#45CEF8`               | Focus, sur-titres, accents                    |
| `mist`             | `#E3F3FA`        | `#A9C7D3`               | Fond atténué (clair) / texte atténué (sombre) |
| `deep` / `deep-2`  | `#0A1C24` / `#102B36` | `#0A1C24` / `#12303C` | Surfaces sombres, barre d'onglets       |
| `ok`               | `#2B7F36`        | `#A6D85B`               | Succès (texte)                                |
| `warn`             | `#F2A900`        | `#FFC94A`               | Vigilance                                     |
| `danger`           | `#D2242C`        | `#FF6B6B`               | Erreur, annulation                            |

Classes signature : `.sky-gradient` (bandeau ciel → cyan), `.deep-gradient` (bandeau profond pour texte blanc), `.ripple` (ondes), `.food-card`, `.visual-kicker` (sur-titre en capitales), ombres `shadow-card` et `shadow-float`, rayon `rounded-card`.

### Règles de contraste (WCAG AA)

- Texte blanc **uniquement** sur `primary` (`#007F9F`, 4,6:1) ou plus foncé. Jamais sur `brand` ni sur `.sky-gradient`.
- Sur `.sky-gradient` et sur `brand` : texte `ink` (≥ 6:1).
- `leaf`, `brand`, `warn` ne servent jamais de couleur de texte sur fond blanc : ce sont des fonds.
- En sombre, texte courant `surface`, texte secondaire `mist` (≥ 9:1 sur `deep`).

## 4. Typographie

Via `next/font` (auto-hébergées) :

- **Raleway** : titres (`font-display`, 700–800) et interface étudiante (`font-sans`).
- **Geist** : interface de l'espace personnel (tableaux denses, chiffres).
- **Geist Mono** : codes de ticket.

Chiffres alignés activés globalement (`font-variant-numeric: lining-nums`) : indispensable avec Raleway pour les prix et les horaires. `tabular-nums` dans les compteurs.

## 5. Mouvement

- Librairie unique : motion. L'app est enveloppée dans `<MotionConfig reducedMotion="user">`.
- Ressorts courts, durées 150–350 ms. Le ticket a un tilt léger (± 6°) désactivé si `prefers-reduced-motion`.
- Squelettes de chargement en `animate-pulse`, toujours avec `motion-reduce:animate-none`.

## 6. Écrans et interactions signature

1. **Accueil** : page de présentation du service (maquette de téléphone en HTML, « Comment ça marche ? » en 4 étapes, trois espaces, prévision IA, chiffres vérifiables).
2. **Menu de la semaine** : bandeau ciel avec le cercle « 1,00 € », jours en pastilles (point lime = repas réservé), créneaux en boutons ronds avec affluence (« Calme », « Fréquenté », « Très demandé »), cartes de plat avec prix en médaillon.
3. **Composition du repas** : fenêtre à en-tête ciel, options en cartes sélectionnables, total en évidence, fermeture par Échap.
4. **Mes tickets** : ticket actif façon écran de paiement (QR dans un grand cercle blanc qui chevauche le bandeau), historique façon relevé avec bilan (retirés, non retirés, annulés).
5. **Cuisine** : onglets en pilule, gros chiffres « à préparer », barres cible / préparé, explications de prévision (badge « Expliqué par Gemini » ou « Calcul local »), produits sans demande regroupés.
6. **Administration** : navigation en pilules avec page active, indicateurs, réservations et non-retraits par jour, exports CSV.
7. **Console de robustesse** : 24 scénarios, verdict par ligne.

## 7. États obligatoires

Chaque écran a : squelette de chargement, état vide illustré, état d'erreur avec action de reprise, état hors-ligne. Page 404 et erreurs globales aux couleurs du service. Jamais d'écran blanc. Messages en français, qui disent quoi faire.

## 8. Accessibilité et performance

- Contraste WCAG AA (voir §3), focus visible (`outline` `highlight`), navigation clavier complète.
- Cibles tactiles ≥ 44 px, mobile-first, `env(safe-area-inset-bottom)` sous la barre d'onglets.
- Aucune image lourde : illustrations et maquettes en SVG / HTML. Polices via `next/font`.

## 9. Definition of Done visuelle

- [ ] Conforme aux tokens, aucune couleur codée en dur
- [ ] Clair (étudiant) et sombre (espace personnel) OK
- [ ] 4 états présents (chargement, vide, erreur, hors-ligne)
- [ ] `prefers-reduced-motion` respecté
- [ ] Testé à 390 px et 1440 px
- [ ] Capture d'écran ajoutée dans `screenshots/`
