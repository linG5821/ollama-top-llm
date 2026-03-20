import { describe, expect, it } from 'vitest'

import { createLoadingModelsDataState, loadModelsData, loadModelsDataState } from '../src/lib/data'
import type { ModelsData } from '../src/types/model'

function createJsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => payload,
  } as Response
}

describe('data loader', () => {
  it('returns success for valid fixture payload', async () => {
    const validPayload: ModelsData = {
      generatedAt: '2026-03-19T10:44:17.770Z',
      source: '/data/models.json',
      models: [
        {
          name: 'llama3.1',
          tags: ['tools', '8b'],
          pullsRaw: '111.5M',
          pullsValue: 111500000,
        },
      ],
    }

    const state = await loadModelsDataState({
      fetchImpl: async () => createJsonResponse(validPayload),
    })

    expect(state.status).toBe('success')
    if (state.status === 'success') {
      expect(state.data.models).toHaveLength(1)
      expect(state.data.models[0]?.name).toBe('llama3.1')
    }
  })

  it('returns error state for malformed JSON', async () => {
    const state = await loadModelsDataState({
      fetchImpl: async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => {
            throw new SyntaxError('Unexpected token } in JSON at position 42')
          },
        }) as Response,
    })

    expect(state.status).toBe('error')
    if (state.status === 'error') {
      expect(state.error.message).toMatch(/Unexpected token|JSON/)
    }
  })

  it('returns empty state when models list is empty', async () => {
    const emptyPayload: ModelsData = {
      generatedAt: '2026-03-19T10:44:17.770Z',
      source: '/data/models.json',
      models: [],
    }

    const state = await loadModelsDataState({
      fetchImpl: async () => createJsonResponse(emptyPayload),
    })

    expect(state.status).toBe('empty')
    if (state.status === 'empty') {
      expect(state.data.models).toHaveLength(0)
    }
  })

  it('returns explicit error state on network failure', async () => {
    const state = await loadModelsDataState({
      fetchImpl: async () =>
        ({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: async () => ({ message: 'unused' }),
        }) as Response,
    })

    expect(state.status).toBe('error')
    if (state.status === 'error') {
      expect(state.error.message).toContain('Failed to load models data: 503 Service Unavailable')
    }
  })

  it('exposes loading state factory and keeps local-path-only rule', async () => {
    expect(createLoadingModelsDataState()).toEqual({
      status: 'loading',
      data: null,
      error: null,
    })

    await expect(
      loadModelsData({
        path: 'https://ollama.com/search',
        fetchImpl: async () => createJsonResponse({}),
      }),
    ).rejects.toThrowError(/forbidden|local \/data\/models\.json/i)
  })
})
