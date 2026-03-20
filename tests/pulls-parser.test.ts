import { describe, expect, it } from 'vitest'

import { parsePullsToNumber, sortByPullsDesc } from '../src/lib/pulls'

describe('parsePullsToNumber', () => {
  it('parses valid K/M/B and comma-formatted values', () => {
    expect(parsePullsToNumber('967.2K')).toBe(967200)
    expect(parsePullsToNumber('111.5M')).toBe(111500000)
    expect(parsePullsToNumber('1.2B')).toBe(1200000000)
    expect(parsePullsToNumber('12,345')).toBe(12345)
  })

  it('parses boundary-like values including zero and decimal units', () => {
    expect(parsePullsToNumber('0')).toBe(0)
    expect(parsePullsToNumber('0K')).toBe(0)
    expect(parsePullsToNumber('0.5K')).toBe(500)
    expect(parsePullsToNumber('0.25M')).toBe(250000)
  })

  it('throws explicit errors for invalid and empty input', () => {
    expect(() => parsePullsToNumber('N/A pulls')).toThrowError(/Invalid pulls value/)
    expect(() => parsePullsToNumber('')).toThrowError(/Invalid pulls value/)
    expect(() => parsePullsToNumber('   ')).toThrowError(/empty input/)
  })
})

describe('sortByPullsDesc', () => {
  it('sorts by pullsValue descending without mutating original array', () => {
    const input = [
      { name: 'a', pullsValue: 10 },
      { name: 'b', pullsValue: 100 },
      { name: 'c', pullsValue: 50 },
    ]

    const sorted = sortByPullsDesc(input)

    expect(sorted.map((item) => item.name)).toEqual(['b', 'c', 'a'])
    expect(input.map((item) => item.name)).toEqual(['a', 'b', 'c'])
    expect(sorted).not.toBe(input)
  })
})
