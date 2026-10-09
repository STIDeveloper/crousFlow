import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StudentShell } from '@/components/features/StudentShell'

const state = vi.hoisted(() => ({ pathname: '/connexion' }))
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }))
vi.mock('@/components/features/StudentLogoutButton', () => ({
  StudentLogoutButton: () => <button>Se déconnecter</button>,
}))
afterEach(cleanup)

describe('Navigation selon la session et la page', () => {
  it('ne montre ni tickets ni déconnexion sur la connexion, même avec une session existante', () => {
    state.pathname = '/connexion'
    render(<StudentShell role="STUDENT">Connexion</StudentShell>)
    expect(screen.queryByText('Mes tickets')).not.toBeInTheDocument()
    expect(screen.queryByText('Se déconnecter')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Consulter le menu' })).toHaveAttribute('href', '/menu')
  })
  it('ne montre pas les actions étudiantes au visiteur', () => {
    state.pathname = '/menu'
    render(<StudentShell role={null}>Menu</StudentShell>)
    expect(screen.queryByText('Mes tickets')).not.toBeInTheDocument()
    expect(screen.queryByText('Se déconnecter')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connexion' })).toBeInTheDocument()
  })
  it('montre les tickets uniquement à un étudiant connecté', () => {
    state.pathname = '/menu'
    render(<StudentShell role="STUDENT">Menu</StudentShell>)
    expect(screen.getAllByText('Mes tickets')).toHaveLength(2)
    expect(screen.getByText('Se déconnecter')).toBeInTheDocument()
  })
  it('ne montre pas les tickets à un membre du personnel', () => {
    state.pathname = '/menu'
    render(<StudentShell role="KITCHEN">Menu</StudentShell>)
    expect(screen.queryByText('Mes tickets')).not.toBeInTheDocument()
  })
})
