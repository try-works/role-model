import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import { Disclosure as DisclosurePrimitive } from '@foldkit/ui'

import * as BannerBehavior from '@/lib/banner'
import * as Icon from '@/lib/icon'
import { buttonVisualStyles } from './button'
import type { ComponentLayoutStyle } from './contracts'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'

export { Model, Message, OutMessage, init, update } from '@/lib/banner'
export type {
  BannerContainer,
  BannerElevation,
  BannerStatus,
} from '@/lib/banner'

/* Ported from Meta Astryx Banner.tsx — StyleX renderer. See src/ui/banner.ts
   for geometry notes. */

export type BannerProps<Msg> = Readonly<{
  model: BannerBehavior.Model
  toParentMessage: (message: BannerBehavior.Message) => Msg
  status: BannerBehavior.BannerStatus
  id: string
  title: Html | string
  description?: Html | string
  icon?: Html
  isDismissable?: boolean
  dismissLabel?: string
  endContent?: ReadonlyArray<Html | string>
  container?: BannerBehavior.BannerContainer
  elevation?: BannerBehavior.BannerElevation
  isCollapsible?: boolean
  children?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const styles = {
  root: Style.make({ display: 'flex', flexDirection: 'column' }),
  rootElevatedCard: Style.make({ borderRadius: tokens.cardRadius }),
  header: Style.make({
    paddingBlock: '0.75rem',
    paddingInline: '1rem',
    alignItems: 'flex-start',
    columnGap: '0.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    rowGap: '0.75rem',
  }),
  headerCardStandalone: Style.make({ borderRadius: tokens.cardRadius }),
  headerCardWithContent: Style.make({
    borderEndEndRadius: '0px',
    borderEndStartRadius: '0px',
    borderStartEndRadius: tokens.cardRadius,
    borderStartStartRadius: tokens.cardRadius,
  }),
  headerCentered: Style.make({ alignItems: 'center' }),
  headerContent: Style.make({
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
  }),
  headerContentWithEndContent: Style.make({ flexBasis: '8rem' }),
  title: Style.make({
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
    overflowWrap: 'anywhere',
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    overflowWrap: 'anywhere',
  }),
  iconWrapper: Style.make({
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
  }),
  iconMd: Style.make({ height: '1.25rem', width: '1.25rem' }),
  endArea: Style.make({
    gap: '0.5rem',
    marginBlock: 'calc(-1 * (0.75rem - 0.5rem))',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginInlineStart: 'auto',
    maxWidth: '100%',
  }),
  contentArea: Style.make({
    paddingBlock: '0.75rem',
    paddingInline: '1rem',
    backgroundColor: tokens.card,
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: '1px',
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
    borderInlineStartColor: tokens.border,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: '1px',
  }),
  contentAreaCard: Style.make({
    borderEndEndRadius: tokens.cardRadius,
    borderEndStartRadius: tokens.cardRadius,
  }),
  iconSm: Style.make({ flexShrink: 0, height: '1rem', width: '1rem' }),
  chevron: Style.make({
    flexShrink: 0,
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1rem',
    width: '1rem',
  }),
  chevronExpanded: Style.make({ transform: 'rotate(180deg)' }),
}

const statusIconColor = {
  info: Style.make({ color: tokens.primary }),
  warning: Style.make({ color: tokens.alertWarning }),
  error: Style.make({ color: tokens.destructive }),
  success: Style.make({ color: tokens.alertSuccess }),
}

/* astryx *-muted header fills are 20% hue tints — outside the stylex.create
   prop limits, so they apply as inline color-mix values (the same CSS
   variables the Tailwind bg-STATUS/20 utilities read).
   PORT-NOTE: tokenize status banner fills as 'accentMuted', 'warningMuted',
   'errorMuted', 'successMuted' (20% hue). */
const STATUS_HEADER_TINT: Readonly<
  Record<BannerBehavior.BannerStatus, string>
> = {
  info: 'color-mix(in oklab, var(--primary) 20%, transparent)',
  warning: 'color-mix(in oklab, var(--warning) 20%, transparent)',
  error: 'color-mix(in oklab, var(--destructive) 20%, transparent)',
  success: 'color-mix(in oklab, var(--success) 20%, transparent)',
}

const ELEVATION_SHADOW: Readonly<
  Record<BannerBehavior.BannerElevation, string>
> = {
  none: 'none',
  /* astryx --shadow-low/-med/-high values, carried verbatim */
  low: '0 1px 1px rgb(0 0 0 / 0.1), 0 2px 8px rgb(0 0 0 / 0.2)',
  med: '0 1px 2px rgb(0 0 0 / 0.1), 0 2px 12px rgb(0 0 0 / 0.2)',
  high: '0 2px 2px rgb(0 0 0 / 0.1), 0 8px 24px rgb(0 0 0 / 0.2)',
}

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
        className(
          styles.root,
          isCard && elevation !== 'none' && styles.rootElevatedCard,
          props.layoutStyle,
        ),
      ),
      ...(elevation === 'none'
        ? []
        : [h.Style({ boxShadow: ELEVATION_SHADOW[elevation] })]),
      BannerBehavior.focusOriginMount(h),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'banner-header'),
          h.Class(
            className(
              styles.header,
              isSingleLine && styles.headerCentered,
              isCard &&
                (showContent
                  ? styles.headerCardWithContent
                  : styles.headerCardStandalone),
            ),
          ),
          h.Style({ backgroundColor: STATUS_HEADER_TINT[status] }),
        ],
        [
          h.div(
            [
              h.DataAttribute('slot', 'banner-icon'),
              h.AriaHidden(true),
              h.Class(className(styles.iconWrapper)),
            ],
            [
              icon ??
                Icon.icon(
                  BannerBehavior.STATUS_ICON[status],
                  {
                    class: className(styles.iconMd, statusIconColor[status]),
                  },
                  h,
                ),
            ],
          ),
          h.div(
            [
              h.Class(
                className(
                  styles.headerContent,
                  endContent !== undefined &&
                    endContent.length > 0 &&
                    styles.headerContentWithEndContent,
                ),
              ),
            ],
            [
              h.div(
                [
                  h.DataAttribute('slot', 'banner-title'),
                  h.Class(className(styles.title)),
                ],
                [title],
              ),
              ...(description === undefined
                ? []
                : [
                    h.div(
                      [
                        h.DataAttribute('slot', 'banner-description'),
                        h.Class(className(styles.description)),
                      ],
                      [description],
                    ),
                  ]),
            ],
          ),
          ...(showEndArea
            ? [
                h.div(
                  [h.Class(className(styles.endArea))],
                  [
                    ...(endContent ?? []),
                    ...(hasToggle && disclosure !== undefined
                      ? [
                          h.button(
                            [
                              ...disclosure.button,
                              h.DataAttribute('slot', 'banner-toggle'),
                              h.Class(
                                className(
                                  reset.button,
                                  ...buttonVisualStyles({
                                    variant: 'ghost',
                                    size: 'icon-sm',
                                  }),
                                ),
                              ),
                            ],
                            [
                              Icon.icon(
                                'chevron-down',
                                {
                                  class: className(
                                    styles.chevron,
                                    model.isOpen && styles.chevronExpanded,
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
                              h.Class(
                                className(
                                  reset.button,
                                  ...buttonVisualStyles({
                                    variant: 'ghost',
                                    size: 'icon-sm',
                                  }),
                                ),
                              ),
                              h.OnClick(
                                toParentMessage(
                                  BannerBehavior.Message.Dismissed(),
                                ),
                              ),
                            ],
                            [
                              Icon.icon(
                                'x',
                                {
                                  class: className(styles.iconSm),
                                },
                                h,
                              ),
                            ],
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
                  className(
                    styles.contentArea,
                    isCard && styles.contentAreaCard,
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
