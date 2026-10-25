import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Listbox as ListboxPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import { joinStyles } from './button-group-join'
import { overlayStyles } from './overlay-tokens'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { themedAnchor } from './overlay-boundary'
import { className } from './style'
import { tokens } from './tokens'

const styles = {
  ghostTrigger: Style.make({
    borderRadius: foundationTokens.radiusSm,
    borderWidth: 0,
    gap: '0.25rem',
    paddingBlock: 0,
    paddingInline: '0.25rem',
    backgroundColor: 'transparent',
    boxShadow: tokens.shadowNone,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 400,
    justifyContent: 'center',
    position: 'relative',
    height: '1.75rem',
    minWidth: '2.5rem',
  }).pipe(
    Style.when(When.before, {
      insetBlock: '-0.375rem',
      insetInline: 0,
      content: '""',
      position: 'absolute',
    }),
    Style.when(When.hover, { backgroundColor: tokens.muted }),
    Style.when(When.focusVisible, { boxShadow: tokens.focusRingShadow }),
  ),
  contents: Style.make({ display: 'contents' }),
  ghostContent: Style.make({ outlineStyle: 'none' }),
  ghostViewport: Style.make({ maxHeight: '16rem', overflowY: 'auto' }),
  content: Style.make({ minWidth: '8rem', width: 'var(--button-width)' }),
  trigger: Style.make({
    boxShadow: foundationTokens.shadowXs,
    color: tokens.foreground,
    display: 'flex',
    whiteSpace: 'nowrap',
    height: '2rem',
    minHeight: 0,
  }).pipe(
    Style.when(When.focusVisible, { boxShadow: tokens.focusRingShadow }),
    Style.when(When.data('placeholder'), { color: tokens.mutedForeground }),
  ),
  item: Style.make({ textAlign: 'start', paddingRight: '2rem' }),
  indicator: Style.make({
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    height: '0.875rem',
    marginLeft: 0,
    right: '0.5rem',
    width: '0.875rem',
  }),
  indicatorSelected: Style.make({ opacity: 1 }),
  iconDim: Style.make({ opacity: 0.5 }),
}

const isStaticStyle = (value: unknown): value is Style.Style =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

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

const TRIGGER_CLASS = overlayStyles.trigger

const CONTENT_CLASS = overlayStyles.panel

const VIEWPORT_CLASS = overlayStyles.viewport

const ITEM_CLASS = overlayStyles.item

const INDICATOR_CLASS = overlayStyles.indicator

const LABEL_CLASS = overlayStyles.label

const SEPARATOR_CLASS = overlayStyles.separator

const BACKDROP_CLASS = overlayStyles.backdrop

const ANCHOR: ListboxPrimitive.AnchorConfig = themedAnchor({
  placement: 'bottom-start',
  gap: 4,
})

export type SelectSize = 'sm' | 'default'

export type SelectItemConfig = Readonly<{
  content?: Html | string
  searchText?: string
  layoutStyle?: ComponentLayoutStyle | undefined
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
  triggerLayoutStyle?: ComponentLayoutStyle | undefined
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
    anchor: themedAnchor({
      placement: 'bottom-start',
      gap: -(
        ITEM_ALIGNED_BASE_OFFSET +
        selectedIndex * ITEM_ALIGNED_ITEM_HEIGHT
      ),
    }),
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
        className: cn(ITEM_CLASS, styles.item, config?.layoutStyle),
        content: hs.span(
          [
            hs.DataAttribute('slot', 'select-item'),
            hs.Class(className(styles.contents)),
          ],
          [
            hs.span(
              [
                hs.DataAttribute('slot', 'select-item-indicator'),
                hs.Class(
                  cn(
                    INDICATOR_CLASS,
                    styles.indicator,
                    Option.contains(props.maybeSelectedValue, value) &&
                      styles.indicatorSelected,
                  ),
                ),
              ],
              [Icon.check({ class: className(overlayStyles.icon) }, h)],
            ),
            hs.span([], [config?.content ?? labelForValue(value)]),
          ],
        ),
      }
    },
    buttonContent: hs.span(
      [hs.Class(className(styles.contents))],
      [
        hs.span(
          [hs.DataAttribute('slot', 'select-value')],
          [selectedLabel ?? props.placeholder ?? ''],
        ),
        Icon.chevronDown(
          { class: className(overlayStyles.icon, styles.iconDim) },
          h,
        ),
      ],
    ),
    buttonClassName: cn(
      reset.button,
      TRIGGER_CLASS,
      styles.trigger,
      joinStyles.join,
      joinStyles.triggerFit,
      joinStyles.triggerRadiusBack,
      props.variant === 'ghost' && styles.ghostTrigger,
      props.triggerLayoutStyle,
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
    ...buildAnchor(props, values),
    itemsClassName: className(
      CONTENT_CLASS,
      overlayStyles.floating,
      styles.content,
      props.variant === 'ghost' && styles.ghostContent,
    ),
    itemsAttributes: childAttributes([
      // Upstream 0.164 stamps tabindex="-1" on the listbox; Base UI parity
      // expects the popup listbox to remain tabbable, so restore tabindex="0".
      hs.Tabindex(0),
      hs.DataAttribute('slot', 'select-content'),
    ]),
    itemsScrollClassName: className(
      reset.list,
      VIEWPORT_CLASS,
      props.variant === 'ghost' && styles.ghostViewport,
    ),
    backdropClassName: className(BACKDROP_CLASS),
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
                  className: className(LABEL_CLASS),
                }
          },
          groupAttributes: childAttributes([
            hs.DataAttribute('slot', 'select-group'),
          ]),
          separatorClassName: className(SEPARATOR_CLASS),
          separatorAttributes: childAttributes([
            hs.DataAttribute('slot', 'select-separator'),
          ]),
        }),
    ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
  }

  // TypeScript cannot reduce Foldkit's conditional SubmodelConfig while
  // Value is still generic; every field remains independently typed above.
  // eslint-disable-next-line no-restricted-syntax -- reason: Foldkit's generic conditional SubmodelConfig cannot be reduced here.
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
