'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="flex max-w-lg flex-col items-center rounded-[2rem] border border-line/70 bg-surface p-8 text-center shadow-card">
        <div className="mb-5 grid size-20 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertCircle className="size-10" aria-hidden="true" />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-ink">
          Oups, une erreur est survenue
        </h2>
        <p className="mt-2 text-ink-soft">
          Nous n&apos;avons pas pu charger cette page. Vous pouvez réessayer ou revenir plus tard.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground hover:bg-brand-deep"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Réessayer
        </button>
      </div>
    </div>
  )
}
