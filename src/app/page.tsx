import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UtensilsCrossed,
  Clock,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { PhoneMockup } from '@/components/marketing/PhoneMockup'

const STEPS = [
  {
    icon: UtensilsCrossed,
    title: 'Choisissez votre plat',
    text: 'Consultez les menus de la semaine, les allergènes, et composez votre plateau : plat, entrée, dessert.',
  },
  {
    icon: Clock,
    title: 'Réservez votre créneau',
    text: 'Choisissez l’heure de retrait selon l’affluence affichée en direct. Un repas par service, sans double réservation.',
  },
  {
    icon: QrCode,
    title: 'Présentez votre ticket QR',
    text: 'Au comptoir, un scan suffit. Le paiement Izly se fait sur place, comme d’habitude.',
  },
  {
    icon: BarChart3,
    title: 'La cuisine produit au plus juste',
    text: 'Réservations et prévision guident la production : moins de restes, moins d’attente.',
  },
]

const AUDIENCES = [
  {
    icon: GraduationCap,
    title: 'Étudiants',
    points: [
      'Menus de la semaine et allergènes',
      'Réservation en trois gestes, sur mobile',
      'Ticket QR et historique des repas',
    ],
    href: '/menu',
    cta: 'Voir les menus',
  },
  {
    icon: ChefHat,
    title: 'Équipes de cuisine',
    points: [
      'Quantités à préparer par plat et par créneau',
      'Validation des retraits au scan ou au code',
      'Ruptures, livraisons et vente comptoir',
    ],
    href: '/connexion',
    cta: 'Ouvrir l’espace cuisine',
  },
  {
    icon: ShieldCheck,
    title: 'Direction du Crous',
    points: [
      'Taux de retrait, absences, affluence',
      'Export des données en un clic',
      'Robustesse testée en continu (24 scénarios)',
    ],
    href: '/connexion',
    cta: 'Ouvrir l’administration',
  },
]

const FACTS = [
  { value: '1,00 €', label: 'Formule sociale Crous, inchangée' },
  { value: '24/24', label: 'Scénarios de robustesse validés en continu' },
  { value: '5 s', label: 'Délai maximal de l’IA avant repli automatique' },
  { value: '0', label: 'Donnée bancaire stockée : le paiement reste sur Izly' },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-50 border-b border-line/70 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:min-h-18 sm:px-8">
          <Link
            href="/"
            aria-label="CrousFlow, accueil"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <Logo />
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {[
              ['#fonctionnement', 'Fonctionnement'],
              ['#espaces', 'Pour qui ?'],
              ['#prevision', 'Prévision IA'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="min-h-11 content-center rounded-full px-4 text-sm font-bold text-ink-soft transition-colors hover:bg-brand-soft hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/menu"
              className="hidden min-h-11 content-center rounded-full px-4 text-sm font-bold text-ink hover:bg-brand-soft sm:block"
            >
              Consulter les menus
            </Link>
            <Link
              href="/connexion"
              className="min-h-11 content-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-brand-deep"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="sky-gradient relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="ripple pointer-events-none absolute -right-72 -top-72 -z-10 size-[64rem] rounded-full"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="visual-kicker mb-5 inline-flex rounded-full bg-surface/60 px-4 py-2 text-ink">
                Restauration universitaire
              </p>
              <h1 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
                Réservez votre repas.
                <br />
                <span className="text-brand-deep">Retirez-le sans attendre.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg font-medium text-ink/85">
                CrousFlow relie les étudiants et les cuisines des restaurants universitaires :
                réservation la veille, ticket QR au comptoir, production ajustée à la demande
                réelle.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/menu"
                  className="inline-flex min-h-13 items-center gap-2 rounded-full bg-primary px-7 text-base font-extrabold text-primary-foreground shadow-md transition-colors hover:bg-brand-deep"
                >
                  Consulter les menus
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/connexion"
                  className="inline-flex min-h-13 items-center gap-2 rounded-full bg-surface px-7 text-base font-extrabold text-ink shadow-md transition-colors hover:bg-brand-soft"
                >
                  Essayer la démo
                </Link>
              </div>
              <ul className="mt-9 grid gap-3 text-sm font-bold sm:grid-cols-3">
                {['Formule Crous à 1,00 €', 'Ticket QR sécurisé', 'Paiement Izly au comptoir'].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf text-ink">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <PhoneMockup />
          </div>
        </section>

        <section id="fonctionnement" className="scroll-mt-20">
          <div className="deep-gradient px-4 py-6 text-center">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-[0.12em] text-surface sm:text-2xl">
              Comment ça marche ?
            </h2>
          </div>
          <ol className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li
                key={title}
                className="relative rounded-[1.75rem] border border-line/70 bg-surface p-6 shadow-card"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="font-display text-xl font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="espaces" className="scroll-mt-20 bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-20">
            <p className="visual-kicker text-primary">Un service, trois espaces</p>
            <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Chacun voit ce qui compte pour lui.
            </h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {AUDIENCES.map(({ icon: Icon, title, points, href, cta }) => (
                <article
                  key={title}
                  className="flex flex-col rounded-[1.75rem] border border-line bg-canvas p-7"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-brand text-ink">
                    <Icon className="size-7" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-extrabold">{title}</h3>
                  <ul className="mt-4 flex-1 space-y-3">
                    {points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm font-medium text-ink">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-ok"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-primary px-5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {cta}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="prevision" className="theme-staff scroll-mt-20 bg-deep text-surface">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
            <div>
              <p className="visual-kicker text-highlight">Prévision de la demande</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                La cuisine sait quoi produire. L’IA explique pourquoi.
              </h2>
              <p className="mt-5 text-lg text-mist">
                Un modèle statistique calcule les quantités à partir de douze semaines d’historique
                et des réservations du jour. Gemini les commente en une phrase et propose une
                action.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  'L’IA n’invente jamais une quantité : elle l’explique',
                  'Sans réseau ou sans clé, une explication locale prend le relais',
                  'Réponses mises en cache : l’écran reste instantané en service',
                ].map((item) => (
                  <li key={item} className="flex gap-3 font-medium">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ok text-deep">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4" aria-label="Aperçu de l’écran cuisine">
              {[
                {
                  name: 'Curry de légumes et riz',
                  target: 'Cible : 42 repas · fourchette 36–48',
                  text: 'Les réservations dépassent déjà la moyenne des lundis : la demande est soutenue.',
                  action: 'Préparez un second bac pour 12:15.',
                  alert: true,
                },
                {
                  name: 'Poisson sauce citron',
                  target: 'Cible : 28 repas · fourchette 24–32',
                  text: 'Demande conforme à l’historique, 60 % déjà réservés.',
                  action: 'Lancer la production prévue.',
                  alert: false,
                },
              ].map((card) => (
                <article
                  key={card.name}
                  className="rounded-2xl border border-line bg-deep-2 p-5 shadow-float"
                >
                  <div className="flex gap-3">
                    {card.alert ? (
                      <TriangleAlert
                        className="mt-0.5 size-5 shrink-0 text-warn"
                        aria-hidden="true"
                      />
                    ) : (
                      <Sparkles
                        className="mt-0.5 size-5 shrink-0 text-highlight"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{card.name}</h3>
                        <span className="rounded-full border border-mist/40 px-2 py-0.5 text-[11px] font-bold text-mist">
                          Expliqué par Gemini
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-mist">{card.target}</p>
                      <p className="mt-2 text-sm text-surface/90">{card.text}</p>
                      <p className="mt-2 text-sm font-bold text-highlight">→ {card.action}</p>
                    </div>
                  </div>
                </article>
              ))}
              <p className="text-center text-xs text-mist">
                Aperçu illustratif de l’écran cuisine.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div
                key={fact.label}
                className="rounded-[1.75rem] border border-line/70 bg-surface p-6 text-center shadow-card"
              >
                <dt className="sr-only">{fact.label}</dt>
                <dd className="font-display text-4xl font-extrabold text-primary">{fact.value}</dd>
                <dd className="mt-2 text-sm font-medium text-ink-soft">{fact.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="px-4 pb-16 sm:px-8">
          <div className="sky-gradient relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-6 py-14 text-center sm:px-12">
            <div
              aria-hidden="true"
              className="ripple pointer-events-none absolute left-1/2 top-1/2 size-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            />
            <h2 className="relative font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Voyez CrousFlow en action.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg font-medium text-ink/85">
              Parcourez l’espace étudiant, l’écran cuisine et l’administration avec des données de
              démonstration.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/connexion"
                className="inline-flex min-h-13 items-center gap-2 rounded-full bg-primary px-7 font-extrabold text-primary-foreground shadow-md hover:bg-brand-deep"
              >
                Ouvrir la démo
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href="/menu"
                className="inline-flex min-h-13 items-center rounded-full bg-surface px-7 font-extrabold text-ink shadow-md hover:bg-brand-soft"
              >
                Consulter les menus
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="theme-staff bg-deep text-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Logo tone="dark" />
            <p className="mt-3 max-w-md text-sm text-mist">
              Réservation des repas en restaurant universitaire. Démonstration : toutes les données
              sont fictives.
            </p>
          </div>
          <nav
            aria-label="Liens de pied de page"
            className="flex flex-wrap gap-2 text-sm font-bold"
          >
            <Link
              href="/menu"
              className="min-h-11 content-center rounded-full px-4 hover:bg-deep-2"
            >
              Menus
            </Link>
            <Link
              href="/connexion"
              className="min-h-11 content-center rounded-full px-4 hover:bg-deep-2"
            >
              Connexion
            </Link>
          </nav>
        </div>
        <p className="border-t border-line px-4 py-4 text-center text-xs text-mist sm:px-8">
          CrousFlow est un projet indépendant, non affilié à Izly ni au réseau des Crous.
        </p>
      </footer>
    </div>
  )
}
