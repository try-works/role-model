import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export type BreadcrumbItemSpec =
  | Readonly<{ kind: 'link'; label: string; href: string }>
  | Readonly<{ kind: 'page'; label: string }>
  /** Bare BreadcrumbEllipsis item (upstream Collapsed example). */
  | Readonly<{ kind: 'ellipsis' }>
  /** Ellipsis inside a dropdown trigger (upstream hero demo). */
  | Readonly<{ kind: 'ellipsisMenu' }>
  /** Text label + chevron dropdown trigger (upstream Dropdown example). */
  | Readonly<{ kind: 'dropdown'; label: string }>

export type BreadcrumbFixture = Readonly<{
  kind:
    | 'demo'
    | 'basic'
    | 'separator'
    | 'dropdown'
    | 'collapsed'
    | 'link'
    | 'rtl'
  title: string
  description: string
  /** Rendered only as the page hero, not as a named example section. */
  heroOnly?: boolean
  /** Default chevron separator or a custom dot icon. */
  separator: 'chevron' | 'dot'
  /** dir="rtl" breadcrumb + mirrored separators + rtl dropdown content. */
  rtl?: boolean
  /** Items rendered by ellipsisMenu/dropdown triggers; presence enables the menu model. */
  menuItems?: ReadonlyArray<string>
  items: ReadonlyArray<BreadcrumbItemSpec>
}>

const MENU_ITEMS_EN = ['Documentation', 'Themes', 'GitHub']
const MENU_ITEMS_AR = ['التوثيق', 'السمات', 'جيت هاب']

export const breadcrumbFixtures: Readonly<
  [BreadcrumbFixture, ...Array<BreadcrumbFixture>]
> = [
  {
    kind: 'demo',
    title: 'Demo',
    description:
      'A breadcrumb trail with an ellipsis dropdown of collapsed levels.',
    heroOnly: true,
    separator: 'chevron',
    menuItems: MENU_ITEMS_EN,
    items: [
      { kind: 'link', label: 'Home', href: '#' },
      { kind: 'ellipsisMenu' },
      { kind: 'link', label: 'Components', href: '#' },
      { kind: 'page', label: 'Breadcrumb' },
    ],
  },
  {
    kind: 'basic',
    title: 'Basic',
    description: 'Linked ancestors and a non-link current page.',
    separator: 'chevron',
    items: [
      { kind: 'link', label: 'Home', href: '#' },
      { kind: 'link', label: 'Components', href: '#' },
      { kind: 'page', label: 'Breadcrumb' },
    ],
  },
  {
    kind: 'separator',
    title: 'Custom separator',
    description:
      'Pass an icon as BreadcrumbSeparator children to replace the chevron.',
    separator: 'dot',
    items: [
      { kind: 'link', label: 'Home', href: '/' },
      { kind: 'link', label: 'Components', href: '/components' },
      { kind: 'page', label: 'Breadcrumb' },
    ],
  },
  {
    kind: 'dropdown',
    title: 'Dropdown',
    description:
      'A BreadcrumbItem can host a dropdown of sibling destinations.',
    separator: 'dot',
    menuItems: MENU_ITEMS_EN,
    items: [
      { kind: 'link', label: 'Home', href: '/' },
      { kind: 'dropdown', label: 'Components' },
      { kind: 'page', label: 'Breadcrumb' },
    ],
  },
  {
    kind: 'collapsed',
    title: 'Collapsed',
    description: 'BreadcrumbEllipsis stands in for omitted middle levels.',
    separator: 'chevron',
    items: [
      { kind: 'link', label: 'Home', href: '/' },
      { kind: 'ellipsis' },
      { kind: 'link', label: 'Components', href: '/docs/components' },
      { kind: 'page', label: 'Breadcrumb' },
    ],
  },
  {
    kind: 'link',
    title: 'Link component',
    description: 'Ancestor levels are rendered through breadcrumbLink anchors.',
    separator: 'chevron',
    items: [
      { kind: 'link', label: 'Home', href: '/' },
      { kind: 'link', label: 'Components', href: '/components' },
      { kind: 'page', label: 'Breadcrumb' },
    ],
  },
  {
    kind: 'rtl',
    title: 'RTL',
    description: 'The same composition laid out right-to-left.',
    separator: 'dot',
    rtl: true,
    menuItems: MENU_ITEMS_AR,
    items: [
      { kind: 'link', label: 'الرئيسية', href: '/' },
      { kind: 'dropdown', label: 'المكونات' },
      { kind: 'page', label: 'مسار التنقل' },
    ],
  },
]

const esc = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

export const needsMenu = (fixture: BreadcrumbFixture): boolean =>
  fixture.items.some(
    item => item.kind === 'dropdown' || item.kind === 'ellipsisMenu',
  )

const menuCallSource = (
  item: BreadcrumbItemSpec,
  fixture: BreadcrumbFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const trigger =
    item.kind === 'ellipsisMenu'
      ? `Breadcrumb.breadcrumbEllipsis({}, h)`
      : renderer !== 'tailwind'
        ? `h.span([h.Class(className(styles.dropdownTrigger))], [
              '${esc(item.kind === 'dropdown' ? item.label : '')}',
              Icon.icon('chevron-down', { class: className(styles.chevron) }, h),
            ])`
        : `h.span(
              [h.Class('flex items-center gap-1')],
              ['${esc(item.kind === 'dropdown' ? item.label : '')}', Icon.icon('chevron-down', { class: 'size-3.5' }, h)],
            )`
  const triggerProps =
    item.kind === 'ellipsisMenu'
      ? renderer !== 'tailwind'
        ? `\n            triggerButtonVariant: 'ghost',\n            triggerButtonSize: 'icon-sm',`
        : `\n            triggerClass: 'inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground',`
      : ''
  const direction =
    fixture.rtl === true ? `\n            direction: 'rtl',` : ''
  return `DropdownMenu.dropdownMenu({
            model: model.menu,
            toParentMessage: message =>
              Message['GotMenuMessage']({ message }),
            trigger: ${trigger},${triggerProps}
            items: menuItems,
            itemToConfig: item => ({ label: item }),${direction}
          }, h)`
}

const itemContentSource = (
  item: BreadcrumbItemSpec,
  fixture: BreadcrumbFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (item.kind) {
    case 'link':
      return `Breadcrumb.breadcrumbLink({
              href: '${esc(item.href)}',
              children: ['${esc(item.label)}'],
            }, h)`
    case 'page':
      return `Breadcrumb.breadcrumbPage({ children: ['${esc(item.label)}'] }, h)`
    case 'ellipsis':
      return `Breadcrumb.breadcrumbEllipsis({}, h)`
    case 'ellipsisMenu':
    case 'dropdown':
      return menuCallSource(item, fixture, renderer)
  }
}

const separatorSource = (
  fixture: BreadcrumbFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const children =
    fixture.separator === 'dot' ? `children: [Icon.icon('dot', {}, h)], ` : ''
  const direction = fixture.rtl === true ? `direction: 'rtl', ` : ''
  return `Breadcrumb.breadcrumbSeparator({ ${children}${direction}}, h)`
}

const viewBodySource = (
  fixture: BreadcrumbFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const separator = separatorSource(fixture, renderer)
  const children = fixture.items
    .map(
      item => `Breadcrumb.breadcrumbItem({
            children: [
              ${itemContentSource(item, fixture, renderer)},
            ],
          }, h)`,
    )
    .join(`,\n          ${separator},`)
  const direction = fixture.rtl === true ? `\n      direction: 'rtl',` : ''
  return `Breadcrumb.breadcrumb({${direction}
      children: [
        Breadcrumb.breadcrumbList({
          children: [
            ${children},
          ],
        }, h),
      ],
    }, h)`
}

const usesIcon = (fixture: BreadcrumbFixture): boolean =>
  fixture.separator === 'dot' ||
  fixture.items.some(item => item.kind === 'dropdown')

const componentImports = (
  fixture: BreadcrumbFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const stylexBits =
    renderer !== 'tailwind'
      ? `import { className } from '@/stylex/style'
${
  fixture.items.some(item => item.kind === 'dropdown')
    ? `
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  chevron: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  dropdownTrigger: { alignItems: 'center', display: 'flex', gap: '0.25rem' },
})
`
    : ''
}`
      : ''
  return `${stylexBits}${needsMenu(fixture) ? `import * as DropdownMenu from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/dropdown-menu'\n` : ''}${usesIcon(fixture) ? `import * as Icon from '@/lib/icon'` : ''}`
}

const source = (
  fixture: BreadcrumbFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const viewBody = viewBodySource(fixture, renderer)
  const imports = componentImports(fixture, renderer)
  if (!needsMenu(fixture)) {
    return staticComponentApplication({
      componentName: 'Breadcrumb',
      componentSlug: 'breadcrumb',
      renderer,
      exampleName: fixture.title,
      componentImports: imports,
      viewBody,
    })
  }
  const menuItemsSource = (fixture.menuItems ?? [])
    .map(item => `'${esc(item)}'`)
    .join(', ')
  return foldkitApplication({
    title: `Breadcrumb — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
${renderer !== 'tailwind' ? `import * as stylex from '@stylexjs/stylex'\n` : ''}
import * as Breadcrumb from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/breadcrumb'
${imports}`,
    model: `export const Model = S.Struct({
  menu: DropdownMenu.Model,
})
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  GotMenuMessage: { message: DropdownMenu.Message },
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { menu: DropdownMenu.init({ id: 'breadcrumb-menu' }) },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotMenuMessage': {
      const result = DropdownMenu.update(model.menu, message.message)
      return {
        model: { ...model, menu: result.model },
        commands: Command.mapMessages(
          result.commands,
          next => Message['GotMenuMessage']({ message: next }),
        ),
      }
    }
  }
}`,
    view: `const menuItems = [${menuItemsSource}] as const

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Breadcrumb — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${viewBody},
  ]),
})`,
  })
}

const breadcrumbExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  breadcrumbFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: source(fixture, renderer),
  }))

export const breadcrumbExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, breadcrumbExamplesFor(renderer))
