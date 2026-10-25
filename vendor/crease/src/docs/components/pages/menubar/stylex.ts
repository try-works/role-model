import { previewLayout } from '@/docs/components/preview-layout.stylex'
import * as stylex from '@stylexjs/stylex'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  checkboxField,
  menubarFixtures,
  menubarSpecs,
  radioField,
  type MarkerSpecItem,
} from '@/docs/components/pages/menubar/shared'
import * as Icon from '@/lib/icon'
import type * as DropdownMenu from '@/stylex/dropdown-menu'
import * as Menubar from '@/stylex/menubar'
import { className } from '@/stylex/style'

const styles = stylex.create({
  menubar: { width: '18rem' },
  content44: { width: '11rem' },
  content64: { width: '16rem' },
})

const sx = (style: stylex.StaticStyles): string => className(style)

interface MenubarPreviewShape {
  readonly file: DropdownMenu.Model
  readonly edit: DropdownMenu.Model
  readonly view: DropdownMenu.Model
  readonly profiles: DropdownMenu.Model
  readonly format: DropdownMenu.Model
  readonly theme: DropdownMenu.Model
  readonly more: DropdownMenu.Model
  readonly menubar: Menubar.Model
  readonly selectedMenu: Option.Option<string>
  readonly checkedBookmarksBar: boolean
  readonly checkedFullUrls: boolean
  readonly checkedStrikethrough: boolean
  readonly checkedCode: boolean
  readonly checkedSuperscript: boolean
  readonly radioUser: string
  readonly radioTheme: string
}

const send = <Msg>(
  onMessageJson: (messageJson: string) => Msg,
  tag: string,
  fields?: Readonly<Record<string, unknown>>,
): Msg => onMessageJson(JSON.stringify({ _tag: tag, ...(fields ?? {}) }))

const checkedValue = (
  item: MarkerSpecItem,
  model: MenubarPreviewShape,
): boolean => {
  const field = checkboxField[item.id]
  if (item.kind === 'checkbox' && field !== undefined) {
    return model[field]
  }
  const rfield = radioField[item.id]
  if (item.kind === 'radio' && rfield !== undefined) {
    return model[rfield] === item.id
  }
  return false
}

const configFor = <Msg>(
  item: MarkerSpecItem,
  model: MenubarPreviewShape,
  h: HtmlBuilder<Msg>,
): DropdownMenu.DropdownMenuItemConfig<string> => ({
  label: item.label,
  ...(item.icon === undefined ? {} : { icon: Icon.icon(item.icon, {}, h) }),
  ...(item.shortcut === undefined ? {} : { shortcut: item.shortcut }),
  ...(item.kind === undefined ? {} : { kind: item.kind }),
  ...(item.kind === undefined ? {} : { isChecked: checkedValue(item, model) }),
  ...(item.inset === true ? { isInset: true } : {}),
  ...(item.disabled === true ? { isDisabled: true } : {}),
  ...(item.destructive === true ? { variant: 'destructive' as const } : {}),
  ...(item.separatorBefore === true ? { separatorBefore: true } : {}),
  ...(item.submenu === undefined
    ? {}
    : {
        submenu: {
          items: item.submenu.map(child => child.id),
          itemToConfig: (
            child: string,
          ): DropdownMenu.DropdownMenuItemConfig<string> =>
            configFor(
              item.submenu?.find(candidate => candidate.id === child) ?? {
                id: child,
                label: child,
              },
              model,
              h,
            ),
        },
      }),
})

const menubarSxView = <Msg>(
  index: number,
  model: MenubarPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = menubarFixtures[index] ?? menubarFixtures[0]
  const spec = menubarSpecs[fixture.kind]
  return h.div(
    [h.Class(className(previewLayout.centered))],
    [
      Menubar.menubar<string, Msg>(
        {
          model: model.menubar,
          toParentMessage: message =>
            send(onMessageJson, 'GotMenubarMessage', { message }),
          ariaLabel: 'Application menu',
          layoutStyle: styles.menubar,
          ...(fixture.direction === 'rtl' ? { direction: 'rtl' as const } : {}),
          menus: spec.map(menu => ({
            id: `sx-menu-${menu.target}-${String(index)}`,
            label: menu.label,
            isSelected: Option.contains(model.selectedMenu, menu.target),
            onSelect: send(onMessageJson, 'SelectedMenubarMenu', {
              target: menu.target,
            }),
            model: model[menu.target],
            ...(menu.contentWidth === undefined
              ? {}
              : {
                  contentLayoutStyle:
                    menu.contentWidth === '11rem'
                      ? styles.content44
                      : styles.content64,
                }),
            toParentMessage: (message: DropdownMenu.Message) =>
              send(onMessageJson, 'GotMenuMessage', {
                target: menu.target,
                message,
              }),
            items: menu.items.map(item => item.id),
            itemToConfig: item =>
              configFor(
                menu.items.find(candidate => candidate.id === item) ?? {
                  id: item,
                  label: item,
                },
                model,
                h,
              ),
          })),
        },
        h,
      ),
    ],
  )
}

export const menubarStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => menubarSxView(exampleIndex, model as MenubarPreviewShape, onMessageJson, h)
