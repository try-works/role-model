import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

import { Combobox as ComboboxPrimitive } from '@foldkit/ui'

import * as Icon from '@/lib/icon'
import { overlayStyles } from './overlay-tokens'
import { foundationTokens } from './foundations-tokens'
import { tokens } from './tokens'
import type { ComponentLayoutStyle } from './contracts'
import { themedAnchor } from './overlay-boundary'
import { className } from './style'

const styles = {
  contents: Style.make({ display: 'contents' }),
  content: Style.make({ minWidth: '8rem', width: 'var(--button-width)' }),
  inputWrapperFix: Style.make({ position: 'relative', height: '2.25rem' }).pipe(
    Style.when(When.data('size', 'sm'), { height: '2rem' }),
    Style.when(When.before, {
      color: tokens.mutedForeground,
      content: '"⌕"',
      flexShrink: 0,
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    }),
  ),
  inputFix: Style.make({
    borderRadius: foundationTokens.radiusMd,
    paddingBlock: '0.75rem',
    display: 'flex',
    opacity: 1,
  }).pipe(
    Style.when(When.pseudo(':is([data-disabled], [aria-disabled="true"])'), {
      opacity: 0.5,
    }),
    Style.when(When.placeholder, { color: tokens.mutedForeground }),
  ),
}

const isStaticStyle = (value: unknown): value is Style.Style =>
  typeof value === 'object' && value !== null
const cn = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

/* shadcn's combobox is a Popover + Command composition rather than a
   standalone primitive. This ports that look onto foldkit's single-select,
   config-driven Combobox submodel.

   Command's selected/highlighted state is driven by foldkit's data-active
   attribute, and its disabled input/item styles use foldkit's data-disabled
   and aria-disabled signals. Popup animation uses a finite data-closed
   transition; pass isAnimated: true to init.

   PORT NOTE: foldkit Combobox only accepts strings as its internal items, so
   arbitrary consumer items are projected through itemToValue before being
   handed to the primitive. Values must be unique.

   PORT NOTE: foldkit Combobox exposes its input-wrapper suffix as a toggle
   button rather than an arbitrary decorative slot. The search icon uses that
   button and is visually ordered before the input. Per-item data attributes
   are not exposed, so command-item is placed on the inner content span. */

export const Model = ComboboxPrimitive.Model
export type Model = typeof Model.Type
export const Message = ComboboxPrimitive.Message
export type Message = typeof Message.Type
export const OutMessage = ComboboxPrimitive.OutMessage
export type OutMessage<Value extends string = string> =
  ComboboxPrimitive.OutMessage<Value>

export const init = ComboboxPrimitive.init
export const MultiModel = ComboboxPrimitive.Multi.Model
export const multiInit = ComboboxPrimitive.Multi.init
export type MultiModel = typeof MultiModel.Type
export type MultiOutMessage<Value extends string = string> = OutMessage<Value>

const ROOT_CLASS = overlayStyles.root

const INPUT_WRAPPER_CLASS = overlayStyles.inputWrapper

const INPUT_CLASS = overlayStyles.input

const CONTENT_CLASS = overlayStyles.panel

const LIST_CLASS = overlayStyles.list

const ITEM_CLASS = overlayStyles.item

const INDICATOR_CLASS = overlayStyles.indicator

const GROUP_CLASS = overlayStyles.group

const SEPARATOR_CLASS = overlayStyles.separator

const BACKDROP_CLASS = overlayStyles.backdrop

export type ComboboxSize = 'sm' | 'default'

export type ComboboxItemConfig = Readonly<{
  content?: Html | string
  searchText?: string
  layoutStyle?: ComponentLayoutStyle | undefined
  isDisabled?: boolean
}>

export type ComboboxProps<Item, Value extends string, Msg> = Readonly<{
  model: Model
  maybeSelectedValue: Option.Option<Value>
  restingInputValue: string
  toParentMessage: (message: Message) => Msg
  items: ReadonlyArray<Item>
  itemToValue: (item: Item) => Value
  itemToLabel: (item: Item) => string
  itemToConfig?: (item: Item) => ComboboxItemConfig
  placeholder?: string
  triggerLayoutStyle?: ComponentLayoutStyle | undefined
  size?: ComboboxSize
  ariaLabel?: string
  ariaLabelledBy?: string
  isDisabled?: boolean
  isReadOnly?: boolean
  isInvalid?: boolean
  formName?: string
  direction?: 'ltr' | 'rtl'
  /**
   * Renders foldkit's input-wrapper suffix as a toggle button (chevron),
   * matching shadcn's trigger-style combobox where a button opens the popup.
   */
  trigger?: Readonly<{
    content: Html | string
    layoutStyle?: ComponentLayoutStyle | undefined
    ariaLabel?: string
  }>
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => string | undefined
}>

const renderCombobox = <Item, Value extends string, Msg>(
  comboboxPrimitive: ComboboxPrimitive.Bundle<Value>,
  props: ComboboxProps<Item, Value, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const hc = h
  const itemForValue = (value: Value): Item | undefined =>
    props.items.find(item => props.itemToValue(item) === value)
  const labelForValue = (value: Value): string => {
    const item = itemForValue(value)
    return item === undefined ? value : props.itemToLabel(item)
  }
  const query = props.model.inputValue.trim().toLocaleLowerCase()
  const isShowingSelectedLabel =
    props.restingInputValue === props.model.inputValue
  const values = props.items
    .filter(
      item =>
        query === '' ||
        isShowingSelectedLabel ||
        (props.itemToConfig?.(item).searchText ?? props.itemToLabel(item))
          .toLocaleLowerCase()
          .includes(query),
    )
    .map(props.itemToValue)

  const baseInputs = buildBaseViewInputs(
    props,
    values,
    props.restingInputValue,
    hc,
  )
  return h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: comboboxPrimitive.view,
    viewInputs: {
      ...baseInputs,
      maybeSelectedValue: props.maybeSelectedValue,
    },
    toParentMessage: props.toParentMessage,
  })
}

type CommonProps<Item, Value extends string, Msg> = Omit<
  ComboboxProps<Item, Value, Msg>,
  'maybeSelectedValue' | 'restingInputValue'
>

const buildBaseViewInputs = <Item, Value extends string, Msg>(
  props: CommonProps<Item, Value, Msg>,
  values: ReadonlyArray<Value>,
  restingInputValue: string,
  hc: HtmlBuilder<Msg>,
): ComboboxPrimitive.BaseViewInputsCommon<Value> => {
  const itemForValue = (value: Value): Item | undefined =>
    props.items.find(item => props.itemToValue(item) === value)
  const labelForValue = (value: Value): string => {
    const item = itemForValue(value)
    return item === undefined ? value : props.itemToLabel(item)
  }
  return {
    restingInputValue,
    items: values,
    itemToValue: value => value,
    itemToDisplayText: labelForValue,
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
        className: cn(ITEM_CLASS, config?.layoutStyle),
        content: hc.span(
          [
            hc.DataAttribute('slot', 'command-item'),
            hc.Class(className(styles.contents)),
          ],
          [
            hc.span([], [config?.content ?? labelForValue(value)]),
            hc.span(
              [hc.Class(className(INDICATOR_CLASS))],
              [Icon.check({ class: className(overlayStyles.icon) }, hc)],
            ),
          ],
        ),
      }
    },
    inputClassName: className(reset.input, INPUT_CLASS, styles.inputFix),
    inputAttributes: childAttributes([
      hc.DataAttribute('slot', 'command-input'),
    ]),
    ...(props.placeholder === undefined
      ? {}
      : { inputPlaceholder: props.placeholder }),
    inputWrapperClassName: cn(
      INPUT_WRAPPER_CLASS,
      styles.inputWrapperFix,
      props.triggerLayoutStyle,
    ),
    inputWrapperAttributes: childAttributes([
      hc.DataAttribute('slot', 'command-input-wrapper'),
      hc.DataAttribute('size', props.size ?? 'default'),
    ]),
    openOnFocus: true,
    itemsClassName: className(
      CONTENT_CLASS,
      overlayStyles.floating,
      styles.content,
    ),
    itemsAttributes: childAttributes([
      hc.DataAttribute('slot', 'command-list'),
    ]),
    itemsScrollClassName: className(reset.list, LIST_CLASS),
    backdropClassName: className(BACKDROP_CLASS),
    backdropAttributes: childAttributes([
      hc.DataAttribute('slot', 'combobox-backdrop'),
    ]),
    className: className(ROOT_CLASS),
    attributes: childAttributes([
      hc.DataAttribute('slot', 'command'),
      ...(props.direction === undefined ? [] : [hc.Dir(props.direction)]),
    ]),
    anchor: themedAnchor({ placement: 'bottom-start', gap: 4 }),
    isDisabled: props.isDisabled ?? false,
    isReadOnly: props.isReadOnly ?? false,
    isInvalid: props.isInvalid ?? false,
    ...(props.formName === undefined ? {} : { formName: props.formName }),
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
                  content: hc.span(
                    [hc.DataAttribute('slot', 'combobox-group-heading')],
                    [heading],
                  ),
                }
          },
          groupClassName: className(GROUP_CLASS),
          groupAttributes: childAttributes([
            hc.DataAttribute('slot', 'command-group'),
          ]),
          separatorClassName: className(SEPARATOR_CLASS),
          separatorAttributes: childAttributes([
            hc.DataAttribute('slot', 'command-separator'),
          ]),
        }),
    ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
    ...(props.ariaLabelledBy === undefined
      ? {}
      : { ariaLabelledBy: props.ariaLabelledBy }),
    ...(props.trigger === undefined
      ? {}
      : {
          buttonContent: hc.span([], [props.trigger.content]),
          buttonClassName: className(reset.button, props.trigger.layoutStyle),
          buttonAttributes: childAttributes(
            props.trigger.ariaLabel === undefined
              ? []
              : [hc.AriaLabel(props.trigger.ariaLabel)],
          ),
        }),
  }
}

export type ComboboxBundle<Value extends string> = Readonly<{
  update: ReturnType<typeof ComboboxPrimitive.create<Value>>['update']
  combobox: <Item, Msg>(
    props: ComboboxProps<Item, Value, Msg>,
    h: HtmlBuilder<Msg>,
  ) => Html
}>

export const create = <Value extends string = string>(
  config?: Readonly<{ autoHighlight?: boolean }>,
): ComboboxBundle<Value> => {
  const primitive = ComboboxPrimitive.create<Value>()
  const update =
    config?.autoHighlight === true
      ? (model: Model, message: Message) =>
          primitive.update(
            model,
            message._tag === 'Opened' &&
              Option.isNone(message.maybeActiveItemIndex)
              ? Message.Opened({ maybeActiveItemIndex: Option.some(0) })
              : message,
          )
      : primitive.update
  return {
    update,
    combobox: (props, h) => renderCombobox(primitive, props, h),
  }
}

export type ComboboxMultiProps<Item, Value extends string, Msg> = Omit<
  ComboboxProps<Item, Value, Msg>,
  'maybeSelectedValue' | 'restingInputValue'
> &
  Readonly<{
    /** The selection the parent owns; selecting an item toggles membership. */
    selectedValues: ReadonlyArray<Value>
  }>

export type ComboboxMultiBundle<Value extends string> = Readonly<{
  update: ReturnType<typeof ComboboxPrimitive.Multi.create<Value>>['update']
  comboboxMulti: <Item, Msg>(
    props: ComboboxMultiProps<Item, Value, Msg>,
    h: HtmlBuilder<Msg>,
  ) => Html
}>

/** Multi-select combobox matching shadcn's `Combobox multiple`: selection
 *  stays open after each pick and the parent toggles value membership from
 *  the `Selected` OutMessage. `autoHighlight` pre-activates the first item
 *  on every open, like base-ui's autoHighlight. */
export const createMulti = <Value extends string = string>(
  config?: Readonly<{ autoHighlight?: boolean }>,
): ComboboxMultiBundle<Value> => {
  const primitive = ComboboxPrimitive.Multi.create<Value>()
  const update =
    config?.autoHighlight === true
      ? (model: MultiModel, message: Message) =>
          primitive.update(
            model,
            message._tag === 'Opened' &&
              Option.isNone(message.maybeActiveItemIndex)
              ? Message.Opened({ maybeActiveItemIndex: Option.some(0) })
              : message,
          )
      : primitive.update
  const comboboxMulti = <Item, Msg>(
    props: ComboboxMultiProps<Item, Value, Msg>,
    h: HtmlBuilder<Msg>,
  ): Html => {
    const hc = h
    const query = props.model.inputValue.trim().toLocaleLowerCase()
    const values = props.items
      .filter(
        item =>
          query === '' ||
          (props.itemToConfig?.(item).searchText ?? props.itemToLabel(item))
            .toLocaleLowerCase()
            .includes(query),
      )
      .map(props.itemToValue)
    const viewInputs: ComboboxPrimitive.Multi.ViewInputs<Value> = {
      ...buildBaseViewInputs(props, values, '', hc),
      selectedValues: props.selectedValues,
    }
    return h.submodel({
      slotId: props.model.id,
      model: props.model,
      view: primitive.view,
      viewInputs,
      toParentMessage: props.toParentMessage,
    })
  }
  return { update, comboboxMulti }
}

const StringCombobox = create<string>()
export const update = StringCombobox.update
export const combobox = StringCombobox.combobox

/*
   Minimal wiring:

   type Framework = Readonly<{ value: 'foldkit' | 'elm'; label: string }>
   const FrameworkCombobox = create<Framework['value']>()

   // Model: { frameworkCombobox: Model }
   // Message: GotFrameworkComboboxMessage({ message: Message })
   // Init: frameworkCombobox: init({ id: 'framework', isAnimated: true })
   //
   // Update:
   // const frameworkComboboxOp__ = //   FrameworkCombobox.update(model.frameworkCombobox, message);
    const frameworkCombobox = frameworkComboboxOp__.model;
    const commands = frameworkComboboxOp__.commands ?? [];
    const maybeOutMessage = Option.fromNullishOr(frameworkComboboxOp__.outMessage);
   //
   // View:
   // combobox<Framework, Framework['value'], AppMessage>({
   //   model: model.frameworkCombobox,
   //   toParentMessage: message => GotFrameworkComboboxMessage({ message }),
   //   items: frameworks,
   //   itemToValue: framework => framework.value,
   //   itemToLabel: framework => framework.label,
   //   placeholder: 'Search frameworks...',
   // })
*/
