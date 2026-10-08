'use client'

import { useEffect } from 'react'

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
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <h2 className="text-2xl font-display font-bold text-danger mb-4">
        Oups, une erreur est survenue
      </h2>
      <p className="text-ink/70 mb-8 max-w-md">
        Nous n&apos;avons pas pu charger cette page. Vous pouvez réessayer ou revenir plus tard.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-forest text-paper rounded-full font-bold hover:bg-forest/90 focus:ring-2 focus:ring-forest focus:ring-offset-2"
      >
        Réessayer
      </button>
    </div>
  )
}
