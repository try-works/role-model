import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Tabs as TabsPrimitive } from '@foldkit/ui'

import { cn } from '@/lib/utils'

/* Ported from shadcn/ui tabs.tsx on top of the foldkit Tabs submodel.
   Radix's data-[state=active] selectors are driven by foldkit's
   data-selected attribute. */

export const Model = TabsPrimitive.Model
export type Model = typeof Model.Type
export const Message = TabsPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = TabsPrimitive.OutMessage
export type OutMessage<Value extends string = string> =
  TabsPrimitive.OutMessage<Value>

export const init = TabsPrimitive.init

const TABS_CLASS =
  'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col'

export const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>

const TRIGGER_CLASS =
  "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[selected]:shadow-sm group-data-[variant=line]/tabs-list:data-[selected]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[selected]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[selected]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[selected]:bg-transparent data-[selected]:bg-background data-[selected]:text-foreground dark:data-[selected]:border-input dark:data-[selected]:bg-input/30 dark:data-[selected]:text-foreground after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[selected]:after:opacity-100"

const CONTENT_CLASS = 'flex-1 outline-none'

export type TabsOrientation = 'horizontal' | 'vertical'

export type TabConfig<Value extends string = string> = Readonly<{
  value: Value
  label: Html | string
  /** Icon element displayed before the label. */
  icon?: Html
  /** Visually hides the label while keeping it as the trigger's accessible name. */
  isLabelHidden?: boolean
  content: Html | string
  isDisabled?: boolean
}>

export type TabsProps<Value extends string, Msg> = Readonly<{
  model: Model
  selectedValue: Value
  toParentMessage: (message: Message) => Msg
  tabs: ReadonlyArray<TabConfig<Value>>
  ariaLabel?: string
  orientation?: TabsOrientation
  direction?: 'ltr' | 'rtl'
  variant?: TabsListVariants['variant']
  class?: string
  listClass?: string
  triggerClass?: string
  contentClass?: string
}>

const renderTabs = <Value extends string, Msg>(
  bundle: TabsPrimitive.Bundle<Value>,
  props: TabsProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'horizontal'
  const variant = props.variant ?? 'default'
  const orderedTabs =
    props.direction === 'rtl' && orientation === 'horizontal'
      ? [...props.tabs].reverse()
      : props.tabs

  return h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: bundle.view,
    viewInputs: {
      tabs: orderedTabs.map(tab => tab.value),
      selectedValue: props.selectedValue,
      ariaLabel: props.ariaLabel ?? 'Tabs',
      orientation: orientation === 'horizontal' ? 'Horizontal' : 'Vertical',
      isTabDisabled: value =>
        props.tabs.find(tab => tab.value === value)?.isDisabled ?? false,
      toView: ({ tablist, tabs: renderedTabs, activeIndex }) => {
        const ht = h

        return ht.div(
          [
            ht.DataAttribute('slot', 'tabs'),
            ht.DataAttribute('orientation', orientation),
            ...(props.direction === undefined ? [] : [ht.Dir(props.direction)]),
            ht.Class(cn(TABS_CLASS, props.class)),
          ],
          [
            ht.div(
              [
                ...tablist,
                ht.DataAttribute('slot', 'tabs-list'),
                ht.DataAttribute('variant', variant),
                ...(props.direction === 'rtl' && orientation === 'horizontal'
                  ? [ht.Dir('ltr')]
                  : []),
                ht.Class(cn(tabsListVariants({ variant }), props.listClass)),
              ],
              renderedTabs.flatMap(tab => {
                const config = props.tabs.find(
                  candidate => candidate.value === tab.value,
                )

                return config === undefined
                  ? []
                  : [
                      ht.button(
                        [
                          ...tab.tab,
                          ht.DataAttribute('slot', 'tabs-trigger'),
                          ...(props.direction === undefined
                            ? []
                            : [ht.Dir(props.direction)]),
                          ht.Class(cn(TRIGGER_CLASS, props.triggerClass)),
                        ],
                        [
                          ...(config.icon === undefined
                            ? []
                            : [
                                ht.span(
                                  [
                                    ht.Class(
                                      'inline-flex shrink-0 items-center justify-center [&_svg]:size-4',
                                    ),
                                  ],
                                  [config.icon],
                                ),
                              ]),
                          config.isLabelHidden === true
                            ? ht.span([ht.Class('sr-only')], [config.label])
                            : config.label,
                        ],
                      ),
                    ]
              }),
            ),
            ...renderedTabs.flatMap(tab => {
              const config = props.tabs.find(
                candidate => candidate.value === tab.value,
              )

              return config === undefined || tab.index !== activeIndex
                ? []
                : [
                    ht.div(
                      [
                        ...tab.panel,
                        ht.DataAttribute('slot', 'tabs-content'),
                        ht.Class(cn(CONTENT_CLASS, props.contentClass)),
                      ],
                      [config.content],
                    ),
                  ]
            }),
          ],
        )
      },
    },
    toParentMessage: props.toParentMessage,
  })
}

export type TabsBundle<Value extends string> = Readonly<{
  update: ReturnType<typeof TabsPrimitive.create<Value>>['update']
  tabs: <Msg>(props: TabsProps<Value, Msg>, h: HtmlBuilder<Msg>) => Html
}>

export const create = <Value extends string = string>(): TabsBundle<Value> => {
  const bundle = TabsPrimitive.create<Value>()
  return {
    update: bundle.update,
    tabs: (props, h) => renderTabs(bundle, props, h),
  }
}

const StringTabs = create<string>()
export const update = StringTabs.update
export const tabs = StringTabs.tabs

/*
Minimal wiring:
const model = init({ id: 'account-tabs' })
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
    const maybeSelection = Option.fromNullishOr(nextModelOp__.outMessage);
tabs({
  model,
  toParentMessage: message => GotTabsMessage({ message }),
  tabs: [
    { value: 'account', label: 'Account', content: accountView },
    { value: 'password', label: 'Password', content: passwordView },
  ],
})
*/
