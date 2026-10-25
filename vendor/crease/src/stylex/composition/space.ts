import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'

import { compositionTokens } from './composition-tokens.stylex.const'
import { semanticSystemTheme } from './semantic-theme.stylex'
import type { ResponsiveSpaceToken, SpaceToken } from './types'

const styles = stylex.create({
  columnGapLg: { columnGap: semanticSystemTheme.regionSpacious },
  columnGapMd: { columnGap: semanticSystemTheme.regionBalanced },
  columnGapNone: { columnGap: compositionTokens.spaceNone },
  columnGapSm: { columnGap: semanticSystemTheme.regionCompact },
  columnGapXl: { columnGap: compositionTokens.spaceXl },
  columnGapXs: { columnGap: compositionTokens.spaceXs },
  columnGapXxl: { columnGap: compositionTokens.spaceXxl },
  gapCreateBoard: {
    gap: {
      default: compositionTokens.spaceMd,
      '@media (min-width: 1920px)': compositionTokens.spaceXxl,
      '@media (min-width: 768px)': compositionTokens.spaceXl,
    },
  },
  gapLg: { gap: semanticSystemTheme.regionSpacious },
  gapMd: { gap: semanticSystemTheme.regionBalanced },
  gapNone: { gap: compositionTokens.spaceNone },
  gapSm: { gap: semanticSystemTheme.regionCompact },
  gapXl: { gap: compositionTokens.spaceXl },
  gapXs: { gap: compositionTokens.spaceXs },
  gapXxl: { gap: compositionTokens.spaceXxl },
  paddingCreateBoard: {
    padding: {
      default: compositionTokens.spaceMd,
      '@media (min-width: 1920px)': compositionTokens.spaceXxl,
      '@media (min-width: 768px)': compositionTokens.spaceXl,
    },
  },
  paddingLg: { padding: semanticSystemTheme.regionSpacious },
  paddingMd: { padding: semanticSystemTheme.regionBalanced },
  paddingNone: { padding: compositionTokens.spaceNone },
  paddingSm: { padding: semanticSystemTheme.regionCompact },
  paddingXl: { padding: compositionTokens.spaceXl },
  paddingXs: { padding: compositionTokens.spaceXs },
  paddingXxl: { padding: compositionTokens.spaceXxl },
  rowGapLg: { rowGap: semanticSystemTheme.regionSpacious },
  rowGapMd: { rowGap: semanticSystemTheme.regionBalanced },
  rowGapNone: { rowGap: compositionTokens.spaceNone },
  rowGapSm: { rowGap: semanticSystemTheme.regionCompact },
  rowGapXl: { rowGap: compositionTokens.spaceXl },
  rowGapXs: { rowGap: compositionTokens.spaceXs },
  rowGapXxl: { rowGap: compositionTokens.spaceXxl },
})

export const gapStyles = (
  value: ResponsiveSpaceToken | undefined,
): ReadonlyArray<StaticStyles> => {
  if (value === undefined) return []
  const map = {
    createBoard: styles.gapCreateBoard,
    lg: styles.gapLg,
    md: styles.gapMd,
    none: styles.gapNone,
    sm: styles.gapSm,
    xl: styles.gapXl,
    xs: styles.gapXs,
    xxl: styles.gapXxl,
  }
  return [map[value]]
}

export const paddingStyles = (
  value: ResponsiveSpaceToken | undefined,
): ReadonlyArray<StaticStyles> => {
  if (value === undefined) return []
  const map = {
    createBoard: styles.paddingCreateBoard,
    lg: styles.paddingLg,
    md: styles.paddingMd,
    none: styles.paddingNone,
    sm: styles.paddingSm,
    xl: styles.paddingXl,
    xs: styles.paddingXs,
    xxl: styles.paddingXxl,
  }
  return [map[value]]
}

export const rowGapStyle = (
  value: SpaceToken | undefined,
): ReadonlyArray<StaticStyles> => {
  if (value === undefined) return []
  const map = {
    lg: styles.rowGapLg,
    md: styles.rowGapMd,
    none: styles.rowGapNone,
    sm: styles.rowGapSm,
    xl: styles.rowGapXl,
    xs: styles.rowGapXs,
    xxl: styles.rowGapXxl,
  }
  return [map[value]]
}

export const columnGapStyle = (
  value: SpaceToken | undefined,
): ReadonlyArray<StaticStyles> => {
  if (value === undefined) return []
  const map = {
    lg: styles.columnGapLg,
    md: styles.columnGapMd,
    none: styles.columnGapNone,
    sm: styles.columnGapSm,
    xl: styles.columnGapXl,
    xs: styles.columnGapXs,
    xxl: styles.columnGapXxl,
  }
  return [map[value]]
}
