import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export const navigationMenuFixtures = [
  {
    title: 'Semantic links',
    description:
      'Plain site navigation needs no Foldkit child model; the active route supplies aria-current.',
  },
  {
    title: 'Popover disclosure',
    description:
      'A rich navigation disclosure uses an explicit Popover child integration rather than hidden component-local state.',
  },
  {
    title: 'Responsive fallback',
    description:
      'A finite responsive layout stacks the list on narrow viewports without moving route data into widget state.',
  },
  {
    title: 'RTL',
    description:
      'A scroll layout contains long navigation sets and preserves RTL reading direction.',
  },
] as const

const staticSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  exampleIndex: 0 | 2 | 3,
): string => {
  const config =
    exampleIndex === 0
      ? {
          name: 'Semantic links',
          layout: '',
          direction: '',
          labels: "['Home', 'Components', 'Docs']",
          active: ', index) =>',
          activeProp: ', isActive: index === 0',
        }
      : exampleIndex === 2
        ? {
            name: 'Responsive fallback',
            layout: ", layout: 'responsive'",
            direction: '',
            labels: "['Home', 'Components', 'Docs']",
            active: ') =>',
            activeProp: '',
          }
        : {
            name: 'RTL',
            layout: ", layout: 'scroll'",
            direction: ", direction: 'rtl'",
            labels:
              "['Home', 'Products', 'Solutions', 'Customers', 'Resources', 'Company', 'Docs']",
            active: ') =>',
            activeProp: '',
          }
  return staticComponentApplication({
    componentName: 'NavigationMenu',
    componentSlug: 'navigation-menu',
    renderer,
    exampleName: config.name,
    viewBody: `NavigationMenu.navigationMenu({ ariaLabel: 'Primary'${config.direction}${config.layout}, children: [
  NavigationMenu.navigationMenuList({${config.layout === '' ? '' : " layout: '" + (exampleIndex === 2 ? 'responsive' : 'scroll') + "',"} children: ${config.labels}.map((label${config.active}
    NavigationMenu.navigationMenuItem({ children: [
      NavigationMenu.navigationMenuLink({ href: \`/\${label.toLowerCase()}\`${config.activeProp}, children: [label] }, h),
    ] }, h),
  ) }, h),
] }, h)`,
  })
}

const disclosureSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: 'Navigation Menu — Disclosure',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${isStyleX ? "\nimport * as stylex from '@stylexjs/stylex'\n" : ''}
import * as NavigationMenu from '@/${isStyleX ? 'stylex' : 'ui'}/navigation-menu'
import * as Popover from '@/${isStyleX ? 'stylex' : 'ui'}/popover'${isStyleX ? "\n\nconst styles = stylex.create({\n  list: { display: 'grid', gap: '0.25rem' },\n  link: { borderRadius: '0.25rem', display: 'block', padding: '0.5rem' },\n})" : ''}`,
    model: `export const Model = S.Struct({ products: Popover.Model })
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  'GotNavigationProductsMessage': { message: Popover.Message },
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { products: Popover.init({ id: 'products-navigation', isAnimated: true, contentFocus: true }) } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotNavigationProductsMessage': {
      const productsOp__ = Popover.update(model.products, message.message);
    const products = productsOp__.model;
    const commands = productsOp__.commands ?? [];
      return { model: { ...model, products }, commands: Command.mapMessages(commands, next => Message['GotNavigationProductsMessage']({ message: next })) }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Navigation Menu — Disclosure',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    NavigationMenu.navigationMenu({ ariaLabel: 'Primary', children: [
      NavigationMenu.navigationMenuList({ children: [
        NavigationMenu.navigationMenuItem({ children: [NavigationMenu.navigationMenuLink({ href: '/', isActive: true, children: ['Home'] }, h)] }, h),
        NavigationMenu.navigationMenuItem({ children: [NavigationMenu.navigationMenuDisclosure({
          model: model.products,
          toParentMessage: message => Message['GotNavigationProductsMessage']({ message }),
          label: 'Products',
          pointerIntent: 'hover-and-press',
          content: h.ul([h.Class(${isStyleX ? "stylex.props(styles.list).className ?? ''" : "'grid gap-1'"} )], [
            h.li([], [h.a([h.Href('/products/analytics'), h.Class(${isStyleX ? "stylex.props(styles.link).className ?? ''" : "'block rounded p-2 hover:bg-accent'"} )], ['Analytics'])]),
            h.li([], [h.a([h.Href('/products/reports'), h.Class(${isStyleX ? "stylex.props(styles.link).className ?? ''" : "'block rounded p-2 hover:bg-accent'"} )], ['Reports'])]),
          ]),
        }, h)] }, h),
      ] }, h),
    ] }, h),
  ]),
})`,
  })
}

const navigationMenuExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> => [
  { ...navigationMenuFixtures[0], code: staticSource(renderer, 0) },
  { ...navigationMenuFixtures[1], code: disclosureSource(renderer) },
  { ...navigationMenuFixtures[2], code: staticSource(renderer, 2) },
  { ...navigationMenuFixtures[3], code: staticSource(renderer, 3) },
]

export const navigationMenuExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, navigationMenuExamplesFor(renderer))
