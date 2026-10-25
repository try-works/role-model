import { Option } from 'effect'
import { Listbox, Popover } from '@foldkit/ui'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import { Message, SELECT_ALL_VALUE, type Model } from './multi-selector'

type OptionEntry = Readonly<{ value: string; label: string }>
export const filterOptions = (
  options: ReadonlyArray<OptionEntry>,
  query: string,
): ReadonlyArray<OptionEntry> => {
  const normalized = query.trim().toLocaleLowerCase()
  return options.filter(option =>
    option.label.toLocaleLowerCase().includes(normalized),
  )
}

type ContentProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  inputs: Listbox.Multi.ViewInputs<string>
  options: ReadonlyArray<OptionEntry>
  label: string
  hasSearch: boolean
  searchPlaceholder?: string
  closeMessage: Message
  initialFocusAttributes?: ReadonlyArray<ChildAttribute>
  visual: Readonly<{
    search: ReadonlyArray<Attribute<Msg> | ChildAttribute>
    input: ReadonlyArray<Attribute<Msg> | ChildAttribute>
    empty: ReadonlyArray<Attribute<Msg> | ChildAttribute>
  }>
}>

export const searchId = (model: Model): string => `${model.listbox.id}-search`
export const itemsId = (model: Model): string => `${model.listbox.id}-items`
const itemId = (model: Model, index: number): string =>
  `${model.listbox.id}-item-${String(index)}`

export const drawerTrigger = <Msg>(
  props: Pick<ContentProps<Msg>, 'model' | 'inputs' | 'toParentMessage'> &
    Readonly<{ labelId: string; isDisabled: boolean }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { model, inputs, toParentMessage: send } = props
  return h.button(
    [
      h.Id(Listbox.Multi.buttonId(model.listbox.id)),
      h.Type('button'),
      h.AriaLabelledBy(props.labelId),
      h.AriaHasPopup('dialog'),
      h.AriaExpanded(model.drawer.dialog.isOpen),
      h.AriaControls(model.drawer.dialog.id),
      ...(inputs.buttonAttributes ?? []),
      ...(inputs.buttonClassName === undefined
        ? []
        : [h.Class(inputs.buttonClassName)]),
      ...(props.isDisabled
        ? [h.Disabled(true)]
        : [
            h.OnClick(send(Message.RequestedOpenDrawer({}))),
            h.OnKeyDownPreventDefault(key =>
              key === 'ArrowDown' || key === 'ArrowUp'
                ? Option.some(
                    send(
                      Message.RequestedOpenDrawer({
                        initialIndex:
                          key === 'ArrowDown' ? 0 : inputs.items.length - 1,
                      }),
                    ),
                  )
                : Option.none(),
            ),
          ]),
    ],
    [inputs.buttonContent],
  )
}

/** Render an option list independently of its popover/drawer presentation. */
export const optionContent = <Msg>(
  props: ContentProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { model, inputs, toParentMessage: send } = props
  const visible = props.hasSearch
    ? filterOptions(props.options, model.query)
    : props.options
  const visibleValues = visible.map(option => option.value)
  const hasSelectAll =
    inputs.items.includes(SELECT_ALL_VALUE) && visible.length > 0
  const items = [...(hasSelectAll ? [SELECT_ALL_VALUE] : []), ...visibleValues]
  const active = model.listbox.maybeActiveItemIndex
  const activeAttributes = Option.match(active, {
    onNone: () => [],
    onSome: index =>
      index < items.length
        ? [h.AriaActiveDescendant(itemId(model, index))]
        : [],
  })
  const select = (value: string): Message =>
    value === SELECT_ALL_VALUE
      ? Message.ClickedSelectAll({ optionValues: visibleValues })
      : Message.GotListboxMessage({
          message: Listbox.Message.SelectedItem({ item: value }),
        })
  const keyMessage = (key: string, isInput: boolean): Option.Option<Msg> => {
    if (key === 'Escape') return Option.some(send(props.closeMessage))
    const current = Option.getOrElse(active, () => -1)
    let next: number | undefined
    if (items.length > 0) {
      if (key === 'ArrowDown') next = (current + 1) % items.length
      if (key === 'ArrowUp')
        next = current <= 0 ? items.length - 1 : current - 1
      if (!isInput && (key === 'Home' || key === 'PageUp')) next = 0
      if (!isInput && (key === 'End' || key === 'PageDown'))
        next = items.length - 1
    }
    if (next !== undefined)
      return Option.some(
        send(
          Message.GotListboxMessage({
            message: Listbox.Message.ActivatedItem({
              index: next,
              activationTrigger: 'Keyboard',
            }),
          }),
        ),
      )
    if (key === 'Enter' || (!isInput && key === ' ')) {
      const value = items[current]
      return value === undefined || inputs.isReadOnly === true
        ? Option.some(
            send(
              Message.GotListboxMessage({
                message: Listbox.Message.SuppressedItemCommit(),
              }),
            ),
          )
        : Option.some(send(select(value)))
    }
    if (!isInput && key.length === 1 && key.trim() !== '') {
      const query = (model.listbox.searchQuery + key).toLocaleLowerCase()
      const index = items.findIndex(value =>
        (
          props.options.find(option => option.value === value)?.label ??
          'Select all'
        )
          .toLocaleLowerCase()
          .startsWith(query),
      )
      return Option.some(
        send(
          Message.GotListboxMessage({
            message: Listbox.Message.Searched({
              key,
              maybeTargetIndex: index < 0 ? Option.none() : Option.some(index),
            }),
          }),
        ),
      )
    }
    return Option.none()
  }
  const options: Html[] = []
  let lastGroup: string | undefined
  for (const [index, value] of items.entries()) {
    const group = inputs.itemGroupKey?.(value, index)
    if (group !== undefined && group !== '' && group !== lastGroup) {
      lastGroup = group
      const heading = inputs.groupToHeading?.(group)
      if (heading !== undefined) options.push(h.div([], [heading.content]))
    }
    const selected =
      value === SELECT_ALL_VALUE
        ? visibleValues.every(option => model.values.includes(option))
        : model.values.includes(value)
    const isActive = Option.contains(active, index)
    const config = inputs.itemToConfig(value, {
      isActive,
      isSelected: selected,
      isDisabled: false,
      isReadOnly: inputs.isReadOnly ?? false,
    })
    options.push(
      h.div(
        [
          h.Id(itemId(model, index)),
          h.Role('option'),
          h.AriaSelected(selected),
          ...(isActive ? [h.DataAttribute('active', '')] : []),
          ...(selected ? [h.DataAttribute('selected', '')] : []),
          ...(inputs.isReadOnly === true || !model.listbox.isOpen
            ? []
            : [h.OnClick(send(select(value)))]),
          h.OnPointerMove((screenX, screenY) =>
            Option.some(
              send(
                Message.GotListboxMessage({
                  message: Listbox.Message.MovedPointerOverItem({
                    index,
                    screenX,
                    screenY,
                  }),
                }),
              ),
            ),
          ),
          ...(config.className === undefined
            ? []
            : [h.Class(config.className)]),
        ],
        [config.content],
      ),
    )
  }
  return h.div(
    [],
    [
      ...(props.hasSearch
        ? [
            h.div(
              [...props.visual.search],
              [
                h.input([
                  ...props.visual.input,
                  h.Id(searchId(model)),
                  h.Type('search'),
                  h.Role('combobox'),
                  h.Autocomplete('off'),
                  h.AriaLabel(`Search ${props.label}`),
                  h.AriaAutocomplete('list'),
                  h.AriaExpanded(model.listbox.isOpen),
                  h.AriaControls(itemsId(model)),
                  ...activeAttributes,
                  h.Placeholder(props.searchPlaceholder ?? 'Search options...'),
                  h.Value(model.query),
                  h.OnInput(query => send(Message.ChangedSearch({ query }))),
                  h.OnKeyDownPreventDefault(key => keyMessage(key, true)),
                  ...(props.initialFocusAttributes ?? []),
                ]),
              ],
            ),
          ]
        : []),
      h.div(
        [
          h.Id(itemsId(model)),
          h.Role('listbox'),
          h.AriaMultiSelectable(true),
          h.AriaLabel(props.label),
          h.Tabindex(-1),
          ...activeAttributes,
          ...(inputs.isReadOnly === true ? [h.AriaReadonly(true)] : []),
          h.OnKeyDownPreventDefault(key => keyMessage(key, false)),
          ...(props.hasSearch ? [] : (props.initialFocusAttributes ?? [])),
          ...(inputs.itemsScrollClassName === undefined
            ? []
            : [h.Class(inputs.itemsScrollClassName)]),
        ],
        options.length === 0
          ? [h.div([...props.visual.empty], ['No options found.'])]
          : options,
      ),
    ],
  )
}

export const searchablePopover = <Msg>(
  props: Omit<ContentProps<Msg>, 'closeMessage'>,
  h: HtmlBuilder<Msg>,
): Html => {
  const { model, inputs, toParentMessage: send } = props
  const closeMessage = Message.GotPopoverMessage({
    message: Popover.Message.RequestedClose(),
  })
  return h.submodel({
    slotId: model.popover.id,
    model: model.popover,
    view: Popover.view,
    toParentMessage: message => send(Message.GotPopoverMessage({ message })),
    viewInputs: {
      anchor: inputs.anchor ?? { placement: 'bottom-start', gap: 4 },
      isDisabled: inputs.isDisabled ?? false,
      focusSelector: `#${searchId(model)}`,
      ariaLabel: props.label,
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [
            ...(inputs.className === undefined
              ? []
              : [h.Class(inputs.className)]),
            ...(inputs.attributes ?? []),
          ],
          [
            h.button(
              [
                ...button,
                ...(inputs.buttonAttributes ?? []),
                ...(inputs.buttonClassName === undefined
                  ? []
                  : [h.Class(inputs.buttonClassName)]),
              ],
              [inputs.buttonContent],
            ),
            ...(inputs.name === undefined
              ? []
              : (model.values.length === 0 ? [''] : model.values).map(value =>
                  h.input([
                    h.Type('hidden'),
                    h.Name(inputs.name!),
                    h.Value(value),
                  ]),
                )),
            ...(isVisible
              ? [
                  h.div(
                    [
                      ...backdrop,
                      ...(inputs.backdropClassName === undefined
                        ? []
                        : [h.Class(inputs.backdropClassName)]),
                    ],
                    [],
                  ),
                  h.div(
                    [
                      ...panel,
                      ...(inputs.itemsAttributes ?? []),
                      ...(inputs.itemsClassName === undefined
                        ? []
                        : [h.Class(inputs.itemsClassName)]),
                    ],
                    [optionContent({ ...props, closeMessage }, h)],
                  ),
                ]
              : []),
          ],
        ),
    },
  })
}
