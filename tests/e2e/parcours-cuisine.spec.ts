import { test, expect } from '@playwright/test'

test('Parcours cuisine', async ({ page }) => {
  // 1. Connexion
  await page.goto('/connexion')
  await page.getByRole('button', { name: /Cuisine/ }).click()

  // 2. Dashboard cuisine
  await expect(page).toHaveURL(/\/kitchen/)

  // 3. Consultation ticket (code non existant)
  const input = page.getByRole('textbox', { name: 'Code du ticket' })
  await expect(input).toBeVisible()
  await input.fill('test-fake-token-12345')
  await page.getByRole('button', { name: /Consulter le ticket/i }).click()

  // 4. Toast erreur
  await expect(page.getByText(/QR Code invalide|Ticket introuvable|introuvable/i)).toBeVisible()
})
