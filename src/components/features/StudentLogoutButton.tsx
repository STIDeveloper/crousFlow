'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function StudentLogoutButton() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  async function logout() {
    setIsPending(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('La déconnexion a échoué.')
      queryClient.clear()
      router.replace('/connexion')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La déconnexion a échoué.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={isPending}
      className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-forest transition-colors hover:bg-sage/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span>{isPending ? 'Déconnexion…' : 'Se déconnecter'}</span>
    </button>
  )
}
