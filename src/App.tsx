import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useModelsData } from './hooks/useModelsData'
import { Leaderboard } from './components/Leaderboard'
import { matchesSelectedTags, toggleSelectedTags } from './lib/tag-filters'

const PAGE_SIZE = 10

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

function formatGeneratedAt(generatedAt: string): { displayText: string; dateTime: string | null } {
  const parsed = new Date(generatedAt)

  if (Number.isNaN(parsed.getTime())) {
    return {
      displayText: '更新时间：未知',
      dateTime: null,
    }
  }

  const displayText = `更新时间：${new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)}`

  return {
    displayText,
    dateTime: parsed.toISOString(),
  }
}

function App() {
  const state = useModelsData()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const allModels = useMemo(
    () => (state.status === 'success' || state.status === 'empty' ? state.data.models : []),
    [state],
  )
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const tags = useMemo(() => {
    const tagSet = new Set<string>()

    for (const model of allModels) {
      const modelTags = model.tags.length > 0 ? model.tags : ['no-tag']
      for (const tag of modelTags) {
        tagSet.add(tag)
      }
    }

    return ['all', ...Array.from(tagSet).sort((a, b) => a.localeCompare(b))]
  }, [allModels])

  const filteredModels = useMemo(() => {
    return allModels.filter((model) => {
      const modelTags = model.tags.length > 0 ? model.tags : ['no-tag']
      const matchesQuery = model.name.toLowerCase().includes(normalizedQuery)
      const matchesTag = matchesSelectedTags(modelTags, selectedTags)

      return matchesQuery && matchesTag
    })
  }, [allModels, normalizedQuery, selectedTags])

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE))
  const boundedPage = Math.min(currentPage, totalPages)

  const pagedModels = useMemo(() => {
    const start = (boundedPage - 1) * PAGE_SIZE
    return filteredModels.slice(start, start + PAGE_SIZE)
  }, [filteredModels, boundedPage])

  const hasNoResults = (state.status === 'success' || state.status === 'empty') && filteredModels.length === 0

  const pageStartOffset = (boundedPage - 1) * PAGE_SIZE

  const themeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  const updatedAtInfo = useMemo(() => {
    if (state.status !== 'success' && state.status !== 'empty') {
      return null
    }

    return formatGeneratedAt(state.data.generatedAt)
  }, [state])

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light')
    document.body.classList.toggle('theme-dark', theme === 'dark')

    return () => {
      document.body.classList.remove('theme-light')
      document.body.classList.remove('theme-dark')
    }
  }, [theme])

  let content: ReactNode = null

  if (state.status === 'loading') {
    content = <p className="app-status">Loading models...</p>
  } else if (state.status === 'error') {
    content = <p className="app-status app-status-error">Error: {state.error.message}</p>
  } else {
    content = (
      <>
        <section className="filters-shell" aria-label="Leaderboard controls">
          <div className="search-control">
            <label className="control-label" htmlFor="search-input">
              Search models
            </label>
            <input
              className="search-input"
              data-testid="search-input"
              id="search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Type model name..."
            />
          </div>

          <div className="tags-control">
            {tags.map((tag) => {
              const isActive =
                tag === 'all'
                  ? selectedTags.length === 0
                  : selectedTags.some((selectedTag) => normalizeTag(selectedTag) === normalizeTag(tag))

              return (
                <button
                  className={`tag-filter ${isActive ? 'tag-filter-active' : ''}`}
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTags((currentTags) => toggleSelectedTags(currentTags, tag))
                    setCurrentPage(1)
                  }}
                  aria-pressed={isActive}
                >
                  {tag}
                </button>
              )
            })}
          </div>

        </section>

        {hasNoResults ? (
          <section className="leaderboard-empty" data-testid="no-results" aria-live="polite">
            <h2>No matching models</h2>
            <p>Try a different name or tag filter to see results.</p>
          </section>
        ) : (
          <>
            <Leaderboard models={pagedModels} rankOffset={pageStartOffset} />

            <nav className="pagination-shell" aria-label="Pagination">
              <button
                className="pagination-button"
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={hasNoResults || boundedPage <= 1}
              >
                Previous
              </button>

              <p className="pagination-status">
                Page {boundedPage} of {totalPages}
              </p>

              <button
                className="pagination-button"
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={hasNoResults || boundedPage >= totalPages}
              >
                Next
              </button>
            </nav>
          </>
        )}
      </>
    )
  }

  return (
    <main className={`app-shell app-theme-${theme}`}>
      <header className="app-header">
        <div className="app-header-main">
          <p className="app-kicker">Model Ranking</p>
          <h1>Ollama 下载量排行榜</h1>

          {updatedAtInfo ? (
            <p className="app-updated-at" data-testid="leaderboard-updated-at">
              {updatedAtInfo.dateTime ? <time dateTime={updatedAtInfo.dateTime}>{updatedAtInfo.displayText}</time> : updatedAtInfo.displayText}
            </p>
          ) : null}
        </div>

        <button
          className="theme-toggle theme-toggle-icon"
          data-testid="theme-toggle"
          type="button"
          onClick={() => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))}
          aria-label={themeLabel}
        >
          <span className="theme-toggle-glyph" aria-hidden="true">
            {theme === 'dark' ? (
              <svg className="theme-icon" viewBox="0 0 24 24" focusable="false">
                <title>Sun icon</title>
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.5v2.7M12 18.8v2.7M21.5 12h-2.7M5.2 12H2.5M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9M18.7 18.7l-1.9-1.9M7.2 7.2 5.3 5.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg className="theme-icon" viewBox="0 0 24 24" focusable="false">
                <title>Moon icon</title>
                <path
                  d="M15.4 2.8A9.6 9.6 0 1 0 21.2 18a9.1 9.1 0 0 1-5.8-15.2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>
      </header>

      {content}
    </main>
  )
}

export default App
