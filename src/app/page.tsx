import Link from 'next/link'
import { Utensils, Ticket, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fff7e7] py-12 px-5 sm:px-6 lg:px-8">
      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto w-full">
        <p className="mb-6 rounded-full bg-[#ffc857]/35 px-5 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#245642]">
          Restauration universitaire · CrousFlow
        </p>
        <h1 className="text-6xl md:text-8xl font-display font-bold text-[#245642] tracking-tight mb-6 leading-[1.02]">
          Votre repas universitaire,
          <br />
          <span className="text-[#ee583f]">simplement.</span>
        </h1>
        <p className="text-lg md:text-xl text-ink/80 max-w-2xl mx-auto mb-10 font-medium">
          Consultez les menus de votre restaurant universitaire, réservez votre repas et présentez
          votre ticket au retrait.
        </p>

        <Link
          href="/menu"
          className="inline-flex min-h-14 items-center justify-center px-8 py-4 text-base font-bold text-white bg-[#ee583f] hover:bg-[#d84731] rounded-full shadow-[0_7px_0_#bf402d] transition-transform hover:-translate-y-1 motion-reduce:transform-none focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
        >
          Consulter les menus ↗
        </Link>

        <div className="mt-14 flex w-full flex-col items-center rounded-[3rem] bg-[#ffc857]/60 p-8 sm:p-12">
          <Utensils aria-hidden="true" className="h-24 w-24 text-forest" />
          <p className="mt-5 font-display text-3xl text-forest">
            Un service adapté à votre vie étudiante.
          </p>
          <p className="mt-2 text-sm font-medium text-forest">
            Des menus accessibles, des créneaux organisés, un retrait facilité.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 w-full max-w-4xl text-left">
          <div className="p-6 rounded-2xl border border-sage bg-paper">
            <Utensils className="h-10 w-10 text-tomato mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">1. Réserver</h3>
            <p className="text-ink/80">
              Découvrez les plats et choisissez le créneau qui vous convient.
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
            <h3 className="text-xl font-display font-bold mb-2">3. Retirer votre repas</h3>
            <p className="text-ink/80">
              Présentez votre ticket au personnel à l’horaire indiqué pour retirer votre repas.
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
