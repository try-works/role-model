import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type BadgeIcon = Readonly<{
  name: 'badge-check' | 'bookmark' | 'arrow-up-right'
  position: 'start' | 'end'
}>

export type BadgePalette = 'blue' | 'green' | 'sky' | 'purple' | 'red'

export type BadgeItem = Readonly<{
  label: string
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'ghost'
    | 'link'
  icon?: BadgeIcon
  spinner?: 'start' | 'end'
  href?: string
  palette?: BadgePalette
}>

export type BadgeFixture = Readonly<{
  title: string
  description: string
  direction?: 'rtl'
  centered?: boolean
  items: ReadonlyArray<BadgeItem>
}>

export const badgeTailwindPaletteClass: Record<BadgePalette, string> = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  green: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  purple:
    'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
}

/* Tailwind v4 oklch palette values via light-dark() — follows the app's
   color-scheme so the StyleX palettes theme like the Tailwind dark: classes. */
export const badgeStyleXPalette: Record<
  BadgePalette,
  Readonly<{ backgroundColor: string; color: string }>
> = {
  blue: {
    backgroundColor:
      'light-dark(oklch(0.97 0.014 254.604), oklch(0.282 0.091 267.935))',
    color: 'light-dark(oklch(0.488 0.243 264.376), oklch(0.809 0.105 251.813))',
  },
  green: {
    backgroundColor:
      'light-dark(oklch(0.982 0.018 155.826), oklch(0.266 0.065 152.934))',
    color: 'light-dark(oklch(0.527 0.154 150.069), oklch(0.871 0.15 154.449))',
  },
  sky: {
    backgroundColor:
      'light-dark(oklch(0.977 0.013 236.62), oklch(0.293 0.066 243.157))',
    color: 'light-dark(oklch(0.5 0.134 242.749), oklch(0.828 0.111 230.318))',
  },
  purple: {
    backgroundColor:
      'light-dark(oklch(0.977 0.014 308.299), oklch(0.291 0.149 302.717))',
    color: 'light-dark(oklch(0.496 0.265 301.924), oklch(0.827 0.119 306.383))',
  },
  red: {
    backgroundColor:
      'light-dark(oklch(0.971 0.013 17.38), oklch(0.258 0.092 26.042))',
    color: 'light-dark(oklch(0.505 0.213 27.518), oklch(0.808 0.114 19.571))',
  },
}

export const badgeFixtures: Readonly<[BadgeFixture, ...Array<BadgeFixture>]> = [
  {
    title: 'Basic',
    description: 'Badges communicate status at a glance.',
    centered: true,
    items: [
      { label: 'Badge' },
      { label: 'Secondary', variant: 'secondary' },
      { label: 'Destructive', variant: 'destructive' },
      { label: 'Outline', variant: 'outline' },
    ],
  },
  {
    title: 'Variants',
    description: 'Use the variant prop to change the variant of the badge.',
    items: [
      { label: 'Default' },
      { label: 'Secondary', variant: 'secondary' },
      { label: 'Destructive', variant: 'destructive' },
      { label: 'Outline', variant: 'outline' },
      { label: 'Ghost', variant: 'ghost' },
    ],
  },
  {
    title: 'With Icon',
    description:
      'Render an icon inside the badge with data-icon="inline-start" or data-icon="inline-end".',
    items: [
      {
        label: 'Verified',
        variant: 'secondary',
        icon: { name: 'badge-check', position: 'start' },
      },
      {
        label: 'Bookmark',
        variant: 'outline',
        icon: { name: 'bookmark', position: 'end' },
      },
    ],
  },
  {
    title: 'With Spinner',
    description:
      'Render a spinner inside the badge with data-icon positioning.',
    items: [
      { label: 'Deleting', variant: 'destructive', spinner: 'start' },
      { label: 'Generating', variant: 'secondary', spinner: 'end' },
    ],
  },
  {
    title: 'Link',
    description: 'Pass href to render the badge as a link.',
    items: [
      {
        label: 'Open Link',
        href: '#link',
        icon: { name: 'arrow-up-right', position: 'end' },
      },
    ],
  },
  {
    title: 'Custom Colors',
    description:
      'Customize badge colors with custom classes (Tailwind) or stylex.create palette entries (StyleX).',
    items: [
      { label: 'Blue', palette: 'blue' },
      { label: 'Green', palette: 'green' },
      { label: 'Sky', palette: 'sky' },
      { label: 'Purple', palette: 'purple' },
      { label: 'Red', palette: 'red' },
    ],
  },
  {
    title: 'RTL',
    description: 'dir="rtl" mirrors icon order for right-to-left layouts.',
    direction: 'rtl',
    centered: true,
    items: [
      { label: 'شارة' },
      { label: 'ثانوي', variant: 'secondary' },
      { label: 'مدمر', variant: 'destructive' },
      { label: 'مخطط', variant: 'outline' },
      {
        label: 'متحقق',
        variant: 'secondary',
        icon: { name: 'badge-check', position: 'start' },
      },
      {
        label: 'إشارة مرجعية',
        variant: 'outline',
        icon: { name: 'bookmark', position: 'end' },
      },
    ],
  },
]

const iconExports: Record<BadgeIcon['name'], string> = {
  'badge-check': 'Icon.badgeCheck',
  bookmark: 'Icon.bookmark',
  'arrow-up-right': 'Icon.arrowUpRight',
}

const tailwindItemSource = (item: BadgeItem): string => {
  const children: Array<string> = []
  if (item.icon?.position === 'start') {
    children.push(
      `${iconExports[item.icon.name]}({ dataIcon: 'inline-start' }, h)`,
    )
  }
  if (item.spinner === 'start') {
    children.push(
      `Spinner.spinner({ size: 'sm', isDecorative: true, dataIcon: 'inline-start' }, h)`,
    )
  }
  children.push(`'${item.label}'`)
  if (item.spinner === 'end') {
    children.push(
      `Spinner.spinner({ size: 'sm', isDecorative: true, dataIcon: 'inline-end' }, h)`,
    )
  }
  if (item.icon?.position === 'end') {
    children.push(
      `${iconExports[item.icon.name]}({ dataIcon: 'inline-end' }, h)`,
    )
  }
  const props: Array<string> = []
  if (item.variant !== undefined && item.variant !== 'default') {
    props.push(`variant: '${item.variant}'`)
  }
  if (item.href !== undefined) {
    props.push(`href: '${item.href}'`)
  }
  if (item.palette !== undefined) {
    props.push(`class: '${badgeTailwindPaletteClass[item.palette]}'`)
  }
  props.push(`children: [${children.join(', ')}]`)
  return `Badge.badge({ ${props.join(', ')} }, h)`
}

const stylexItemSource = (item: BadgeItem): string => {
  if (item.palette !== undefined) {
    return `h.span(
        [h.Class(stylex.props(styles.badge).className ?? ''), h.Style({ backgroundColor: '${badgeStyleXPalette[item.palette].backgroundColor}', color: '${badgeStyleXPalette[item.palette].color}' })],
        ['${item.label}'],
      )`
  }
  const children: Array<string> = []
  const iconInset =
    item.icon?.position === 'start' || item.spinner === 'start'
      ? 'start'
      : item.icon?.position === 'end' || item.spinner === 'end'
        ? 'end'
        : undefined
  if (item.icon?.position === 'start') {
    children.push(
      `${iconExports[item.icon.name]}({ dataIcon: 'inline-start' }, h)`,
    )
  }
  if (item.spinner === 'start') {
    children.push(
      `Spinner.spinner({ size: 'sm', isDecorative: true, dataIcon: 'inline-start' }, h)`,
    )
  }
  children.push(`'${item.label}'`)
  if (item.spinner === 'end') {
    children.push(
      `Spinner.spinner({ size: 'sm', isDecorative: true, dataIcon: 'inline-end' }, h)`,
    )
  }
  if (item.icon?.position === 'end') {
    children.push(
      `${iconExports[item.icon.name]}({ dataIcon: 'inline-end' }, h)`,
    )
  }
  const props: Array<string> = []
  if (item.variant !== undefined && item.variant !== 'default') {
    props.push(`variant: '${item.variant}'`)
  }
  if (item.href !== undefined) {
    props.push(`href: '${item.href}'`)
  }
  if (iconInset !== undefined) {
    props.push(`iconInset: '${iconInset}'`)
  }
  props.push(`children: [${children.join(', ')}]`)
  return `Badge.badge({ ${props.join(', ')} }, h)`
}

const stylexStylesSource = (fixture: BadgeFixture): string => {
  const hasPalettes = fixture.items.some(item => item.palette !== undefined)
  const badgeEntry = hasPalettes
    ? `,
  badge: {
    alignItems: 'center',
    borderRadius: '2rem',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'transparent',
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem', lineHeight: '1rem',
    fontWeight: 500,
    height: '1.25rem',
    justifyContent: 'center',
    paddingBlock: '0.125rem',
    paddingInline: '0.5rem',
    width: 'fit-content',
  }`
    : ''
  return `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  wrap: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem'${
    fixture.centered ? ", justifyContent: 'center', width: '100%'" : ''
  } }${badgeEntry},
})`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = badgeFixtures[index] ?? badgeFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const wrapClass = fixture.centered
    ? 'flex w-full flex-wrap justify-center gap-2'
    : 'flex flex-wrap gap-2'
  const componentImports = [
    `import * as Icon from '@/lib/icon'`,
    fixture.items.some(item => item.spinner !== undefined)
      ? `import * as Spinner from '@/${isStyleX ? 'stylex' : 'ui'}/spinner'`
      : '',
    isStyleX ? stylexStylesSource(fixture) : '',
  ]
    .filter(Boolean)
    .join('\n')
  const items = fixture.items
    .map(item => (isStyleX ? stylexItemSource(item) : tailwindItemSource(item)))
    .join(',\n      ')
  const viewBody = `h.div(
      [${fixture.direction === 'rtl' ? "h.Dir('rtl'), " : ''}${
        isStyleX
          ? "h.Class(stylex.props(styles.wrap).className ?? '')"
          : `h.Class('${wrapClass}')`
      }],
      [
        ${items},
      ],
    )`
  return staticComponentApplication({
    componentName: 'Badge',
    componentSlug: 'badge',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const badgeExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  badgeFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const badgeExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, badgeExamplesFor(renderer))
