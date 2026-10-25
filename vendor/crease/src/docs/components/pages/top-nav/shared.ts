import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

/** Renderer-neutral fixture shapes — menu-item/heading `icon` is a lucide
    name decorated per renderer (Icon.icon), `logoIcon` is the NavIcon glyph
    (`logoPlain` drops the circular tile, matching astryx's bare AppIcon), and
    `endContent` decorates Button/Icon per renderer. */
export type TopNavFixtureMenuItem = Readonly<{
  title: string
  description?: string
  icon?: string
  href?: string
}>

export type TopNavFixtureFeaturedCard = Readonly<{
  title: string
  description?: string
  image?: string
  imageAlt?: string
  linkLabel?: string
  linkHref?: string
}>

export type TopNavFixtureEntry =
  | Readonly<{
      kind: 'item'
      label: string
      href?: string
      icon?: string
      isSelected?: boolean
      isDisabled?: boolean
      onSelect?: boolean
    }>
  | Readonly<{
      kind: 'menu'
      label: string
      items: ReadonlyArray<TopNavFixtureMenuItem>
    }>
  | Readonly<{
      kind: 'megaMenu'
      label: string
      items: ReadonlyArray<TopNavFixtureMenuItem>
      featured?: TopNavFixtureFeaturedCard
    }>

export type TopNavFixtureHeading = Readonly<{
  heading?: string
  /** Lucide name; wrapped in the NavIcon circle unless `logoPlain`. */
  logoIcon?: string
  logoPlain?: boolean
  headingHref?: string
  superheading?: string
  subheading?: string
  menu?: ReadonlyArray<string>
}>

export type TopNavFixtureEndItem =
  | Readonly<{ kind: 'ghostIcon'; label: string; icon: string }>
  | Readonly<{ kind: 'ghost'; label: string }>
  | Readonly<{ kind: 'primary'; label: string }>
  | Readonly<{ kind: 'icon'; icon: string }>

export type TopNavFixtureNav = Readonly<{
  label?: string
  heading?: TopNavFixtureHeading
  startItems?: ReadonlyArray<TopNavFixtureEntry>
  centerItems?: ReadonlyArray<TopNavFixtureEntry>
  endContent?: ReadonlyArray<TopNavFixtureEndItem>
  /** astryx `style={{ width: 600 }}` on the example root. */
  width600?: boolean
}>

export type TopNavFixtureMegaItem = Readonly<{
  title: string
  description?: string
  icon?: string
  href?: string
}>

export type TopNavFixture = Readonly<
  | {
      title: string
      description?: string
      kind: 'navs'
      navs: ReadonlyArray<TopNavFixtureNav>
    }
  | {
      title: string
      description?: string
      kind: 'megaItems'
      megaItems: ReadonlyArray<TopNavFixtureMegaItem>
    }
  | {
      title: string
      description?: string
      kind: 'featuredCard'
      featuredCard: TopNavFixtureFeaturedCard
    }
>

export const topNavFixtures: Readonly<
  [TopNavFixture, ...Array<TopNavFixture>]
> = [
  {
    title: 'Top Nav',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        width600: true,
        heading: { heading: 'My App', logoIcon: 'package' },
        startItems: [
          { kind: 'item', label: 'Home', href: '#', isSelected: true },
          { kind: 'item', label: 'Products', href: '#' },
          { kind: 'item', label: 'About', href: '#' },
        ],
        endContent: [
          { kind: 'ghostIcon', label: 'Search', icon: 'search' },
          { kind: 'ghostIcon', label: 'Notifications', icon: 'bell' },
          { kind: 'ghostIcon', label: 'Profile', icon: 'circle-user' },
        ],
      },
    ],
  },
  {
    title: 'TopNav — Centered Navigation',
    description:
      'Navigation layout with center-aligned nav items flanked by a logo heading and end actions.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        heading: { heading: 'My App', logoIcon: 'package', headingHref: '#' },
        centerItems: [
          { kind: 'item', label: 'Home', href: '#', isSelected: true },
          { kind: 'item', label: 'Products', href: '#' },
          { kind: 'item', label: 'About', href: '#' },
        ],
        endContent: [
          { kind: 'ghostIcon', label: 'Search', icon: 'search' },
          { kind: 'ghostIcon', label: 'Profile', icon: 'circle-user' },
        ],
      },
    ],
  },
  {
    title: 'TopNav — Enterprise Dashboard',
    description:
      'Full-featured navigation bar with icon-labeled nav items, search, notifications, and a primary CTA.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        heading: { heading: 'My App', logoIcon: 'package', headingHref: '#' },
        startItems: [
          {
            kind: 'item',
            label: 'Dashboard',
            href: '#',
            icon: 'house',
            isSelected: true,
          },
          { kind: 'item', label: 'Reports', href: '#', icon: 'file-text' },
        ],
        endContent: [
          { kind: 'ghostIcon', label: 'Search', icon: 'search' },
          { kind: 'ghostIcon', label: 'Notifications', icon: 'bell' },
          { kind: 'primary', label: 'Upgrade' },
        ],
      },
    ],
  },
  {
    title: 'TopNav — Hover Menu',
    description:
      'Navigation bar with a hover-triggered dropdown menu showing product items with icons and descriptions.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        heading: { heading: 'My App', logoIcon: 'package', headingHref: '#' },
        startItems: [
          { kind: 'item', label: 'Home', href: '#', isSelected: true },
          {
            kind: 'menu',
            label: 'Products',
            items: [
              {
                title: 'Analytics',
                description: 'Track and analyze user behavior',
                icon: 'chart-no-axes-combined',
                href: '#analytics',
              },
              {
                title: 'Security',
                description: 'Enterprise-grade protection',
                icon: 'shield-check',
                href: '#security',
              },
              {
                title: 'Automation',
                description: 'Streamline your workflows',
                icon: 'zap',
                href: '#automation',
              },
              {
                title: 'Developer Tools',
                description: 'APIs, SDKs, and CLI tools',
                icon: 'code',
                href: '#dev-tools',
              },
            ],
          },
          { kind: 'item', label: 'Pricing', href: '#' },
        ],
        endContent: [
          { kind: 'ghostIcon', label: 'Profile', icon: 'circle-user' },
        ],
      },
    ],
  },
  {
    title: 'TopNav — Mega Menu',
    description:
      'Marketing-style navigation with a full-width mega menu featuring product items and a promotional featured card.',
    kind: 'navs',
    navs: [
      {
        label: 'Marketing navigation',
        heading: { heading: 'My App', logoIcon: 'package', headingHref: '#' },
        startItems: [
          {
            kind: 'megaMenu',
            label: 'Products',
            items: [
              {
                title: 'Analytics',
                description: 'Track and analyze user behavior across your apps',
                icon: 'chart-no-axes-combined',
                href: '#analytics',
              },
              {
                title: 'Security',
                description: 'Enterprise-grade protection for your data',
                icon: 'shield-check',
                href: '#security',
              },
              {
                title: 'Automation',
                description: 'Streamline workflows with intelligent tools',
                icon: 'zap',
                href: '#automation',
              },
              {
                title: 'Developer Tools',
                description: 'APIs, SDKs, and CLI for integration',
                icon: 'code',
                href: '#dev-tools',
              },
              {
                title: 'Global Network',
                description: 'Low-latency edge infra in 40+ regions',
                icon: 'globe',
                href: '#network',
              },
            ],
            featured: {
              title: "What's new in v4.0",
              description: 'AI-powered analytics and real-time collaboration.',
              image: '/template-assets/light-working-horizontal-1.png',
              imageAlt: 'Team collaboration',
              linkLabel: 'Read the announcement',
              linkHref: '#announcement',
            },
          },
          { kind: 'item', label: 'Pricing', href: '#' },
          { kind: 'item', label: 'Docs', href: '#' },
        ],
        endContent: [
          { kind: 'ghost', label: 'Sign in' },
          { kind: 'primary', label: 'Get started' },
        ],
      },
    ],
  },
  {
    title: 'TopNav — Multiple Dropdowns',
    description:
      'Navigation bar with multiple hover-triggered dropdown menus that auto-close when switching between them.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        heading: { heading: 'My App', logoIcon: 'package', headingHref: '#' },
        startItems: [
          {
            kind: 'menu',
            label: 'Products',
            items: [
              {
                title: 'Analytics',
                description: 'Track behavior',
                icon: 'chart-no-axes-combined',
                href: '#',
              },
              {
                title: 'Security',
                description: 'Enterprise protection',
                icon: 'shield-check',
                href: '#',
              },
            ],
          },
          {
            kind: 'menu',
            label: 'Resources',
            items: [
              { title: 'Documentation', href: '#' },
              { title: 'API Reference', href: '#' },
              { title: 'Community Forum', href: '#' },
            ],
          },
          { kind: 'item', label: 'Pricing', href: '#' },
        ],
      },
    ],
  },
  {
    title: 'TopNav — With Logo',
    description:
      'Navigation bar with a branded logo icon, heading link, nav items, and a profile action.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        heading: { heading: 'My App', logoIcon: 'package', headingHref: '#' },
        startItems: [
          { kind: 'item', label: 'Overview', href: '#', isSelected: true },
          { kind: 'item', label: 'Analytics', href: '#' },
          { kind: 'item', label: 'Reports', href: '#' },
        ],
        endContent: [
          { kind: 'ghostIcon', label: 'Profile', icon: 'circle-user' },
        ],
      },
    ],
  },
  {
    title: 'TopNavHeading — Basic',
    description:
      'A product heading with a logo inside a TopNav, linked to the home page. Use as the leading brand element of a top navigation bar.',
    kind: 'navs',
    navs: [
      {
        label: 'Product navigation',
        heading: {
          heading: 'Acme Platform',
          logoIcon: 'columns-3',
          headingHref: '/',
        },
      },
    ],
  },
  {
    title: 'Top Nav Heading',
    description:
      'Demonstrates TopNavHeading with a logo and text, both as a plain display and as a clickable link.',
    kind: 'navs',
    navs: [
      {
        label: 'Plain heading example',
        heading: { heading: 'Acme Platform', logoIcon: 'layout-grid' },
      },
      {
        label: 'Linked heading example',
        heading: {
          heading: 'Acme Platform',
          logoIcon: 'layout-grid',
          logoPlain: true,
          headingHref: '/',
        },
      },
    ],
  },
  {
    title: 'TopNavItem — Basic',
    description:
      'Navigation links inside a TopNav with one item marked as selected. Use for top-level pages of an application.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        heading: { heading: 'App' },
        startItems: [
          { kind: 'item', label: 'Dashboard', href: '#', isSelected: true },
          { kind: 'item', label: 'Projects', href: '#' },
          { kind: 'item', label: 'Reports', href: '#' },
        ],
      },
    ],
  },
  {
    title: 'Top Nav Item',
    description:
      'Demonstrates TopNavItem with selected, icon, disabled, and default states.',
    kind: 'navs',
    navs: [
      {
        label: 'Navigation items demo',
        width600: true,
        heading: { heading: 'App' },
        startItems: [
          {
            kind: 'item',
            label: 'Dashboard',
            href: '#',
            icon: 'house',
            isSelected: true,
          },
          { kind: 'item', label: 'Projects', href: '#' },
          { kind: 'item', label: 'Reports', href: '#' },
          { kind: 'item', label: 'Archived', href: '#', isDisabled: true },
        ],
        endContent: [{ kind: 'icon', icon: 'search' }],
      },
    ],
  },
  {
    title: 'TopNavMegaMenu — Basic',
    description:
      'A mega menu trigger inside a TopNav that opens a panel of rich link items. Use when a navigation section has multiple destinations worth describing.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        width600: true,
        heading: { heading: 'DevTools' },
        startItems: [
          { kind: 'item', label: 'Overview', href: '#', isSelected: true },
          {
            kind: 'megaMenu',
            label: 'Products',
            items: [
              {
                title: 'Deploy',
                description: 'Ship to production in seconds',
                icon: 'rocket',
                href: '#deploy',
              },
              {
                title: 'Documentation',
                description: 'Guides, references, and tutorials',
                icon: 'book-open',
                href: '#docs',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Top Nav Mega Menu',
    description:
      'Demonstrates TopNavMegaMenu with items and a featured card in the mega menu panel.',
    kind: 'navs',
    navs: [
      {
        label: 'Mega menu demo',
        width600: true,
        heading: { heading: 'DevTools' },
        startItems: [
          { kind: 'item', label: 'Overview', href: '#', isSelected: true },
          {
            kind: 'megaMenu',
            label: 'Products',
            items: [
              {
                title: 'Deploy',
                description: 'Ship to production in seconds',
                icon: 'rocket',
                href: '#deploy',
              },
              {
                title: 'Documentation',
                description: 'Guides, references, and tutorials',
                icon: 'book-open',
                href: '#docs',
              },
              {
                title: 'API',
                description: 'Programmatic access to all features',
                icon: 'code',
                href: '#api',
              },
              {
                title: 'Security',
                description: 'Enterprise-grade protection',
                icon: 'shield-check',
                href: '#security',
              },
            ],
            featured: {
              title: "What's New",
              description:
                'Check out our latest features and improvements in the Q2 release.',
              linkLabel: 'Read the changelog',
              linkHref: '#changelog',
            },
          },
        ],
        endContent: [{ kind: 'icon', icon: 'search' }],
      },
    ],
  },
  {
    title: 'TopNavMegaMenuFeaturedCard — Basic',
    description:
      'A promotional card with a title, description, and call-to-action link. Pass it to the featured slot of a TopNavMegaMenu to highlight announcements.',
    kind: 'featuredCard',
    featuredCard: {
      title: "What's New",
      description:
        'Check out the latest features and improvements in the Q2 release.',
      linkLabel: 'Read the changelog',
      linkHref: '#changelog',
    },
  },
  {
    title: 'Top Nav Mega Menu Featured Card',
    description:
      'Demonstrates TopNavMegaMenuFeaturedCard with a title, description, and CTA link inside a mega menu.',
    kind: 'featuredCard',
    featuredCard: {
      title: 'Introducing v2.0',
      description:
        'Our biggest release yet with new components, faster builds, and a refreshed design language.',
      linkLabel: 'Explore the release',
      linkHref: '#release',
    },
  },
  {
    title: 'TopNavMegaMenuItem — Basic',
    description:
      'Rich link items with an icon, title, and description. Use inside the items slot of a TopNavMegaMenu to describe each destination.',
    kind: 'megaItems',
    megaItems: [
      {
        title: 'Edge Functions',
        description: 'Run serverless code at the network edge',
        icon: 'zap',
        href: '#edge',
      },
      {
        title: 'Storage',
        description: 'Object and file storage for your application',
        icon: 'database',
        href: '#storage',
      },
    ],
  },
  {
    title: 'Top Nav Mega Menu Item',
    description:
      'Demonstrates TopNavMegaMenuItem with icons, titles, and descriptions inside a mega menu.',
    kind: 'megaItems',
    megaItems: [
      {
        title: 'Edge Functions',
        description: 'Run serverless code at the network edge',
        icon: 'zap',
        href: '#edge',
      },
      {
        title: 'Storage',
        description: 'Object and file storage for your application',
        icon: 'package',
        href: '#storage',
      },
      {
        title: 'CDN',
        description: 'Global content delivery with instant purging',
        icon: 'globe',
        href: '#cdn',
      },
      {
        title: 'Build Tools',
        description: 'Optimized bundling and compilation pipeline',
        icon: 'wrench',
        href: '#build',
      },
    ],
  },
  {
    title: 'TopNavMenu — Basic',
    description:
      'A dropdown menu inside a TopNav built from an items array with icons and descriptions. Use to group related destinations under a single trigger.',
    kind: 'navs',
    navs: [
      {
        label: 'Main navigation',
        width600: true,
        heading: { heading: 'Platform' },
        startItems: [
          { kind: 'item', label: 'Home', href: '#', isSelected: true },
          {
            kind: 'menu',
            label: 'Tools',
            items: [
              {
                title: 'Analytics',
                description: 'View traffic and engagement metrics',
                icon: 'chart-no-axes-combined',
                href: '#analytics',
              },
              {
                title: 'Settings',
                description: 'Configure your workspace',
                icon: 'settings',
                href: '#settings',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Top Nav Menu',
    description:
      'Demonstrates TopNavMenu with a hover-triggered dropdown containing items with icons and descriptions.',
    kind: 'navs',
    navs: [
      {
        label: 'Menu demo',
        width600: true,
        heading: { heading: 'Platform' },
        startItems: [
          { kind: 'item', label: 'Home', href: '#', isSelected: true },
          {
            kind: 'menu',
            label: 'Tools',
            items: [
              {
                title: 'Analytics',
                description: 'View traffic and engagement metrics',
                icon: 'chart-no-axes-combined',
                href: '#analytics',
              },
              {
                title: 'Team Members',
                description: 'Manage your team and permissions',
                icon: 'users',
                href: '#team',
              },
              {
                title: 'Settings',
                description: 'Configure your workspace',
                icon: 'settings',
                href: '#settings',
              },
            ],
          },
        ],
        endContent: [{ kind: 'ghostIcon', label: 'Search', icon: 'search' }],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Fixture introspection (which decorations the generated code needs)
// ---------------------------------------------------------------------------

const navUsesIcon = (nav: TopNavFixtureNav): boolean =>
  nav.heading?.logoIcon !== undefined ||
  (nav.startItems ?? []).some(
    entry =>
      (entry.kind === 'item' && entry.icon !== undefined) ||
      (entry.kind !== 'item' &&
        entry.items.some(item => item.icon !== undefined)),
  ) ||
  (nav.centerItems ?? []).some(
    entry =>
      (entry.kind === 'item' && entry.icon !== undefined) ||
      (entry.kind !== 'item' &&
        entry.items.some(item => item.icon !== undefined)),
  ) ||
  (nav.endContent ?? []).some(
    item => item.kind === 'ghostIcon' || item.kind === 'icon',
  )

const fixtureNeedsIcon = (fixture: TopNavFixture): boolean =>
  fixture.kind === 'megaItems'
    ? fixture.megaItems.some(item => item.icon !== undefined)
    : fixture.kind === 'navs' && fixture.navs.some(navUsesIcon)

const fixtureNeedsButton = (fixture: TopNavFixture): boolean =>
  fixture.kind === 'navs' &&
  fixture.navs.some(nav =>
    (nav.endContent ?? []).some(item => item.kind !== 'icon'),
  )

// ---------------------------------------------------------------------------
// Generated example source
// ---------------------------------------------------------------------------

const quote = (value: string): string =>
  `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

const menuItemSource = (item: TopNavFixtureMenuItem): string => {
  const fields: Array<string> = [`title: ${quote(item.title)}`]
  if (item.description !== undefined) {
    fields.push(`description: ${quote(item.description)}`)
  }
  if (item.icon !== undefined) {
    fields.push(`icon: Icon.icon(${quote(item.icon)}, { class: 'size-5' }, h)`)
  }
  if (item.href !== undefined) {
    fields.push(`href: ${quote(item.href)}`)
  }
  return `{ ${fields.join(', ')} }`
}

const featuredCardSource = (card: TopNavFixtureFeaturedCard): string => {
  const fields: Array<string> = [`title: ${quote(card.title)}`]
  if (card.description !== undefined) {
    fields.push(`description: ${quote(card.description)}`)
  }
  if (card.image !== undefined) {
    fields.push(`image: ${quote(card.image)}`)
  }
  if (card.imageAlt !== undefined) {
    fields.push(`imageAlt: ${quote(card.imageAlt)}`)
  }
  if (card.linkLabel !== undefined) {
    fields.push(`linkLabel: ${quote(card.linkLabel)}`)
  }
  if (card.linkHref !== undefined) {
    fields.push(`linkHref: ${quote(card.linkHref)}`)
  }
  return `{ ${fields.join(', ')} }`
}

const entrySource = (entry: TopNavFixtureEntry): string => {
  if (entry.kind === 'item') {
    const fields: Array<string> = [`label: ${quote(entry.label)}`]
    if (entry.icon !== undefined) {
      fields.push(`icon: ${quote(entry.icon)}`)
    }
    if (entry.isSelected === true) {
      fields.push('isSelected: true')
    }
    if (entry.isDisabled === true) {
      fields.push('isDisabled: true')
    }
    if (entry.href !== undefined) {
      fields.push(`href: ${quote(entry.href)}`)
    }
    if (entry.onSelect === true) {
      fields.push('onSelect: true')
    }
    return `{ ${fields.join(', ')} }`
  }
  if (entry.kind === 'menu') {
    return `{ kind: 'menu', label: ${quote(entry.label)}, items: [${entry.items
      .map(item => menuItemSource(item))
      .join(', ')}] }`
  }
  return `{ kind: 'megaMenu', label: ${quote(entry.label)}, items: [${entry.items
    .map(item => menuItemSource(item))
    .join(', ')}]${
    entry.featured === undefined
      ? ''
      : `, featured: ${featuredCardSource(entry.featured)}`
  } }`
}

const endItemSource = (item: TopNavFixtureEndItem): string => {
  switch (item.kind) {
    case 'ghostIcon':
      return `Button.button({ variant: 'ghost', size: 'icon-sm', ariaLabel: ${quote(item.label)}, children: [Icon.icon('${item.icon}', { class: 'size-4' }, h)] }, h)`
    case 'ghost':
      return `Button.button({ variant: 'ghost', children: [${quote(item.label)}] }, h)`
    case 'primary':
      return `Button.button({ children: [${quote(item.label)}] }, h)`
    case 'icon':
      return `Icon.icon('${item.icon}', { class: 'size-5' }, h)`
  }
}

const headingSource = (heading: TopNavFixtureHeading): string => {
  const fields: Array<string> = []
  if (heading.heading !== undefined) {
    fields.push(`heading: ${quote(heading.heading)}`)
  }
  if (heading.logoIcon !== undefined) {
    const glyph = `Icon.icon('${heading.logoIcon}', { class: 'size-4' }, h)`
    const logo =
      heading.logoPlain === true
        ? `Icon.icon('${heading.logoIcon}', { class: 'size-5' }, h)`
        : `h.span([h.Class('flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground')], [${glyph}])`
    fields.push(`logo: ${logo}`)
  }
  if (heading.headingHref !== undefined) {
    fields.push(`headingHref: ${quote(heading.headingHref)}`)
  }
  if (heading.superheading !== undefined) {
    fields.push(`superheading: ${quote(heading.superheading)}`)
  }
  if (heading.subheading !== undefined) {
    fields.push(`subheading: ${quote(heading.subheading)}`)
  }
  if (heading.menu !== undefined) {
    fields.push(
      `menu: [${heading.menu
        .map(label => `{ label: ${quote(label)}, href: '#' }`)
        .join(', ')}]`,
    )
  }
  return `{ ${fields.join(', ')} }`
}

const viewInputsSource = (nav: TopNavFixtureNav, isStyleX: boolean): string => {
  const fields: Array<string> = [
    `label: ${quote(nav.label ?? 'Top navigation')}`,
  ]
  if (nav.heading !== undefined) {
    fields.push(`heading: ${headingSource(nav.heading)}`)
  }
  if (nav.startItems !== undefined) {
    fields.push(
      `startItems: [${nav.startItems
        .map(entry => entrySource(entry))
        .join(', ')}]`,
    )
  }
  if (nav.centerItems !== undefined) {
    fields.push(
      `centerItems: [${nav.centerItems
        .map(entry => entrySource(entry))
        .join(', ')}]`,
    )
  }
  if (nav.endContent !== undefined) {
    fields.push(
      `endContent: h.div([h.Class('flex items-center gap-1')], [${nav.endContent
        .map(item => endItemSource(item))
        .join(', ')}])`,
    )
  }
  if (nav.width600 === true) {
    fields.push(
      isStyleX
        ? `layoutStyle: layoutStyle({ maxWidth: "100%", width: "600px" })`
        : `class: 'w-150 max-w-full'`,
    )
  }
  return `{ ${fields.join(', ')} }`
}

const submodelSource = (
  modelField: string,
  messageTag: string,
  nav: TopNavFixtureNav,
  isStyleX: boolean,
): string => `h.submodel({
        slotId: '${modelField}',
        model: model.${modelField},
        view: TopNav.view,
        viewInputs: ${viewInputsSource(nav, isStyleX)},
        toParentMessage: message => Message['${messageTag}']({ message }),
      })`

const applySource = (
  modelField: string,
  messageTag: string,
): string => `const apply${modelField[0]!.toUpperCase()}${modelField.slice(1)} = (model: Model, result: ReturnType<typeof TopNav.update>): Update.Return<Model, Message> => {
  const commands = Command.mapMessages(result.commands ?? [], message => Message['${messageTag}']({ message }));
  const maybeSelectedId = result.outMessage?._tag === 'SelectedTopNavItem'
    ? Option.some(result.outMessage.id)
    : result.outMessage?._tag === 'SelectedTopNavMenuItem'
      ? Option.some(result.outMessage.itemTitle)
      : model.maybeSelectedId;
  return { model: { ...model, ${modelField}: result.model, maybeSelectedId }, commands };
};`

const navSource = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = topNavFixtures[index] ?? topNavFixtures[0]
  if (fixture.kind !== 'navs') {
    return ''
  }
  const isStyleX = renderer !== 'tailwind'
  const ui = isStyleX ? 'stylex' : 'ui'
  const multi = fixture.navs.length > 1
  const fields = fixture.navs.map((_nav, i) => `nav${i}`)
  const tags = fixture.navs.map((_nav, i) => `GotTopNav${i}Message`)
  const needsIcon = fixtureNeedsIcon(fixture)
  const needsButton = fixtureNeedsButton(fixture)

  const modelFields = fields.map(field => `${field}: TopNav.Model`).join(', ')
  const initFields = fixture.navs
    .map(
      (_nav, i) =>
        `${fields[i]}: TopNav.init({ id: 'docs-top-nav-${index}-${i}' })`,
    )
    .join(', ')

  const navsSource = fixture.navs
    .map((nav, i) => submodelSource(fields[i]!, tags[i]!, nav, isStyleX))
    .join(',\n    ')

  const bodyWrapper = multi
    ? `h.div([h.Class('flex flex-col gap-6')], [
      ${navsSource},
    ])`
    : navsSource

  const needsWidth600 = fixture.navs.some(nav => nav.width600 === true)
  const stylexStyles =
    isStyleX && needsWidth600
      ? `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  shell: { display: 'flex', flexDirection: 'column', gap: '1.5rem', marginInline: 'auto', maxWidth: '48rem', minHeight: '100vh', padding: '2rem', width: '100%' },
  navWidth600: { maxWidth: '100%', width: '600px' },
})`
      : ''

  return foldkitApplication({
    title: `TopNav — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
${stylexStyles === '' ? '' : `${stylexStyles}\n`}import * as TopNav from '@/${ui}/top-nav'${needsIcon ? `\nimport * as Icon from '@/lib/icon'` : ''}${needsButton ? `\nimport * as Button from '@/${ui}/button'` : ''}`,
    model: `export const Model = S.Struct({ ${modelFields}, maybeSelectedId: S.Option(S.String) })
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
${tags.map(tag => `  ${tag}: { message: TopNav.Message },`).join('\n')}
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { ${initFields}, maybeSelectedId: Option.none() } })`,
    update: `${fields
      .map((field, i) => applySource(field, tags[i]!))
      .join('\n\n')}

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
${tags
  .map(
    (tag, i) =>
      `    case '${tag}': return apply${fields[i]![0]!.toUpperCase()}${fields[i]!.slice(1)}(model, TopNav.update(model.${fields[i]!}, message.message))`,
  )
  .join('\n')}
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'TopNav — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-8'"})], [
    ${bodyWrapper},
  ]),
})`,
  })
}

const megaItemCallSource = (item: TopNavFixtureMegaItem): string => {
  const fields: Array<string> = [`title: ${quote(item.title)}`]
  if (item.description !== undefined) {
    fields.push(`description: ${quote(item.description)}`)
  }
  if (item.icon !== undefined) {
    fields.push(`icon: Icon.icon(${quote(item.icon)}, { class: 'size-5' }, h)`)
  }
  if (item.href !== undefined) {
    fields.push(`href: ${quote(item.href)}`)
  }
  return `TopNav.topNavMegaMenuItem({ ${fields.join(', ')} }, undefined, h)`
}

const standaloneSource = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = topNavFixtures[index] ?? topNavFixtures[0]
  if (fixture.kind === 'navs') {
    return ''
  }
  const isStyleX = renderer !== 'tailwind'
  const ui = isStyleX ? 'stylex' : 'ui'
  const needsIcon = fixtureNeedsIcon(fixture)
  const viewBody =
    fixture.kind === 'megaItems'
      ? `h.div([h.Class('grid grid-cols-2 gap-2')], [
        ${fixture.megaItems.map(item => megaItemCallSource(item)).join(',\n        ')},
      ])`
      : `TopNav.topNavMegaMenuFeaturedCard(${featuredCardSource(
          fixture.featuredCard,
        )}, h)`
  return staticComponentApplication({
    componentName: 'TopNav',
    componentSlug: 'top-nav',
    renderer,
    exampleName: fixture.title
      .replaceAll('Top Nav ', 'TopNav')
      .replaceAll(' ', ''),
    ...(needsIcon
      ? { componentImports: `import * as Icon from '@/lib/icon'` }
      : {}),
    viewBody,
  })
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = topNavFixtures[index] ?? topNavFixtures[0]
  return fixture.kind === 'navs'
    ? navSource(index, renderer)
    : standaloneSource(index, renderer)
}

const topNavExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  topNavFixtures.map((fixture, index) => ({
    title: fixture.title,
    keepIdsCanonical: index === 0,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const topNavExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, topNavExamplesFor(renderer))
