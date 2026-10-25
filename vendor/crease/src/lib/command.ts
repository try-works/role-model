import { Option } from 'effect'
import { Combobox } from '@foldkit/ui'
import { defineView } from 'foldkit/submodel'
import type { Html } from 'foldkit/html'
import type { Update } from 'foldkit'

export const normalizeCommandQuery = (value: string): string =>
  value.trim().toLocaleLowerCase()

export const filterCommandItems = <Item>(
  items: ReadonlyArray<Item>,
  queryValue: string,
  restingInputValue: string,
  itemToSearchText: (item: Item) => string,
): ReadonlyArray<Item> => {
  const query = normalizeCommandQuery(queryValue)
  if (query === '' || queryValue === restingInputValue) return items
  return items.filter(item =>
    normalizeCommandQuery(itemToSearchText(item)).includes(query),
  )
}

/** Command reuses Foldkit's combobox state and typed selection updates, with
 * an always-visible list rendered in document flow. No anchor, portal, toggle,
 * blur dismissal, or dropdown animation participates in this surface. */
export const createInlineCommandView = <Item extends string>() =>
  defineView<Combobox.Model, Combobox.Message, Combobox.ViewInputs<Item>>(
    (model, props, h) => {
      const inputId = Combobox.inputId(model.id)
      const listId = `${model.id}-items`
      const itemId = (index: number): string =>
        `${model.id}-item-${String(index)}`
      const valueAt = (item: Item, index: number): Item =>
        props.itemToValue(item, index)
      const isDisabled = (index: number): boolean => {
        const item = props.items[index]
        return (
          item === undefined || props.isItemDisabled?.(item, index) === true
        )
      }
      const enabledIndices = props.items
        .map((_, index) => index)
        .filter(index => !isDisabled(index))
      const activeIndex = Option.getOrUndefined(model.maybeActiveItemIndex)
      const active =
        activeIndex !== undefined && !isDisabled(activeIndex)
          ? activeIndex
          : enabledIndices[0]
      const keyMessage = (key: string): Option.Option<Combobox.Message> => {
        if (key === 'Enter') {
          return Option.some(
            active === undefined
              ? Combobox.Message.SuppressedItemCommit()
              : Combobox.Message.RequestedItemClick({ index: active }),
          )
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key))
          return Option.none()
        if (enabledIndices.length === 0)
          return Option.some(Combobox.Message.SuppressedEmptyItemNavigation())
        const current =
          active === undefined ? -1 : enabledIndices.indexOf(active)
        const position =
          key === 'Home'
            ? 0
            : key === 'End'
              ? enabledIndices.length - 1
              : (current +
                  (key === 'ArrowDown' ? 1 : -1) +
                  enabledIndices.length) %
                enabledIndices.length
        const index = enabledIndices[position]
        return index === undefined
          ? Option.none()
          : Option.some(
              Combobox.Message.ActivatedItem({
                index,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: Option.none(),
              }),
            )
      }
      const renderedItems = props.items.map((item, index) => {
        const disabled = isDisabled(index)
        const selected = Option.exists(
          props.maybeSelectedValue,
          value => value === valueAt(item, index),
        )
        const config = props.itemToConfig(item, {
          isActive: active === index,
          isDisabled: disabled,
          isReadOnly: props.isReadOnly === true,
          isSelected: selected,
        })
        return h.keyed('div')(
          itemId(index),
          [
            h.Id(itemId(index)),
            h.Role('option'),
            h.AriaSelected(selected),
            ...(active === index ? [h.DataAttribute('active', '')] : []),
            ...(selected ? [h.DataAttribute('selected', '')] : []),
            ...(disabled
              ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
              : [
                  h.OnClick(
                    Combobox.Message.SelectedItem({
                      item: valueAt(item, index),
                      displayText: props.itemToDisplayText(item, index),
                      wasSelected: selected,
                    }),
                  ),
                  h.OnPointerMove((screenX, screenY, pointerType) =>
                    pointerType === 'touch'
                      ? Option.none()
                      : Option.some(
                          Combobox.Message.MovedPointerOverItem({
                            index,
                            screenX,
                            screenY,
                          }),
                        ),
                  ),
                ]),
            ...(config.className === undefined
              ? []
              : [h.Class(config.className)]),
          ],
          [config.content],
        )
      })
      const renderGroups = (): ReadonlyArray<Html> => {
        if (props.itemGroupKey === undefined) return renderedItems
        const groups = new Map<string, Array<Html>>()
        props.items.forEach((item, index) => {
          const group = props.itemGroupKey?.(item, index) ?? ''
          const child = renderedItems[index]
          if (child === undefined) return
          const children = groups.get(group)
          if (children === undefined) groups.set(group, [child])
          else children.push(child)
        })
        return Array.from(groups).flatMap(([key, children], index) => {
          const heading = props.groupToHeading?.(key)
          const headingId = `${model.id}-group-${String(index)}-heading`
          return [
            ...(index === 0
              ? []
              : [
                  h.div(
                    [
                      h.Role('separator'),
                      ...(props.separatorClassName === undefined
                        ? []
                        : [h.Class(props.separatorClassName)]),
                      ...(props.separatorAttributes ?? []),
                    ],
                    [],
                  ),
                ]),
            h.div(
              [
                h.Role('group'),
                ...(heading === undefined ? [] : [h.AriaLabelledBy(headingId)]),
                ...(props.groupClassName === undefined
                  ? []
                  : [h.Class(props.groupClassName)]),
                ...(props.groupAttributes ?? []),
              ],
              [
                ...(heading === undefined
                  ? []
                  : [
                      h.div(
                        [
                          h.Id(headingId),
                          ...(heading.className === undefined
                            ? []
                            : [h.Class(heading.className)]),
                        ],
                        [heading.content],
                      ),
                    ]),
                ...children,
              ],
            ),
          ]
        })
      }
      return h.div(
        [
          ...(props.className === undefined ? [] : [h.Class(props.className)]),
          ...(props.attributes ?? []),
        ],
        [
          h.div(
            [
              ...(props.inputWrapperClassName === undefined
                ? []
                : [h.Class(props.inputWrapperClassName)]),
              ...(props.inputWrapperAttributes ?? []),
            ],
            [
              ...(props.buttonContent === undefined
                ? []
                : [
                    h.span(
                      [
                        h.AriaHidden(true),
                        ...(props.buttonClassName === undefined
                          ? []
                          : [h.Class(props.buttonClassName)]),
                      ],
                      [props.buttonContent],
                    ),
                  ]),
              h.input([
                h.Id(inputId),
                h.Role('combobox'),
                h.AriaExpanded(true),
                h.AriaControls(listId),
                h.Attribute('aria-autocomplete', 'list'),
                ...(props.ariaLabel === undefined
                  ? []
                  : [h.AriaLabel(props.ariaLabel)]),
                ...(props.ariaLabelledBy === undefined
                  ? []
                  : [h.AriaLabelledBy(props.ariaLabelledBy)]),
                ...(active === undefined
                  ? []
                  : [h.AriaActiveDescendant(itemId(active))]),
                h.Autocomplete('off'),
                h.Value(model.inputValue),
                ...(props.inputPlaceholder === undefined
                  ? []
                  : [h.Placeholder(props.inputPlaceholder)]),
                h.OnInput(value =>
                  Combobox.Message.UpdatedInputValue({ value }),
                ),
                h.OnKeyDownPreventDefault(keyMessage),
                ...(model.selectInputOnFocus
                  ? [h.OnMount(Combobox.AttachComboboxSelectOnFocus())]
                  : []),
                ...(props.inputClassName === undefined
                  ? []
                  : [h.Class(props.inputClassName)]),
                ...(props.inputAttributes ?? []),
              ]),
            ],
          ),
          h.div(
            [
              h.Id(listId),
              h.Role('listbox'),
              h.AriaLabelledBy(inputId),
              h.OnMount(Combobox.AttachComboboxPreventBlur()),
              ...(props.itemsClassName === undefined
                ? []
                : [h.Class(props.itemsClassName)]),
              ...(props.itemsAttributes ?? []),
            ],
            [
              h.div(
                [
                  ...(props.itemsScrollClassName === undefined
                    ? []
                    : [h.Class(props.itemsScrollClassName)]),
                  ...(props.itemsScrollAttributes ?? []),
                ],
                [...renderGroups()],
              ),
            ],
          ),
        ],
      )
    },
  )
// Command actions keep their search query when committed; a selected label
// does not replace the search input as it would in a selection combobox.
export const retainCommandQuery = <Item extends string>(
  previous: Combobox.Model,
  next: Update.ReturnWithOutMessage<
    Combobox.Model,
    Combobox.Message,
    Combobox.OutMessage<Item>
  >,
): Update.ReturnWithOutMessage<
  Combobox.Model,
  Combobox.Message,
  Combobox.OutMessage<Item>
> =>
  next.outMessage?._tag === 'Selected'
    ? { ...next, model: { ...next.model, inputValue: previous.inputValue } }
    : next
