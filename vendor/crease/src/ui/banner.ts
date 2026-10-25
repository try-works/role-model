import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { Disclosure as DisclosurePrimitive } from '@foldkit/ui'

import * as BannerBehavior from '@/lib/banner'
import * as Icon from '@/lib/icon'
import { buttonVariants } from '@/ui/button'
import { cn } from '@/lib/utils'

export { Model, Message, OutMessage, init, update } from '@/lib/banner'
export type {
  BannerContainer,
  BannerElevation,
  BannerStatus,
} from '@/lib/banner'

/* Ported from Meta Astryx Banner.tsx — page-level status notice: tinted
   status header (icon + title + description + actions), optional bordered
   content area behind a disclosure toggle, and self-managed dismissal with
   a focus handoff back to the element focused before the banner. */

export type BannerProps<Msg> = Readonly<{
  model: BannerBehavior.Model
  toParentMessage: (message: BannerBehavior.Message) => Msg
  /** Status type controlling the icon, tint, and ARIA role. */
  status: BannerBehavior.BannerStatus
  /** Stable id — anchors the disclosure's aria-controls link. */
  id: string
  title: Html | string
  description?: Html | string
  /** Overrides the default status icon. */
  icon?: Html
  /** Shows the dismiss button; the banner always hides itself. */
  isDismissable?: boolean
  /** Accessible name for the dismiss button (default "Dismiss {title}"). */
  dismissLabel?: string
  /** Action content rendered in the header end area. */
  endContent?: ReadonlyArray<Html | string>
  /** @default 'card' */
  container?: BannerBehavior.BannerContainer
  /** Resting shadow depth. @default 'none' */
  elevation?: BannerBehavior.BannerElevation
  /** Content area behind an expand/collapse toggle (starts closed).
      Pass false to pin children open with no toggle. @default true */
  isCollapsible?: boolean
  children?: ReadonlyArray<Html | string>
  class?: string
}>

const STATUS_HEADER_TINT: Readonly<
  Record<BannerBehavior.BannerStatus, string>
> = {
  /* astryx *-muted fills are 20% hue tints over the surface.
     PORT-NOTE: tokenize status banner fills as 'accentMuted',
     'warningMuted', 'errorMuted', 'successMuted' (20% hue). */
  info: 'bg-primary/20',
  warning: 'bg-warning/20',
  error: 'bg-destructive/20',
  success: 'bg-success/20',
}

const ELEVATION: Readonly<Record<BannerBehavior.BannerElevation, string>> = {
  none: 'shadow-none',
  /* astryx --shadow-low/-med/-high values, carried verbatim */
  low: '[--_banner-elevation:0_1px_1px_rgb(0_0_0/0.1),0_2px_8px_rgb(0_0_0/0.2)] shadow-[var(--_banner-elevation)]',
  med: '[--_banner-elevation:0_1px_2px_rgb(0_0_0/0.1),0_2px_12px_rgb(0_0_0/0.2)] shadow-[var(--_banner-elevation)]',
  high: '[--_banner-elevation:0_2px_2px_rgb(0_0_0/0.1),0_8px_24px_rgb(0_0_0/0.2)] shadow-[var(--_banner-elevation)]',
}

const GHOST_ICON_CLASS = buttonVariants({ variant: 'ghost', size: 'icon-sm' })

type DisclosureAttrs<Msg> = Readonly<{
  button: ReadonlyArray<Attribute<Msg>>
  panel: ReadonlyArray<Attribute<Msg>>
}>

const render = <Msg>(
  props: BannerProps<Msg>,
  showContent: boolean,
  hasToggle: boolean,
  disclosure: DisclosureAttrs<Msg> | undefined,
  h: HtmlBuilder<Msg>,
): Html => {
  const {
    model,
    toParentMessage,
    status,
    title,
    description,
    icon,
    isDismissable = false,
    dismissLabel,
    endContent,
    container = 'card',
    elevation = 'none',
    children,
  } = props
  const showEndArea =
    (endContent !== undefined && endContent.length > 0) ||
    isDismissable ||
    hasToggle
  const isSingleLine =
    description === undefined &&
    ((endContent !== undefined && endContent.length > 0) || isDismissable)
  const isCard = container === 'card'
  const dismissName =
    dismissLabel ?? (typeof title === 'string' ? `Dismiss ${title}` : 'Dismiss')

  return h.div(
    [
      h.DataAttribute('slot', 'banner'),
      h.DataAttribute('container', container),
      h.DataAttribute('status', status),
      h.DataAttribute('elevation', elevation),
      h.Role(BannerBehavior.STATUS_ROLE[status]),
      h.Class(
        cn(
          'flex flex-col',
          ELEVATION[elevation],
          isCard && elevation !== 'none' && 'rounded-xl',
          props.class,
        ),
      ),
      BannerBehavior.focusOriginMount(h),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'banner-header'),
          h.Class(
            cn(
              'flex flex-wrap items-start gap-x-2 gap-y-3 px-4 py-3',
              STATUS_HEADER_TINT[status],
              isSingleLine && 'items-center',
              isCard &&
                (showContent ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'),
            ),
          ),
        ],
        [
          h.div(
            [
              h.DataAttribute('slot', 'banner-icon'),
              h.AriaHidden(true),
              h.Class('flex shrink-0 items-center'),
            ],
            [
              icon ??
                Icon.icon(
                  BannerBehavior.STATUS_ICON[status],
                  {
                    class: cn(
                      'size-5',
                      BannerBehavior.STATUS_TEXT_CLASS[status],
                    ),
                  },
                  h,
                ),
            ],
          ),
          h.div(
            [
              h.Class(
                cn(
                  'flex min-w-0 flex-1 flex-col',
                  endContent !== undefined &&
                    endContent.length > 0 &&
                    'basis-32',
                ),
              ),
            ],
            [
              h.div(
                [
                  h.DataAttribute('slot', 'banner-title'),
                  h.Class('text-sm font-semibold wrap-anywhere'),
                ],
                [title],
              ),
              ...(description === undefined
                ? []
                : [
                    h.div(
                      [
                        h.DataAttribute('slot', 'banner-description'),
                        h.Class('text-xs text-muted-foreground wrap-anywhere'),
                      ],
                      [description],
                    ),
                  ]),
            ],
          ),
          ...(showEndArea
            ? [
                h.div(
                  [
                    h.Class(
                      '-my-1 ms-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2',
                    ),
                  ],
                  [
                    ...(endContent ?? []),
                    ...(hasToggle && disclosure !== undefined
                      ? [
                          h.button(
                            [
                              ...disclosure.button,
                              h.DataAttribute('slot', 'banner-toggle'),
                              h.Class(cn(GHOST_ICON_CLASS)),
                            ],
                            [
                              Icon.icon(
                                'chevron-down',
                                {
                                  class: cn(
                                    'size-4 transition-transform duration-150',
                                    model.isOpen && 'rotate-180',
                                  ),
                                },
                                h,
                              ),
                            ],
                          ),
                        ]
                      : []),
                    ...(isDismissable
                      ? [
                          h.button(
                            [
                              h.Type('button'),
                              h.DataAttribute('slot', 'banner-dismiss'),
                              h.AriaLabel(dismissName),
                              h.Class(cn(GHOST_ICON_CLASS)),
                              h.OnClick(
                                toParentMessage(
                                  BannerBehavior.Message.Dismissed(),
                                ),
                              ),
                            ],
                            [Icon.icon('x', { class: 'size-4' }, h)],
                          ),
                        ]
                      : []),
                  ],
                ),
              ]
            : []),
        ],
      ),
      ...(showContent
        ? [
            h.div(
              [
                ...(disclosure === undefined ? [] : disclosure.panel),
                h.DataAttribute('slot', 'banner-content'),
                h.Class(
                  cn(
                    'border-x border-b border-border bg-card px-4 py-3',
                    isCard && 'rounded-b-xl',
                  ),
                ),
              ],
              [...(children ?? [])],
            ),
          ]
        : []),
    ],
  )
}

export const banner = <Msg>(
  props: BannerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { model, toParentMessage } = props
  if (model.isDismissed) {
    return h.empty
  }
  const isCollapsible = props.isCollapsible !== false
  const hasChildren = props.children !== undefined && props.children.length > 0
  const hasToggle = isCollapsible && hasChildren
  const showContent = hasChildren && (!isCollapsible || model.isOpen)

  if (!hasToggle) {
    return render(props, showContent, false, undefined, h)
  }
  return DisclosurePrimitive.view(
    {
      id: props.id,
      isOpen: model.isOpen,
      ariaLabel: model.isOpen ? 'Collapse' : 'Expand',
      onToggle: () => toParentMessage(BannerBehavior.Message.ToggledContent()),
      toView: ({ button, panel }) =>
        render(props, showContent, true, { button, panel }, h),
    },
    h,
  )
}
