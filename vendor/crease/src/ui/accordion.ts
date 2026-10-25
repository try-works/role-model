import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

import { Disclosure as DisclosurePrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import * as AccordionBehavior from '@/lib/accordion-state'
import { cn } from '@/lib/utils'

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

const ITEM_CLASS = 'border-b last:border-b-0'
const TRIGGER_CLASS =
  'group flex min-h-10 flex-1 items-start justify-between gap-4 rounded-md py-2.5 text-left text-sm font-medium outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'
const ICON_CLASS =
  'pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200 ease-in-out group-data-[open]:rotate-180'
const PANEL_CLASS = 'overflow-hidden text-sm'
const CONTENT_CLASS = 'pt-0 pb-2.5'

export type ViewInputs = Readonly<{
  items: ReadonlyArray<AccordionBehavior.AccordionItem>
  class?: string
  itemClass?: string
  triggerClass?: string
  contentClass?: string
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
      ...(viewInputs.class === undefined
        ? []
        : [h.Class(cn(viewInputs.class))]),
    ],
    viewInputs.items.map(item => {
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
                h.Class(cn(ITEM_CLASS, viewInputs.itemClass)),
              ],
              [
                h.h3(
                  [h.Class('flex')],
                  [
                    h.button(
                      [
                        ...button,
                        h.DataAttribute('slot', 'accordion-trigger'),
                        h.Class(cn(TRIGGER_CLASS, viewInputs.triggerClass)),
                      ],
                      [
                        item.trigger,
                        Icon.chevronDown<Msg>({ class: ICON_CLASS }, h),
                      ],
                    ),
                  ],
                ),
                animatePanel(
                  h.div(
                    [
                      ...panel,
                      h.DataAttribute('slot', 'accordion-content'),
                      h.Class(PANEL_CLASS),
                    ],
                    [
                      h.div(
                        [h.Class(cn(CONTENT_CLASS, viewInputs.contentClass))],
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

/** Canonical stateful view. Embed with `h.submodel`. */
export const view = defineView<
  AccordionBehavior.Model,
  AccordionBehavior.Message,
  ViewInputs
>((model, viewInputs, h) => render(model, viewInputs, message => message, h))

/**
 * Compatibility helper for existing consumers. New code should use
 * `h.submodel({ model, view, viewInputs, toParentMessage, slotId })`.
 */
export type AccordionProps<Msg> = ViewInputs &
  Readonly<{
    model: AccordionBehavior.Model
    toParentMessage: (message: AccordionBehavior.Message) => Msg
  }>

export const accordion = <Msg>(
  props: AccordionProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => render(props.model, props, props.toParentMessage, h)
