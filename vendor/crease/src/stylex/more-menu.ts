import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { flattenOptions } from '@/lib/more-menu'
import type { MoreMenuOption } from '@/lib/more-menu'
import type {
  ButtonSize,
  ButtonVariant,
  ComponentLayoutStyle,
} from './contracts'
import { className } from './style'
import { dropdownMenu } from './dropdown-menu'
import type {
  DropdownMenuAlign,
  DropdownMenuSide,
  Model,
  Message,
} from './dropdown-menu'

export { Model, Message, OutMessage, init, update } from './dropdown-menu'
export { flattenOptions } from '@/lib/more-menu'
export type { MoreMenuAction, MoreMenuOption } from '@/lib/more-menu'

/* Ported from Meta Astryx MoreMenu.tsx — StyleX renderer. See
   src/ui/more-menu.ts for the port contract + decision notes. */

export type MoreMenuProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  items: ReadonlyArray<MoreMenuOption>
  label?: string
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: Html
  isDisabled?: boolean
  side?: DropdownMenuSide
  align?: DropdownMenuAlign
  layoutStyle?: ComponentLayoutStyle
}>

const ICON_SIZE: Readonly<Record<'sm' | 'md' | 'lg', ButtonSize>> = {
  sm: 'icon-sm',
  md: 'icon-sm',
  lg: 'icon',
}

const triggerStyles = stylex.create({
  icon: {
    height: '1rem',
    width: '1rem',
  },
})

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
      trigger:
        props.icon ??
        Icon.icon('ellipsis', { class: className(triggerStyles.icon) }, h),
      triggerButtonVariant: props.variant ?? 'ghost',
      triggerButtonSize: ICON_SIZE[props.size ?? 'md'],
      triggerAriaLabel: props.label ?? 'More options',
      ...(props.isDisabled === true ? { triggerIsDisabled: true } : {}),
      ...(props.layoutStyle === undefined
        ? {}
        : { triggerLayoutStyle: props.layoutStyle }),
      items: flat.map(({ item }) => item),
      itemToConfig: item => configByItem.get(item) ?? { label: item },
      side: props.side ?? 'bottom',
      align: props.align ?? 'start',
      ariaLabel: props.label ?? 'More options',
    },
    h,
  )
}
