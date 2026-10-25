import { Style, When, Theme } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { foundationTokens } from '../foundations-tokens'
import { className } from '../style'
import { tokens } from '../tokens'
import { compositionTheme } from './composition-theme'
import { primitiveAttributes, primitiveElement } from './element'
import { semanticLayoutTokens } from './semantic-layout-tokens.const'
import { gapStyles, paddingStyles } from './space'
import type {
  LayoutElement,
  PrimitiveChildren,
  PrimitiveData,
  ResponsiveSpaceToken,
} from './types'

export type GridProps = Readonly<{
  align?: 'start' | 'center' | 'stretch'
  as?: LayoutElement
  children: PrimitiveChildren
  columns?:
    | 'one'
    | 'two'
    | 'four'
    | 'gallery'
    | 'sidebar'
    | 'sidebarWide'
    | 'appShell'
    | 'appShellWide'
    | 'masterDetail'
    | 'loginSplit'
    | 'createBoard'
  data?: PrimitiveData
  gap?: ResponsiveSpaceToken
  padding?: ResponsiveSpaceToken
  slot?: string
  surface?: 'none' | 'muted' | 'canvas'
  width?: 'auto' | 'full' | 'createBoard'
}>

const styles = {
  alignCenter: Style.make({ alignItems: 'center' }),
  alignStart: Style.make({ alignItems: 'flex-start' }),
  alignStretch: Style.make({ alignItems: 'stretch' }),
  base: Style.make({ display: 'grid', minWidth: 0 }),
  columnsCreateBoard: Style.make({
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  }),
  columnsAppShell: Style.make({ gridTemplateColumns: 'minmax(0, 1fr)' }).pipe(
    Style.when(When.minWidth('768px'), {
      gridTemplateColumns: `${semanticLayoutTokens.navigationStandard} minmax(0, 1fr)`,
    }),
  ),
  columnsAppShellWide: Style.make({
    gridTemplateColumns: 'minmax(0, 1fr)',
  }).pipe(
    Style.when(When.minWidth('768px'), {
      gridTemplateColumns: `${semanticLayoutTokens.navigationWide} minmax(0, 1fr)`,
    }),
  ),
  columnsFour: Style.make({ gridTemplateColumns: 'minmax(0, 1fr)' }).pipe(
    Style.when(When.minWidth('1100px'), {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    }),
    Style.when(When.minWidth('700px) and (max-width: 1099px'), {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    }),
  ),
  columnsGallery: Style.make({ gridTemplateColumns: 'minmax(0, 1fr)' }).pipe(
    Style.when(When.minWidth('1024px'), {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    }),
    Style.when(When.minWidth('700px) and (max-width: 1023px'), {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    }),
  ),
  columnsLoginSplit: Style.make({ gridTemplateColumns: 'minmax(0, 1fr)' }).pipe(
    Style.when(When.minWidth('900px'), {
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    }),
  ),
  columnsMasterDetail: Style.make({
    gridTemplateColumns: 'minmax(0, 1fr)',
  }).pipe(
    Style.when(When.minWidth('1024px'), {
      gridTemplateColumns: `minmax(0, 1fr) ${semanticLayoutTokens.panelComfortable}`,
    }),
  ),
  columnsOne: Style.make({ gridTemplateColumns: 'minmax(0, 1fr)' }),
  columnsSidebar: Style.make({ gridTemplateColumns: 'minmax(0, 1fr)' }).pipe(
    Style.when(When.minWidth('768px'), {
      gridTemplateColumns: '15rem minmax(0, 1fr)',
    }),
  ),
  columnsSidebarWide: Style.make({
    gridTemplateColumns: 'minmax(0, 1fr)',
  }).pipe(
    Style.when(When.minWidth('768px'), {
      gridTemplateColumns: '18rem minmax(0, 1fr)',
    }),
  ),
  columnsTwo: Style.make({ gridTemplateColumns: 'minmax(0, 1fr)' }).pipe(
    Style.when(When.minWidth('700px'), {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    }),
  ),
  surfaceCanvas: Style.make({
    backgroundColor: compositionTheme.canvas,
    color: tokens.foreground,
  }),
  surfaceMuted: Style.make({
    backgroundColor: foundationTokens.muted,
    color: tokens.foreground,
  }),
  surfaceNone: Style.make({ backgroundColor: tokens.transparent }),
  widthAuto: Style.make({ width: 'auto' }),
  widthCreateBoard: Style.make({ width: '150rem' }).pipe(
    Style.when(When.minWidth('768px'), { width: '187.5rem' }),
  ),
  widthFull: Style.make({ width: '100%' }),
}

export const grid = <Message>(
  props: GridProps,
  h: HtmlBuilder<Message>,
): Html => {
  const align =
    props.align === undefined
      ? []
      : [
          {
            center: styles.alignCenter,
            start: styles.alignStart,
            stretch: styles.alignStretch,
          }[props.align],
        ]
  const columns =
    props.columns === undefined
      ? []
      : [
          {
            appShell: styles.columnsAppShell,
            appShellWide: styles.columnsAppShellWide,
            createBoard: styles.columnsCreateBoard,
            four: styles.columnsFour,
            gallery: styles.columnsGallery,
            loginSplit: styles.columnsLoginSplit,
            masterDetail: styles.columnsMasterDetail,
            one: styles.columnsOne,
            sidebar: styles.columnsSidebar,
            sidebarWide: styles.columnsSidebarWide,
            two: styles.columnsTwo,
          }[props.columns],
        ]
  const surface =
    props.surface === undefined
      ? []
      : [
          {
            canvas: styles.surfaceCanvas,
            muted: styles.surfaceMuted,
            none: styles.surfaceNone,
          }[props.surface],
        ]
  const width =
    props.width === undefined
      ? []
      : [
          {
            auto: styles.widthAuto,
            createBoard: styles.widthCreateBoard,
            full: styles.widthFull,
          }[props.width],
        ]
  return primitiveElement(
    props.as ?? 'div',
    primitiveAttributes(
      className(
        styles.base,
        ...align,
        ...columns,
        ...surface,
        ...width,
        ...gapStyles(props.gap),
        ...paddingStyles(props.padding),
      ),
      props.slot,
      props.data,
      h,
    ),
    props.children,
    h,
  )
}
