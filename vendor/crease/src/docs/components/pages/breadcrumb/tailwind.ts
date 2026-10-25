import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  breadcrumbFixtures,
  type BreadcrumbFixture,
  type BreadcrumbItemSpec,
} from '@/docs/components/pages/breadcrumb/shared'
import * as Breadcrumb from '@/ui/breadcrumb'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Icon from '@/lib/icon'

const PreviewMessage = defineMessageUnion({
  GotMenuMessage: { message: DropdownMenu.Message },
})
type PreviewMessage = typeof PreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('breadcrumb'),
  menu: DropdownMenu.Model,
})
type PreviewModel = typeof PreviewModel.Type

const menuView = (
  model: PreviewModel,
  item: BreadcrumbItemSpec,
  fixture: BreadcrumbFixture,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  DropdownMenu.dropdownMenu(
    {
      model: model.menu,
      toParentMessage: message => PreviewMessage.GotMenuMessage({ message }),
      trigger:
        item.kind === 'ellipsisMenu'
          ? Breadcrumb.breadcrumbEllipsis({}, h)
          : h.span(
              [h.Class('flex items-center gap-1')],
              [
                item.kind === 'dropdown' ? item.label : '',
                Icon.icon('chevron-down', { class: 'size-3.5' }, h),
              ],
            ),
      ...(item.kind === 'ellipsisMenu'
        ? {
            triggerClass:
              'inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground',
          }
        : {}),
      items: fixture.menuItems ?? [],
      itemToConfig: entry => ({ label: entry }),
      ...(fixture.rtl === true ? { direction: 'rtl' as const } : {}),
    },
    h,
  )

const itemContentView = (
  model: PreviewModel,
  item: BreadcrumbItemSpec,
  fixture: BreadcrumbFixture,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  switch (item.kind) {
    case 'link':
      return Breadcrumb.breadcrumbLink(
        { href: item.href, children: [item.label] },
        h,
      )
    case 'page':
      return Breadcrumb.breadcrumbPage({ children: [item.label] }, h)
    case 'ellipsis':
      return Breadcrumb.breadcrumbEllipsis({}, h)
    case 'ellipsisMenu':
    case 'dropdown':
      return menuView(model, item, fixture, h)
  }
}

const breadcrumbView = (
  fixture: BreadcrumbFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const children: Array<Html> = []
  fixture.items.forEach((item, index) => {
    if (index > 0) {
      children.push(
        Breadcrumb.breadcrumbSeparator(
          {
            ...(fixture.separator === 'dot'
              ? { children: [Icon.icon('dot', {}, h)] }
              : {}),
            ...(fixture.rtl === true ? { direction: 'rtl' as const } : {}),
          },
          h,
        ),
      )
    }
    children.push(
      Breadcrumb.breadcrumbItem(
        { children: [itemContentView(model, item, fixture, h)] },
        h,
      ),
    )
  })
  return Breadcrumb.breadcrumb(
    {
      ...(fixture.rtl === true ? { direction: 'rtl' as const } : {}),
      children: [Breadcrumb.breadcrumbList({ children }, h)],
    },
    h,
  )
}

export const breadcrumbTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => ({
    _docsPage: 'breadcrumb',
    menu: DropdownMenu.init({
      id: `docs-breadcrumb-${String(index)}`,
      isAnimated: false,
    }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotMenuMessage': {
        const result = DropdownMenu.update(model.menu, message.message)
        return {
          model: { ...model, menu: result.model },
          commands: Command.mapMessages(result.commands, next =>
            PreviewMessage.GotMenuMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    breadcrumbView(
      breadcrumbFixtures[index] ?? breadcrumbFixtures[0],
      model,
      h,
    ),
})
