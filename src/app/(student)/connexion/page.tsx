'use client'

import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowUpRight,
  ChefHat,
  GraduationCap,
  Loader2,
  ShieldCheck,
  WifiOff,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const DEMO_ACCOUNTS = [
  { email: 'etudiant1@crousflow.test', role: 'STUDENT', label: 'Étudiant' },
  { email: 'cuisine@crousflow.test', role: 'KITCHEN', label: 'Cuisine' },
  { email: 'admin@crousflow.test', role: 'ADMIN', label: 'Admin' },
]

export default function ConnexionPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
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
    setLoading(true)
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
      setLoading(false)
      setError(loginError instanceof Error ? loginError.message : 'Connexion impossible.')
    }
  }

  return (
    <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-2">
      <div className="hidden lg:block">
        <p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-forest">
          Restauration universitaire
        </p>
        <h2 className="font-display text-6xl leading-[1.08] text-forest">
          Vos repas,
          <br />
          <span className="text-tomato">votre organisation.</span>
        </h2>
        <div className="mt-10 rounded-[2.5rem] bg-glow/40 p-8">
          <GraduationCap aria-hidden="true" className="mb-4 h-10 w-10 text-forest" />
          <p className="font-display text-2xl text-forest">Un service dédié aux étudiants.</p>
          <p className="mt-3 text-forest/80">
            Consultez les menus et réservez votre créneau de retrait dans votre restaurant
            universitaire.
          </p>
        </div>
      </div>
      <div className="w-full max-w-lg justify-self-center rounded-[2.5rem] border border-[#245642]/10 bg-white p-6 shadow-[0_20px_70px_#744e1510] sm:p-10">
        <p className="mb-2 text-center text-sm font-bold uppercase tracking-[0.16em] text-forest">
          CrousFlow
        </p>
        <h1 className="font-display text-4xl font-bold text-center text-[#245642]">
          Accéder à votre espace
        </h1>
        <p className="mt-2 text-center text-sm text-ink/70">
          Environnement de démonstration : choisissez le profil à consulter.
        </p>
        {!isOnline ? (
          <p className="mt-5 flex items-center gap-2 rounded-xl border border-warn bg-warn/20 p-3 text-sm font-medium">
            <WifiOff className="h-4 w-4" />
            Vous êtes hors ligne : la connexion est indisponible.
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-5 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm font-medium text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              disabled={loading || !isOnline}
              onClick={() => login(account.email, account.role)}
              className="group flex min-h-24 items-center gap-4 rounded-[1.5rem] border border-[#245642]/15 bg-[#fff7e7]/60 p-4 text-left transition-colors hover:border-[#ee583f] hover:bg-[#ffc857]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="rounded-2xl bg-[#245642] p-3 text-[#fff7e7]">
                {account.role === 'STUDENT' ? (
                  <GraduationCap className="h-6 w-6" />
                ) : account.role === 'KITCHEN' ? (
                  <ChefHat className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-lg text-[#245642]">{account.label}</span>
                <span className="block break-all text-xs text-ink/70">{account.email}</span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-[#ee583f]" />
            </button>
          ))}
        </div>
        {loading ? (
          <p className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-forest">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Ouverture de votre espace…
          </p>
        ) : null}
      </div>
    </div>
  )
}
