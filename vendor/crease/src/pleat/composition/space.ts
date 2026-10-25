import { Style, When, Theme } from '@pleat/core'
import { compositionTokens } from './composition-tokens.const'
import { semanticSystemTheme } from './semantic-theme'
import type { ResponsiveSpaceToken, SpaceToken } from './types'

const styles = {
  columnGapLg: Style.make({ columnGap: semanticSystemTheme.regionSpacious }),
  columnGapMd: Style.make({ columnGap: semanticSystemTheme.regionBalanced }),
  columnGapNone: Style.make({ columnGap: compositionTokens.spaceNone }),
  columnGapSm: Style.make({ columnGap: semanticSystemTheme.regionCompact }),
  columnGapXl: Style.make({ columnGap: compositionTokens.spaceXl }),
  columnGapXs: Style.make({ columnGap: compositionTokens.spaceXs }),
  columnGapXxl: Style.make({ columnGap: compositionTokens.spaceXxl }),
  gapCreateBoard: Style.make({ gap: compositionTokens.spaceMd }).pipe(
    Style.when(When.minWidth('1920px'), { gap: compositionTokens.spaceXxl }),
    Style.when(When.minWidth('768px'), { gap: compositionTokens.spaceXl }),
  ),
  gapLg: Style.make({ gap: semanticSystemTheme.regionSpacious }),
  gapMd: Style.make({ gap: semanticSystemTheme.regionBalanced }),
  gapNone: Style.make({ gap: compositionTokens.spaceNone }),
  gapSm: Style.make({ gap: semanticSystemTheme.regionCompact }),
  gapXl: Style.make({ gap: compositionTokens.spaceXl }),
  gapXs: Style.make({ gap: compositionTokens.spaceXs }),
  gapXxl: Style.make({ gap: compositionTokens.spaceXxl }),
  paddingCreateBoard: Style.make({ padding: compositionTokens.spaceMd }).pipe(
    Style.when(When.minWidth('1920px'), {
      padding: compositionTokens.spaceXxl,
    }),
    Style.when(When.minWidth('768px'), { padding: compositionTokens.spaceXl }),
  ),
  paddingLg: Style.make({ padding: semanticSystemTheme.regionSpacious }),
  paddingMd: Style.make({ padding: semanticSystemTheme.regionBalanced }),
  paddingNone: Style.make({ padding: compositionTokens.spaceNone }),
  paddingSm: Style.make({ padding: semanticSystemTheme.regionCompact }),
  paddingXl: Style.make({ padding: compositionTokens.spaceXl }),
  paddingXs: Style.make({ padding: compositionTokens.spaceXs }),
  paddingXxl: Style.make({ padding: compositionTokens.spaceXxl }),
  rowGapLg: Style.make({ rowGap: semanticSystemTheme.regionSpacious }),
  rowGapMd: Style.make({ rowGap: semanticSystemTheme.regionBalanced }),
  rowGapNone: Style.make({ rowGap: compositionTokens.spaceNone }),
  rowGapSm: Style.make({ rowGap: semanticSystemTheme.regionCompact }),
  rowGapXl: Style.make({ rowGap: compositionTokens.spaceXl }),
  rowGapXs: Style.make({ rowGap: compositionTokens.spaceXs }),
  rowGapXxl: Style.make({ rowGap: compositionTokens.spaceXxl }),
}

export const gapStyles = (
  value: ResponsiveSpaceToken | undefined,
): ReadonlyArray<Style.Style> => {
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
): ReadonlyArray<Style.Style> => {
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
): ReadonlyArray<Style.Style> => {
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
): ReadonlyArray<Style.Style> => {
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
