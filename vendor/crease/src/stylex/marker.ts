import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { tokens } from './tokens.stylex'

export type MarkerVariant = 'default' | 'separator' | 'border'
export type MarkerPurpose = 'annotation' | 'status' | 'decorative'
type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>

const shimmerSweep = stylex.keyframes({
  from: { backgroundPosition: '100% 0' },
  to: { backgroundPosition: '0 0' },
})

const styles = stylex.create({
  root: {
    gap: '0.5rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    position: 'relative',
    textAlign: 'left',
    minHeight: '1rem',
    width: '100%',
  },
  default: {},
  separator: {
    '::after': {
      backgroundColor: tokens.border,
      content: '""',
      flexBasis: '0%',
      flexGrow: 1,
      flexShrink: 1,
      height: '1px',
      marginLeft: '0.25rem',
      minWidth: 0,
    },
    '::before': {
      backgroundColor: tokens.border,
      content: '""',
      flexBasis: '0%',
      flexGrow: 1,
      flexShrink: 1,
      height: '1px',
      marginRight: '0.25rem',
      minWidth: 0,
    },
  },
  border: {
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    paddingBottom: '0.5rem',
  },
  interactive: {
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.foreground,
    },
    cursor: interactionTokens.cursorAction,
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color',
    width: 'fit-content',
  },
  interactiveAnchor: {
    textDecorationLine: 'underline',
    textUnderlineOffset: '0.1875rem',
  },
  column: { flexDirection: 'column' },
  icon: { flexShrink: 0, height: '1rem', width: '1rem' },
  content: { overflowWrap: 'break-word', minWidth: 0 },
  separatorContent: {
    flexBasis: {
      default: null,
      [stylex.when.ancestor(':is([data-variant=separator])')]: 'auto',
    },
    flexGrow: {
      default: null,
      [stylex.when.ancestor(':is([data-variant=separator])')]: 0,
    },
    flexShrink: {
      default: null,
      [stylex.when.ancestor(':is([data-variant=separator])')]: 0,
    },
    textAlign: {
      default: null,
      [stylex.when.ancestor(':is([data-variant=separator])')]: 'center',
    },
  },
  shimmer: {
    WebkitTextFillColor: 'transparent',
    animationDuration: interactionTokens.motionLoopSlow,
    animationIterationCount: 'infinite',
    animationName: shimmerSweep,
    animationTimingFunction: interactionTokens.easingLinear,
    backgroundClip: 'text',
    backgroundImage:
      'linear-gradient(110deg, currentColor calc(50% - (3ch + 40px)), color-mix(in oklch, color-mix(in oklch, currentColor 20%, transparent), currentColor 50%) calc(50% - (3ch + 40px) * 0.5), color-mix(in oklch, currentColor 20%, transparent) 50%, color-mix(in oklch, color-mix(in oklch, currentColor 20%, transparent), currentColor 50%) calc(50% + (3ch + 40px) * 0.5), currentColor calc(50% + (3ch + 40px)))',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'calc(200% + (3ch + 40px) * 2) 100%',
  },
})

export const markerVariants = (
  options: Readonly<{ variant?: MarkerVariant | null }> = {},
): string => className(styles.root, styles[options.variant ?? 'default'])

export const marker = <Msg>(
  props: ChildrenProps &
    Readonly<{
      variant?: MarkerVariant
      purpose?: MarkerPurpose
      ariaLabel?: string
      element?: 'div' | 'a' | 'button'
      href?: string
      onClick?: () => Msg
      direction?: 'row' | 'column'
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const purpose = props.purpose ?? 'annotation'
  const element = props.element ?? 'div'
  const attrs = [
    h.DataAttribute('slot', 'marker'),
    h.DataAttribute('variant', props.variant ?? 'default'),
    h.DataAttribute('purpose', purpose),
    ...(purpose === 'decorative'
      ? [h.Role('none'), h.AriaHidden(true)]
      : [h.Role(purpose === 'status' ? 'status' : 'note')]),
    ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
    h.Class(
      className(
        element === 'button'
          ? reset.button
          : element === 'a'
            ? reset.link
            : undefined,
        styles.root,
        styles[props.variant ?? 'default'],
        ...(props.direction === 'column' ? [styles.column] : []),
        ...(element === 'div' ? [] : [styles.interactive]),
        ...(element === 'a' ? [styles.interactiveAnchor] : []),
        stylex.defaultMarker(),
        props.layoutStyle,
      ),
    ),
  ]
  switch (element) {
    case 'a':
      return h.a([...attrs, h.Href(props.href ?? '#')], [...props.children])
    case 'button':
      return h.button(
        [
          ...attrs,
          h.Type('button'),
          ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick())]),
        ],
        [...props.children],
      )
    default:
      return h.div(attrs, [...props.children])
  }
}

export const markerIcon = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'marker-icon'),
      h.AriaHidden(true),
      h.Class(className(styles.icon, props.layoutStyle)),
    ],
    [...props.children],
  )

export const markerContent = <Msg>(
  props: ChildrenProps & Readonly<{ shimmer?: boolean }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'marker-content'),
      h.Class(
        className(
          styles.content,
          styles.separatorContent,
          ...(props.shimmer === true ? [styles.shimmer] : []),
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
