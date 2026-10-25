import type { Html } from 'foldkit/html'

/* Ported from Meta Astryx MoreMenu.tsx — the action/divider/section option
   shapes and the flattening logic shared by both renderers. */

/** One selectable action inside the menu (astryx's plain option shape). */
export type MoreMenuAction = Readonly<{
  type?: 'action'
  label: string
  icon?: Html
  variant?: 'default' | 'destructive'
  isDisabled?: boolean
}>

export type MoreMenuOption =
  | MoreMenuAction
  | Readonly<{ type: 'divider' }>
  | Readonly<{
      type: 'section'
      title: string
      items: ReadonlyArray<MoreMenuAction>
    }>

/** The dropdown-menu config subset more-menu produces — structurally
   compatible with each renderer's DropdownMenuItemConfig. */
export type MoreMenuItemConfig = Readonly<{
  label: Html | string
  icon?: Html
  variant?: 'default' | 'destructive'
  isDisabled?: boolean
  group?: string
  separatorBefore?: boolean
}>

/** Flattens astryx's action/divider/section option list into crease
   dropdown-menu items (labels) and their configs: dividers become
   `separatorBefore`, section titles become `group`. */
export const flattenOptions = (
  options: ReadonlyArray<MoreMenuOption>,
): ReadonlyArray<Readonly<{ item: string; config: MoreMenuItemConfig }>> => {
  const flat: Array<{ item: string; config: MoreMenuItemConfig }> = []
  let pendingDivider = false
  const pushAction = (
    action: MoreMenuAction,
    group: string | undefined,
  ): void => {
    flat.push({
      item: action.label,
      config: {
        label: action.label,
        ...(action.icon === undefined ? {} : { icon: action.icon }),
        ...(action.variant === undefined ? {} : { variant: action.variant }),
        ...(action.isDisabled === true ? { isDisabled: true } : {}),
        ...(group === undefined ? {} : { group }),
        ...(pendingDivider ? { separatorBefore: true } : {}),
      },
    })
    pendingDivider = false
  }
  options.forEach(option => {
    if (option.type === 'divider') {
      pendingDivider = true
      return
    }
    if (option.type === 'section') {
      option.items.forEach(action => pushAction(action, option.title))
      return
    }
    pushAction(option, undefined)
  })
  return flat
}
