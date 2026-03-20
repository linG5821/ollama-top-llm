const PULLS_PATTERN = /^(\d+(?:\.\d+)?)([KMB])?$/i

const MULTIPLIERS: Record<string, number> = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
}

export function parsePullsToNumber(input: string): number {
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    throw new Error('Invalid pulls value: empty input')
  }

  const normalized = trimmed.replace(/,/g, '')
  const match = normalized.match(PULLS_PATTERN)

  if (!match) {
    throw new Error(`Invalid pulls value: ${input}`)
  }

  const [, numericPart, unitPart] = match
  const baseValue = Number(numericPart)

  if (Number.isNaN(baseValue)) {
    throw new Error(`Invalid pulls value: ${input}`)
  }

  const multiplier = unitPart ? MULTIPLIERS[unitPart.toUpperCase()] : 1
  return baseValue * multiplier
}

export function sortByPullsDesc<T extends { pullsValue: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.pullsValue - a.pullsValue)
}
