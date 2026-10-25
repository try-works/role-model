import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { Option } from 'effect'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'
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
import { buttonVariants } from '@/ui/button'

export * from '@/lib/toast'

const variantIcon = <Msg>(
  variant: Variant,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const config = { class: 'mt-0.5 size-4 shrink-0' }
  switch (variant) {
    case 'Default':
      return undefined
    case 'Success':
      return Icon.circleCheck<Msg>(config, h)
    case 'Error':
      return Icon.octagonX<Msg>(config, h)
    case 'Warning':
      return Icon.triangleAlert<Msg>(config, h)
    case 'Info':
      return Icon.info<Msg>(config, h)
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

const positionClass = (position: Position): string => {
  const base =
    'pointer-events-none fixed z-[100] w-[calc(100%-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] outline-none sm:w-full'
  switch (position) {
    case 'top-left':
      return cn(base, 'left-4 top-4')
    case 'top-center':
      return cn(base, 'left-1/2 top-4 -translate-x-1/2')
    case 'top-right':
      return cn(base, 'right-4 top-4')
    case 'bottom-left':
      return cn(base, 'bottom-4 left-4')
    case 'bottom-center':
      return cn(base, 'bottom-4 left-1/2 -translate-x-1/2')
    case 'bottom-right':
      return cn(base, 'bottom-4 right-4')
  }
}

export type ToastProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  ariaLabel?: string
  pausePolicy?: 'none' | 'pointer'
  class?: string
  entryClass?: string
  position?: Position
  /** Set false to keep the visible cards expanded instead of stacked. */
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
        cn(
          "group absolute left-0 w-full rounded-2xl border bg-popover text-popover-foreground shadow-lg [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms] motion-reduce:transition-none! motion-reduce:duration-0! data-swiping:duration-0! data-swiping:select-none data-swiping:cursor-grabbing after:absolute after:left-0 after:h-[13px] after:w-full after:content-['']",
          Option.isSome(props.model.maybeSwipeConfig) && 'touch-pan-y',
          position.startsWith('top')
            ? 'top-0 origin-top after:bottom-full'
            : 'bottom-0 origin-bottom after:top-full',
          limited ? 'pointer-events-none' : 'pointer-events-auto',
          item.index === 0 && 'after:hidden',
          props.entryClass,
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
            cn(
              'relative flex items-start gap-3 overflow-hidden p-4 pr-8 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              behind && 'opacity-0',
            ),
          ),
        ],
        [
          ...(variantIcon(entry.payload.variant, h) === undefined
            ? []
            : [variantIcon(entry.payload.variant, h)!]),
          h.div(
            [h.Class('grid min-w-0 flex-1 gap-1 wrap-anywhere')],
            [
              h.div([h.Class('text-sm font-semibold')], [entry.payload.title]),
              ...(entry.payload.description === undefined
                ? []
                : [
                    h.div(
                      [h.Class('text-sm text-muted-foreground')],
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
                      cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'shrink-0 bg-transparent hover:bg-secondary',
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
                cn(
                  buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
                  'absolute top-2 right-2 p-1 text-foreground/50 transition-opacity motion-reduce:transition-none hover:text-foreground focus:opacity-100',
                ),
              ),
            ],
            [Icon.x<Msg>({ class: 'size-4' }, h)],
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
            cn(
              positionClass(position),
              expanded &&
                layout.height > props.model.viewportHeight - 32 &&
                'overflow-y-auto',
              props.class,
            ),
          ),
        ],
        [
          h.div(
            [
              h.Class('relative w-full'),
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
