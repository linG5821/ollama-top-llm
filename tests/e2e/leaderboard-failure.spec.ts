import { expect, test } from '@playwright/test'

test.describe('leaderboard failure flow', () => {
  test('shows visible error and does not crash when models data is unavailable', async ({ page }) => {
    await page.route('**/data/models.json', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'forced-e2e-failure' }),
      })
    })

    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Ollama 下载量排行榜' })).toBeVisible()
    await expect(page.getByText(/Error: Failed to load models data: 500/)).toBeVisible()
    await expect(page.getByTestId('search-input')).toHaveCount(0)
    await expect(page.getByTestId('leaderboard-list')).toHaveCount(0)
    await expect(page.getByTestId('empty-state')).toHaveCount(0)
    await expect(page.getByTestId('no-results')).toHaveCount(0)
  })
})
