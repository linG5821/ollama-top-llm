import { useEffect, useState } from 'react'

import { createLoadingModelsDataState, loadModelsDataState, type LoadModelsDataOptions } from '../lib/data'
import type { ModelsDataState } from '../types/model'

export function useModelsData(options: LoadModelsDataOptions = {}): ModelsDataState {
  const { fetchImpl, path } = options
  const [state, setState] = useState<ModelsDataState>(createLoadingModelsDataState())

  useEffect(() => {
    let active = true

    setState(createLoadingModelsDataState())

    void loadModelsDataState({ fetchImpl, path }).then((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    return () => {
      active = false
    }
  }, [fetchImpl, path])

  return state
}
