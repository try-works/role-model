import { Style, When, Global } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { interactionTokens } from './interaction-tokens'
import { tokens } from './tokens'

export type MarkerVariant = 'default' | 'separator' | 'border'
export type MarkerPurpose = 'annotation' | 'status' | 'decorative'
type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const shimmerSweep = Global.keyframes('marker-shimmer-sweep', {
  from: { backgroundPosition: '100% 0' },
  to: { backgroundPosition: '0 0' },
})

const styles = {
  root: Style.make({
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
  }),
  default: Style.empty,
  separator: Style.empty.pipe(
    Style.when(When.after, {
      backgroundColor: tokens.border,
      content: '""',
      flexBasis: '0%',
      flexGrow: 1,
      flexShrink: 1,
      height: '1px',
      marginLeft: '0.25rem',
      minWidth: 0,
    }),
    Style.when(When.before, {
      backgroundColor: tokens.border,
      content: '""',
      flexBasis: '0%',
      flexGrow: 1,
      flexShrink: 1,
      height: '1px',
      marginRight: '0.25rem',
      minWidth: 0,
    }),
  ),
  border: Style.make({
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    paddingBottom: '0.5rem',
  }),
  interactive: Style.make({
    color: tokens.mutedForeground,
    cursor: interactionTokens.cursorAction,
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color',
    width: 'fit-content',
  }).pipe(Style.when(When.hover, { color: tokens.foreground })),
  interactiveAnchor: Style.make({
    textDecorationLine: 'underline',
    textUnderlineOffset: '0.1875rem',
  }),
  column: Style.make({ flexDirection: 'column' }),
  icon: Style.make({ flexShrink: 0, height: '1rem', width: '1rem' }),
  content: Style.make({ overflowWrap: 'break-word', minWidth: 0 }),
  separatorContent: Style.empty.pipe(
    Style.when(When.within(When.data('variant', 'separator')), {
      flexBasis: 'auto',
      flexGrow: 0,
      flexShrink: 0,
      textAlign: 'center',
    }),
  ),
  shimmer: Style.make({
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
  }),
}

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
        When.marker('default-marker'),
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
