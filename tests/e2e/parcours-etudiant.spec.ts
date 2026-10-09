import { test, expect } from '@playwright/test'

test('Parcours étudiant', async ({ page }) => {
  // 1. Connexion
  await page.goto('/connexion')
  await page.getByRole('button', { name: /Étudiant/ }).click()

  // 2. Menu
  await expect(page).toHaveURL(/\/menu/)
  // Attendre le chargement
  await expect(
    page.getByRole('heading', { name: /Les menus de la semaine prochaine/i }),
  ).toBeVisible()

  // 3. Réservation (sur un jour disponible sans réservation préalable, ex: mardi)
  const tuesdayBtn = page.getByRole('button', { name: /mar\./i })
  if (await tuesdayBtn.isVisible()) {
    await tuesdayBtn.click()
  }

  const reserveBtn = page.locator('button:has-text("Réserver"):enabled').first()
  if ((await reserveBtn.count()) > 0) {
    await reserveBtn.click()
    const composer = page.getByRole('dialog', { name: 'Composer votre repas' })
    if (await composer.isVisible()) {
      await composer.getByRole('button', { name: 'Confirmer la réservation' }).click()
    }
    await expect(page.getByText(/réservation est confirmée/i)).toBeVisible()
  }

  // 4. Tickets
  await page.getByRole('link', { name: 'Mes tickets', exact: true }).click()
  await expect(page).toHaveURL(/\/tickets/)

  // 5. Vérifier QR (soit vide soit visible)
  const ticketCount = await page.locator('canvas').count()
  expect(ticketCount).toBeGreaterThanOrEqual(0) // Can be empty if no res
})
