import { expect, test } from '@playwright/test'

test.describe('leaderboard core flow', () => {
  test('loads, searches, filters by tag, paginates, and toggles theme', async ({ page }) => {
    await page.route('**/data/models.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: '2026-03-19T00:00:00.000Z',
          source: 'e2e-fixture',
          models: [
            { name: 'llama3.1', tags: ['tools'], pullsRaw: '100M', pullsValue: 100000000 },
            { name: 'model-2', tags: ['vision'], pullsRaw: '90M', pullsValue: 90000000 },
            { name: 'model-3', tags: ['coding'], pullsRaw: '80M', pullsValue: 80000000 },
            { name: 'model-4', tags: ['chat'], pullsRaw: '70M', pullsValue: 70000000 },
            { name: 'model-5', tags: ['math'], pullsRaw: '60M', pullsValue: 60000000 },
            { name: 'model-6', tags: ['research'], pullsRaw: '50M', pullsValue: 50000000 },
            { name: 'model-7', tags: ['tools'], pullsRaw: '40M', pullsValue: 40000000 },
            { name: 'model-8', tags: ['audio'], pullsRaw: '30M', pullsValue: 30000000 },
            { name: 'model-9', tags: ['multimodal'], pullsRaw: '20M', pullsValue: 20000000 },
            { name: 'model-10', tags: ['safety'], pullsRaw: '10M', pullsValue: 10000000 },
            { name: 'nomic-embed-text', tags: ['embedding'], pullsRaw: '9M', pullsValue: 9000000 },
            { name: 'mxbai-embed-large', tags: ['embedding'], pullsRaw: '8M', pullsValue: 8000000 },
          ],
        }),
      })
    })

    await page.goto('/')

    await expect(page.getByTestId('search-input')).toBeVisible()
    await expect(page.getByTestId('theme-toggle')).toBeVisible()
    await expect(page.getByTestId('leaderboard-list')).toBeVisible()
    await expect(page.getByTestId('model-pull-command').first()).toBeVisible()
    await expect(page.getByText('ollama pull llama3.1')).toBeVisible()
    await expect(page.getByRole('link', { name: 'llama3.1' })).toHaveAttribute('href', 'https://ollama.com/library/llama3.1')

    const copyButton = page.getByRole('button', { name: 'Copy pull command for llama3.1' })
    await copyButton.click()
    await expect(copyButton).toHaveAttribute('data-copy-state', 'success')

    const rows = page.getByTestId('model-row')
    await expect(rows).toHaveCount(10)
    await expect(page.getByText('Page 1 of 2')).toBeVisible()

    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('llama3.1')
    await expect(page.getByTestId('no-results')).toHaveCount(0)
    await expect(rows).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 2, name: 'llama3.1' })).toBeVisible()

    await searchInput.fill('zzz-no-such-model')
    await expect(page.getByTestId('no-results')).toBeVisible()
    await expect(page.getByTestId('leaderboard-list')).toHaveCount(0)

    await searchInput.clear()
    await expect(rows).toHaveCount(10)
    await expect(page.getByRole('button', { name: 'embedding' })).toBeVisible()

    await page.getByRole('button', { name: 'embedding' }).click()
    await expect(rows).toHaveCount(2)
    await expect(page.getByRole('heading', { level: 2, name: 'nomic-embed-text' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'mxbai-embed-large' })).toBeVisible()
    await expect(page.getByText('Page 1 of 1')).toBeVisible()

    await page.getByRole('button', { name: 'all' }).click()
    await expect(rows).toHaveCount(10)
    await expect(page.getByText('Page 1 of 2')).toBeVisible()

    const nextButton = page.getByRole('button', { name: 'Next' })
    const previousButton = page.getByRole('button', { name: 'Previous' })

    await expect(previousButton).toBeDisabled()
    await expect(nextButton).toBeEnabled()

    await nextButton.click()
    await expect(page.getByText('Page 2 of 2')).toBeVisible()
    await expect(previousButton).toBeEnabled()
    await expect(page.getByText('#11')).toBeVisible()

    const appShell = page.locator('main.app-shell')
    const themeToggle = page.getByTestId('theme-toggle')
    await expect(appShell).toHaveClass(/app-theme-dark/)
    await themeToggle.click()
    await expect(appShell).toHaveClass(/app-theme-light/)
    await themeToggle.click()
    await expect(appShell).toHaveClass(/app-theme-dark/)
  })
})
