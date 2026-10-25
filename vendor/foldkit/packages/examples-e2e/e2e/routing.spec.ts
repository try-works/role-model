import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('routing example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates to people route', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'People', exact: true }).click()
    await expect(page).toHaveURL(/\/people/)
  })

  test('navigates into the file tree', async ({ page }) => {
    await page.goto('/files')
    await page.getByRole('link', { name: 'documents', exact: true }).click()
    await expect(page).toHaveURL(/\/files\/documents$/)
    await page.getByRole('link', { name: 'taxes', exact: true }).click()
    await expect(page).toHaveURL(/\/files\/documents\/taxes$/)
    await expect(page.getByRole('link', { name: '2024.pdf' })).toBeVisible()
  })
})
