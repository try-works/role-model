import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { Tabs as TabsPrimitive } from '@foldkit/ui'

export const Model = TabsPrimitive.Model
export type Model = typeof Model.Type
export const Message = TabsPrimitive.Message
export type Message = typeof Message.Type
export type OutMessage<Value extends string = string> =
  TabsPrimitive.OutMessage<Value>

export const init = (config: Readonly<{ id: string }>): Model =>
  TabsPrimitive.init({ id: config.id, activationMode: 'Manual' })

export type ToggleGroupBehaviorItem<Value extends string> = Readonly<{
  value: Value
  isDisabled?: boolean
}>

export type ToggleGroupItemState<Value extends string> = Readonly<{
  value: Value
  index: number
  isPressed: boolean
  isFocused: boolean
  isDisabled: boolean
  attributes: ReadonlyArray<ChildAttribute>
}>

export type ToggleGroupBehaviorProps<Value extends string, Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  selectedValues: ReadonlyArray<Value>
  items: ReadonlyArray<ToggleGroupBehaviorItem<Value>>
  ariaLabel: string
  direction?: 'ltr' | 'rtl'
  orientation?: 'vertical'
}>

export type ToggleGroupVisualAttributes<Msg> = Readonly<{
  group: ReadonlyArray<Attribute<Msg>>
  item: (item: ToggleGroupItemState<string>) => ReadonlyArray<Attribute<Msg>>
}>

const childAttributeTag = (attribute: ChildAttribute): string | undefined => {
  const value = attribute.attribute
  return typeof value === 'object' &&
    value !== null &&
    '_tag' in value &&
    typeof value._tag === 'string'
    ? value._tag
    : undefined
}

const tabOnlyAttributes = new Set(['Role', 'AriaSelected', 'AriaControls'])

const renderToggleGroup = <Value extends string, Msg>(
  bundle: TabsPrimitive.Bundle<Value>,
  props: ToggleGroupBehaviorProps<Value, Msg>,
  visual: ToggleGroupVisualAttributes<Msg>,
  toItem: (item: ToggleGroupItemState<Value>, h: HtmlBuilder<Msg>) => Html,
  h: HtmlBuilder<Msg>,
): Html => {
  const orderedItems =
    props.direction === 'rtl' ? [...props.items].reverse() : props.items
  const firstEnabled = orderedItems.find(
    item => item.isDisabled !== true,
  )?.value
  const focusedValue =
    orderedItems.find(
      item =>
        item.isDisabled !== true && props.selectedValues.includes(item.value),
    )?.value ??
    firstEnabled ??
    orderedItems[0]?.value

  if (focusedValue === undefined) {
    return h.div(
      [h.Role('group'), h.AriaLabel(props.ariaLabel), ...visual.group],
      [],
    )
  }

  return h.submodel({
    slotId: props.model.id,
    model: props.model,
    view: bundle.view,
    viewInputs: {
      tabs: orderedItems.map(item => item.value),
      selectedValue: focusedValue,
      ariaLabel: props.ariaLabel,
      orientation: props.orientation === 'vertical' ? 'Vertical' : 'Horizontal',
      isTabDisabled: value =>
        props.items.find(item => item.value === value)?.isDisabled === true,
      toView: ({ tabs }) =>
        h.div(
          [
            h.Role('group'),
            h.AriaLabel(props.ariaLabel),
            ...(props.direction === undefined
              ? []
              : [h.Dir(props.direction === 'rtl' ? 'ltr' : props.direction)]),
            ...visual.group,
          ],
          tabs.flatMap(tab => {
            const config = props.items.find(item => item.value === tab.value)
            if (config === undefined) return []
            const state: ToggleGroupItemState<Value> = {
              value: tab.value,
              index: tab.index,
              isPressed: props.selectedValues.includes(tab.value),
              isFocused: tab.isFocused,
              isDisabled: tab.isDisabled,
              attributes: tab.tab.filter(
                attribute =>
                  !tabOnlyAttributes.has(childAttributeTag(attribute) ?? ''),
              ),
            }
            return [toItem(state, h)]
          }),
        ),
    },
    toParentMessage: props.toParentMessage,
  })
}

export type Bundle<Value extends string> = Readonly<{
  update: ReturnType<typeof TabsPrimitive.create<Value>>['update']
  render: <Msg>(
    props: ToggleGroupBehaviorProps<Value, Msg>,
    visual: ToggleGroupVisualAttributes<Msg>,
    toItem: (item: ToggleGroupItemState<Value>, h: HtmlBuilder<Msg>) => Html,
    h: HtmlBuilder<Msg>,
  ) => Html
}>

export const create = <Value extends string = string>(): Bundle<Value> => {
  const bundle = TabsPrimitive.create<Value>()
  return {
    update: bundle.update,
    render: (props, visual, toItem, h) =>
      renderToggleGroup(bundle, props, visual, toItem, h),
  }
}

const StringToggleGroup = create<string>()
export const update = StringToggleGroup.update
export const render = StringToggleGroup.render
