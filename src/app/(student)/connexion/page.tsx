'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const DEMO_ACCOUNTS = [
  { email: 'etudiant1@crousflow.test', role: 'STUDENT', label: 'Étudiant' },
  { email: 'cuisine@crousflow.test', role: 'KITCHEN', label: 'Cuisine' },
  { email: 'admin@crousflow.test', role: 'ADMIN', label: 'Admin' },
]

export default function ConnexionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function login(email: string, role: string) {
    setLoading(true)
    const res = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (res.ok) {
      if (role === 'STUDENT') router.push('/menu')
      else if (role === 'KITCHEN') router.push('/kitchen')
      else router.push('/admin')
    } else {
      setLoading(false)
      alert('Erreur de connexion')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md p-8 border border-sage rounded-2xl bg-paper shadow-sm">
        <h1 className="text-3xl font-display font-bold text-center mb-8">Comptes de démo</h1>
        <div className="flex flex-col gap-4">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              disabled={loading}
              onClick={() => login(account.email, account.role)}
              className="flex flex-col items-start p-4 border border-sage rounded-xl hover:border-forest hover:bg-sage/10 transition-colors disabled:opacity-50"
            >
              <span className="font-bold text-lg">{account.label}</span>
              <span className="text-sm text-ink/70">{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
