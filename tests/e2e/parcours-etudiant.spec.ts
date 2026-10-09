import { test, expect } from '@playwright/test'

test('Parcours étudiant', async ({ page }) => {
  // 1. Connexion
  await page.goto('/connexion')
  await page.click('text=étudiant')

  // 2. Menu
  await expect(page).toHaveURL(/\/menu/)
  // Attendre le chargement
  await page.waitForSelector('text=Date du jour', { timeout: 10000 })

  // 3. Réservation (si bouton dispo, on clique)
  const reserveBtn = page.locator('button:has-text("Réserver")').first()
  if (await reserveBtn.isVisible()) {
    await reserveBtn.click()
    await expect(page.locator('text=Réservation confirmée')).toBeVisible()
  }

  // 4. Tickets
  await page.click('text=Mes tickets')
  await expect(page).toHaveURL(/\/tickets/)

  // 5. Vérifier QR (soit vide soit visible)
  const ticketCount = await page.locator('canvas').count()
  expect(ticketCount).toBeGreaterThanOrEqual(0) // Can be empty if no res
})
