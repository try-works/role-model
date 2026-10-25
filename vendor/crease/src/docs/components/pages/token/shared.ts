import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type TokenItem = Readonly<{
  label: string
  color?:
    | 'default'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'teal'
    | 'cyan'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'gray'
  size?: 'sm' | 'md' | 'lg'
  icon?: 'user' | 'star' | 'tag' | 'shield-check'
  endContent?: string
  isDisabled?: boolean
  hasClick?: boolean
  hasRemove?: boolean
}>

export type TokenSection = Readonly<{
  label: string
  items: ReadonlyArray<TokenItem>
}>

export type TokenFixture = Readonly<{
  title: string
  description: string
  heading?: string
  sections: ReadonlyArray<TokenSection>
}>

const ALL_COLORS: ReadonlyArray<NonNullable<TokenItem['color']>> = [
  'default',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'cyan',
  'blue',
  'purple',
  'pink',
  'gray',
]

const colorItems = (isDisabled: boolean): ReadonlyArray<TokenItem> =>
  ALL_COLORS.map(color => ({
    label:
      color === 'default'
        ? 'Default'
        : color.charAt(0).toUpperCase() + color.slice(1),
    color,
    ...(isDisabled ? { isDisabled: true } : {}),
  }))

export const tokenFixtures: Readonly<[TokenFixture, ...Array<TokenFixture>]> = [
  {
    title: 'Token',
    description:
      'A compact pill for a selected entity: label, optional icon, color, and remove affordance.',
    sections: [
      {
        label: '',
        items: [
          { label: 'Default' },
          { label: 'Removable', color: 'blue', hasRemove: true },
          { label: 'Design', color: 'purple', icon: 'tag' },
        ],
      },
    ],
  },
  {
    title: 'Token — Clickable',
    description:
      'Interactive tokens that respond to clicks. Use for toggleable filters or tokens that open a detail view when selected.',
    heading: 'Click a token to view details',
    sections: [
      {
        label: 'Click a token to view details',
        items: [
          { label: 'Bug', color: 'red', hasClick: true },
          { label: 'Feature', color: 'blue', hasClick: true },
          { label: 'Enhancement', color: 'green', hasClick: true },
          { label: 'Documentation', color: 'gray', hasClick: true },
        ],
      },
    ],
  },
  {
    title: 'Token — Colors',
    description:
      'All 11 color variants in default and disabled states. Use color to categorize entities or convey status at a glance.',
    sections: [
      { label: 'Default', items: colorItems(false) },
      { label: 'Disabled', items: colorItems(true) },
    ],
  },
  {
    title: 'Token — End Content',
    description:
      'Tokens with trailing content like a count badge or status indicator after the label. Use for notification counts, item quantities, or compact status info.',
    heading: 'Trailing badges for counts or status',
    sections: [
      {
        label: 'Trailing badges for counts or status',
        items: [
          { label: 'Inbox', color: 'blue', endContent: '12' },
          { label: 'Reviews', color: 'purple', endContent: '3' },
          { label: 'Resolved', color: 'green', endContent: 'Done' },
        ],
      },
    ],
  },
  {
    title: 'Token — Icon',
    description:
      'Tokens with a leading icon that identifies the entity type. Use when the icon helps users recognize the token category faster, like a user icon for people or a tag icon for labels.',
    heading: 'Icons identify the token category',
    sections: [
      {
        label: 'Icons identify the token category',
        items: [
          { label: 'Sarah Chen', color: 'blue', icon: 'user' },
          { label: 'Featured', color: 'yellow', icon: 'star' },
          { label: 'Design', color: 'purple', icon: 'tag' },
          { label: 'Verified', color: 'green', icon: 'shield-check' },
        ],
      },
    ],
  },
  {
    title: 'Token — Removable',
    description:
      'Tokens with a dismiss button for selections the user can undo. Use in multi-select fields, active filters, or any list of user-chosen items.',
    sections: [
      {
        label: 'Active filters',
        items: [
          { label: 'Status: Open', color: 'green', hasRemove: true },
          { label: 'Priority: High', color: 'red', hasRemove: true },
          { label: 'Team: Design', color: 'purple', hasRemove: true },
        ],
      },
      {
        label: 'Selected recipients',
        items: [
          { label: 'Sarah Chen', color: 'blue', hasRemove: true },
          { label: 'Alex Rivera', color: 'blue', hasRemove: true },
          { label: 'Jordan Lee', color: 'blue', hasRemove: true },
        ],
      },
    ],
  },
]

const iconSource = (
  name: NonNullable<TokenItem['icon']>,
  isStyleX: boolean,
): string =>
  isStyleX
    ? `(h) => Icon.icon('${name}', { class: className(styles.iconSm) }, h)`
    : `(h) => Icon.icon('${name}', { class: 'size-3' }, h)`

const itemSource = (item: TokenItem, isStyleX: boolean): string => {
  const icon =
    item.icon === undefined ? [] : [`icon: ${iconSource(item.icon, isStyleX)}`]
  const props = [
    `label: '${item.label}'`,
    ...(item.color === undefined || item.color === 'default'
      ? []
      : [`color: '${item.color}'`]),
    ...(item.size === undefined ? [] : [`size: '${item.size}'`]),
    ...icon,
    ...(item.endContent === undefined
      ? []
      : [
          `endContent: [Badge.badge({ variant: 'secondary', children: ['${item.endContent}'] }, h)]`,
        ]),
    ...(item.isDisabled === true ? ['isDisabled: true'] : []),
    ...(item.hasClick === true ? ['onClick: NoOp()'] : []),
    ...(item.hasRemove === true ? ['onRemove: NoOp()'] : []),
  ]
  return `Token.token({ ${props.join(', ')} }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = tokenFixtures[index] ?? tokenFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const componentImports = [
    `import * as Icon from '@/lib/icon'`,
    isStyleX ? `import { className } from '@/stylex/style'` : '',
    `import * as Badge from '@/${isStyleX ? 'stylex' : 'ui'}/badge'`,
    isStyleX
      ? `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({ column: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }, gapLarge: { display: 'flex', flexDirection: 'column', gap: '2.5rem' }, row: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }, caption: { fontSize: '0.75rem', lineHeight: '1.25rem', color: 'var(--muted-foreground)' }, iconSm: { fontSize: '0.75rem', lineHeight: '1rem' } })`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const sections = fixture.sections
    .map(
      section => `h.div(
        [h.Class(${isStyleX ? "stylex.props(styles.column).className ?? ''" : "'flex flex-col gap-2'"})],
        [
          h.span([h.Class(${isStyleX ? "stylex.props(styles.caption).className ?? ''" : "'text-xs text-muted-foreground'"})], ['${section.label}']),
          h.div(
            [h.Class(${isStyleX ? "stylex.props(styles.row).className ?? ''" : "'flex flex-wrap gap-1'"})],
            [
              ${section.items.map(item => itemSource(item, isStyleX)).join(',\n              ')},
            ],
          ),
        ],
      )`,
    )
    .join(',\n        ')

  const singleSection =
    fixture.sections.length === 1 ? fixture.sections[0] : undefined
  const viewBody =
    singleSection !== undefined && singleSection.label === ''
      ? `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.row).className ?? ''" : "'flex flex-wrap items-center gap-2'"})],
      [
        ${singleSection.items.map(item => itemSource(item, isStyleX)).join(',\n        ')},
      ],
    )`
      : `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.gapLarge).className ?? ''" : "'flex flex-col gap-10'"})],
      [
        ${sections},
      ],
    )`

  return staticComponentApplication({
    componentName: 'Token',
    componentSlug: 'token',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const tokenExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  tokenFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const tokenExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, tokenExamplesFor(renderer))
