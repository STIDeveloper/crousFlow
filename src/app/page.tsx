import Link from 'next/link'
import { ImpactBanner } from '@/components/features/ImpactBanner'
import { Utensils, Ticket, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto w-full">
        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-ink tracking-tight mb-6">
          Réservé. <span className="text-forest">Chauffé.</span> Prêt.
        </h1>
        <p className="text-lg md:text-xl text-ink/80 max-w-2xl mx-auto mb-10 font-medium">
          Réservez vos repas de la semaine au CROUS. Zéro file, zéro gaspillage.
        </p>

        <Link
          href="/menu"
          className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-paper bg-forest hover:bg-forest/90 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
        >
          Voir le menu de la semaine
        </Link>

        <ImpactBanner />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 w-full max-w-4xl text-left">
          <div className="p-6 rounded-2xl border border-sage bg-paper">
            <Utensils className="h-10 w-10 text-tomato mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">1. Réserver</h3>
            <p className="text-ink/80">
              Choisissez vos plats et vos créneaux pour la semaine, jusqu&apos;à 15 minutes avant.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-sage bg-paper">
            <Ticket className="h-10 w-10 text-ok mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">2. Ticket QR</h3>
            <p className="text-ink/80">
              Recevez un ticket QR unique et sécurisé pour chaque réservation confirmée.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-sage bg-paper">
            <Zap className="h-10 w-10 text-forest mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">3. Retrait express</h3>
            <p className="text-ink/80">
              Scannez votre ticket en cuisine et récupérez votre repas sans faire la queue.
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-20 py-6 text-center text-sm text-ink/60">
        <p>Démonstration — données fictives</p>
      </footer>
    </div>
  )
}
