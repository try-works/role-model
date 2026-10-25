import type { Html, HtmlBuilder } from 'foldkit/html'

import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  breadcrumbFixtures,
  type BreadcrumbFixture,
  type BreadcrumbItemSpec,
} from '@/docs/components/pages/breadcrumb/shared'
import * as Icon from '@/lib/icon'
import * as Breadcrumb from '@/stylex/breadcrumb'
import * as DropdownMenu from '@/stylex/dropdown-menu'

const styles = stylex.create({
  chevron: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  dropdownTrigger: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
  },
})

type PreviewSnapshot = Readonly<{
  menu: DropdownMenu.Model
}>

const menuView = <Msg>(
  model: PreviewSnapshot,
  item: BreadcrumbItemSpec,
  fixture: BreadcrumbFixture,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  DropdownMenu.dropdownMenu(
    {
      model: model.menu,
      toParentMessage: message =>
        onMessageJson(JSON.stringify({ _tag: 'GotMenuMessage', message })),
      trigger:
        item.kind === 'ellipsisMenu'
          ? Breadcrumb.breadcrumbEllipsis({}, h)
          : h.span(
              [h.Class(stylex.props(styles.dropdownTrigger).className ?? '')],
              [
                item.kind === 'dropdown' ? item.label : '',
                Icon.icon(
                  'chevron-down',
                  { class: stylex.props(styles.chevron).className ?? '' },
                  h,
                ),
              ],
            ),
      ...(item.kind === 'ellipsisMenu'
        ? {
            triggerButtonVariant: 'ghost' as const,
            triggerButtonSize: 'icon-sm' as const,
          }
        : {}),
      items: fixture.menuItems ?? [],
      itemToConfig: entry => ({ label: entry }),
      ...(fixture.rtl === true ? { direction: 'rtl' as const } : {}),
    },
    h,
  )

const itemContentView = <Msg>(
  model: PreviewSnapshot,
  item: BreadcrumbItemSpec,
  fixture: BreadcrumbFixture,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
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
      return menuView(model, item, fixture, onMessageJson, h)
  }
}

export const breadcrumbStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = breadcrumbFixtures[exampleIndex] ?? breadcrumbFixtures[0]
  const previewModel = model as PreviewSnapshot
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
        {
          children: [
            itemContentView(previewModel, item, fixture, onMessageJson, h),
          ],
        },
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
