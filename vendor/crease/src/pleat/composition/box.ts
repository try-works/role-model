import { Style, When, Theme } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { foundationTokens } from '../foundations-tokens'
import { className } from '../style'
import { tokens } from '../tokens'
import { compositionTheme } from './composition-theme'
import { primitiveAttributes, primitiveElement } from './element'
import { paddingStyles } from './space'
import { semanticSystemTheme } from './semantic-theme'
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

const styles = {
  containNone: Style.make({ contain: 'none' }),
  containPaint: Style.make({ contain: 'paint' }),
  contentCenter: Style.make({
    alignItems: 'center',
    display: 'grid',
    justifyItems: 'center',
  }),
  contentNormal: Style.make({ display: 'block' }),
  minHeightViewport: Style.make({ minHeight: '100svh' }),
  minHeightCreatePage: Style.make({ minHeight: 'calc(100vh - 3.5rem)' }),
  minHeightBlockPreview: Style.make({ minHeight: '36rem' }).pipe(
    Style.when(When.minWidth('768px'), { minHeight: '50rem' }),
  ),
  minHeightBlocksHero: Style.make({ minHeight: '22rem' }).pipe(
    Style.when(When.minWidth('768px'), { minHeight: '25rem' }),
  ),
  minHeightFull: Style.make({ minHeight: '100%' }),
  minHeightNone: Style.make({ minHeight: 0 }),
  minHeightSkeleton: Style.make({ minHeight: '28rem' }),
  minWidthMaxContent: Style.make({ minWidth: 'max-content' }),
  minWidthNone: Style.make({ minWidth: 0 }),
  overflowXAuto: Style.make({ overflowX: 'auto' }),
  overflowXHidden: Style.make({ overflowX: 'hidden' }),
  overflowXVisible: Style.make({ overflowX: 'visible' }),
  overflowYAuto: Style.make({ overflowY: 'auto' }),
  overflowYHidden: Style.make({ overflowY: 'hidden' }),
  overflowYVisible: Style.make({ overflowY: 'visible' }),
  positionRelative: Style.make({ position: 'relative' }),
  positionStatic: Style.make({ position: 'static' }),
  radiusFull: Style.make({ borderRadius: foundationTokens.radiusFull }),
  radiusLg: Style.make({ borderRadius: foundationTokens.radiusLg }),
  radiusMd: Style.make({ borderRadius: foundationTokens.radiusMd }),
  radiusNone: Style.make({ borderRadius: '0px' }),
  radiusSm: Style.make({ borderRadius: foundationTokens.radiusSm }),
  railCustomizer: Style.make({ paddingInlineStart: 0 }).pipe(
    Style.when(When.minWidth('1024px'), { paddingInlineStart: '20.625rem' }),
  ),
  railNone: Style.make({ paddingInlineStart: 0 }),
  surfaceCard: Style.make({
    borderColor: tokens.border,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: tokens.card,
    boxShadow: tokens.shadowCard,
    color: tokens.cardForeground,
  }),
  surfaceCanvas: Style.make({
    backgroundColor: compositionTheme.canvas,
    color: tokens.foreground,
  }),
  surfaceMuted: Style.make({
    backgroundColor: foundationTokens.muted,
    color: tokens.foreground,
  }),
  surfaceNone: Style.make({ backgroundColor: tokens.transparent }),
  surfacePage: Style.make({
    backgroundColor: tokens.background,
    color: tokens.foreground,
  }),
  surfaceSection: Style.make({
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
  }),
  visibilityAlways: Style.make({ display: 'block' }),
  visibilityDesktop: Style.make({ display: 'none' }).pipe(
    Style.when(When.minWidth('768px'), { display: 'block' }),
  ),
  visibilityMobile: Style.make({ display: 'block' }).pipe(
    Style.when(When.minWidth('768px'), { display: 'none' }),
  ),
  widthAuto: Style.make({ width: 'auto' }),
  widthContent: Style.make({
    marginInline: 'auto',
    maxWidth: '90rem',
    width: '100%',
  }),
  widthCreateBoard: Style.make({
    boxSizing: 'border-box',
    width: '150rem',
  }).pipe(Style.when(When.minWidth('768px'), { width: '187.5rem' })),
  widthFit: Style.make({ width: 'fit-content' }),
  widthForm: Style.make({
    maxWidth: semanticSystemTheme.contentForm,
    width: '100%',
  }),
  widthLogin: Style.make({
    marginInline: 'auto',
    maxWidth: '56rem',
    width: '100%',
  }),
  widthReadable: Style.make({
    marginInline: 'auto',
    maxWidth: semanticSystemTheme.contentReadable,
    width: '100%',
  }),
  widthFull: Style.make({ width: '100%' }),
}

const pick = <T extends PropertyKey>(
  value: T | undefined,
  map: Readonly<Record<T, Style.Style>>,
): ReadonlyArray<Style.Style> => (value === undefined ? [] : [map[value]])

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
