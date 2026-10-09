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
      className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sage transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span>{isPending ? 'Déconnexion…' : 'Déconnexion'}</span>
    </button>
  )
}
