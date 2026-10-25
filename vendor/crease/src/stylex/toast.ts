import * as stylex from '@stylexjs/stylex'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { Option } from 'effect'

import * as Icon from '@/lib/icon'
import {
  ActivatedToastAction,
  type Entry,
  type Message,
  type Model,
  type Position,
  type Variant,
  Message as ToastMessages,
  stackLayout,
  contentMount,
  viewportMount,
} from '@/lib/toast'
import type { StaticStyles } from '@stylexjs/stylex'

import { buttonVisualStyles } from './button'
import type { ComponentLayoutStyle } from './contracts'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

export * from '@/lib/toast'

const styles = stylex.create({
  action: {
    paddingInline: '0.75rem',
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.secondary,
    },
    flexShrink: 0,
  },
  body: {
    gap: '0.25rem',
    display: 'grid',
    flexGrow: 1,
    overflowWrap: 'anywhere',
    minWidth: 0,
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  dismiss: {
    padding: '0.25rem',
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    opacity: { default: 0.7, ':focus': 1 },
    position: 'absolute',
    right: '0.5rem',
    top: '0.5rem',
  },
  icon: { flexShrink: 0, height: '1rem', marginTop: '0.125rem', width: '1rem' },
  title: { fontSize: '0.875rem', fontWeight: 600, lineHeight: '1.25rem' },
  toast: {
    borderColor: tokens.border,
    borderRadius: tokens.cardRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowCard,
    color: tokens.foreground,
    pointerEvents: 'auto',
    position: 'absolute',
    transitionDuration: {
      default: interactionTokens.motionToast,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'transform, opacity, height',
    transitionTimingFunction: interactionTokens.easingToast,
    left: 0,
    width: '100%',
    '::after': {
      content: "''",
      position: 'absolute',
      height: 13,
      left: 0,
      width: '100%',
    },
  },
  viewport: {
    outline: 'none',
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 100,
    maxHeight: 'calc(100dvh - 2rem)',
    maxWidth: '24rem',
    width: {
      default: 'calc(100% - 2rem)',
      '@media (min-width: 640px)': '100%',
    },
  },
  stage: { position: 'relative', width: '100%' },
  content: {
    padding: '1rem',
    gap: '0.75rem',
    overflow: 'hidden',
    alignItems: 'flex-start',
    display: 'flex',
    position: 'relative',
    transitionDuration: {
      default: interactionTokens.motionToastContent,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: 'opacity',
    transitionTimingFunction: interactionTokens.easingToastContent,
    paddingRight: '2rem',
  },
  entryTop: { transformOrigin: 'top', top: 0, '::after': { bottom: '100%' } },
  entryBottom: {
    transformOrigin: 'bottom',
    bottom: 0,
    '::after': { top: '100%' },
  },
  limited: { pointerEvents: 'none' },
  swipeEnabled: { touchAction: 'pan-y' },
  swiping: {
    cursor: interactionTokens.cursorGrabbing,
    transitionDuration: interactionTokens.motionNone,
    userSelect: 'none',
  },
  front: { '::after': { display: 'none' } },
  expanded: { overflowY: 'auto' },
  viewportLeft: { left: '1rem' },
  viewportCenter: { transform: 'translateX(-50%)', left: '50%' },
  viewportRight: { right: '1rem' },
  viewportTop: { top: '1rem' },
  viewportBottomEdge: { bottom: '1rem' },
  visuallyClosed: { opacity: 0 },
})

const variantIcon = <Msg>(
  variant: Variant,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const config = { class: className(styles.icon) }
  switch (variant) {
    case 'Success':
      return Icon.circleCheck<Msg>(config, h)
    case 'Error':
      return Icon.octagonX<Msg>(config, h)
    case 'Warning':
      return Icon.triangleAlert<Msg>(config, h)
    case 'Info':
      return Icon.info<Msg>(config, h)
    case 'Default':
      return undefined
  }
}

const POSITION_ORDER: ReadonlyArray<Position> = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

const positionStyle = (position: Position): ReadonlyArray<StaticStyles> => {
  switch (position) {
    case 'top-left':
      return [styles.viewportLeft, styles.viewportTop]
    case 'top-center':
      return [styles.viewportCenter, styles.viewportTop]
    case 'top-right':
      return [styles.viewportRight, styles.viewportTop]
    case 'bottom-left':
      return [styles.viewportLeft, styles.viewportBottomEdge]
    case 'bottom-center':
      return [styles.viewportCenter, styles.viewportBottomEdge]
    case 'bottom-right':
      return [styles.viewportRight, styles.viewportBottomEdge]
  }
}

export type ToastProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  ariaLabel?: string
  pausePolicy?: 'none' | 'pointer'
  layoutStyle?: ComponentLayoutStyle
  entryLayoutStyle?: ComponentLayoutStyle
  position?: Position
  stacked?: boolean
  expanded?: boolean
}>

/** Mirrors the upstream Toast view's animation attributes so the entry
 *  participates in the primitive's enter/leave lifecycle. */
const animationAttributes = <Msg>(
  entry: Entry,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Attribute<Msg>> => {
  switch (entry.animation.transitionState) {
    case 'EnterStart':
      return [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]
    case 'EnterAnimating':
      return [h.DataAttribute('enter', ''), h.DataAttribute('transition', '')]
    case 'LeaveStart':
      return [h.DataAttribute('leave', ''), h.DataAttribute('transition', '')]
    case 'LeaveAnimating':
      return [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]
    default:
      return []
  }
}

/** `data-closed` phases (enter start, leave end) fade the entry via the
 *  existing opacity/transform transition. */
const entryView = <Msg>(
  item: ReturnType<typeof stackLayout>['entries'][number],
  position: Position,
  expanded: boolean,
  props: ToastProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { entry, limited, behind } = item
  return h.article(
    [
      h.Key(entry.id),
      h.Id(entry.id),
      h.Role(entry.payload.variant === 'Error' ? 'alert' : 'status'),
      h.DataAttribute('slot', 'toast-entry'),
      h.DataAttribute('variant', entry.payload.variant.toLowerCase()),
      h.DataAttribute('paused', String(entry.isHovered)),
      h.Inert(limited),
      ...(item.swiping ? [h.DataAttribute('swiping', '')] : []),
      ...(item.swipeDirection
        ? [
            h.DataAttribute(
              'swipe-direction',
              item.swipeDirection.toLowerCase(),
            ),
          ]
        : []),
      ...(limited ? [h.DataAttribute('limited', ''), h.AriaHidden(true)] : []),
      ...(expanded ? [h.DataAttribute('expanded', '')] : []),
      h.Style(item.style),
      ...animationAttributes(entry, h),
      h.Class(
        className(
          styles.toast,
          position.startsWith('top') ? styles.entryTop : styles.entryBottom,
          limited ? styles.limited : undefined,
          Option.isSome(props.model.maybeSwipeConfig)
            ? styles.swipeEnabled
            : undefined,
          item.swiping ? styles.swiping : undefined,
          item.index === 0 ? styles.front : undefined,
          props.entryLayoutStyle,
        ),
      ),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'toast-content'),
          ...(behind ? [h.DataAttribute('behind', '')] : []),
          ...(expanded ? [h.DataAttribute('expanded', '')] : []),
          h.OnMount(contentMount(entry.id, props.toParentMessage)),
          h.Class(
            className(
              styles.content,
              behind ? styles.visuallyClosed : undefined,
            ),
          ),
        ],
        [
          ...(variantIcon(entry.payload.variant, h) === undefined
            ? []
            : [variantIcon(entry.payload.variant, h)!]),
          h.div(
            [h.Class(className(styles.body))],
            [
              h.div([h.Class(className(styles.title))], [entry.payload.title]),
              ...(entry.payload.description === undefined
                ? []
                : [
                    h.div(
                      [h.Class(className(styles.description))],
                      [entry.payload.description],
                    ),
                  ]),
            ],
          ),
          ...(entry.payload.actionLabel === undefined
            ? []
            : [
                h.button(
                  [
                    h.Type('button'),
                    h.OnClick(
                      props.toParentMessage(
                        ActivatedToastAction({ id: entry.id }),
                      ),
                    ),
                    h.Class(
                      className(
                        ...buttonVisualStyles({
                          variant: 'outline',
                          size: 'sm',
                        }),
                        styles.action,
                      ),
                    ),
                  ],
                  [entry.payload.actionLabel],
                ),
              ]),
          h.button(
            [
              h.Type('button'),
              h.AriaLabel('Dismiss notification'),
              h.OnClick(
                props.toParentMessage(
                  ToastMessages.Dismissed({ entryId: entry.id }),
                ),
              ),
              h.Class(
                className(
                  ...buttonVisualStyles({ variant: 'ghost', size: 'icon-xs' }),
                  styles.dismiss,
                ),
              ),
            ],
            [Icon.x<Msg>({}, h)],
          ),
        ],
      ),
    ],
  )
}

export const toast = <Msg>(
  props: ToastProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const fallback = props.position ?? props.model.position
  const entryPosition = (entry: Entry): Position =>
    entry.payload.position ?? fallback
  const positions = POSITION_ORDER.filter(position =>
    props.model.entries.some(entry => entryPosition(entry) === position),
  )
  return h.div(
    [h.DataAttribute('slot', 'toast-root')],
    (positions.length === 0 ? [fallback] : positions).map(position => {
      const expanded =
        props.stacked === false ||
        props.expanded === true ||
        props.model.hoveredPositions.includes(position) ||
        props.model.focusedPositions.includes(position)
      const layout = stackLayout(props.model, position, expanded, fallback)
      return h.section(
        [
          h.AriaLabel(props.ariaLabel ?? 'Notifications'),
          h.AriaLive('polite'),
          h.Key(position),
          h.Tabindex(-1),
          h.OnMount(
            viewportMount(
              position,
              fallback,
              props.model.id,
              props.toParentMessage,
              Option.isSome(props.model.maybeSwipeConfig),
              props.pausePolicy !== 'none',
            ),
          ),
          h.DataAttribute('slot', 'toast'),
          h.DataAttribute('position', position),
          h.Style({ height: `${layout.height}px` }),
          h.Class(
            className(
              styles.viewport,
              ...positionStyle(position),
              expanded && layout.height > props.model.viewportHeight - 32
                ? styles.expanded
                : undefined,
              props.layoutStyle,
            ),
          ),
        ],
        [
          h.div(
            [
              h.Class(className(styles.stage)),
              h.Style({ height: `${layout.height}px` }),
            ],
            layout.entries.map(item =>
              entryView(item, position, expanded, props, h),
            ),
          ),
        ],
      )
    }),
  )
}
