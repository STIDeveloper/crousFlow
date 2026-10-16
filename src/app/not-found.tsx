import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

export default function NotFound() {
  return (
    <div className="sky-gradient relative isolate flex min-h-screen flex-col overflow-hidden text-ink">
      <div
        aria-hidden="true"
        className="ripple pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
      />
      <header className="px-4 py-5 sm:px-8">
        <Link href="/" aria-label="CrousFlow, accueil" className="inline-flex rounded-full">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
        <div className="grid size-48 place-items-center rounded-full bg-surface shadow-float">
          <span className="font-display text-6xl font-extrabold tracking-tight text-primary">
            404
          </span>
        </div>
        <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Cette page n’est pas au menu.
        </h1>
        <p className="mt-3 max-w-md text-lg font-medium text-ink/85">
          L’adresse est peut-être incomplète, ou la page a été déplacée.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/menu"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-extrabold text-primary-foreground shadow-md hover:bg-brand-deep"
          >
            Voir les menus
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-full bg-surface px-6 font-extrabold text-ink shadow-md hover:bg-brand-soft"
          >
            Retour à l’accueil
          </Link>
        </div>
      </main>
    </div>
  )
}
