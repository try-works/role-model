import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  buttonFixtures,
  buttonGroupItemIcon,
  buttonGroupItemLabel,
  buttonGroupLabelItems,
  buttonGroupMenuItems,
  buttonSizeTiers,
  type ButtonGroupMenuItem,
  type ButtonFixture,
  type ButtonItemSpec,
} from '@/docs/components/pages/button/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import { buttonVariants } from '@/ui/button'
import * as ButtonGroup from '@/ui/button-group'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Spinner from '@/ui/spinner'

const GotMenuMessage = defineMessageUnion({
  GotMenuMessage: { message: DropdownMenu.Message },
})
type GotMenuMessage = typeof GotMenuMessage.Type

const ButtonPreviewModel = S.Struct({
  _docsPage: S.Literal('button'),
  menu: DropdownMenu.Model,
  labelAs: S.Option(S.String),
})
type ButtonPreviewModel = typeof ButtonPreviewModel.Type

const itemChildren = (
  item: ButtonItemSpec,
  h: HtmlBuilder<GotMenuMessage>,
): Array<Html | string> => {
  const children: Array<Html | string> = []
  if (item.spinner === 'start')
    children.push(
      Spinner.spinner({ isDecorative: true, dataIcon: 'inline-start' }, h),
    )
  if (item.icon !== undefined && (item.iconPosition ?? 'start') === 'start')
    children.push(
      Icon.icon(
        item.icon,
        {
          dataIcon: 'inline-start',
          ...(item.iconClass === undefined ? {} : { class: item.iconClass }),
        },
        h,
      ),
    )
  if (item.label !== undefined) children.push(item.label)
  if (item.icon !== undefined && item.iconPosition === 'end')
    children.push(
      Icon.icon(
        item.icon,
        {
          dataIcon: 'inline-end',
          ...(item.iconClass === undefined ? {} : { class: item.iconClass }),
        },
        h,
      ),
    )
  if (item.spinner === 'end')
    children.push(
      Spinner.spinner({ isDecorative: true, dataIcon: 'inline-end' }, h),
    )
  return children
}

const itemHtml = (item: ButtonItemSpec, h: HtmlBuilder<GotMenuMessage>): Html =>
  Button.button(
    {
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.rounded === true ? { class: 'rounded-full' } : {}),
      ...(item.isDisabled === true ? { isDisabled: true } : {}),
      ...(item.ariaLabel === undefined ? {} : { ariaLabel: item.ariaLabel }),
      children: itemChildren(item, h),
    },
    h,
  )

const menuItemConfig =
  (labelAs: Option.Option<string>, h: HtmlBuilder<GotMenuMessage>) =>
  (
    item: ButtonGroupMenuItem,
  ): DropdownMenu.DropdownMenuItemConfig<ButtonGroupMenuItem> => {
    if (item === 'personal' || item === 'work' || item === 'other')
      return {
        label: item.charAt(0).toUpperCase() + item.slice(1),
        kind: 'radio',
      }
    const main = item as (typeof buttonGroupMenuItems)[number]
    return {
      label: buttonGroupItemLabel(main),
      icon: Icon.icon(buttonGroupItemIcon(main), {}, h),
      ...(main === 'snooze' || main === 'trash'
        ? { separatorBefore: true }
        : {}),
      ...(main === 'trash' ? { variant: 'destructive' as const } : {}),
      ...(main === 'label-as'
        ? {
            submenu: {
              items: buttonGroupLabelItems,
              itemToConfig: (label: ButtonGroupMenuItem) => ({
                label:
                  typeof label === 'string'
                    ? label.charAt(0).toUpperCase() + label.slice(1)
                    : label,
                kind: 'radio' as const,
                isChecked: Option.getOrNull(labelAs) === label,
              }),
            },
          }
        : {}),
    }
  }

const buttonGroupHtml = (
  model: ButtonPreviewModel,
  h: HtmlBuilder<GotMenuMessage>,
): Html =>
  ButtonGroup.buttonGroup(
    {
      children: [
        ButtonGroup.buttonGroup(
          {
            class: 'hidden sm:flex',
            children: [
              Button.button(
                {
                  variant: 'outline',
                  size: 'icon',
                  ariaLabel: 'Go Back',
                  children: [Icon.icon('arrow-left', {}, h)],
                },
                h,
              ),
            ],
          },
          h,
        ),
        ButtonGroup.buttonGroup(
          {
            children: [
              Button.button({ variant: 'outline', children: ['Archive'] }, h),
              Button.button({ variant: 'outline', children: ['Report'] }, h),
            ],
          },
          h,
        ),
        ButtonGroup.buttonGroup(
          {
            children: [
              Button.button({ variant: 'outline', children: ['Snooze'] }, h),
              DropdownMenu.dropdownMenu(
                {
                  model: model.menu,
                  toParentMessage: message =>
                    GotMenuMessage.GotMenuMessage({ message }),
                  trigger: Icon.icon('ellipsis', {}, h),
                  triggerClass: buttonVariants({
                    variant: 'outline',
                    size: 'icon',
                  }),
                  triggerAriaLabel: 'More options',
                  ariaLabel: 'More options',
                  items: [...buttonGroupMenuItems],
                  itemToConfig: menuItemConfig(model.labelAs, h),
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

const fixtureHtml = (
  fixture: ButtonFixture,
  model: ButtonPreviewModel,
  h: HtmlBuilder<GotMenuMessage>,
): Html => {
  switch (fixture.kind) {
    case 'link':
      return Button.buttonLink({ href: '/login', children: ['Login'] }, h)
    case 'buttonGroup':
      return buttonGroupHtml(model, h)
    case 'sizes':
      return h.div(
        [h.Class('flex flex-col items-start gap-8 sm:flex-row')],
        buttonSizeTiers.map(tier =>
          h.div(
            [h.Class('flex items-start gap-2')],
            [
              itemHtml(
                {
                  label: tier.name,
                  variant: 'outline',
                  ...(tier.size === undefined ? {} : { size: tier.size }),
                },
                h,
              ),
              itemHtml(
                {
                  variant: 'outline',
                  size: tier.iconSize,
                  icon: 'arrow-up-right',
                  ariaLabel: tier.name,
                },
                h,
              ),
            ],
          ),
        ),
      )
    case 'items': {
      const items = fixture.items.map(item => itemHtml(item, h))
      if (items.length === 1 && fixture.direction === undefined)
        return items[0] as Html
      return h.div(
        [
          ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
          h.Class('flex flex-wrap items-center gap-2'),
        ],
        items,
      )
    }
  }
}

export const buttonTailwindPreviewProgram = definePreviewProgram<
  ButtonPreviewModel,
  GotMenuMessage
>({
  Model: ButtonPreviewModel,
  Message: GotMenuMessage,
  init: index => ({
    _docsPage: 'button',
    menu: DropdownMenu.init({
      id: `docs-button-menu-${String(index)}`,
      isAnimated: false,
    }),
    labelAs: Option.some('personal'),
  }),
  update: (model, message) => {
    const result = DropdownMenu.update(model.menu, message.message)
    const selected = Option.fromNullishOr(result.outMessage)
    return {
      model: {
        ...model,
        menu: result.model,
        labelAs: Option.match(selected, {
          onNone: () => model.labelAs,
          onSome: ({ value }) =>
            (buttonGroupLabelItems as ReadonlyArray<string>).includes(value)
              ? Option.some(value)
              : model.labelAs,
        }),
      },
      commands: Command.mapMessages(result.commands, next =>
        GotMenuMessage.GotMenuMessage({ message: next }),
      ),
    }
  },
  view: (index, model, h) =>
    fixtureHtml(buttonFixtures[index] ?? buttonFixtures[0], model, h),
})
