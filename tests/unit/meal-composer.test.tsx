import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MealCard } from '@/components/features/MealCard'

afterEach(cleanup)

const main = {
  id: 'main-item',
  date: '2026-10-12',
  meal: {
    id: 'main',
    name: 'Plat du jour',
    category: 'Végétarien',
    priceCents: 100,
    productType: 'MAIN' as const,
    socialEligible: true,
    imageUrl: '',
    allergens: [],
  },
}

function option(id: string, name: string, productType: 'SIDE' | 'SUPPLEMENT', priceCents = 0) {
  return {
    id,
    date: '2026-10-12',
    meal: {
      id: `meal-${id}`,
      name,
      category: name,
      priceCents,
      productType,
      socialEligible: productType === 'SIDE',
      imageUrl: '',
      allergens: [],
    },
  }
}

describe('Composition d’une formule sociale', () => {
  it('bloque visuellement le troisième périphérique et additionne les suppléments', () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <MealCard
          menuItem={main}
          slot={{ id: 'slot', startTime: '12:00', capacity: 10, reservedCount: 0 }}
          isReserved={false}
          canReserve
          socialMealPriceCents={100}
          peripheralOptions={[
            option('side-1', 'Fruit', 'SIDE'),
            option('side-2', 'Yaourt', 'SIDE'),
            option('side-3', 'Compote', 'SIDE'),
          ]}
          supplementOptions={[option('extra-1', 'Boisson', 'SUPPLEMENT', 150)]}
        />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Réserver Plat du jour à 12:00' }))
    expect(screen.getByRole('dialog', { name: 'Composer votre repas' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Fruit/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Yaourt/ }))
    expect(screen.getByRole('checkbox', { name: /Compote/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Boisson/ }))
    expect(screen.getByText('2,50 €')).toBeInTheDocument()
    client.clear()
  })
})
