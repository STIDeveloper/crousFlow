'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { useQueryClient } from '@tanstack/react-query'

export function StaffLogoutButton() {
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
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={isPending}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-bold text-mist transition-colors hover:bg-deep-2 hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{isPending ? 'Déconnexion…' : 'Déconnexion'}</span>
    </button>
  )
}
