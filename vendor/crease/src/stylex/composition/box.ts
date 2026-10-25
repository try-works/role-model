import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { foundationTokens } from '../foundations-tokens.stylex'
import { className } from '../style'
import { tokens } from '../tokens.stylex'
import { compositionTheme } from './composition-theme.stylex'
import { primitiveAttributes, primitiveElement } from './element'
import { paddingStyles } from './space'
import { semanticSystemTheme } from './semantic-theme.stylex'
import type {
  LayoutElement,
  PrimitiveChildren,
  PrimitiveData,
  ResponsiveSpaceToken,
} from './types'

export type BoxSurface =
  | 'none'
  | 'page'
  | 'section'
  | 'card'
  | 'muted'
  | 'canvas'
export type BoxRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

export type BoxProps = Readonly<{
  as?: LayoutElement
  children: PrimitiveChildren
  contain?: 'none' | 'paint'
  contentAlignment?: 'normal' | 'center'
  data?: PrimitiveData
  minHeight?:
    | 'viewport'
    | 'none'
    | 'full'
    | 'createPage'
    | 'blockPreview'
    | 'blocksHero'
    | 'skeleton'
  minWidth?: 'none' | 'maxContent'
  overflowX?: 'visible' | 'hidden' | 'auto'
  overflowY?: 'visible' | 'hidden' | 'auto'
  padding?: ResponsiveSpaceToken
  position?: 'static' | 'relative'
  radius?: BoxRadius
  rail?: 'none' | 'customizer'
  slot?: string
  surface?: BoxSurface
  visibility?: 'always' | 'desktop' | 'mobile'
  width?:
    | 'auto'
    | 'full'
    | 'fit'
    | 'content'
    | 'readable'
    | 'form'
    | 'login'
    | 'createBoard'
}>

const styles = stylex.create({
  containNone: { contain: 'none' },
  containPaint: { contain: 'paint' },
  contentCenter: {
    alignItems: 'center',
    display: 'grid',
    justifyItems: 'center',
  },
  contentNormal: { display: 'block' },
  minHeightViewport: { minHeight: '100svh' },
  minHeightCreatePage: { minHeight: 'calc(100vh - 3.5rem)' },
  minHeightBlockPreview: {
    minHeight: { default: '36rem', '@media (min-width: 768px)': '50rem' },
  },
  minHeightBlocksHero: {
    minHeight: { default: '22rem', '@media (min-width: 768px)': '25rem' },
  },
  minHeightFull: { minHeight: '100%' },
  minHeightNone: { minHeight: 0 },
  minHeightSkeleton: { minHeight: '28rem' },
  minWidthMaxContent: { minWidth: 'max-content' },
  minWidthNone: { minWidth: 0 },
  overflowXAuto: { overflowX: 'auto' },
  overflowXHidden: { overflowX: 'hidden' },
  overflowXVisible: { overflowX: 'visible' },
  overflowYAuto: { overflowY: 'auto' },
  overflowYHidden: { overflowY: 'hidden' },
  overflowYVisible: { overflowY: 'visible' },
  positionRelative: { position: 'relative' },
  positionStatic: { position: 'static' },
  radiusFull: { borderRadius: foundationTokens.radiusFull },
  radiusLg: { borderRadius: foundationTokens.radiusLg },
  radiusMd: { borderRadius: foundationTokens.radiusMd },
  radiusNone: { borderRadius: '0px' },
  radiusSm: { borderRadius: foundationTokens.radiusSm },
  railCustomizer: {
    paddingInlineStart: {
      default: 0,
      '@media (min-width: 1024px)': '20.625rem',
    },
  },
  railNone: { paddingInlineStart: 0 },
  surfaceCard: {
    borderColor: tokens.border,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: tokens.card,
    boxShadow: tokens.shadowCard,
    color: tokens.cardForeground,
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
  surfacePage: { backgroundColor: tokens.background, color: tokens.foreground },
  surfaceSection: {
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
  },
  visibilityAlways: { display: 'block' },
  visibilityDesktop: {
    display: { default: 'none', '@media (min-width: 768px)': 'block' },
  },
  visibilityMobile: {
    display: { default: 'block', '@media (min-width: 768px)': 'none' },
  },
  widthAuto: { width: 'auto' },
  widthContent: { marginInline: 'auto', maxWidth: '90rem', width: '100%' },
  widthCreateBoard: {
    boxSizing: 'border-box',
    width: { default: '150rem', '@media (min-width: 768px)': '187.5rem' },
  },
  widthFit: { width: 'fit-content' },
  widthForm: { maxWidth: semanticSystemTheme.contentForm, width: '100%' },
  widthLogin: { marginInline: 'auto', maxWidth: '56rem', width: '100%' },
  widthReadable: {
    marginInline: 'auto',
    maxWidth: semanticSystemTheme.contentReadable,
    width: '100%',
  },
  widthFull: { width: '100%' },
})

const pick = <T extends PropertyKey>(
  value: T | undefined,
  map: Readonly<Record<T, StaticStyles>>,
): ReadonlyArray<StaticStyles> => (value === undefined ? [] : [map[value]])

export const box = <Message>(
  props: BoxProps,
  h: HtmlBuilder<Message>,
): Html => {
  const style = className(
    ...pick(props.surface, {
      card: styles.surfaceCard,
      canvas: styles.surfaceCanvas,
      muted: styles.surfaceMuted,
      none: styles.surfaceNone,
      page: styles.surfacePage,
      section: styles.surfaceSection,
    }),
    ...paddingStyles(props.padding),
    ...pick(props.radius, {
      full: styles.radiusFull,
      lg: styles.radiusLg,
      md: styles.radiusMd,
      none: styles.radiusNone,
      sm: styles.radiusSm,
    }),
    ...pick(props.width, {
      auto: styles.widthAuto,
      content: styles.widthContent,
      createBoard: styles.widthCreateBoard,
      fit: styles.widthFit,
      form: styles.widthForm,
      full: styles.widthFull,
      login: styles.widthLogin,
      readable: styles.widthReadable,
    }),
    ...pick(props.minWidth, {
      maxContent: styles.minWidthMaxContent,
      none: styles.minWidthNone,
    }),
    ...pick(props.minHeight, {
      viewport: styles.minHeightViewport,
      blockPreview: styles.minHeightBlockPreview,
      blocksHero: styles.minHeightBlocksHero,
      createPage: styles.minHeightCreatePage,
      full: styles.minHeightFull,
      none: styles.minHeightNone,
      skeleton: styles.minHeightSkeleton,
    }),
    ...pick(props.position, {
      relative: styles.positionRelative,
      static: styles.positionStatic,
    }),
    ...pick(props.contain, {
      none: styles.containNone,
      paint: styles.containPaint,
    }),
    ...pick(props.contentAlignment, {
      center: styles.contentCenter,
      normal: styles.contentNormal,
    }),
    ...pick(props.overflowX, {
      auto: styles.overflowXAuto,
      hidden: styles.overflowXHidden,
      visible: styles.overflowXVisible,
    }),
    ...pick(props.overflowY, {
      auto: styles.overflowYAuto,
      hidden: styles.overflowYHidden,
      visible: styles.overflowYVisible,
    }),
    ...pick(props.rail, {
      customizer: styles.railCustomizer,
      none: styles.railNone,
    }),
    ...pick(props.visibility, {
      always: styles.visibilityAlways,
      desktop: styles.visibilityDesktop,
      mobile: styles.visibilityMobile,
    }),
  )
  return primitiveElement(
    props.as ?? 'div',
    primitiveAttributes(style, props.slot, props.data, h),
    props.children,
    h,
  )
}
