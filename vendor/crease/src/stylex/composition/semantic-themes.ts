import * as stylex from '@stylexjs/stylex'

import { semanticSystemTheme } from './semantic-theme.stylex'

export const compactSemanticTheme = stylex.createTheme(semanticSystemTheme, {
  controlLarge: '2rem',
  controlMedium: '1.75rem',
  controlSmall: '1.5rem',
  durationFast: '120ms',
  durationNormal: '170ms',
  regionBalanced: '0.75rem',
  regionCompact: '0.5rem',
  regionSpacious: '1rem',
})

export const comfortableSemanticTheme = stylex.createTheme(
  semanticSystemTheme,
  {},
)

export const expressiveSemanticTheme = stylex.createTheme(semanticSystemTheme, {
  durationFast: '180ms',
  durationNormal: '260ms',
  easingStandard: 'cubic-bezier(0.16, 1, 0.3, 1)',
  elevationHigh: '0 20px 48px rgb(0 0 0 / 0.2)',
  elevationMedium: '0 10px 24px rgb(0 0 0 / 0.14)',
  regionBalanced: '1.25rem',
  regionCompact: '0.75rem',
  regionSpacious: '2rem',
})
