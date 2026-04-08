import { describe, test, expect } from 'vitest'
import { calculateCost, formatCost } from '../cost'
import type { TokenUsage, OpenRouterPricing } from '../../types/index'

const tokens: TokenUsage = {
  inputTokens: 100,
  outputTokens: 50,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
}

const pricing: OpenRouterPricing = {
  prompt: 0.00003,
  completion: 0.00015,
  inputCacheRead: null,
  inputCacheWrite: null,
}

describe('calculateCost', () => {
  test('computes correct cost for known tokens and pricing', () => {
    const cost = calculateCost(tokens, pricing)
    expect(cost).toBeCloseTo(0.0105)
  })

  test('returns null when pricing is null', () => {
    expect(calculateCost(tokens, null)).toBeNull()
  })

  test('null cache pricing treated as $0, rest calculated normally', () => {
    const tokensWithCache: TokenUsage = {
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 1000,
      cacheWriteTokens: 500,
    }
    const cost = calculateCost(tokensWithCache, pricing)
    expect(cost).toBeCloseTo(0.0105)
  })

  test('all zero tokens returns $0', () => {
    const zeroTokens: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }
    expect(calculateCost(zeroTokens, pricing)).toBe(0)
  })

  test('includes cache costs when pricing available', () => {
    const pricingWithCache: OpenRouterPricing = {
      prompt: 0.00003,
      completion: 0.00015,
      inputCacheRead: 0.000003,
      inputCacheWrite: 0.0000375,
    }
    const tokensWithCache: TokenUsage = {
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 100,
      cacheWriteTokens: 50,
    }
    const cost = calculateCost(tokensWithCache, pricingWithCache)
    expect(cost).toBeCloseTo(0.012675)
  })
})

describe('formatCost', () => {
  test('formats null as N/A', () => {
    expect(formatCost(null)).toBe('N/A')
  })

  test('formats zero as $0.0000', () => {
    expect(formatCost(0)).toBe('$0.0000')
  })

  test('formats normal value with 4 decimal places', () => {
    expect(formatCost(0.0105)).toBe('$0.0105')
  })

  test('formats very small value in scientific notation', () => {
    const result = formatCost(0.000001)
    expect(result).toMatch(/^\$/)
    expect(result).toMatch(/e/)
  })
})
