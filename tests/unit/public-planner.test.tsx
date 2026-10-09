import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeekPlanner } from '@/components/features/WeekPlanner'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Menu en consultation publique', () => {
  it('affiche les vrais plats sans charger les tickets et sans permettre une réservation', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            week: 1,
            startsOn: '2026-10-12',
            endsOn: '2026-10-17',
            socialMealPriceCents: 100,
            days: [
              {
                date: '2026-10-12',
                menuItems: [
                  {
                    id: 'menu1',
                    date: '2026-10-12',
                    available: true,
                    meal: {
                      id: 'meal1',
                      name: 'Curry végétal',
                      description: 'Riz et légumes',
                      priceCents: 330,
                      productType: 'MAIN',
                      socialEligible: true,
                      category: 'Végétarien',
                      imageUrl: '',
                      allergens: ['Gluten'],
                    },
                  },
                ],
                slots: [
                  {
                    id: 'slot1',
                    date: '2026-10-12',
                    startTime: '12:00',
                    endTime: '12:15',
                    capacity: 40,
                    reservedCount: 10,
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <WeekPlanner canReserve={false} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Curry végétal')).toBeInTheDocument()
    expect(screen.getByText('Formule sociale 1,00 €')).toBeInTheDocument()
    expect(screen.getByText(/réservation ne débite pas Izly/i)).toBeInTheDocument()
    const card = screen.getByRole('button', { name: 'Curry végétal — consultation uniquement' })
    expect(card).toBeDisabled()
    fireEvent.click(card)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]).toEqual(['/api/menus?week=1', { cache: 'no-store' }])
    expect(screen.queryByText('Voir mes tickets')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion')
    client.clear()
  })
})
