import { Option } from 'effect'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Listbox as ListboxPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import { themedAnchor, themedListboxPanel } from '@/lib/overlay-boundary'
import { cn } from '@/lib/utils'

/* Ported from shadcn/ui select.tsx on top of foldkit's single-select
   config-driven Listbox submodel.

   Class strings are shadcn's, with these adaptations:
   - Radix highlighted state is driven by foldkit's data-active attribute.
   - Button disabled styles use data-disabled/aria-disabled because foldkit's
     Listbox button is not natively disabled.
   - Radix keyframe animations become finite transitions driven by foldkit's
     data-closed transition phase. Pass isAnimated: true to init.
   - The panel uses foldkit Anchor's --button-width variable and forced inline
     available-height/positioning instead of Radix positioning variables.

   PORT NOTE: foldkit Listbox does not expose per-item attributes. The
   select-item data slot is therefore placed on the item's content span rather
   than the primitive's outer role=option element. Arbitrary consumer items are
   projected through itemToValue, so their values must be unique. */

export const Model = ListboxPrimitive.Model
export type Model = typeof Model.Type
export const Message = ListboxPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = ListboxPrimitive.OutMessage
export type OutMessage<Value extends string = string> =
  ListboxPrimitive.OutMessage<Value>

export const init = ListboxPrimitive.init

const TRIGGER_CLASS =
  "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"

const CONTENT_CLASS =
  'relative z-50 w-(--button-width) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md transition duration-200 ease-out motion-reduce:transition-none data-[closed]:opacity-0 data-[closed]:scale-95'

const VIEWPORT_CLASS = 'w-full scroll-my-1 p-1'

const ITEM_CLASS =
  "group relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[active]:bg-accent data-[active]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2"

const INDICATOR_CLASS =
  'absolute right-2 flex size-3.5 items-center justify-center opacity-0 group-data-[selected]:opacity-100'

const LABEL_CLASS = 'px-2 py-1.5 text-xs text-muted-foreground'

const SEPARATOR_CLASS = 'pointer-events-none -mx-1 my-1 h-px bg-border'

const BACKDROP_CLASS = 'fixed inset-0 z-40'

const ANCHOR: ListboxPrimitive.AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
}

export type SelectSize = 'sm' | 'default'

export type SelectItemConfig = Readonly<{
  content?: Html | string
  searchText?: string
  class?: string
  isDisabled?: boolean
}>

export type SelectProps<Item, Value extends string, Msg> = Readonly<{
  model: Model
  maybeSelectedValue: Option.Option<Value>
  toParentMessage: (message: Message) => Msg
  items: ReadonlyArray<Item>
  itemToValue: (item: Item) => Value
  itemToLabel: (item: Item) => string
  itemToConfig?: (item: Item) => SelectItemConfig
  placeholder?: string
  variant?: 'default' | 'ghost'
  triggerClass?: string
  size?: SelectSize
  ariaLabel?: string
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  name?: string
  form?: string
  direction?: 'ltr' | 'rtl'
  /**
   * 'popper' places the popup below the trigger (default). 'item-aligned'
   * shifts the popup so the selected item overlaps the trigger, matching
   * Radix's position="item-aligned" as a static offset approximation.
   */
  position?: 'popper' | 'item-aligned'
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => string | undefined
}>

const ITEM_ALIGNED_ITEM_HEIGHT = 32
const ITEM_ALIGNED_BASE_OFFSET = 40

const buildAnchor = <Item, Value extends string, Msg>(
  props: SelectProps<Item, Value, Msg>,
  values: ReadonlyArray<Value>,
): Readonly<{ anchor: ListboxPrimitive.AnchorConfig }> => {
  if (props.position !== 'item-aligned') {
    return { anchor: ANCHOR }
  }
  const selectedIndex = Option.match(props.maybeSelectedValue, {
    onNone: () => 0,
    onSome: selected =>
      Math.max(
        0,
        values.findIndex(value => value === selected),
      ),
  })
  return {
    anchor: {
      placement: 'bottom-start',
      gap: -(
        ITEM_ALIGNED_BASE_OFFSET +
        selectedIndex * ITEM_ALIGNED_ITEM_HEIGHT
      ),
    },
  }
}

const renderSelect = <Item, Value extends string, Msg>(
  listbox: ListboxPrimitive.Bundle<Value, Value>,
  props: SelectProps<Item, Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const hs = h
  const values = props.items.map(props.itemToValue)
  const itemForValue = (value: Value): Item | undefined =>
    props.items.find(item => props.itemToValue(item) === value)
  const labelForValue = (value: Value): string => {
    const item = itemForValue(value)
    return item === undefined ? value : props.itemToLabel(item)
  }
  const selectedLabel = Option.match(props.maybeSelectedValue, {
    onNone: () => undefined,
    onSome: labelForValue,
  })

  const { anchor } = buildAnchor(props, values)
  const viewInputs: ListboxPrimitive.ViewInputs<Value, Value> = {
    maybeSelectedValue: props.maybeSelectedValue,
    items: values,
    itemToValue: value => value,
    itemToSearchText: value => {
      const item = itemForValue(value)
      return item === undefined
        ? labelForValue(value)
        : (props.itemToConfig?.(item).searchText ?? labelForValue(value))
    },
    isItemDisabled: value => {
      const item = itemForValue(value)
      return item === undefined
        ? false
        : (props.itemToConfig?.(item).isDisabled ?? false)
    },
    itemToConfig: value => {
      const item = itemForValue(value)
      const config = item === undefined ? undefined : props.itemToConfig?.(item)
      return {
        className: cn(ITEM_CLASS, config?.class),
        content: hs.span(
          [hs.DataAttribute('slot', 'select-item'), hs.Class('contents')],
          [
            hs.span(
              [
                hs.DataAttribute('slot', 'select-item-indicator'),
                hs.Class(INDICATOR_CLASS),
              ],
              [Icon.check({ class: 'size-4' }, h)],
            ),
            hs.span([], [config?.content ?? labelForValue(value)]),
          ],
        ),
      }
    },
    buttonContent: hs.span(
      [hs.Class('contents')],
      [
        hs.span(
          [hs.DataAttribute('slot', 'select-value')],
          [selectedLabel ?? props.placeholder ?? ''],
        ),
        Icon.chevronDown({ class: 'size-4 opacity-50' }, h),
      ],
    ),
    buttonClassName: cn(
      TRIGGER_CLASS,
      props.variant === 'ghost' &&
        'relative min-w-10 justify-center gap-1 rounded-sm border-0 bg-transparent px-1 py-0 font-normal tabular-nums shadow-none hover:bg-muted dark:bg-transparent dark:hover:bg-muted data-[size=default]:h-7 data-[size=sm]:h-7 before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[""]',
      props.triggerClass,
    ),
    isDisabled: props.isDisabled ?? false,
    isReadOnly: props.isReadOnly ?? false,
    isInvalid: props.isInvalid ?? false,
    ...(props.name === undefined ? {} : { name: props.name }),
    ...(props.form === undefined ? {} : { form: props.form }),
    buttonAttributes: childAttributes([
      hs.DataAttribute('slot', 'select-trigger'),
      hs.DataAttribute('size', props.size ?? 'default'),
      ...(selectedLabel === undefined
        ? [hs.DataAttribute('placeholder', '')]
        : []),
    ]),
    anchor: themedAnchor(anchor),
    itemsClassName: cn(
      CONTENT_CLASS,
      props.variant === 'ghost' && 'outline-none',
    ),
    itemsAttributes: childAttributes([
      // Upstream 0.164 stamps tabindex="-1" on the listbox; Base UI parity
      // expects the popup listbox to remain tabbable, so restore tabindex="0".
      hs.Tabindex(0),
      hs.DataAttribute('slot', 'select-content'),
      hs.OnMount(
        themedListboxPanel(
          `${props.model.id}-button`,
          anchor,
          props.toParentMessage,
        ),
      ),
    ]),
    itemsScrollClassName: cn(
      VIEWPORT_CLASS,
      props.variant === 'ghost' && 'max-h-64 overflow-y-auto',
    ),
    backdropClassName: BACKDROP_CLASS,
    backdropAttributes: childAttributes([
      hs.DataAttribute('slot', 'select-backdrop'),
    ]),
    attributes: childAttributes([
      hs.DataAttribute('slot', 'select'),
      ...(props.direction === undefined ? [] : [hs.Dir(props.direction)]),
    ]),
    ...(props.itemGroupKey === undefined
      ? {}
      : {
          itemGroupKey: (value: Value, index: number): string => {
            const item = itemForValue(value)
            return item === undefined
              ? ''
              : (props.itemGroupKey?.(item, index) ?? '')
          },
          groupToHeading: (groupKey: string) => {
            const heading = props.groupToHeading?.(groupKey)
            return heading === undefined
              ? undefined
              : {
                  content: hs.span(
                    [hs.DataAttribute('slot', 'select-label')],
                    [heading],
                  ),
                  className: LABEL_CLASS,
                }
          },
          groupAttributes: childAttributes([
            hs.DataAttribute('slot', 'select-group'),
          ]),
          separatorClassName: SEPARATOR_CLASS,
          separatorAttributes: childAttributes([
            hs.DataAttribute('slot', 'select-separator'),
          ]),
        }),
    ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
  }

  // TypeScript cannot reduce Foldkit's conditional SubmodelConfig while
  // Value is still generic; every field remains independently typed above.
  // eslint-disable-next-line no-restricted-syntax
  return h.submodel<typeof listbox.view>({
    slotId: props.model.id,
    model: props.model,
    view: listbox.view,
    viewInputs,
    toParentMessage: props.toParentMessage,
  } as unknown as Parameters<typeof h.submodel<typeof listbox.view>>[0])
}

export type SelectBundle<Value extends string> = Readonly<{
  update: ReturnType<typeof ListboxPrimitive.create<Value, Value>>['update']
  select: <Item, Msg>(
    props: SelectProps<Item, Value, Msg>,
    h: HtmlBuilder<Msg>,
  ) => Html
}>

export const create = <
  Value extends string = string,
>(): SelectBundle<Value> => {
  const listbox = ListboxPrimitive.create<Value, Value>()
  return {
    update: listbox.update,
    select: (props, h) => renderSelect(listbox, props, h),
  }
}

const StringSelect = create<string>()
export const update = StringSelect.update
export const select = StringSelect.select

/*
   Minimal wiring:

   type Color = Readonly<{ value: 'red' | 'blue'; label: string }>
   const ColorSelect = create<Color['value']>()

   // Model: { colorSelect: Model }
   // Message: GotColorSelectMessage({ message: Message })
   // Init: colorSelect: init({ id: 'color', isAnimated: true })
   //
   // Update:
   // const colorSelectOp__ = //   ColorSelect.update(model.colorSelect, message);
    const colorSelect = colorSelectOp__.model;
    const commands = colorSelectOp__.commands ?? [];
    const maybeOutMessage = Option.fromNullishOr(colorSelectOp__.outMessage);
   //
   // View:
   // ColorSelect.select<Color, AppMessage>({
   //   model: model.colorSelect,
   //   toParentMessage: message => GotColorSelectMessage({ message }),
   //   items: colors,
   //   itemToValue: color => color.value,
   //   itemToLabel: color => color.label,
   //   placeholder: 'Select a color',
   // })
*/
