import { Style, When } from '@pleat/core'
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
import { buttonVisualStyles } from './button'
import type { ComponentLayoutStyle } from './contracts'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'

export * from '@/lib/toast'

const styles = {
  action: Style.make({
    paddingInline: '0.75rem',
    backgroundColor: tokens.transparent,
    flexShrink: 0,
  }).pipe(Style.when(When.hover, { backgroundColor: tokens.secondary })),
  body: Style.make({
    gap: '0.25rem',
    display: 'grid',
    flexGrow: 1,
    overflowWrap: 'anywhere',
    minWidth: 0,
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  dismiss: Style.make({
    padding: '0.25rem',
    color: tokens.mutedForeground,
    opacity: 0.7,
    position: 'absolute',
    right: '0.5rem',
    top: '0.5rem',
  }).pipe(
    Style.when(When.hover, { color: tokens.foreground }),
    Style.when(When.focus, { opacity: 1 }),
  ),
  icon: Style.make({
    flexShrink: 0,
    height: '1rem',
    marginTop: '0.125rem',
    width: '1rem',
  }),
  title: Style.make({
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
  }),
  toast: Style.make({
    borderColor: tokens.border,
    borderRadius: tokens.cardRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowCard,
    color: tokens.foreground,
    pointerEvents: 'auto',
    position: 'absolute',
    transitionDuration: interactionTokens.motionToast,
    transitionProperty: 'transform, opacity, height',
    transitionTimingFunction: interactionTokens.easingToast,
    left: 0,
    width: '100%',
  }).pipe(
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
    Style.when(When.after, {
      content: "''",
      position: 'absolute',
      height: 13,
      left: 0,
      width: '100%',
    }),
  ),
  viewport: Style.make({
    outline: 'none',
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 100,
    maxHeight: 'calc(100dvh - 2rem)',
    maxWidth: '24rem',
    width: 'calc(100% - 2rem)',
  }).pipe(Style.when(When.minWidth('640px'), { width: '100%' })),
  stage: Style.make({ position: 'relative', width: '100%' }),
  content: Style.make({
    padding: '1rem',
    gap: '0.75rem',
    overflow: 'hidden',
    alignItems: 'flex-start',
    display: 'flex',
    position: 'relative',
    transitionDuration: interactionTokens.motionToastContent,
    transitionProperty: 'opacity',
    transitionTimingFunction: interactionTokens.easingToastContent,
    paddingRight: '2rem',
  }).pipe(
    Style.when(When.reducedMotion, {
      transitionDuration: interactionTokens.motionNone,
    }),
  ),
  entryTop: Style.make({ transformOrigin: 'top', top: 0 }).pipe(
    Style.when(When.after, { bottom: '100%' }),
  ),
  entryBottom: Style.make({ transformOrigin: 'bottom', bottom: 0 }).pipe(
    Style.when(When.after, { top: '100%' }),
  ),
  limited: Style.make({ pointerEvents: 'none' }),
  swipeEnabled: Style.make({ touchAction: 'pan-y' }),
  swiping: Style.make({
    cursor: interactionTokens.cursorGrabbing,
    transitionDuration: interactionTokens.motionNone,
    userSelect: 'none',
  }),
  front: Style.empty.pipe(Style.when(When.after, { display: 'none' })),
  expanded: Style.make({ overflowY: 'auto' }),
  viewportLeft: Style.make({ left: '1rem' }),
  viewportCenter: Style.make({ transform: 'translateX(-50%)', left: '50%' }),
  viewportRight: Style.make({ right: '1rem' }),
  viewportTop: Style.make({ top: '1rem' }),
  viewportBottomEdge: Style.make({ bottom: '1rem' }),
  visuallyClosed: Style.make({ opacity: 0 }),
}

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

const positionStyle = (position: Position): ReadonlyArray<Style.Style> => {
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
  layoutStyle?: ComponentLayoutStyle | undefined
  entryLayoutStyle?: ComponentLayoutStyle | undefined
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
