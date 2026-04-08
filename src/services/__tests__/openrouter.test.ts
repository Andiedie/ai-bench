import { describe, test, expect, vi, afterEach } from 'vitest'
import { parsePricing, fetchModels, findModelPricing } from '../openrouter'

describe('parsePricing', () => {
  test('parses normal string values to numbers', () => {
    const result = parsePricing({ prompt: '0.00003', completion: '0.00015' })
    expect(result.prompt).toBeCloseTo(0.00003)
    expect(result.completion).toBeCloseTo(0.00015)
  })

  test('returns null for -1 value', () => {
    const result = parsePricing({
      prompt: '-1',
      completion: '0.00015',
      input_cache_read: '-1',
    })
    expect(result.prompt).toBe(0)
    expect(result.inputCacheRead).toBeNull()
  })

  test('returns null for undefined cache prices', () => {
    const result = parsePricing({ prompt: '0.00003', completion: '0.00015' })
    expect(result.inputCacheRead).toBeNull()
    expect(result.inputCacheWrite).toBeNull()
  })

  test('handles "0" as valid zero price', () => {
    const result = parsePricing({ prompt: '0', completion: '0' })
    expect(result.prompt).toBe(0)
    expect(result.completion).toBe(0)
  })
})

describe('findModelPricing', () => {
  const models = [
    {
      id: 'anthropic/claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      pricing: {
        prompt: 0.00003,
        completion: 0.00015,
        inputCacheRead: null,
        inputCacheWrite: null,
      },
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      pricing: {
        prompt: 0.000005,
        completion: 0.000015,
        inputCacheRead: null,
        inputCacheWrite: null,
      },
    },
  ]

  test('matches via anthropic/ prefix', () => {
    const result = findModelPricing(models, 'claude-sonnet-4-20250514')
    expect(result).not.toBeNull()
    expect(result!.prompt).toBeCloseTo(0.00003)
  })

  test('matches exact id', () => {
    const result = findModelPricing(
      models,
      'anthropic/claude-sonnet-4-20250514',
    )
    expect(result).not.toBeNull()
  })

  test('returns null when not found', () => {
    const result = findModelPricing(models, 'nonexistent-model')
    expect(result).toBeNull()
  })
})

describe('fetchModels', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns parsed models on success', async () => {
    const mockData = {
      data: [
        {
          id: 'anthropic/claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet',
          pricing: { prompt: '0.00003', completion: '0.00015' },
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    )
    const models = await fetchModels()
    expect(models).toHaveLength(1)
    expect(models[0].id).toBe('anthropic/claude-3-5-sonnet')
    expect(models[0].pricing.prompt).toBeCloseTo(0.00003)
  })

  test('returns empty array on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    )
    const models = await fetchModels()
    expect(models).toEqual([])
  })
})
