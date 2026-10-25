import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { foundationTokens } from '../foundations-tokens.stylex'
import { className } from '../style'
import { tokens } from '../tokens.stylex'
import { compositionTheme } from './composition-theme.stylex'
import { primitiveAttributes, primitiveElement } from './element'
import { semanticLayoutTokens } from './semantic-layout-tokens.stylex.const'
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

const styles = stylex.create({
  alignCenter: { alignItems: 'center' },
  alignStart: { alignItems: 'flex-start' },
  alignStretch: { alignItems: 'stretch' },
  base: { display: 'grid', minWidth: 0 },
  columnsCreateBoard: { gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' },
  columnsAppShell: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 768px)': `${semanticLayoutTokens.navigationStandard} minmax(0, 1fr)`,
    },
  },
  columnsAppShellWide: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 768px)': `${semanticLayoutTokens.navigationWide} minmax(0, 1fr)`,
    },
  },
  columnsFour: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 1100px)': 'repeat(4, minmax(0, 1fr))',
      '@media (min-width: 700px) and (max-width: 1099px)':
        'repeat(2, minmax(0, 1fr))',
    },
  },
  columnsGallery: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 1024px)': 'repeat(3, minmax(0, 1fr))',
      '@media (min-width: 700px) and (max-width: 1023px)':
        'repeat(2, minmax(0, 1fr))',
    },
  },
  columnsLoginSplit: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 900px)': 'minmax(0, 1fr) minmax(0, 1fr)',
    },
  },
  columnsMasterDetail: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 1024px)': `minmax(0, 1fr) ${semanticLayoutTokens.panelComfortable}`,
    },
  },
  columnsOne: { gridTemplateColumns: 'minmax(0, 1fr)' },
  columnsSidebar: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 768px)': '15rem minmax(0, 1fr)',
    },
  },
  columnsSidebarWide: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 768px)': '18rem minmax(0, 1fr)',
    },
  },
  columnsTwo: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 700px)': 'repeat(2, minmax(0, 1fr))',
    },
  },
  surfaceCanvas: {
    backgroundColor: compositionTheme.canvas,
    color: tokens.foreground,
  },
  surfaceMuted: {
    backgroundColor: foundationTokens.muted,
    color: tokens.foreground,
  },
  surfaceNone: { backgroundColor: tokens.transparent },
  widthAuto: { width: 'auto' },
  widthCreateBoard: {
    width: { default: '150rem', '@media (min-width: 768px)': '187.5rem' },
  },
  widthFull: { width: '100%' },
})

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
