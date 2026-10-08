'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body className="bg-paper text-ink font-sans flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-3xl font-display font-bold text-danger mb-4">Erreur fatale</h2>
        <p className="text-ink/70 mb-8">L&apos;application a rencontré un problème critique.</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-forest text-paper rounded-full font-bold hover:bg-forest/90"
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
