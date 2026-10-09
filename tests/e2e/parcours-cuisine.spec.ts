import { test, expect } from '@playwright/test'

test('Parcours cuisine', async ({ page }) => {
  // 1. Connexion
  await page.goto('/connexion')
  await page.click('text=Cuisine')

  // 2. Dashboard cuisine
  await expect(page).toHaveURL(/\/kitchen/)

  // 3. Validation ticket (code au hasard)
  const input = page.locator('input[placeholder="Scanner QR ou code..."]')
  await expect(input).toBeVisible()
  await input.fill('test-fake-token-12345')
  await page.click('text=Valider')

  // 4. Toast erreur
  await expect(page.locator('text=Ticket invalide')).toBeVisible()
})
