import * as stylex from '@stylexjs/stylex'

/** Semantic values shared by layout recipes and product components. */
export const semanticSystemTheme = stylex.defineVars({
  contentForm: '24rem',
  contentReadable: '60rem',
  controlLarge: '2.25rem',
  controlMedium: '2rem',
  controlSmall: '1.75rem',
  durationFast: '150ms',
  durationNormal: '200ms',
  easingStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  elevationHigh: '0 16px 36px rgb(0 0 0 / 0.16)',
  elevationLow: '0 1px 2px rgb(0 0 0 / 0.05)',
  elevationMedium: '0 6px 18px rgb(0 0 0 / 0.1)',
  focusOffset: '2px',
  focusWidth: '2px',
  regionBalanced: '1rem',
  regionCompact: '0.75rem',
  regionSpacious: '1.5rem',
  typeBodyLeading: '1.5',
  typeBodySize: '0.875rem',
  typeLabelLeading: '1.25',
  typeLabelSize: '0.875rem',
  typeSupportingLeading: '1.5',
  typeSupportingSize: '0.75rem',
})
