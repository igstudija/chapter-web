/**
 * AI Model Pricing & Cost Calculation
 *
 * Pricing is per 1M tokens, stored as USD.
 * Source: https://openai.com/pricing
 */

export interface ModelPricing {
  inputPer1M: number
  outputPer1M: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4.1-nano': {
    inputPer1M: 0.10,
    outputPer1M: 0.40,
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.60,
  },
  'gpt-4.1-mini': {
    inputPer1M: 0.40,
    outputPer1M: 1.60,
  },
  'o3-mini': {
    inputPer1M: 1.10,
    outputPer1M: 4.40,
  },
  'o4-mini': {
    inputPer1M: 1.10,
    outputPer1M: 4.40,
  },
  'gpt-5': {
    inputPer1M: 1.25,
    outputPer1M: 10,
  },
  'o3': {
    inputPer1M: 2,
    outputPer1M: 8,
  },
  'gpt-4.1': {
    inputPer1M: 2,
    outputPer1M: 8,
  },
  'gpt-4o': {
    inputPer1M: 2.5,
    outputPer1M: 10,
  },
}

/** Models that use reasoning (o-series) — need max_completion_tokens instead of max_tokens, no temperature */
export const REASONING_MODELS = new Set(['o3', 'o3-mini', 'o4-mini'])

/**
 * Calculate cost in USD for a given number of tokens.
 * Returns a number with up to 6 decimal places.
 */
export function calculateTokenCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini']
  const cost =
    (promptTokens * pricing.inputPer1M + completionTokens * pricing.outputPer1M) / 1_000_000
  return Number(cost.toFixed(6))
}
