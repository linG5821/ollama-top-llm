import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Leaderboard } from '../src/components/Leaderboard'

describe('Leaderboard', () => {
  it('renders no-tag fallback chip when model tags are empty', () => {
    const html = renderToStaticMarkup(
      <Leaderboard
        models={[
          {
            name: 'model-without-tags',
            tags: [],
            pullsRaw: '2K',
            pullsValue: 2000,
          },
        ]}
      />,
    )

    expect(html).toContain('data-testid="leaderboard-list"')
    expect(html).toContain('data-testid="model-row"')
    expect(html).toContain('data-testid="model-pull-command"')
    expect(html).toContain('href="https://ollama.com/library/model-without-tags"')
    expect(html).toContain('ollama pull model-without-tags')
    expect(html).toContain('data-copy-state="idle"')
    expect(html).toContain('下载量：2K')
    expect(html).toContain('no-tag')
  })

  it('renders empty-state testid when models array is empty', () => {
    const html = renderToStaticMarkup(<Leaderboard models={[]} />)

    expect(html).toContain('data-testid="empty-state"')
    expect(html).toContain('No models yet')
  })
})
