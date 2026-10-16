'use client'

import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChefHat,
  GraduationCap,
  Loader2,
  ShieldCheck,
  WifiOff,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogoMark } from '@/components/brand/Logo'

const DEMO_ACCOUNTS = [
  {
    email: 'etudiant1@crousflow.test',
    role: 'STUDENT',
    label: 'Étudiant',
    hint: 'Réserver un repas, retrouver son ticket QR',
  },
  {
    email: 'cuisine@crousflow.test',
    role: 'KITCHEN',
    label: 'Cuisine',
    hint: 'Valider les retraits, piloter la production',
  },
  {
    email: 'admin@crousflow.test',
    role: 'ADMIN',
    label: 'Administration',
    hint: 'Statistiques, services, catalogue, robustesse',
  },
]

const PROMISES = [
  'Réservez la veille, retirez sans attendre',
  'Un ticket QR sécurisé pour chaque repas',
  'Le paiement Izly au comptoir reste inchangé',
]

export default function ConnexionPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  async function login(email: string, role: string) {
    setLoading(email)
    setError(null)
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Connexion impossible. Réessayez dans un instant.')
      queryClient.clear()
      if (role === 'STUDENT') router.push('/menu')
      else if (role === 'KITCHEN') router.push('/kitchen')
      else router.push('/admin')
      router.refresh()
    } catch (loginError) {
      setLoading(null)
      setError(loginError instanceof Error ? loginError.message : 'Connexion impossible.')
    }
  }

  return (
    <div className="sky-gradient relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden sm:min-h-[calc(100dvh-4.5rem)]">
      <div
        aria-hidden="true"
        className="ripple pointer-events-none absolute -left-60 top-1/2 -z-10 size-[56rem] -translate-y-1/2 rounded-full"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-8 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-2 lg:gap-16">
        <div className="hidden text-ink lg:block">
          <p className="visual-kicker mb-5 text-ink/80">Restauration universitaire</p>
          <h2 className="font-display text-5xl font-extrabold leading-[1.06] tracking-tight xl:text-[3.5rem]">
            Vos repas,
            <br />
            <span className="text-brand-deep">votre organisation.</span>
          </h2>
          <ul className="mt-10 space-y-4">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-3 text-lg font-semibold">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf text-ink">
                  <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                </span>
                {promise}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full max-w-lg justify-self-center rounded-[2rem] bg-surface p-6 shadow-float sm:p-10">
          <div className="flex justify-center">
            <LogoMark className="size-14" />
          </div>
          <h1 className="mt-4 text-center font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Accéder à votre espace
          </h1>
          <p className="mt-2 text-center text-sm text-ink-soft">
            Environnement de démonstration : choisissez le profil à consulter.
          </p>
          {!isOnline ? (
            <p className="mt-5 flex items-center gap-2 rounded-2xl border border-warn bg-warn/15 p-3 text-sm font-semibold text-ink">
              <WifiOff className="h-4 w-4 shrink-0" />
              Vous êtes hors ligne : la connexion est indisponible.
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-5 flex items-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
          <div className="mt-7 flex flex-col gap-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                disabled={loading !== null || !isOnline}
                onClick={() => login(account.email, account.role)}
                className="group flex min-h-20 items-center gap-4 rounded-[1.25rem] border border-line bg-surface p-3.5 text-left transition-colors hover:border-brand hover:bg-brand-soft/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft text-primary transition-colors group-hover:bg-brand group-hover:text-ink">
                  {account.role === 'STUDENT' ? (
                    <GraduationCap className="h-6 w-6" />
                  ) : account.role === 'KITCHEN' ? (
                    <ChefHat className="h-6 w-6" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold text-ink">{account.label}</span>
                  <span className="block text-xs font-medium text-ink-soft">{account.hint}</span>
                  <span className="block break-all text-[11px] text-ink-soft/80">
                    {account.email}
                  </span>
                </span>
                {loading === account.email ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
                ) : (
                  <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            ))}
          </div>
          {loading ? (
            <p
              className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary"
              role="status"
            >
              Ouverture de votre espace…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
