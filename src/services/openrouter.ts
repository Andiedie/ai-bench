import type { OpenRouterModel, OpenRouterPricing } from '../types/index'

/**
 * Parses a raw OpenRouter pricing string value to a number.
 * Returns null for "-1" (unknown pricing), undefined values, or non-numeric strings.
 */
function parsePrice(val: string | undefined | null): number | null {
  if (val === undefined || val === null) return null
  const num = parseFloat(val)
  if (isNaN(num) || num < 0) return null // -1 means unknown
  return num
}

/**
 * Parses raw OpenRouter pricing object (with string values) to typed pricing.
 */
export function parsePricing(raw: {
  prompt?: string
  completion?: string
  input_cache_read?: string
  input_cache_write?: string
  [key: string]: string | undefined
}): OpenRouterPricing {
  return {
    prompt: parsePrice(raw.prompt) ?? 0,
    completion: parsePrice(raw.completion) ?? 0,
    inputCacheRead: parsePrice(raw.input_cache_read),
    inputCacheWrite: parsePrice(raw.input_cache_write),
  }
}

/**
 * Fetches all models from OpenRouter API.
 * Returns empty array on network error.
 */
export async function fetchModels(): Promise<OpenRouterModel[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models')
    if (!res.ok) return []
    const json = (await res.json()) as {
      data: Array<{
        id: string
        name: string
        pricing: {
          prompt?: string
          completion?: string
          input_cache_read?: string
          input_cache_write?: string
        }
      }>
    }
    return json.data.map((m) => ({
      id: m.id,
      name: m.name,
      pricing: parsePricing(m.pricing),
    }))
  } catch {
    return []
  }
}

/**
 * Finds pricing for the given user model name in the OpenRouter model list.
 * Strategy:
 *   1. Try exact match: userModel === model.id
 *   2. Try prefix match: "anthropic/{userModel}" === model.id
 *   3. Try substring: model.id ends with "/{userModel}"
 * Returns null if not found.
 */
export function findModelPricing(
  models: OpenRouterModel[],
  userModel: string,
): OpenRouterPricing | null {
  const lower = userModel.toLowerCase()

  // 1. Exact match
  const exact = models.find((m) => m.id.toLowerCase() === lower)
  if (exact) return exact.pricing

  // 2. anthropic/ prefix
  const withPrefix = models.find(
    (m) => m.id.toLowerCase() === `anthropic/${lower}`,
  )
  if (withPrefix) return withPrefix.pricing

  // 3. Substring: any provider prefix
  const suffix = models.find((m) => m.id.toLowerCase().endsWith(`/${lower}`))
  if (suffix) return suffix.pricing

  return null
}
