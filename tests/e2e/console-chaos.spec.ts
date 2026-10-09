import { test, expect } from '@playwright/test'

test('Console chaos', async ({ page }) => {
  // 1. Connexion admin
  await page.goto('/connexion')
  await page.getByRole('button', { name: /Admin/ }).click()

  // 2. Dashboard admin
  await expect(page).toHaveURL(/\/admin/)

  // 3. Navigation vers chaos
  await page.goto('/admin/chaos')
  await expect(page.getByRole('heading', { name: 'À l’épreuve du réel.' })).toBeVisible()

  // 4. Lancer tout
  await page.getByRole('button', { name: 'TOUT LANCER' }).click()

  // 5. Attendre la fin (le loader disparaît, le résumé s'affiche)
  // On laisse 5s max car les mocks répondent vite
  await expect(page.getByRole('heading', { name: 'Test terminé' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('24/24')).toBeVisible()
})
