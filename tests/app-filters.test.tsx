import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { matchesSelectedTags, toggleSelectedTags } from '../src/lib/tag-filters'

vi.mock('../src/hooks/useModelsData', () => {
  return {
    useModelsData: () => ({
      status: 'success',
      data: {
        generatedAt: '2026-01-01T00:00:00.000Z',
        source: 'test-fixture',
        models: [
          {
            name: 'alpha-model',
            tags: ['vision'],
            pullsRaw: '1M',
            pullsValue: 1_000_000,
          },
        ],
      },
      error: null,
    }),
  }
})

import App from '../src/App'

describe('App task9 controls', () => {
  it('renders search input and theme toggle testids', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('data-testid="search-input"')
    expect(html).toContain('data-testid="theme-toggle"')
    expect(html).toContain('data-testid="leaderboard-updated-at"')
  })

  it('does not render no-results by default', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).not.toContain('data-testid="no-results"')
  })

  it('toggles multiple tags and supports clearing with all', () => {
    let selectedTags: string[] = []

    selectedTags = toggleSelectedTags(selectedTags, 'vision')
    expect(selectedTags).toEqual(['vision'])

    selectedTags = toggleSelectedTags(selectedTags, 'coding')
    expect(selectedTags).toEqual(['vision', 'coding'])

    selectedTags = toggleSelectedTags(selectedTags, 'vision')
    expect(selectedTags).toEqual(['coding'])

    selectedTags = toggleSelectedTags(selectedTags, 'all')
    expect(selectedTags).toEqual([])
  })

  it('matches selected tags with OR semantics', () => {
    expect(matchesSelectedTags(['vision'], ['vision', 'coding'])).toBe(true)
    expect(matchesSelectedTags(['coding'], ['vision', 'coding'])).toBe(true)
    expect(matchesSelectedTags(['math'], ['vision', 'coding'])).toBe(false)
  })

  it('returns true for all models when no tags are selected', () => {
    expect(matchesSelectedTags(['vision'], [])).toBe(true)
    expect(matchesSelectedTags(['no-tag'], [])).toBe(true)
  })
})
