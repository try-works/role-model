import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type AvatarItemSpec = Readonly<{
  /** Stable key for the avatar's lifecycle model entry. */
  key: string
  src: string
  alt: string
  fallback: string
  size?: 'sm' | 'lg'
  badge?: 'green' | 'icon'
  /** Where upstream applies `grayscale`: the image (demo/basic) or the avatar root (badge-icon). */
  grayscale?: 'image' | 'avatar'
}>

export type AvatarClusterSpec = Readonly<{
  /** Wrap the items in Avatar.avatarGroup (upstream AvatarGroup). */
  grouped?: boolean
  /** `class="grayscale"` on the AvatarGroup element. */
  grayscale?: boolean
  /** AvatarGroupCount text (e.g. '+3'). */
  count?: string
  /** AvatarGroupCount containing a plus icon. */
  countIcon?: boolean
  items: ReadonlyArray<AvatarItemSpec>
}>

export type AvatarFixture = Readonly<{
  kind:
    | 'demo'
    | 'basic'
    | 'badge'
    | 'badgeIcon'
    | 'group'
    | 'groupCount'
    | 'groupCountIcon'
    | 'sizes'
    | 'dropdown'
    | 'rtl'
  title: string
  description: string
  /** Rendered only as the page hero, not as a named example section. */
  heroOnly?: boolean
  /** Outer frame: upstream 'flex flex-row flex-wrap gap-6 md:gap-12' row, the sizes row, or loose clusters. */
  frame: 'hero' | 'sizesRow' | 'plain'
  /** dir="rtl" on the frame (upstream RTL example). */
  rtl?: boolean
  /** Dropdown example: menu items rendered by the avatar trigger. */
  menuItems?: ReadonlyArray<Readonly<{ label: string; destructive?: boolean }>>
  clusters: ReadonlyArray<AvatarClusterSpec>
}>

const CREASEUI: AvatarItemSpec = {
  key: 'creaseui',
  src: '/logo-mark.svg',
  alt: '@creaseui',
  fallback: 'CU',
}
const FOLDKIT: AvatarItemSpec = {
  key: 'foldkit',
  src: 'https://github.com/foldkit.png',
  alt: '@foldkit',
  fallback: 'FK',
}
const DEVIN: AvatarItemSpec = {
  key: 'devin',
  src: 'https://avatars.githubusercontent.com/in/811515?v=4',
  alt: 'Devin',
  fallback: 'DV',
}

const GROUP_TRIO: ReadonlyArray<AvatarItemSpec> = [CREASEUI, FOLDKIT, DEVIN]

const demoClusters = (count: string): ReadonlyArray<AvatarClusterSpec> => [
  { items: [{ ...CREASEUI, grayscale: 'image' }] },
  { items: [{ ...DEVIN, badge: 'green' }] },
  { grouped: true, grayscale: true, count, items: GROUP_TRIO },
]

export const avatarFixtures: Readonly<
  [AvatarFixture, ...Array<AvatarFixture>]
> = [
  {
    kind: 'demo',
    title: 'Demo',
    description: 'Avatars with a status badge and an overflow group count.',
    heroOnly: true,
    frame: 'hero',
    clusters: demoClusters('+3'),
  },
  {
    kind: 'basic',
    title: 'Basic',
    description: 'A single avatar with an image and initials fallback.',
    frame: 'plain',
    clusters: [{ items: [{ ...CREASEUI, grayscale: 'image' }] }],
  },
  {
    kind: 'badge',
    title: 'Badge',
    description: 'AvatarBadge pins a status dot to the corner of the avatar.',
    frame: 'plain',
    clusters: [{ items: [{ ...CREASEUI, badge: 'green' }] }],
  },
  {
    kind: 'badgeIcon',
    title: 'Badge with Icon',
    description: 'AvatarBadge can also carry an icon.',
    frame: 'plain',
    clusters: [{ items: [{ ...FOLDKIT, badge: 'icon', grayscale: 'avatar' }] }],
  },
  {
    kind: 'group',
    title: 'Avatar Group',
    description: 'AvatarGroup overlaps a row of avatars with a ring separator.',
    frame: 'plain',
    clusters: [{ grouped: true, grayscale: true, items: GROUP_TRIO }],
  },
  {
    kind: 'groupCount',
    title: 'Avatar Group Count',
    description: 'AvatarGroupCount trails the group with an overflow count.',
    frame: 'plain',
    clusters: [
      { grouped: true, grayscale: true, count: '+3', items: GROUP_TRIO },
    ],
  },
  {
    kind: 'groupCountIcon',
    title: 'Avatar Group with Icon',
    description: 'The group count can carry an icon instead of a number.',
    frame: 'plain',
    clusters: [
      { grouped: true, grayscale: true, countIcon: true, items: GROUP_TRIO },
    ],
  },
  {
    kind: 'sizes',
    title: 'Sizes',
    description: "Use size 'sm' or 'lg' to change the avatar size.",
    frame: 'sizesRow',
    clusters: [
      {
        items: [
          { ...CREASEUI, size: 'sm' },
          CREASEUI,
          { ...CREASEUI, size: 'lg' },
        ],
      },
    ],
  },
  {
    kind: 'dropdown',
    title: 'Dropdown',
    description: 'An avatar works as a dropdown menu trigger.',
    frame: 'plain',
    menuItems: [
      { label: 'Profile' },
      { label: 'Billing' },
      { label: 'Settings' },
      { label: 'Log out', destructive: true },
    ],
    clusters: [{ items: [CREASEUI] }],
  },
  {
    kind: 'rtl',
    title: 'RTL',
    description: 'The same composition laid out right-to-left.',
    frame: 'hero',
    rtl: true,
    clusters: demoClusters('+٣'),
  },
]

const esc = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const allItems = (fixture: AvatarFixture): ReadonlyArray<AvatarItemSpec> =>
  fixture.clusters.flatMap(cluster => cluster.items)

const needsMenu = (fixture: AvatarFixture): boolean =>
  fixture.menuItems !== undefined
const needsBadgeIcon = (fixture: AvatarFixture): boolean =>
  allItems(fixture).some(item => item.badge === 'icon')
const needsCountIcon = (fixture: AvatarFixture): boolean =>
  fixture.clusters.some(cluster => cluster.countIcon === true)
const needsIcon = (fixture: AvatarFixture): boolean =>
  needsBadgeIcon(fixture) || needsCountIcon(fixture)

const badgeSource = (
  item: AvatarItemSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  if (item.badge === 'green')
    return `\n        Avatar.avatarBadge({ ${renderer !== 'tailwind' ? `tone: 'success'` : `class: 'bg-green-600 dark:bg-green-800'`} }, h),`
  if (item.badge === 'icon')
    return `\n        Avatar.avatarBadge({ children: [Icon.icon('plus', ${renderer !== 'tailwind' ? `{ class: stylex.props(styles.badgeIcon).className ?? '' }` : '{}'}, h)] }, h),`
  return ''
}

const itemCallSource = (
  item: AvatarItemSpec,
  overlap: boolean,
  grouped: boolean,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const sizeProp =
    item.size === undefined ? '' : `\n      size: '${item.size}',`
  const avatarGrayscale =
    item.grayscale === 'avatar'
      ? renderer !== 'tailwind'
        ? `\n      grayscale: true,`
        : `\n      class: 'grayscale',`
      : ''
  const imageGrayscale =
    item.grayscale === 'image'
      ? renderer !== 'tailwind'
        ? `\n          grayscale: true,`
        : `\n          class: 'grayscale',`
      : ''
  const groupProps =
    renderer !== 'tailwind' && grouped
      ? `\n      ring: true,${overlap ? '\n      overlap: true,' : ''}`
      : ''
  return `Avatar.avatar({${sizeProp}${avatarGrayscale}${groupProps}
      children: [
        Avatar.avatarImage({
          src: '${item.src}',
          alt: '${esc(item.alt)}',${imageGrayscale}
          model: avatarModel(model, '${item.key}'),
          toParentMessage: message =>
            Message['GotAvatarMessage']({ key: '${item.key}', message }),
        }, h),
        Avatar.avatarFallback({
          model: avatarModel(model, '${item.key}'),
          children: ['${item.fallback}'],
        }, h),${badgeSource(item, renderer)}
      ],
    }, h)`
}

const countSource = (
  cluster: AvatarClusterSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  if (cluster.count !== undefined)
    return `\n        Avatar.avatarGroupCount({ children: ['${cluster.count}'] }, h),`
  if (cluster.countIcon === true)
    return `\n        Avatar.avatarGroupCount({ children: [Icon.icon('plus', ${renderer !== 'tailwind' ? `{ class: stylex.props(styles.countIcon).className ?? '' }` : '{}'}, h)] }, h),`
  return ''
}

const clusterSource = (
  fixture: AvatarFixture,
  cluster: AvatarClusterSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  if (cluster.grouped === true) {
    const hasCount = cluster.count !== undefined || cluster.countIcon === true
    const items = cluster.items
      .map(
        (item, index) =>
          `\n        ${itemCallSource(item, index < cluster.items.length - 1 || hasCount, true, renderer)},`,
      )
      .join('')
    const grayscale =
      cluster.grayscale === true
        ? renderer !== 'tailwind'
          ? `\n      grayscale: true,`
          : `\n      class: 'grayscale',`
        : ''
    return `Avatar.avatarGroup({${grayscale}
      children: [${items}${countSource(cluster, renderer)}
      ],
    }, h)`
  }
  const item = cluster.items[0]
  if (item === undefined) return ''
  if (needsMenu(fixture)) {
    const image = `Avatar.avatarImage({
          src: '${item.src}',
          alt: '${esc(item.alt)}',
          model: avatarModel(model, '${item.key}'),
          toParentMessage: message =>
            Message['GotAvatarMessage']({ key: '${item.key}', message }),
        }, h)`
    const fallback = `Avatar.avatarFallback({
          model: avatarModel(model, '${item.key}'),
          children: ['${item.fallback}'],
        }, h)`
    const triggerProps =
      renderer !== 'tailwind'
        ? `\n      triggerButtonVariant: 'ghost',\n      triggerButtonSize: 'icon-sm',\n      triggerButtonRounded: true,`
        : `\n      triggerClass: 'rounded-full',`
    return `DropdownMenu.dropdownMenu({
      model: model.menu,
      toParentMessage: message => Message['GotMenuMessage']({ message }),
      trigger: Avatar.avatar({
        children: [
          ${image},
          ${fallback},
        ],
      }, h),${triggerProps}
      items: menuItems,
      itemToConfig: item =>
        item === 'Log out'
          ? { label: item, group: 'account', separatorBefore: true, variant: 'destructive' as const }
          : { label: item, group: 'main' },
    }, h)`
  }
  return cluster.items
    .map(entry => itemCallSource(entry, false, false, renderer))
    .join(',\n      ')
}

const bodySource = (
  fixture: AvatarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const clusters = fixture.clusters
    .map(cluster => `      ${clusterSource(fixture, cluster, renderer)}`)
    .join(',\n')
  if (fixture.frame === 'plain') return clusters
  const frameAttr =
    renderer !== 'tailwind'
      ? `[h.Class(stylex.props(${fixture.frame === 'sizesRow' ? 'styles.sizesRow' : 'styles.hero'}).className ?? '')${fixture.rtl === true ? ", h.Dir('rtl')" : ''}]`
      : `[h.Class('${fixture.frame === 'sizesRow' ? 'flex flex-wrap items-center gap-2 grayscale' : 'flex flex-row flex-wrap items-center gap-6 md:gap-12'}')${fixture.rtl === true ? `, h.Dir('rtl')` : ''}]`
  return `h.div(${frameAttr}, [
${clusters}
    ])`
}

const stylexStylesSource = (fixture: AvatarFixture): string => {
  const hero =
    fixture.frame === 'hero'
      ? `\n  hero: { alignItems: 'center', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: { default: '1.5rem', '@media (min-width: 768px)': '3rem' } },`
      : ''
  const sizesRow =
    fixture.frame === 'sizesRow'
      ? `\n  sizesRow: { alignItems: 'center', display: 'flex', filter: 'grayscale(100%)', flexWrap: 'wrap', gap: '0.5rem' },`
      : ''
  const badgeIcon = needsBadgeIcon(fixture)
    ? `\n  badgeIcon: { height: '0.5rem', width: '0.5rem' },`
    : ''
  const countIcon = needsCountIcon(fixture)
    ? `\n  countIcon: { height: '1rem', width: '1rem' },`
    : ''
  return `const styles = stylex.create({${hero}${sizesRow}${badgeIcon}${countIcon}
})

`
}

const componentImports = (
  fixture: AvatarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const ui = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const stylexBits =
    renderer !== 'tailwind'
      ? `import * as stylex from '@stylexjs/stylex'

${stylexStylesSource(fixture)}`
      : ''
  return `${stylexBits}import * as Avatar from '@/${ui}/avatar'${needsMenu(fixture) ? `\nimport * as DropdownMenu from '@/${ui}/dropdown-menu'` : ''}${needsIcon(fixture) ? `\nimport * as Icon from '@/lib/icon'` : ''}`
}

const source = (
  fixture: AvatarFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: `Avatar — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${componentImports(fixture, renderer)}`,
    model: `export const Model = S.Struct({
  avatars: S.Record(S.String, Avatar.Model),${
    needsMenu(fixture)
      ? `
  menu: DropdownMenu.Model,`
      : ''
  }
})
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  GotAvatarMessage: { key: S.String, message: Avatar.Message },${
    needsMenu(fixture)
      ? `
  GotMenuMessage: { message: DropdownMenu.Message },`
      : ''
  }
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { avatars: {}${needsMenu(fixture) ? `, menu: DropdownMenu.init({ id: 'avatar-menu' })` : ''} },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotAvatarMessage': {
      const current = model.avatars[message.key] ?? Avatar.init()
      return {
        model: {
          ...model,
          avatars: {
            ...model.avatars,
            [message.key]: Avatar.update(current, message.message),
          },
        },
      }
    }${
      needsMenu(fixture)
        ? `
    case 'GotMenuMessage': {
      const result = DropdownMenu.update(model.menu, message.message)
      return {
        model: { ...model, menu: result.model },
        commands: Command.mapMessages(
          result.commands,
          next => Message['GotMenuMessage']({ message: next }),
        ),
      }
    }`
        : ''
    }
  }
}`,
    view: `const avatarModel = (model: Model, key: string): Avatar.Model =>
  model.avatars[key] ?? Avatar.init()
${
  needsMenu(fixture)
    ? `
const menuItems = ['Profile', 'Billing', 'Settings', 'Log out'] as const
`
    : ''
}
export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Avatar — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${bodySource(fixture, renderer)},
  ]),
})`,
  })

const avatarExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  avatarFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: source(fixture, renderer),
  }))

export const avatarExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, avatarExamplesFor(renderer))
