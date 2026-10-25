import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  type Bundle as BehaviorBundle,
  Message,
  Model,
  type OutMessage,
  create as createBehavior,
  init,
} from '@/lib/toggle-group'
import { cn } from '@/lib/utils'
import { type ToggleVariants, toggleVariants } from '@/ui/toggle'

export { Message, Model, init }
export type { OutMessage }

export type ToggleGroupItem<Value extends string = string> = Readonly<{
  value: Value
  children: ReadonlyArray<Html | string>
  ariaLabel?: string
  isDisabled?: boolean
  class?: string
}>

type SingleSelection<Value extends string> = Readonly<{
  value: Value
  values?: never
}>
type MultipleSelection<Value extends string> = Readonly<{
  value?: never
  values: ReadonlyArray<Value>
}>

export type ToggleGroupProps<Value extends string, Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  ariaLabel: string
  items: ReadonlyArray<ToggleGroupItem<Value>>
  direction?: 'ltr' | 'rtl'
  arrangement?: 'joined' | 'wrapped'
  orientation?: 'vertical'
  variant?: ToggleVariants['variant']
  size?: ToggleVariants['size']
  class?: string
}> &
  (SingleSelection<Value> | MultipleSelection<Value>)

type LegacyToggleGroupProps<Value extends string, Msg> = Readonly<{
  items: ReadonlyArray<ToggleGroupItem<Value>>
  onToggle: (value: Value) => Msg
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
  arrangement?: 'joined' | 'wrapped'
  orientation?: 'vertical'
  variant?: ToggleVariants['variant']
  size?: ToggleVariants['size']
  class?: string
}> &
  (SingleSelection<Value> | MultipleSelection<Value>)

const GROUP_CLASS =
  'group/toggle-group flex w-fit items-center gap-0 rounded-md data-[variant=outline]:shadow-xs data-[arrangement=wrapped]:flex-wrap data-[arrangement=wrapped]:gap-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch'
const ITEM_CLASS =
  'w-auto min-w-0 shrink-0 rounded-none px-3 shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 first:data-[variant=outline]:border-l group-data-[arrangement=wrapped]/toggle-group:rounded-md group-data-[arrangement=wrapped]/toggle-group:data-[variant=outline]:border-l'
const ITEM_CLASS_VERTICAL =
  'w-auto min-w-0 shrink-0 rounded-none px-3 shadow-none first:rounded-t-md last:rounded-b-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-t-0 first:data-[variant=outline]:border-t group-data-[arrangement=wrapped]/toggle-group:rounded-md group-data-[arrangement=wrapped]/toggle-group:data-[variant=outline]:border-t'

const renderToggleGroup = <Value extends string, Msg>(
  behavior: BehaviorBundle<Value>,
  props: ToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'
  const size = props.size ?? 'default'
  const arrangement = props.arrangement ?? 'joined'
  const vertical = props.orientation === 'vertical'
  const selectedValues: ReadonlyArray<Value> =
    props.values === undefined ? [props.value] : props.values

  return behavior.render(
    {
      model: props.model,
      toParentMessage: props.toParentMessage,
      selectedValues,
      items: props.items,
      ariaLabel: props.ariaLabel,
      ...(props.direction === undefined ? {} : { direction: props.direction }),
      ...(vertical ? { orientation: 'vertical' as const } : {}),
    },
    {
      group: [
        h.DataAttribute('slot', 'toggle-group'),
        h.DataAttribute('variant', variant),
        h.DataAttribute('size', size),
        h.DataAttribute('arrangement', arrangement),
        h.DataAttribute('orientation', vertical ? 'vertical' : 'horizontal'),
        h.Class(cn(GROUP_CLASS, props.class)),
      ],
      item: () => [],
    },
    (item, ht) => {
      const content = props.items.find(
        candidate => candidate.value === item.value,
      )
      return content === undefined
        ? ht.empty
        : ht.button(
            [
              ...item.attributes,
              ht.DataAttribute('slot', 'toggle-group-item'),
              ht.DataAttribute('variant', variant),
              ht.DataAttribute('size', size),
              ht.AriaPressed(item.isPressed ? 'true' : 'false'),
              ...(props.direction === undefined
                ? []
                : [ht.Dir(props.direction)]),
              ...(content.ariaLabel === undefined
                ? []
                : [ht.AriaLabel(content.ariaLabel)]),
              ht.Class(
                cn(
                  toggleVariants({ variant, size }),
                  vertical ? ITEM_CLASS_VERTICAL : ITEM_CLASS,
                  content.class,
                ),
              ),
            ],
            [...content.children],
          )
    },
    h,
  )
}

const renderLegacyToggleGroup = <Value extends string, Msg>(
  props: LegacyToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'
  const size = props.size ?? 'default'
  const arrangement = props.arrangement ?? 'joined'
  const vertical = props.orientation === 'vertical'
  const selectedValues: ReadonlyArray<Value> =
    props.values === undefined ? [props.value] : props.values
  return h.div(
    [
      h.Role('group'),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      h.DataAttribute('slot', 'toggle-group'),
      h.DataAttribute('variant', variant),
      h.DataAttribute('size', size),
      h.DataAttribute('arrangement', arrangement),
      h.DataAttribute('orientation', vertical ? 'vertical' : 'horizontal'),
      h.Class(cn(GROUP_CLASS, props.class)),
    ],
    props.items.map(item =>
      h.button(
        [
          h.Type('button'),
          h.OnClick(props.onToggle(item.value)),
          h.Disabled(item.isDisabled ?? false),
          h.AriaPressed(selectedValues.includes(item.value) ? 'true' : 'false'),
          ...(item.ariaLabel === undefined
            ? []
            : [h.AriaLabel(item.ariaLabel)]),
          h.DataAttribute('slot', 'toggle-group-item'),
          h.DataAttribute('variant', variant),
          h.DataAttribute('size', size),
          h.Class(
            cn(
              toggleVariants({ variant, size }),
              vertical ? ITEM_CLASS_VERTICAL : ITEM_CLASS,
              item.class,
            ),
          ),
        ],
        [...item.children],
      ),
    ),
  )
}

export type ToggleGroupBundle<Value extends string> = Readonly<{
  update: BehaviorBundle<Value>['update']
  toggleGroup: <Msg>(
    props: ToggleGroupProps<Value, Msg>,
    h: HtmlBuilder<Msg>,
  ) => Html
}>

export const create = <
  Value extends string = string,
>(): ToggleGroupBundle<Value> => {
  const behavior = createBehavior<Value>()
  return {
    update: behavior.update,
    toggleGroup: (props, h) => renderToggleGroup(behavior, props, h),
  }
}

const StringToggleGroup = create<string>()
export const update = StringToggleGroup.update
export function toggleGroup<Msg, Value extends string = string>(
  props: LegacyToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html
export function toggleGroup<Value extends string, Msg>(
  props: ToggleGroupProps<Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html
export function toggleGroup<Msg>(
  props: ToggleGroupProps<string, Msg> | LegacyToggleGroupProps<string, Msg>,
  h: HtmlBuilder<Msg>,
): Html {
  return 'model' in props
    ? StringToggleGroup.toggleGroup(props, h)
    : renderLegacyToggleGroup(props, h)
}
