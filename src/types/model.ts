export interface ModelRecord {
  name: string
  tags: string[]
  pullsRaw: string
  pullsValue: number
}

export interface ModelsData {
  generatedAt: string
  source: string
  models: ModelRecord[]
}

export type ModelsDataState =
  | {
      status: 'loading'
      data: null
      error: null
    }
  | {
      status: 'success'
      data: ModelsData
      error: null
    }
  | {
      status: 'empty'
      data: ModelsData
      error: null
    }
  | {
      status: 'error'
      data: null
      error: Error
    }
