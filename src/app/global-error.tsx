'use client'

import './globals.css'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body className="sky-gradient flex min-h-screen flex-col items-center justify-center p-6 text-center font-sans text-ink">
        <div className="max-w-md rounded-[2rem] bg-surface p-8 shadow-float">
          <h2 className="font-display text-3xl font-extrabold">
            Service momentanément indisponible
          </h2>
          <p className="mt-3 text-ink-soft">
            L&apos;application a rencontré un problème. Vos réservations ne sont pas perdues.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 min-h-11 rounded-full bg-primary px-6 font-bold text-primary-foreground hover:bg-brand-deep"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
