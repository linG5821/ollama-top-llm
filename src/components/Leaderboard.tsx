import { useEffect, useRef, useState } from 'react'
import type { ModelRecord } from '../types/model'

interface LeaderboardProps {
  models: ModelRecord[]
  rankOffset?: number
}

export function Leaderboard({ models, rankOffset = 0 }: LeaderboardProps) {
  const [copiedModelName, setCopiedModelName] = useState<string | null>(null)
  const copiedResetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current)
      }
    }
  }, [])

  async function copyPullCommand(modelName: string): Promise<void> {
    const command = `ollama pull ${modelName}`
    let copied = false

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(command)
        copied = true
      } catch {
        copied = false
      }
    }

    if (!copied && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.value = command
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      copied = document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    if (!copied) {
      return
    }

    setCopiedModelName(modelName)
    if (copiedResetTimerRef.current !== null) {
      window.clearTimeout(copiedResetTimerRef.current)
    }
    copiedResetTimerRef.current = window.setTimeout(() => {
      setCopiedModelName(null)
      copiedResetTimerRef.current = null
    }, 1500)
  }

  if (models.length === 0) {
    return (
      <section className="leaderboard-empty" data-testid="empty-state" aria-live="polite">
        <h2>No models yet</h2>
        <p>The leaderboard is ready, but there are no model records to display.</p>
      </section>
    )
  }

  return (
    <section className="leaderboard-shell" aria-label="Top models leaderboard">
      <ul className="leaderboard-list" data-testid="leaderboard-list">
        {models.map((model, index) => {
          const tags = model.tags.length > 0 ? model.tags : ['no-tag']
          const pullCommand = `ollama pull ${model.name}`
          const modelLink = `https://ollama.com/library/${encodeURIComponent(model.name)}`
          const isCopied = copiedModelName === model.name

          return (
            <li className="model-row" data-testid="model-row" key={model.name}>
              <span className="model-rank">
                #{rankOffset + index + 1}
              </span>

              <div className="model-main">
                <h2 className="model-name">
                  <a className="model-link" href={modelLink} target="_blank" rel="noopener noreferrer">
                    {model.name}
                  </a>
                </h2>

                <p className="model-metric">
                  下载量：{model.pullsRaw}
                </p>

                <div className="model-tags">
                  {tags.map((tag) => (
                    <span className="tag-chip" key={`${model.name}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="model-command-shell" data-testid="model-pull-command">
                  <pre className="model-command-code">
                    <code>{pullCommand}</code>
                  </pre>

                  <button
                    className="copy-command-button"
                    type="button"
                    onClick={() => {
                      void copyPullCommand(model.name)
                    }}
                    aria-label={`Copy pull command for ${model.name}`}
                    data-copy-state={isCopied ? 'success' : 'idle'}
                  >
                    {isCopied ? (
                      <svg className="copy-command-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path
                          d="M5 13.2 9.2 17.4 19 7.6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg className="copy-command-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <rect x="9" y="9" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <rect x="5" y="5" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
