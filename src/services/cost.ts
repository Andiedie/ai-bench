import type { TokenUsage, OpenRouterPricing } from '../types/index'

/**
 * Calculates the cost in USD for a single request.
 * Returns null if pricing is null.
 * Null cache prices are treated as $0 (not N/A for the whole cost).
 */
export function calculateCost(
  tokens: TokenUsage,
  pricing: OpenRouterPricing | null,
): number | null {
  if (pricing === null) return null

  const promptCost = pricing.prompt * tokens.inputTokens
  const completionCost = pricing.completion * tokens.outputTokens
  const cacheReadCost = (pricing.inputCacheRead ?? 0) * tokens.cacheReadTokens
  const cacheWriteCost =
    (pricing.inputCacheWrite ?? 0) * tokens.cacheWriteTokens

  return promptCost + completionCost + cacheReadCost + cacheWriteCost
}

/**
 * Formats a cost value for display.
 * null → "N/A"
 * 0 → "$0.0000"
 * Very small values (< $0.0001) → scientific notation with $ prefix
 * Otherwise → "$X.XXXX" (4 decimal places)
 */
export function formatCost(cost: number | null): string {
  if (cost === null) return 'N/A'
  if (cost === 0) return '$0.0000'
  if (cost < 0.0001) return `$${cost.toExponential(4)}`
  return `$${cost.toFixed(4)}`
}
