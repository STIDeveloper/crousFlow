import { test, expect } from '@playwright/test'

test('Console chaos', async ({ page }) => {
  // 1. Connexion admin
  await page.goto('/connexion')
  await page.click('text=Admin')

  // 2. Dashboard admin
  await expect(page).toHaveURL(/\/admin/)

  // 3. Navigation vers chaos
  await page.goto('/admin/chaos')
  await expect(page.locator('text=CONSOLE DE ROBUSTESSE')).toBeVisible()

  // 4. Lancer tout
  await page.click('text=TOUT LANCER')

  // 5. Attendre la fin (le loader disparaît, le résumé s'affiche)
  // On laisse 5s max car les mocks répondent vite
  await expect(page.locator('text=Test terminé')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=24/24')).toBeVisible()
})
