import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'
import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'

import { Disclosure as DisclosurePrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as AccordionBehavior from '@/lib/accordion-state'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'

export {
  AccordionType,
  Message,
  Model,
  OutMessage,
  init,
  reflect,
  update,
} from '@/lib/accordion-state'
export type {
  AccordionInitItem,
  AccordionItem,
  InitConfig,
  UpdateReturn,
} from '@/lib/accordion-state'

const styles = stylex.create({
  content: {
    paddingBottom: '0.625rem',
    paddingTop: 0,
  },
  icon: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    transform: 'translateY(0.125rem) rotate(0deg)',
    transitionDuration: interactionTokens.motionModerate,
    transitionProperty: 'transform',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1rem',
    width: '1rem',
  },
  iconOpen: {
    transform: 'translateY(0.125rem) rotate(180deg)',
  },
  item: {
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  borderedRoot: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  itemBordered: {
    paddingInline: '1rem',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  itemBorderedLast: {
    borderBottomWidth: 0,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  panel: {
    overflow: 'hidden',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  trigger: {
    borderColor: {
      default: tokens.transparent,
      ':focus-visible': tokens.ring,
    },
    borderRadius: foundationTokens.radiusMd,
    gap: '1rem',
    paddingBlock: '0.625rem',
    alignItems: 'flex-start',
    backgroundColor: tokens.transparent,
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    color: tokens.foreground,
    cursor: {
      default: interactionTokens.cursorAction,
      ':disabled': interactionTokens.cursorDisabled,
    },
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'space-between',
    lineHeight: '1.25rem',
    opacity: { default: 1, ':disabled': 0.5 },
    outlineStyle: 'none',
    textAlign: 'left',
    textDecorationLine: { default: 'none', ':hover': 'underline' },
    minHeight: '2.5rem',
  },
  triggerRow: {
    display: 'flex',
  },
})

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

export type ViewInputs = Readonly<{
  items: ReadonlyArray<AccordionBehavior.AccordionItem>
  /** Render the shadcn bordered variant: rounded frame with divided items. */
  bordered?: boolean
  layoutStyle?: ComponentLayoutStyle
  itemLayoutStyle?: ComponentLayoutStyle
  triggerLayoutStyle?: ComponentLayoutStyle
  contentLayoutStyle?: ComponentLayoutStyle
}>

const itemDomId = (accordionId: string, value: string): string =>
  `${accordionId}-item-${encodeURIComponent(value)}`

const render = <Msg>(
  model: AccordionBehavior.Model,
  viewInputs: ViewInputs,
  toMessage: (message: AccordionBehavior.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'accordion'),
      ...(viewInputs.layoutStyle === undefined && viewInputs.bordered !== true
        ? []
        : [
            h.Class(
              cn(
                viewInputs.bordered === true && styles.borderedRoot,
                viewInputs.layoutStyle,
              ),
            ),
          ]),
    ],
    viewInputs.items.map((item, index) => {
      const isOpen = model.value.includes(item.value)

      return DisclosurePrimitive.view(
        {
          id: itemDomId(model.id, item.value),
          isOpen,
          onToggle: nextIsOpen =>
            toMessage(
              AccordionBehavior.Message.ToggledItem({
                value: item.value,
                isOpen: nextIsOpen,
              }),
            ),
          ...(item.isDisabled === undefined
            ? {}
            : { isDisabled: item.isDisabled }),
          toView: ({ button, panel, animatePanel }) =>
            h.div(
              [
                h.DataAttribute('slot', 'accordion-item'),
                h.Class(
                  cn(
                    viewInputs.bordered === true
                      ? styles.itemBordered
                      : styles.item,
                    index === viewInputs.items.length - 1 &&
                      (viewInputs.bordered === true
                        ? styles.itemBorderedLast
                        : styles.itemLast),
                    viewInputs.itemLayoutStyle,
                  ),
                ),
              ],
              [
                h.h3(
                  [h.Class(className(reset.text, styles.triggerRow))],
                  [
                    h.button(
                      [
                        ...button,
                        h.DataAttribute('slot', 'accordion-trigger'),
                        h.Class(
                          cn(
                            reset.button,
                            styles.trigger,
                            viewInputs.triggerLayoutStyle,
                          ),
                        ),
                      ],
                      [
                        item.trigger,
                        Icon.chevronDown<Msg>(
                          { class: cn(styles.icon, isOpen && styles.iconOpen) },
                          h,
                        ),
                      ],
                    ),
                  ],
                ),
                animatePanel(
                  h.div(
                    [
                      ...panel,
                      h.DataAttribute('slot', 'accordion-content'),
                      h.Class(className(styles.panel)),
                    ],
                    [
                      h.div(
                        [
                          h.Class(
                            cn(styles.content, viewInputs.contentLayoutStyle),
                          ),
                        ],
                        [item.content],
                      ),
                    ],
                  ),
                ),
              ],
            ),
        },
        h,
      )
    }),
  )

/** Canonical StyleX Submodel view. */
export const view = defineView<
  AccordionBehavior.Model,
  AccordionBehavior.Message,
  ViewInputs
>((model, viewInputs, h) => render(model, viewInputs, message => message, h))

/** @deprecated Embed `view` with `h.submodel`. */
export type AccordionProps<Msg> = ViewInputs &
  Readonly<{
    model: AccordionBehavior.Model
    toParentMessage: (message: AccordionBehavior.Message) => Msg
  }>

/** @deprecated Embed `view` with `h.submodel`. */
export const accordion = <Msg>(
  props: AccordionProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => render(props.model, props, props.toParentMessage, h)
