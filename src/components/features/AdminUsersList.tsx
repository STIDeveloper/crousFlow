'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

type UserItem = {
  id: string
  name: string
  email: string
  role: 'STUDENT' | 'KITCHEN' | 'ADMIN'
  createdAt: string
  restaurant?: { id: string; name: string } | null
  _count?: { reservations: number }
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export function AdminUsersList() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')

  const {
    data: users,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserItem[]>({
    queryKey: ['admin', 'users', search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (roleFilter !== 'ALL') params.set('role', roleFilter)
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const data: unknown = await res.json().catch(() => [])
      if (!res.ok) throw new Error(readError(data, 'Impossible de charger les utilisateurs.'))
      return Array.isArray(data) ? (data as UserItem[]) : []
    },
  })

  const roleMutation = useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string
      newRole: 'STUDENT' | 'KITCHEN' | 'ADMIN'
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(readError(data, 'La mise à jour du rôle a échoué.'))
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Rôle mis à jour avec succès.', { icon: <CheckCircle2 className="text-ok" /> })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const userList = users ?? []

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-sage/20 bg-night-2 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-glow">Accès & Rôles</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Gestion des Utilisateurs
          </h1>
          <p className="mt-2 text-sage">
            Gérez les comptes, permissions du personnel de cuisine et administrateurs du restaurant.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-night p-3 border border-sage/20 text-sm text-sage">
          <Users className="size-5 text-glow" />
          <span>
            <strong className="text-paper">{userList.length}</strong> utilisateur
            {userList.length > 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col gap-3 rounded-2xl border border-sage/20 bg-night-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 size-4 text-sage" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email (ex: etudiant, cuisine...)"
            className="min-h-11 w-full rounded-xl border border-sage/40 bg-night pl-10 pr-4 text-sm text-paper focus:outline-none focus:ring-2 focus:ring-glow"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'STUDENT', 'KITCHEN', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                roleFilter === r
                  ? 'bg-glow text-night'
                  : 'bg-night border border-sage/30 text-sage hover:text-paper'
              }`}
            >
              {r === 'ALL'
                ? 'Tous'
                : r === 'STUDENT'
                  ? 'Étudiants'
                  : r === 'KITCHEN'
                    ? 'Cuisine'
                    : 'Admins'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-sage/40 bg-night px-3 text-xs font-bold text-sage hover:text-paper"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-sage/20 bg-night-2 p-12">
          <Loader2 className="size-8 animate-spin text-glow motion-reduce:animate-none" />
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-night-2 p-8 text-center"
        >
          <AlertTriangle className="mx-auto mb-3 size-8 text-danger" />
          <h2 className="font-display text-2xl font-bold">Erreur de chargement</h2>
          <p className="mt-2 text-sage">{error?.message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sage/40 px-4 font-bold"
          >
            <RefreshCw className="size-4" /> Réessayer
          </button>
        </div>
      ) : userList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sage/30 bg-night-2 p-12 text-center text-sage">
          <Users className="mx-auto mb-3 size-10 text-sage/60" />
          <h2 className="font-display text-xl font-bold text-paper">Aucun utilisateur trouvé</h2>
          <p className="mt-1 text-sm">Modifiez vos critères de recherche ou filtres.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sage/20 bg-night-2">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sage/20 bg-night/60 text-xs uppercase tracking-wider text-sage">
              <tr>
                <th className="px-5 py-4">Utilisateur</th>
                <th className="px-5 py-4">Rôle actuel</th>
                <th className="px-5 py-4">Réservations</th>
                <th className="px-5 py-4">Date création</th>
                <th className="px-5 py-4 text-right">Modifier le rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {userList.map((u) => {
                const isUpdating = roleMutation.isPending && roleMutation.variables?.userId === u.id
                return (
                  <tr key={u.id} className="hover:bg-sage/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-paper">{u.name}</div>
                      <div className="font-mono text-xs text-sage">{u.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-glow/20 text-glow'
                            : u.role === 'KITCHEN'
                              ? 'bg-forest/20 text-forest'
                              : 'bg-sage/20 text-sage'
                        }`}
                      >
                        {u.role === 'ADMIN' ? (
                          <ShieldCheck className="size-3.5" />
                        ) : (
                          <UserCheck className="size-3.5" />
                        )}
                        {u.role === 'ADMIN'
                          ? 'Administrateur'
                          : u.role === 'KITCHEN'
                            ? 'Personnel Cuisine'
                            : 'Étudiant'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-paper">
                      {u._count?.reservations ?? 0}
                    </td>
                    <td className="px-5 py-4 text-xs text-sage">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {isUpdating ? (
                          <Loader2 className="size-4 animate-spin text-glow" />
                        ) : (
                          <select
                            value={u.role}
                            disabled={isUpdating}
                            onChange={(e) =>
                              roleMutation.mutate({
                                userId: u.id,
                                newRole: e.target.value as 'STUDENT' | 'KITCHEN' | 'ADMIN',
                              })
                            }
                            aria-label={`Rôle de ${u.name}`}
                            className="rounded-lg border border-sage/40 bg-night px-2.5 py-1.5 text-xs font-bold text-paper focus:ring-1 focus:ring-glow"
                          >
                            <option value="STUDENT">Étudiant</option>
                            <option value="KITCHEN">Cuisine</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
