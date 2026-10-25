import { Option } from 'effect'

export type MenuModel = Readonly<{
  id: string
  isOpen: boolean
  isAnimated: boolean
  activeIndex: number
  activeSubmenuIndex: number
  openSubmenuIndex: Option.Option<number>
  anchorX: Option.Option<number>
  anchorY: Option.Option<number>
}>

export type MenuMessage =
  | Readonly<{ _tag: 'Opened' }>
  | Readonly<{ _tag: 'AnchoredAt'; x: number; y: number }>
  | Readonly<{ _tag: 'OpenedFromContext' }>
  | Readonly<{ _tag: 'OpenedAt'; x: number; y: number }>
  | Readonly<{ _tag: 'Closed' }>
  | Readonly<{ _tag: 'ActivatedItem'; index: number }>
  | Readonly<{ _tag: 'OpenedSubmenu'; index: number }>
  | Readonly<{ _tag: 'ActivatedSubmenuItem'; index: number }>
  | Readonly<{ _tag: 'ClosedSubmenu' }>
  | Readonly<{
      _tag: 'SelectedItem'
      item: string
      index: number
      staysOpenOnSelect: boolean
    }>

export type Selection = Readonly<{ item: string; index: number }>

export type UpdateResult = Readonly<{
  model: MenuModel
  selection: Option.Option<Selection>
}>

const noSelection = (model: MenuModel): UpdateResult => ({
  model,
  selection: Option.none(),
})

export const update = (
  model: MenuModel,
  message: MenuMessage,
): UpdateResult => {
  switch (message._tag) {
    case 'Opened':
      return noSelection({
        ...model,
        isOpen: true,
        anchorX: Option.none(),
        anchorY: Option.none(),
      })
    case 'AnchoredAt':
      return noSelection({
        ...model,
        anchorX: Option.some(message.x),
        anchorY: Option.some(message.y),
      })
    case 'OpenedFromContext':
      return noSelection({ ...model, isOpen: true })
    case 'OpenedAt':
      return noSelection({
        ...model,
        isOpen: true,
        anchorX: Option.some(message.x),
        anchorY: Option.some(message.y),
      })
    case 'Closed':
      return noSelection({
        ...model,
        isOpen: false,
        openSubmenuIndex: Option.none(),
        anchorX: Option.none(),
        anchorY: Option.none(),
      })
    case 'ActivatedItem':
      return noSelection({ ...model, activeIndex: Math.max(0, message.index) })
    case 'OpenedSubmenu':
      return noSelection({
        ...model,
        activeIndex: message.index,
        activeSubmenuIndex: 0,
        openSubmenuIndex: Option.some(message.index),
      })
    case 'ActivatedSubmenuItem':
      return noSelection({
        ...model,
        activeSubmenuIndex: Math.max(0, message.index),
      })
    case 'ClosedSubmenu':
      return noSelection({ ...model, openSubmenuIndex: Option.none() })
    case 'SelectedItem':
      return {
        model:
          message.staysOpenOnSelect === true
            ? model
            : {
                ...model,
                isOpen: false,
                openSubmenuIndex: Option.none(),
                anchorX: Option.none(),
                anchorY: Option.none(),
              },
        selection: Option.some({ item: message.item, index: message.index }),
      }
  }
}

export type MenuItemBehavior<Item extends string = string> = Readonly<{
  label: string
  isDisabled: boolean
  staysOpenOnSelect?: boolean
  submenu?: Readonly<{
    items: ReadonlyArray<Item>
    itemToBehavior: (item: Item) => MenuItemBehavior<Item>
  }>
}>

const enabledEntries = <Item extends string>(
  items: ReadonlyArray<Item>,
  itemToBehavior: (item: Item) => MenuItemBehavior<Item>,
) =>
  items
    .map((item, index) => ({ item, index, behavior: itemToBehavior(item) }))
    .filter(entry => !entry.behavior.isDisabled)

const moveIndex = (
  entries: ReadonlyArray<Readonly<{ index: number }>>,
  activeIndex: number,
  delta: number,
): number => {
  if (entries.length === 0) return 0
  const current = Math.max(
    0,
    entries.findIndex(entry => entry.index === activeIndex),
  )
  return (
    entries[(current + delta + entries.length) % entries.length]?.index ?? 0
  )
}

const typeaheadIndex = <Item extends string>(
  entries: ReadonlyArray<
    Readonly<{
      item: Item
      index: number
      behavior: MenuItemBehavior<Item>
    }>
  >,
  activeIndex: number,
  key: string,
): number | undefined => {
  if ([...key].length !== 1 || /\s/u.test(key)) return undefined
  const query = key.toLocaleLowerCase()
  const current = entries.findIndex(entry => entry.index === activeIndex)
  const ordered = [
    ...entries.slice(current + 1),
    ...entries.slice(0, current + 1),
  ]
  return ordered.find(entry =>
    entry.behavior.label.trim().toLocaleLowerCase().startsWith(query),
  )?.index
}

export const keyMessage = <Item extends string>(
  model: MenuModel,
  items: ReadonlyArray<Item>,
  itemToBehavior: (item: Item) => MenuItemBehavior<Item>,
  key: string,
  direction: 'ltr' | 'rtl' = 'ltr',
): MenuMessage | undefined => {
  const forwardKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
  const backKey = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
  const parentIndex = Option.getOrUndefined(model.openSubmenuIndex)
  const parent = parentIndex === undefined ? undefined : items[parentIndex]
  const submenu =
    parent === undefined ? undefined : itemToBehavior(parent).submenu

  if (submenu !== undefined) {
    const children = enabledEntries(submenu.items, submenu.itemToBehavior)
    if (key === 'ArrowDown' || key === 'ArrowUp')
      return {
        _tag: 'ActivatedSubmenuItem',
        index: moveIndex(
          children,
          model.activeSubmenuIndex,
          key === 'ArrowDown' ? 1 : -1,
        ),
      }
    if (key === 'Home')
      return { _tag: 'ActivatedSubmenuItem', index: children[0]?.index ?? 0 }
    if (key === 'End')
      return {
        _tag: 'ActivatedSubmenuItem',
        index: children.at(-1)?.index ?? 0,
      }
    if (key === 'Escape') return { _tag: 'Closed' }
    if (key === backKey) return { _tag: 'ClosedSubmenu' }
    if (key === 'Enter' || key === ' ') {
      const child = submenu.items[model.activeSubmenuIndex]
      return child === undefined
        ? undefined
        : {
            _tag: 'SelectedItem',
            item: child,
            index: model.activeSubmenuIndex,
            staysOpenOnSelect:
              submenu.itemToBehavior(child).staysOpenOnSelect ?? false,
          }
    }
    const match = typeaheadIndex(children, model.activeSubmenuIndex, key)
    return match === undefined
      ? undefined
      : { _tag: 'ActivatedSubmenuItem', index: match }
  }

  const enabled = enabledEntries(items, itemToBehavior)
  if (key === 'Escape') return { _tag: 'Closed' }
  if (key === 'Home')
    return { _tag: 'ActivatedItem', index: enabled[0]?.index ?? 0 }
  if (key === 'End')
    return { _tag: 'ActivatedItem', index: enabled.at(-1)?.index ?? 0 }
  if (key === 'ArrowDown' || key === 'ArrowUp')
    return {
      _tag: 'ActivatedItem',
      index: moveIndex(
        enabled,
        model.activeIndex,
        key === 'ArrowDown' ? 1 : -1,
      ),
    }

  const active = items[model.activeIndex]
  if (active === undefined) return undefined
  const behavior = itemToBehavior(active)
  if (
    (key === forwardKey || key === 'Enter' || key === ' ') &&
    behavior.submenu !== undefined
  )
    return { _tag: 'OpenedSubmenu', index: model.activeIndex }
  if (key === backKey) return { _tag: 'ClosedSubmenu' }
  if ((key === 'Enter' || key === ' ') && behavior.submenu === undefined)
    return {
      _tag: 'SelectedItem',
      item: active,
      index: model.activeIndex,
      staysOpenOnSelect: behavior.staysOpenOnSelect ?? false,
    }

  const match = typeaheadIndex(enabled, model.activeIndex, key)
  return match === undefined
    ? undefined
    : { _tag: 'ActivatedItem', index: match }
}
