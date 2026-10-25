import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { flattenOptions, type MoreMenuOption } from '@/lib/more-menu'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariants } from '@/ui/button'
import { dropdownMenu } from '@/ui/dropdown-menu'
import type {
  DropdownMenuAlign,
  DropdownMenuSide,
  Model,
  Message,
} from '@/ui/dropdown-menu'

export { Model, Message, OutMessage, init, update } from '@/ui/dropdown-menu'
export { flattenOptions } from '@/lib/more-menu'
export type { MoreMenuAction, MoreMenuOption } from '@/lib/more-menu'

/* Ported from Meta Astryx MoreMenu.tsx — an overflow menu with a three-dot
   icon trigger: a thin wrapper over dropdown-menu with icon-only button
   defaults and astryx's action/divider/section option shapes flattened into
   the crease item list.
   astryx's `presentation` prop (adaptive bottom-sheet on compact viewports)
   has no crease primitive — the menu always anchors as a popover.
   astryx's i18n default label is 'More options' (hardcoded here).
   astryx button sizes are 28/32/36px; crease icon sizes are 24/32/36/40 —
   sm→'icon-sm' (32px), md→'icon-sm', lg→'icon' (36px). */

export type MoreMenuProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  items: ReadonlyArray<MoreMenuOption>
  /** Trigger aria-label — the button is always icon-only.
      @default 'More options' */
  label?: string
  /** @default 'ghost' */
  variant?: NonNullable<ButtonVariants['variant']>
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** Override the default three-dot icon. */
  icon?: Html
  isDisabled?: boolean
  /** Menu placement — forwarded to dropdown-menu.
      @default 'bottom' */
  side?: DropdownMenuSide
  /** @default 'start' */
  align?: DropdownMenuAlign
  class?: string
}>

const ICON_SIZE: Readonly<
  Record<'sm' | 'md' | 'lg', NonNullable<ButtonVariants['size']>>
> = {
  sm: 'icon-sm',
  md: 'icon-sm',
  lg: 'icon',
}

export const moreMenu = <Msg>(
  props: MoreMenuProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const flat = flattenOptions(props.items)
  const configByItem = new Map(flat.map(({ item, config }) => [item, config]))
  return dropdownMenu(
    {
      model: props.model,
      toParentMessage: props.toParentMessage,
      trigger: props.icon ?? Icon.icon('ellipsis', { class: 'size-4' }, h),
      triggerClass: cn(
        buttonVariants({
          variant: props.variant ?? 'ghost',
          size: ICON_SIZE[props.size ?? 'md'],
        }),
        props.class,
      ),
      triggerAriaLabel: props.label ?? 'More options',
      ...(props.isDisabled === true ? { triggerIsDisabled: true } : {}),
      items: flat.map(({ item }) => item),
      itemToConfig: item => configByItem.get(item) ?? { label: item },
      side: props.side ?? 'bottom',
      align: props.align ?? 'start',
      ariaLabel: props.label ?? 'More options',
    },
    h,
  )
}
