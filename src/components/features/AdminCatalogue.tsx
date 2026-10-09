'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'

type ProductType = 'MAIN' | 'SIDE' | 'SUPPLEMENT' | 'STANDALONE'

type Product = {
  id: string
  name: string
  description: string
  category: string
  priceCents: number
  productType: ProductType
  sideCategory?: 'STARTER' | 'DESSERT' | null
  socialEligible: boolean
  active: boolean
  allergens: string[]
}

type ProductForm = {
  name: string
  description: string
  category: string
  priceCents: string
  productType: ProductType
  sideCategory: 'STARTER' | 'DESSERT'
  socialEligible: boolean
  allergens: string
}

const emptyForm: ProductForm = {
  name: '',
  description: '',
  category: 'Plat',
  priceCents: '100',
  productType: 'MAIN',
  sideCategory: 'STARTER',
  socialEligible: true,
  allergens: '',
}

function readError(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

function readProducts(value: unknown): Product[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'object' && value !== null && 'products' in value
      ? (value as { products?: unknown }).products
      : []
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const product = item as Record<string, unknown>
    if (typeof product.id !== 'string' || typeof product.name !== 'string') return []
    const allergens = Array.isArray(product.allergens)
      ? product.allergens.filter((value): value is string => typeof value === 'string')
      : typeof product.allergens === 'string'
        ? product.allergens
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : []
    const productType = product.productType
    const sideCategory =
      product.sideCategory === 'DESSERT'
        ? 'DESSERT'
        : product.sideCategory === 'STARTER'
          ? 'STARTER'
          : null
    const allowedTypes: ProductType[] = ['MAIN', 'SIDE', 'SUPPLEMENT', 'STANDALONE']
    return [
      {
        id: product.id,
        name: product.name,
        description: typeof product.description === 'string' ? product.description : '',
        category: typeof product.category === 'string' ? product.category : 'Produit',
        priceCents:
          typeof product.priceCents === 'number'
            ? product.priceCents
            : Number(product.priceCents ?? 0),
        productType: allowedTypes.includes(productType as ProductType)
          ? (productType as ProductType)
          : 'MAIN',
        sideCategory,
        socialEligible: product.socialEligible !== false,
        active: typeof product.active === 'boolean' ? product.active : true,
        allergens,
      },
    ]
  })
}

function toForm(product: Product): ProductForm {
  return {
    name: product.name,
    description: product.description ?? '',
    category: product.category,
    priceCents: String(product.priceCents),
    productType: product.productType,
    sideCategory: product.sideCategory === 'DESSERT' ? 'DESSERT' : 'STARTER',
    socialEligible: product.socialEligible,
    allergens: product.allergens.join(', '),
  }
}

export function AdminCatalogue() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const productsQuery = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/admin/products', { cache: 'no-store' })
      const data: unknown = await response.json().catch(() => [])
      if (!response.ok) throw new Error(readError(data, 'Le catalogue est indisponible.'))
      return readProducts(data)
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: ProductForm) => {
      const endpoint = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products'
      const response = await fetch(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          sideCategory: payload.productType === 'SIDE' ? payload.sideCategory : undefined,
          priceCents: Number(payload.priceCents),
          allergens: payload.allergens
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readError(data, 'Le produit n’a pas été enregistré.'))
      return data
    },
    onSuccess: () => {
      setForm(emptyForm)
      setEditingId(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      toast.success(editingId ? 'Produit modifié.' : 'Produit ajouté au catalogue.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const toggleMutation = useMutation({
    mutationFn: async (product: Product) => {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readError(data, 'Le statut du produit n’a pas changé.'))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      toast.success('Disponibilité du produit mise à jour.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function updateForm<K extends keyof ProductForm>(field: K, value: ProductForm[K]): void {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!form.name.trim() || Number(form.priceCents) < 0 || !isOnline) return
    saveMutation.mutate(form)
  }

  if (!isOnline && !productsQuery.data) {
    return (
      <section
        role="status"
        className="rounded-2xl border border-warn/40 bg-night-2 p-8 text-center"
      >
        <WifiOff className="mx-auto mb-3 size-8 text-glow" />
        <h1 className="font-display text-2xl font-bold">Catalogue hors ligne</h1>
        <p className="mt-2 text-sage">Reconnectez-vous pour gérer les produits.</p>
      </section>
    )
  }

  if (productsQuery.isLoading) {
    return (
      <div
        className="h-96 animate-pulse rounded-2xl bg-night-2"
        aria-label="Chargement du catalogue"
      />
    )
  }

  if (productsQuery.isError) {
    return (
      <section
        role="alert"
        className="rounded-2xl border border-danger/40 bg-night-2 p-8 text-center"
      >
        <AlertTriangle className="mx-auto mb-3 size-8 text-danger" />
        <h1 className="font-display text-2xl font-bold">Le catalogue est indisponible.</h1>
        <p className="mt-2 text-sage">{productsQuery.error.message}</p>
        <button
          type="button"
          onClick={() => void productsQuery.refetch()}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sage/40 px-4 font-bold"
        >
          <RefreshCw className="size-4" /> Réessayer
        </button>
      </section>
    )
  }

  const products = productsQuery.data ?? []
  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6">
      {!isOnline ? (
        <div role="alert" className="rounded-xl border border-warn/50 bg-warn/15 p-4 text-sm">
          <strong>Hors ligne.</strong> Les produits restent consultables, les modifications sont
          désactivées.
        </div>
      ) : null}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-glow">
            Préparer le service
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Catalogue produits
          </h1>
          <p className="mt-2 max-w-2xl text-sage">
            Créez les plats, entrées, desserts et suppléments qui pourront être publiés dans un
            service.
          </p>
        </div>
        <span className="w-fit rounded-full border border-sage/30 px-4 py-2 text-sm font-bold text-sage">
          {products.length} produit{products.length > 1 ? 's' : ''}
        </span>
      </header>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          className="order-2 min-w-0 rounded-2xl border border-sage/20 bg-night-2 p-4 sm:p-6 xl:order-1"
          aria-label="Produits du catalogue"
        >
          {products.length === 0 ? (
            <div className="py-14 text-center">
              <PackagePlus className="mx-auto mb-3 size-10 text-glow" />
              <h2 className="font-display text-2xl font-bold">Votre catalogue est vide</h2>
              <p className="mt-2 text-sage">Ajoutez le premier produit avec le formulaire.</p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <article
                  key={product.id}
                  className={`min-w-0 rounded-xl border p-4 ${product.active ? 'border-sage/25 bg-night' : 'border-danger/30 bg-danger/5 opacity-70'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-glow">
                        {product.productType}
                      </p>
                      <h2 className="mt-1 truncate font-display text-xl font-bold">
                        {product.name}
                      </h2>
                      <p className="mt-1 text-sm text-sage">
                        {product.category} ·{' '}
                        {(product.priceCents / 100).toFixed(2).replace('.', ',')} €
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${product.active ? 'bg-ok/15 text-ok' : 'bg-danger/15 text-danger'}`}
                    >
                      {product.active ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                  {product.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-paper/80 break-words">
                      {product.description}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {product.sideCategory ? (
                      <span className="rounded-full bg-forest/20 px-2 py-1 text-xs font-bold text-forest">
                        {product.sideCategory === 'DESSERT' ? 'Dessert' : 'Entrée'}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-sage/20 px-2 py-1 text-xs text-sage">
                      {product.socialEligible ? 'Formule sociale' : 'À la carte'}
                    </span>
                    {product.allergens.length ? (
                      <span className="rounded-full border border-sage/20 px-2 py-1 text-xs text-sage">
                        Allergènes : {product.allergens.join(', ')}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!isOnline}
                      onClick={() => {
                        setEditingId(product.id)
                        setForm(toForm(product))
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-sage/35 px-3 text-sm font-bold disabled:opacity-50"
                    >
                      <Pencil className="size-4" /> Modifier
                    </button>
                    <button
                      type="button"
                      disabled={!isOnline || toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(product)}
                      className="min-h-10 rounded-xl border border-sage/35 px-3 text-sm font-bold disabled:opacity-50"
                    >
                      {product.active ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form
          onSubmit={submit}
          className="order-1 h-fit min-w-0 w-full rounded-2xl border border-glow/30 bg-night-2 p-4 sm:p-6 xl:order-2"
        >
          <div className="flex items-center gap-2">
            <PackagePlus className="size-5 text-glow shrink-0" />
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              {editingId ? 'Modifier le produit' : 'Nouveau produit'}
            </h2>
          </div>
          <div className="mt-5 grid min-w-0 gap-4">
            <label className="grid gap-1 text-sm font-bold min-w-0">
              Nom
              <input
                required
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-normal text-paper"
                placeholder="Ex. Curry de légumes"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold min-w-0">
              Description
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                className="min-h-20 w-full rounded-xl border border-sage/40 bg-night px-3 py-2 font-normal text-paper resize-y"
                placeholder="Description affichée à l'étudiant"
              />
            </label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold min-w-0">
                Catégorie
                <input
                  required
                  value={form.category}
                  onChange={(event) => updateForm('category', event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-normal text-paper"
                  placeholder="Plat, Entrée…"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold min-w-0">
                Prix (centimes)
                <input
                  required
                  type="number"
                  min="0"
                  value={form.priceCents}
                  onChange={(event) => updateForm('priceCents', event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono font-normal text-paper"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-bold min-w-0">
              Type
              <select
                value={form.productType}
                onChange={(event) => updateForm('productType', event.target.value as ProductType)}
                className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-normal text-paper"
              >
                <option value="MAIN">Plat chaud</option>
                <option value="SIDE">Périphérique (Entrée ou dessert)</option>
                <option value="SUPPLEMENT">Supplément payant</option>
                <option value="STANDALONE">Produit froid / Libre-service (sans réservation)</option>
              </select>
            </label>
            {form.productType === 'SIDE' ? (
              <label className="grid gap-1 text-sm font-bold min-w-0">
                Rôle dans la formule
                <select
                  value={form.sideCategory}
                  onChange={(event) =>
                    updateForm('sideCategory', event.target.value as 'STARTER' | 'DESSERT')
                  }
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-normal text-paper"
                >
                  <option value="STARTER">Entrée</option>
                  <option value="DESSERT">Dessert</option>
                </select>
              </label>
            ) : null}
            <label className="grid gap-1 text-sm font-bold min-w-0">
              Allergènes
              <input
                value={form.allergens}
                onChange={(event) => updateForm('allergens', event.target.value)}
                className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-normal text-paper"
                placeholder="Gluten, Lait"
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-sage/25 bg-night px-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.socialEligible}
                onChange={(event) => updateForm('socialEligible', event.target.checked)}
                className="size-4 shrink-0"
              />
              <span className="truncate">Éligible à la formule sociale</span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!isOnline || saveMutation.isPending || !form.name.trim()}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-glow px-5 font-bold text-night disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Check className="size-5" />
              )}
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
                className="min-h-12 rounded-full border border-sage/40 px-4 font-bold"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
