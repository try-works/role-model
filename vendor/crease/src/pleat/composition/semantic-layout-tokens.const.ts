/**
 * Structural budgets are centralized here. Raw lengths belong at region
 * boundaries; component interiors continue to use the semantic spacing scale.
 */
export const semanticLayoutTokens = {
  contentReadable: '60rem',
  navigationStandard: '15rem',
  navigationWide: '18rem',
  panelComfortable: '24rem',
  panelWide: '26rem',
} as const
