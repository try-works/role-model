import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type MobileNavKind =
  | 'showcase'
  | 'basic'
  | 'endside'
  | 'notitle'
  | 'toggle'
  | 'togglebasic'

export type NavItemSpec = Readonly<{
  label: string
  icon?: string
  href: string
  isSelected?: boolean
}>

export type NavSectionSpec = Readonly<{
  title: string
  items: ReadonlyArray<NavItemSpec>
}>

export type MobileNavFixture = Readonly<{
  title: string
  description?: string
  kind: MobileNavKind
  trigger: 'icon' | 'labeled' | 'toggle' | 'togglelabeled'
  navTitle?: string
  side?: 'start' | 'end' | 'auto'
  sections: ReadonlyArray<NavSectionSpec>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/{MobileNav,MobileNavToggle} —
   same sections/items/labels. astryx's heroicons map to the closest lucide
   glyphs; SideNavSection/SideNavItem map to creaseui Sidebar primitives. */
export const mobileNavFixtures: ReadonlyArray<MobileNavFixture> = [
  {
    title: 'Mobile Nav',
    kind: 'showcase',
    trigger: 'icon',
    navTitle: 'Navigation',
    sections: [
      {
        title: 'Main',
        items: [
          { label: 'Dashboard', href: '/dashboard', isSelected: true },
          { label: 'Projects', href: '/projects' },
          { label: 'Analytics', href: '/analytics' },
        ],
      },
      {
        title: 'Settings',
        items: [
          { label: 'General', href: '/settings' },
          { label: 'Team', href: '/team' },
        ],
      },
    ],
  },
  {
    title: 'MobileNav — Basic Drawer',
    description:
      'Mobile navigation drawer with sectioned nav items triggered by a menu button.',
    kind: 'basic',
    trigger: 'icon',
    navTitle: 'Navigation',
    sections: [
      {
        title: 'Main',
        items: [
          {
            label: 'Dashboard',
            icon: 'house',
            href: '/dashboard',
            isSelected: true,
          },
          { label: 'Projects', icon: 'folder', href: '/projects' },
          { label: 'Analytics', icon: 'chartBarStacked', href: '/analytics' },
        ],
      },
      {
        title: 'Settings',
        items: [
          { label: 'General', icon: 'settings', href: '/settings' },
          { label: 'Team', icon: 'users', href: '/team' },
        ],
      },
    ],
  },
  {
    title: 'MobileNav — End Side Drawer',
    description:
      'Navigation drawer that slides in from the right side of the screen.',
    kind: 'endside',
    trigger: 'labeled',
    side: 'end',
    navTitle: 'Settings',
    sections: [
      {
        title: 'Settings',
        items: [
          { label: 'General', icon: 'settings', href: '/settings' },
          { label: 'Team', icon: 'users', href: '/team' },
        ],
      },
    ],
  },
  {
    title: 'MobileNav — Without Title',
    description: 'Mobile navigation drawer without a title header.',
    kind: 'notitle',
    trigger: 'icon',
    sections: [
      {
        title: 'Main',
        items: [
          {
            label: 'Dashboard',
            icon: 'house',
            href: '/dashboard',
            isSelected: true,
          },
          { label: 'Projects', icon: 'folder', href: '/projects' },
        ],
      },
    ],
  },
  {
    title: 'Mobile Nav Toggle',
    description:
      'Demonstrates MobileNavToggle as a standalone hamburger button for opening the mobile navigation drawer.',
    kind: 'toggle',
    trigger: 'toggle',
    navTitle: 'Navigation',
    sections: [
      {
        title: 'Pages',
        items: [
          { label: 'Home', href: '#', isSelected: true },
          { label: 'Settings', href: '#' },
        ],
      },
    ],
  },
  {
    title: 'MobileNavToggle — Basic',
    description:
      'A nav toggle with a custom icon and accessible label instead of the default hamburger.',
    kind: 'togglebasic',
    trigger: 'togglelabeled',
    navTitle: 'Navigation',
    sections: [
      {
        title: 'Pages',
        items: [
          { label: 'Home', href: '#', isSelected: true },
          { label: 'Settings', href: '#' },
        ],
      },
    ],
  },
]

const emitStyles = `const styles = stylex.create({
  main: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  headerRow: { alignItems: 'center', display: 'flex', gap: '0.75rem' },
  pageTitle: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 700 },
  navContent: { display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem' },
  navIcon: { height: '1rem', width: '1rem' },
})`

const emitSections = (fixture: MobileNavFixture, isStyleX: boolean): string => {
  const iconOf = (icon: string): string =>
    isStyleX
      ? `Icon.${icon}({ class: className(styles.navIcon) }, h)`
      : `Icon.${icon}({ class: 'size-4' }, h)`
  const items = fixture.sections
    .map(
      section => `    Sidebar.sidebarGroup({ children: [
      Sidebar.sidebarGroupLabel({ children: ['${section.title}'] }, h),
      Sidebar.sidebarGroupContent({ children: [
        Sidebar.sidebarMenu({ children: [
${section.items
  .map(
    item => `          Sidebar.sidebarMenuItem({ children: [
            Sidebar.sidebarMenuButton({ href: '${item.href}'${item.isSelected === true ? ', isActive: true' : ''}, children: [${
              item.icon === undefined
                ? `'${item.label}'`
                : `${iconOf(item.icon)}, '${item.label}'`
            }] }, h),
          ] }, h),`,
  )
  .join('\n')}
        ] }, h),
      ] }, h),
    ] }, h),`,
    )
    .join('\n')
  return `h.div([h.Class(${isStyleX ? 'className(styles.navContent)' : `'flex flex-col gap-2 p-2'`})], [\n${items}\n  ])`
}

const emitTrigger = (fixture: MobileNavFixture, isStyleX: boolean): string => {
  const icon = isStyleX
    ? `Icon.menu({ class: className(styles.navIcon) }, h)`
    : `Icon.menu({ class: 'size-5' }, h)`
  switch (fixture.trigger) {
    case 'icon':
      return `Button.button({ variant: 'ghost', size: 'icon', ariaLabel: 'Open Navigation', onClick: ClickedOpenNav(), children: [${icon}] }, h)`
    case 'labeled':
      return `Button.button({ variant: 'default', onClick: ClickedOpenNav(), children: ['Open from Right'] }, h)`
    case 'toggle':
      return `h.div([h.Class(${isStyleX ? 'className(styles.headerRow)' : `'flex items-center gap-3'`})], [
    MobileNav.mobileNavToggle({ controls: model.nav.dialog.id, isExpanded: model.nav.dialog.isOpen, message: ClickedOpenNav() }, h),
    h.p([h.Class(${isStyleX ? 'className(styles.pageTitle)' : `'text-base font-bold'`})], ['Page title']),
  ])`
    case 'togglelabeled':
      return `h.div([h.Class(${isStyleX ? 'className(styles.headerRow)' : `'flex items-center gap-3'`})], [
    MobileNav.mobileNavToggle({ controls: model.nav.dialog.id, isExpanded: model.nav.dialog.isOpen, message: ClickedOpenNav(), label: 'Open menu' }, h),
    h.p([h.Class(${isStyleX ? 'className(styles.pageTitle)' : `'text-base font-bold'`})], ['Page title']),
  ])`
  }
}

const source = (
  fixture: MobileNavFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const u = isStyleX ? 'stylex' : 'ui'
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const usesIcons =
    fixture.trigger === 'icon' ||
    fixture.sections.some(section =>
      section.items.some(item => item.icon !== undefined),
    )
  const imports = `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${isStyleX ? "\nimport * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n" : ''}import * as MobileNav from '@/${u}/mobile-nav'
import * as Sidebar from '@/${u}/sidebar'
${fixture.trigger === 'icon' || fixture.trigger === 'labeled' ? `import * as Button from '@/${u}/button'` : ''}
${usesIcons ? "import * as Icon from '@/lib/icon'" : ''}${isStyleX ? `\n\n${emitStyles}` : ''}`
  const init =
    fixture.side === 'end'
      ? `export const init = (): Update.Return<Model, Message> => ({ model: { nav: MobileNav.init({ id: 'mobile-nav', side: 'end' }) } })`
      : `export const init = (): Update.Return<Model, Message> => ({ model: { nav: MobileNav.init({ id: 'mobile-nav' }) } })`
  const nav = `MobileNav.mobileNav({
    model: model.nav,
    toParentMessage: message => GotNavMessage({ message }),${fixture.navTitle === undefined ? '' : `\n    title: '${fixture.navTitle}',`}
    content: ${emitSections(fixture, isStyleX)},
  }, h)`
  return foldkitApplication({
    title: `Mobile Nav — ${fixture.title}`,
    imports,
    model: `export const Model = S.Struct({ nav: MobileNav.Model })
export type Model = typeof Model.Type`,
    messages: `export const ClickedOpenNav = taggedStruct('ClickedOpenNav${tag}');
export const GotNavMessage = taggedStruct('GotNavMessage${tag}', { message: MobileNav.Message });
export const Message = S.Union([ClickedOpenNav, GotNavMessage])
export type Message = typeof Message.Type`,
    init,
    update: `const mapNav = (
  model: Model,
  result: ReturnType<typeof MobileNav.update>,
): Update.Return<Model, Message> => {
  return { model: { ...model, nav: result.model }, commands: Command.mapMessages(result.commands ?? [], next => GotNavMessage({ message: next })) }
}

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedOpenNav${tag}':
      return mapNav(model, MobileNav.open(model.nav))
    case 'GotNavMessage${tag}':
      return mapNav(model, MobileNav.update(model.nav, message.message))
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Mobile Nav — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.main)' : `'flex min-h-screen items-center justify-center p-8'`})], [
  ${emitTrigger(fixture, isStyleX)},
  ${nav},
  ]),
})`,
  })
}

const mobileNavExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  mobileNavFixtures.map((fixture, index) => ({
    title: fixture.title,
    keepIdsCanonical: index === 0,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(fixture, renderer),
  }))

export const mobileNavExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mobileNavExamplesFor(renderer))
