import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type ListExampleKind =
  | 'showcase'
  | 'basic'
  | 'bulleted'
  | 'messageList'
  | 'ordered'

export type ListItemSpec = Readonly<{
  label: string
  description?: string
  initials?: string
  badge?: string
}>

export type ListFixture = Readonly<{
  title: string
  description?: string
  kind: ListExampleKind
  listStyle?: 'none' | 'disc' | 'decimal'
  hasDividers?: boolean
  items: ReadonlyArray<ListItemSpec>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/List/*.tsx — same demos,
   same labels and copy. */
export const listFixtures: Readonly<[ListFixture, ...Array<ListFixture>]> = [
  {
    title: 'List',
    description: 'Simple list of settings with labels and descriptions.',
    kind: 'showcase',
    items: [
      { label: 'Notifications', description: 'Manage your alerts' },
      { label: 'Privacy', description: 'Control your data' },
      { label: 'Security', description: 'Password and 2FA' },
    ],
  },
  {
    title: 'List — Basic',
    description: 'Label and description rows without markers or dividers.',
    kind: 'basic',
    items: [
      { label: 'Notifications', description: 'Manage your alerts' },
      { label: 'Privacy', description: 'Control your data' },
      { label: 'Security', description: 'Password and 2FA' },
    ],
  },
  {
    title: 'List — Bulleted Features',
    description: 'Disc-marked feature list.',
    kind: 'bulleted',
    listStyle: 'disc',
    items: [
      { label: 'Accessible by default' },
      { label: 'Themeable with StyleX' },
      { label: 'Composable and extensible' },
    ],
  },
  {
    title: 'List — Message List',
    description:
      'Divided list with avatar start content and badge end content for chat previews.',
    kind: 'messageList',
    hasDividers: true,
    items: [
      {
        label: 'Alex Johnson',
        description: 'Hey, are we still on for lunch tomorrow?',
        initials: 'AJ',
        badge: '2',
      },
      {
        label: 'Sam Rivera',
        description: 'I pushed the latest changes to the repo',
        initials: 'SR',
      },
      {
        label: 'Jordan Lee',
        description: 'Can you review the design spec when you get a chance?',
        initials: 'JL',
        badge: '5',
      },
    ],
  },
  {
    title: 'List — Ordered Steps',
    description: 'Decimal-numbered setup steps.',
    kind: 'ordered',
    listStyle: 'decimal',
    items: [
      {
        label: 'Add the component',
        description: 'npx creaseui add list',
      },
      {
        label: 'Import components',
        description: "import * as List from '@/ui/list'",
      },
      { label: 'Start building', description: 'Use components in your app' },
    ],
  },
]

const itemSource = (item: ListItemSpec, fixture: ListFixture): string => {
  const props: string[] = [`label: '${item.label.replace(/'/g, "\\'")}'`]
  // listItem is context-free — forward the parent list's shared config.
  if (fixture.listStyle !== undefined) {
    props.push(`listStyle: '${fixture.listStyle}'`)
  }
  if (fixture.hasDividers === true) {
    props.push('hasDividers: true')
  }
  if (item.description !== undefined) {
    props.push(`description: '${item.description.replace(/'/g, "\\'")}'`)
  }
  if (item.initials !== undefined) {
    props.push(
      `startContent: Avatar.avatar({ children: [Avatar.avatarFallback({ children: ['${item.initials}'] }, h)] }, h)`,
      'onClick: NoOp()',
    )
  }
  if (item.badge !== undefined) {
    props.push(`endContent: Badge.badge({ children: ['${item.badge}'] }, h)`)
  }
  return `List.listItem({\n        ${props.join(',\n        ')}\n      }, h)`
}

const viewBody = (fixture: ListFixture): string => {
  const listProps: string[] = []
  if (fixture.listStyle !== undefined) {
    listProps.push(`listStyle: '${fixture.listStyle}'`)
  }
  if (fixture.hasDividers === true) {
    listProps.push('hasDividers: true')
  }
  const items = fixture.items
    .map(item => itemSource(item, fixture))
    .join(',\n      ')
  return `List.list(
      {
        children: [
      ${items},
        ]${listProps.length === 0 ? '' : `,\n        ${listProps.join(',\n        ')}`}
      },
      h,
    )`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = listFixtures[index] ?? listFixtures[0]
  const base = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const imports: string[] = []
  if (fixture.kind === 'messageList') {
    imports.push(
      `import * as Avatar from '@/${base}/avatar'`,
      `import * as Badge from '@/${base}/badge'`,
    )
  }
  return staticComponentApplication({
    componentName: 'List',
    componentSlug: 'list',
    renderer,
    exampleName: fixture.title,
    ...(imports.length === 0 ? {} : { componentImports: imports.join('\n') }),
    viewBody: viewBody(fixture),
  })
}

const listExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  listFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const listExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, listExamplesFor(renderer))
