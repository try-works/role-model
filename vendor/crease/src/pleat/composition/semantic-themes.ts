import { Theme } from '@pleat/core'

import { semanticSystemTheme, semanticSystemThemeTheme } from './semantic-theme'

export const compactSemanticTheme = Theme.patch(
  semanticSystemThemeTheme,
  semanticSystemTheme,
  {
    controlLarge: '2rem',
    controlMedium: '1.75rem',
    controlSmall: '1.5rem',
    durationFast: '120ms',
    durationNormal: '170ms',
    regionBalanced: '0.75rem',
    regionCompact: '0.5rem',
    regionSpacious: '1rem',
  },
)

export const comfortableSemanticTheme = Theme.patch(
  semanticSystemThemeTheme,
  semanticSystemTheme,
  {},
)

export const expressiveSemanticTheme = Theme.patch(
  semanticSystemThemeTheme,
  semanticSystemTheme,
  {
    durationFast: '180ms',
    durationNormal: '260ms',
    easingStandard: 'cubic-bezier(0.16, 1, 0.3, 1)',
    elevationHigh: '0 20px 48px rgb(0 0 0 / 0.2)',
    elevationMedium: '0 10px 24px rgb(0 0 0 / 0.14)',
    regionBalanced: '1.25rem',
    regionCompact: '0.75rem',
    regionSpacious: '2rem',
  },
)
