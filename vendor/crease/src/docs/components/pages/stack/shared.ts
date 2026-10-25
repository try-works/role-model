import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

/* Astryx Stack/HStack/VStack/StackItem example blocks ported 1:1. Astryx
   Token → crease Badge secondary and astryx Badge default (neutral tint) →
   crease Badge secondary; astryx primary Button → crease default; astryx
   Text supporting/secondary → muted small text; astryx Card padding={4}
   and padding={3} → crease Card size 'sm' (16px — closest named density;
   astryx's 12px step has no crease equivalent). */

export type StackFixture = Readonly<{
  title: string
  description: string
  kind:
    | 'directions'
    | 'alignment'
    | 'fillItem'
    | 'hBasic'
    | 'hShowcase'
    | 'vBasic'
    | 'vShowcase'
    | 'itemFill'
    | 'itemShowcase'
}>

export const stackFixtures: Readonly<[StackFixture, ...Array<StackFixture>]> = [
  {
    title: 'Stack — Directions',
    description:
      'Badges arranged horizontally and vertically in side-by-side cards.',
    kind: 'directions',
  },
  {
    title: 'Stack — Alignment',
    description: 'Buttons positioned at the start, center, and end of a row.',
    kind: 'alignment',
  },
  {
    title: 'Stack — Fill Item',
    description:
      'An avatar, text, and button in a row; the text stretches to fill the available space.',
    kind: 'fillItem',
  },
  {
    title: 'HStack — Basic',
    description:
      'Items arranged in a horizontal row with a consistent gap and centered vertical alignment. Use HStack whenever siblings should sit side by side.',
    kind: 'hBasic',
  },
  {
    title: 'H Stack',
    description:
      'Demonstrates HStack arranging items horizontally with different gaps and alignments.',
    kind: 'hShowcase',
  },
  {
    title: 'VStack — Basic',
    description:
      'A heading and paragraphs stacked vertically with a consistent gap. Use VStack whenever siblings should flow top to bottom with even spacing.',
    kind: 'vBasic',
  },
  {
    title: 'V Stack',
    description:
      'Demonstrates VStack arranging items vertically with different gaps.',
    kind: 'vShowcase',
  },
  {
    title: 'StackItem — Fill',
    description:
      'A static-width item next to one that fills the remaining space. Wrap stack children in StackItem when an item needs explicit sizing control.',
    kind: 'itemFill',
  },
  {
    title: 'Stack Item',
    description:
      'StackItem can be used within HStack or VStack for more granular control over individual item sizing and alignment, but is optional; stack children work without it.',
    kind: 'itemShowcase',
  },
]

export type StackUser = Readonly<{
  name: string
  role: string
  initials: string
}>

export const stackUsers: ReadonlyArray<StackUser> = [
  { name: 'Olivia Chen', role: 'Engineering Lead', initials: 'OC' },
  { name: 'Marcus Rivera', role: 'Product Designer', initials: 'MR' },
  { name: 'Aisha Patel', role: 'Marketing Manager', initials: 'AP' },
]

export type StackShowcaseGroup = Readonly<{
  label: string
  gap: 2 | 4 | 6
  hAlign: 'start' | 'center' | 'between'
  items: ReadonlyArray<string>
}>

export const stackShowcaseGroups: ReadonlyArray<StackShowcaseGroup> = [
  {
    label: 'HAlign: start',
    gap: 2,
    hAlign: 'start',
    items: ['Foldkit', 'TypeScript', 'Node.js'],
  },
  {
    label: 'HAlign: center',
    gap: 4,
    hAlign: 'center',
    items: ['Design', 'Engineering', 'Product'],
  },
  {
    label: 'HAlign: between',
    gap: 2,
    hAlign: 'between',
    items: ['Start', 'Middle', 'End'],
  },
]

export const stackGapGroups: ReadonlyArray<{ label: string; gap: 2 | 4 | 6 }> =
  [
    { label: 'gap=2', gap: 2 },
    { label: 'gap=4', gap: 4 },
    { label: 'gap=6', gap: 6 },
  ]

export const stackAlignmentRows: ReadonlyArray<{
  label: string
  hAlign: 'start' | 'center' | 'end'
}> = [
  { label: 'Start (left)', hAlign: 'start' },
  { label: 'Center', hAlign: 'center' },
  { label: 'End (right)', hAlign: 'end' },
]

/* Code emitters — child arguments are emitted raw, so callers pass a quoted
   literal ('Step 1') or an expression (group.label, user.name). */

const supportingTw = (child: string): string =>
  `h.p([h.Class('text-xs text-muted-foreground')], [${child}])`
const supportingSx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.supporting).className ?? '')], [${child}])`
const nameTw = (child: string): string =>
  `h.p([h.Class('text-sm font-semibold')], [${child}])`
const nameSx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.name).className ?? '')], [${child}])`

const badgeFor = (labelChild: string): string =>
  `Badge.badge({ variant: 'secondary', children: [${labelChild}] }, h)`

const cardLabelTw = (label: string): string =>
  `Card.card({ size: 'sm', children: [
              Card.cardContent({ children: [${supportingTw(`'${label}'`)}] }, h),
            ] }, h)`
const cardLabelSx = (label: string): string =>
  `Card.card({ size: 'sm', children: [
              Card.cardContent({ children: [${supportingSx(`'${label}'`)}] }, h)],
            }, h)`

const emitDirection = (badge: (label: string) => string): string =>
  `Stack.hStack(
      {
        gap: 10,
        hAlign: 'center',
        children: [
          Stack.hStack(
            { gap: 2, vAlign: 'center', children: [
              ${badge(`'Horizontal'`)},
              ${badge(`'Horizontal'`)},
              ${badge(`'Horizontal'`)},
            ] },
            h,
          ),
          Stack.vStack(
            { gap: 2, children: [
              ${badge(`'Vertical'`)},
              ${badge(`'Vertical'`)},
              ${badge(`'Vertical'`)},
            ] },
            h,
          ),
        ],
      },
      h,
    )`

const emitAlignment = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  return `Stack.stack(
      {
        direction: 'vertical',
        gap: 3,
        width: '100%',
        maxWidth: 500,
        children: [
          ${stackAlignmentRows
            .map(
              row => `Card.card({ size: 'sm', children: [
            Card.cardContent({ children: [
              Stack.vStack({ gap: 4, children: [
                ${supporting(`'${row.label}'`)},
                Stack.hStack({ gap: 1, hAlign: '${row.hAlign}', children: [
                  Button.button({ variant: 'secondary', size: 'sm', children: ['Cancel'] }, h),
                  Button.button({ size: 'sm', children: ['Save'] }, h),
                ] }, h),
              ] }, h),
            ] }, h),
          ] }, h)`,
            )
            .join(',\n          ')},
        ],
      },
      h,
    )`
}

const emitFillItem = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const name = renderer === 'tailwind' ? nameTw : nameSx
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  return `Stack.vStack(
      { gap: 3, width: '100%', maxWidth: 300, children: [
        ...USERS.map(user =>
          Stack.hStack(
            { gap: 3, vAlign: 'center', children: [
              Stack.stackItem({ size: 'static', children: [
                Avatar.avatar({ children: [
                  Avatar.avatarFallback({ children: [user.initials] }, h),
                ] }, h),
              ] }, h),
              Stack.stackItem({ size: 'fill', children: [
                Stack.vStack({ gap: 0, children: [
                  ${name('user.name')},
                  ${supporting('user.role')},
                ] }, h),
              ] }, h),
              Stack.stackItem({ size: 'static', children: [
                Button.button({ variant: 'secondary', size: 'sm', children: ['View'] }, h),
              ] }, h),
            ] },
            h,
          ),
        ),
      ] },
      h,
    )`
}

const emitHBasic = (badge: (label: string) => string): string =>
  `Stack.hStack(
      { gap: 2, vAlign: 'center', children: [
        ${badge(`'Foldkit'`)},
        ${badge(`'TypeScript'`)},
        ${badge(`'Node.js'`)},
      ] },
      h,
    )`

const emitHShowcase = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const badge = badgeFor
  return `Stack.vStack(
      { gap: 6, width: '100%', maxWidth: 400, children: [
        ...GROUPS.map(group =>
          Stack.vStack({ gap: 2, children: [
            ${supporting('group.label')},
            Stack.hStack({ gap: group.gap, hAlign: group.hAlign, children: [
              ...group.items.map(label => ${badge('label')}),
            ] }, h),
          ] }, h),
        ),
      ] },
      h,
    )`
}

const emitVBasic = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const heading =
    renderer === 'tailwind'
      ? `h.h5([h.Class('text-xs font-semibold')], ['Weekly Report'])`
      : `h.h5([h.Class(stylex.props(styles.heading).className ?? '')], ['Weekly Report'])`
  const body = (text: string): string =>
    renderer === 'tailwind'
      ? `h.p([h.Class('text-sm text-muted-foreground')], ['${text}'])`
      : `h.p([h.Class(stylex.props(styles.body).className ?? '')], ['${text}'])`
  return `Stack.vStack(
      { gap: 3, children: [
        ${heading},
        ${body('VStack arranges its children in a vertical column.')},
        ${body('The gap prop controls the spacing between each item.')},
      ] },
      h,
    )`
}

const emitVShowcase = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const badge = badgeFor
  return `Stack.hStack(
      { gap: 10, hAlign: 'center', children: [
        ...GROUPS.map(group =>
          Stack.vStack({ gap: 2, children: [
            ${supporting('group.label')},
            Stack.vStack({ gap: group.gap, children: [
              ${badge(`'Step 1'`)},
              ${badge(`'Step 2'`)},
              ${badge(`'Step 3'`)},
            ] }, h),
          ] }, h),
        ),
      ] },
      h,
    )`
}

const emitItemFill = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  maxWidth: number,
  trailing: boolean,
): string => {
  const card = renderer === 'tailwind' ? cardLabelTw : cardLabelSx
  const trailingItem = trailing
    ? `
        Stack.stackItem({ size: 'static', children: [
          ${card('Static Width')},
        ] }, h),`
    : ''
  return `Stack.hStack(
      { gap: 3, vAlign: 'center', width: '100%', maxWidth: ${String(maxWidth)}, children: [
        Stack.stackItem({ size: 'static', children: [
          ${card(trailing ? 'Static Width' : 'Static')},
        ] }, h),
        Stack.stackItem({ size: 'fill', children: [
          ${card('Fills remaining space')},
        ] }, h),${trailingItem}
      ] },
      h,
    )`
}

const emitBody = (
  fixture: StackFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const badge = badgeFor
  switch (fixture.kind) {
    case 'directions':
      return emitDirection(badge)
    case 'alignment':
      return emitAlignment(renderer)
    case 'fillItem':
      return emitFillItem(renderer)
    case 'hBasic':
      return emitHBasic(badge)
    case 'hShowcase':
      return emitHShowcase(renderer)
    case 'vBasic':
      return emitVBasic(renderer)
    case 'vShowcase':
      return emitVShowcase(renderer)
    case 'itemFill':
      return emitItemFill(renderer, 400, false)
    case 'itemShowcase':
      return emitItemFill(renderer, 500, true)
  }
}

const stackUsersSource = `const USERS = [
  { name: 'Olivia Chen', role: 'Engineering Lead', initials: 'OC' },
  { name: 'Marcus Rivera', role: 'Product Designer', initials: 'MR' },
  { name: 'Aisha Patel', role: 'Marketing Manager', initials: 'AP' },
]`

const hGroupsSource = `const GROUPS = [
  { label: 'HAlign: start', gap: 2, hAlign: 'start', items: ['Foldkit', 'TypeScript', 'Node.js'] },
  { label: 'HAlign: center', gap: 4, hAlign: 'center', items: ['Design', 'Engineering', 'Product'] },
  { label: 'HAlign: between', gap: 2, hAlign: 'between', items: ['Start', 'Middle', 'End'] },
] as const`

const vGroupsSource = `const GROUPS = [
  { label: 'gap=2', gap: 2 },
  { label: 'gap=4', gap: 4 },
  { label: 'gap=6', gap: 6 },
] as const`

const usesBadge = (kind: StackFixture['kind']): boolean =>
  kind === 'directions' ||
  kind === 'hBasic' ||
  kind === 'hShowcase' ||
  kind === 'vShowcase'
const usesButton = (kind: StackFixture['kind']): boolean =>
  kind === 'alignment' || kind === 'fillItem'
const usesCard = (kind: StackFixture['kind']): boolean =>
  kind === 'alignment' || kind === 'itemFill' || kind === 'itemShowcase'
const usesAvatar = (kind: StackFixture['kind']): boolean => kind === 'fillItem'

const stylexStylesFor = (kind: StackFixture['kind']): string => {
  const entries: Array<string> = []
  if (kind !== 'hBasic' && kind !== 'vBasic') {
    entries.push(
      `  supporting: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' }`,
    )
  }
  if (kind === 'fillItem') {
    entries.push(
      `  name: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 600 }`,
    )
  }
  if (kind === 'vBasic') {
    entries.push(
      `  heading: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 600 }`,
    )
    entries.push(
      `  body: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' }`,
    )
  }
  if (entries.length === 0) return ''
  return `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
${entries.join(',\n')},
})`
}

const extraSourceFor = (kind: StackFixture['kind']): string => {
  switch (kind) {
    case 'fillItem':
      return stackUsersSource
    case 'hShowcase':
      return hGroupsSource
    case 'vShowcase':
      return vGroupsSource
    default:
      return ''
  }
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = stackFixtures[index] ?? stackFixtures[0]
  const mod = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const componentImports = [
    usesBadge(fixture.kind) ? `import * as Badge from '@/${mod}/badge'` : '',
    usesButton(fixture.kind) ? `import * as Button from '@/${mod}/button'` : '',
    usesCard(fixture.kind) ? `import * as Card from '@/${mod}/card'` : '',
    usesAvatar(fixture.kind) ? `import * as Avatar from '@/${mod}/avatar'` : '',
    extraSourceFor(fixture.kind),
    renderer !== 'tailwind' ? stylexStylesFor(fixture.kind) : '',
  ]
    .filter(Boolean)
    .join('\n')
  return staticComponentApplication({
    componentName: 'Stack',
    componentSlug: 'stack',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody: emitBody(fixture, renderer),
  })
}

const stackExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  stackFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const stackExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, stackExamplesFor(renderer))
