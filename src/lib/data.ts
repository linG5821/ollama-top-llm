import type { ModelRecord, ModelsData, ModelsDataState } from '../types/model'

const DEFAULT_MODELS_PATH = '/data/models.json'

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error('Unknown data loading error')
}

function isModelRecord(value: unknown): value is ModelRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<ModelRecord>
  return (
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === 'string') &&
    typeof candidate.pullsRaw === 'string' &&
    typeof candidate.pullsValue === 'number'
  )
}

function isModelsData(value: unknown): value is ModelsData {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<ModelsData>
  return (
    typeof candidate.generatedAt === 'string' &&
    typeof candidate.source === 'string' &&
    Array.isArray(candidate.models) &&
    candidate.models.every((model) => isModelRecord(model))
  )
}

function ensureLocalModelsPath(path: string): string {
  const normalized = path.trim()

  if (normalized.length === 0) {
    throw new Error('Models data path must not be empty')
  }

  if (/^https?:\/\//i.test(normalized) || /ollama\.com/i.test(normalized)) {
    throw new Error('Remote domains are forbidden. Use local /data/models.json only.')
  }

  return normalized
}

export interface LoadModelsDataOptions {
  fetchImpl?: typeof fetch
  path?: string
}

export async function loadModelsData(options: LoadModelsDataOptions = {}): Promise<ModelsData> {
  const fetchImpl = options.fetchImpl ?? fetch
  const path = ensureLocalModelsPath(options.path ?? DEFAULT_MODELS_PATH)

  const response = await fetchImpl(path)

  if (!response.ok) {
    throw new Error(`Failed to load models data: ${response.status} ${response.statusText}`.trim())
  }

  const payload = (await response.json()) as unknown

  if (!isModelsData(payload)) {
    throw new Error('Invalid models data payload shape')
  }

  return {
    generatedAt: payload.generatedAt,
    source: payload.source,
    models: payload.models.map((model) => ({
      name: model.name,
      tags: [...model.tags],
      pullsRaw: model.pullsRaw,
      pullsValue: model.pullsValue,
    })),
  }
}

export async function loadModelsDataState(options: LoadModelsDataOptions = {}): Promise<ModelsDataState> {
  try {
    const data = await loadModelsData(options)

    if (data.models.length === 0) {
      return {
        status: 'empty',
        data,
        error: null,
      }
    }

    return {
      status: 'success',
      data,
      error: null,
    }
  } catch (error) {
    return {
      status: 'error',
      data: null,
      error: toError(error),
    }
  }
}

export function createLoadingModelsDataState(): ModelsDataState {
  return {
    status: 'loading',
    data: null,
    error: null,
  }
}
