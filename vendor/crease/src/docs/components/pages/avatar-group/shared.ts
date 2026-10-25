import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

const FOLDKIT_SRC = 'https://github.com/foldkit.png'
const DEVIN_SRC = 'https://avatars.githubusercontent.com/in/811515?v=4'
const COGNITION_SRC = 'https://github.com/cognition-ai.png'
const CREASE_SRC = '/logo-mark.svg'

export type AvatarEntry = Readonly<{
  name: string
  /** Optional image source (data URI constant name in generated code). */
  src?: string
}>

export type AvatarGroupSection = Readonly<{
  label: string
  /** crease Avatar sizes: sm = 24px, default = 32px, lg = 40px — astryx AvatarGroup sm/md/lg. */
  size: 'sm' | 'default' | 'lg'
  ariaLabel?: string
  avatars: ReadonlyArray<AvatarEntry>
  overflow?: Readonly<{ count: number; onClick?: boolean }>
}>

export type StatusDotEntry = Readonly<{
  name: string
  variant: 'success' | 'neutral' | 'error'
  label: string
}>

export type AvatarGroupFixture = Readonly<{
  title: string
  description: string
  kind: 'groups' | 'status'
  sections: ReadonlyArray<AvatarGroupSection>
  statusDots?: ReadonlyArray<StatusDotEntry>
}>

const TEAM = [
  { name: 'Foldkit' },
  { name: 'Devin' },
  { name: 'Cognition AI' },
  { name: 'Crease UI' },
  { name: 'Astryx' },
]

const MEMBERS = [
  { name: 'Foldkit' },
  { name: 'Devin' },
  { name: 'Cognition AI' },
]

const PHOTO_USERS = [
  { name: 'Foldkit', src: FOLDKIT_SRC },
  { name: 'Devin', src: DEVIN_SRC },
  { name: 'Cognition AI', src: COGNITION_SRC },
  { name: 'Crease UI', src: CREASE_SRC },
]

export const avatarGroupFixtures: Readonly<
  [AvatarGroupFixture, ...Array<AvatarGroupFixture>]
> = [
  {
    title: 'Avatar Group',
    description:
      'Overlapping avatar rows with a sliced visible set and a server-side overflow count. Shows team members in a compact facepile layout.',
    kind: 'groups',
    sections: [
      { label: 'Team members', size: 'lg', avatars: TEAM },
      {
        label: 'With overflow',
        size: 'lg',
        avatars: TEAM.slice(0, 3),
        overflow: { count: 2 },
      },
    ],
  },
  {
    title: 'Avatar Group — Interactive',
    description:
      'Avatars can link and the overflow chip can open a full member list.',
    kind: 'groups',
    sections: [
      {
        label: 'Reviewers',
        size: 'lg',
        ariaLabel: 'Reviewers',
        avatars: MEMBERS,
        overflow: { count: 15, onClick: true },
      },
      {
        label: 'Compact, static',
        size: 'sm',
        ariaLabel: 'Attendees',
        avatars: MEMBERS,
        overflow: { count: 15 },
      },
    ],
  },
  {
    title: 'Avatar — Group',
    description:
      'Overlap multiple avatars in a row to represent a group of people. Use for team lists, PR reviewers, or participant counts where you want to show faces without taking up much space.',
    kind: 'groups',
    sections: [
      {
        label: 'Team members',
        size: 'lg',
        avatars: PHOTO_USERS,
        overflow: { count: 3 },
      },
      {
        label: 'Larger group',
        size: 'lg',
        avatars: PHOTO_USERS.slice(0, 3),
        overflow: { count: 8 },
      },
    ],
  },
  {
    title: 'Avatar — Status Dot',
    description:
      'Add a status dot to an avatar to show whether someone is online, away, or busy. Use in chat, messaging, or any UI where knowing availability matters.',
    kind: 'status',
    sections: [],
    statusDots: [
      { name: 'Foldkit', variant: 'success', label: 'Online' },
      { name: 'Devin', variant: 'neutral', label: 'Offline' },
      { name: 'Cognition AI', variant: 'error', label: 'Busy' },
    ],
  },
]

const initials = (name: string): string =>
  name
    .split(' ')
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 2)

const IMAGE_SRCS: Record<string, string> = {
  FOLDKIT_SRC,
  DEVIN_SRC,
  COGNITION_SRC,
  CREASE_SRC,
}
const uriConstName = (src: string): string =>
  Object.entries(IMAGE_SRCS).find(([, v]) => v === src)?.[0] ?? 'FOLDKIT_SRC'

const avatarSource = (
  entry: AvatarEntry,
  size: string,
  isStyleX: boolean,
): string => {
  const children =
    entry.src === undefined
      ? `[Avatar.avatarFallback({ children: ['${initials(entry.name)}'] }, h)]`
      : `[Avatar.avatarImage({ src: ${uriConstName(entry.src)}, alt: '${entry.name}', model: { status: 'loaded' } }, h)]`
  return isStyleX
    ? `Avatar.avatar({ size: '${size}', ring: true, layoutStyle: layoutStyle({ marginInlineStart: '${size === 'lg' ? '-0.625rem' : size === 'sm' ? '-0.375rem' : '-0.5rem'}' }), children: ${children} }, h)`
    : `Avatar.avatar({ size: '${size}', children: ${children} }, h)`
}

const sectionSource = (
  section: AvatarGroupSection,
  isStyleX: boolean,
): string => {
  const overflow =
    section.overflow === undefined
      ? ''
      : `,
          AvatarGroup.avatarGroupOverflow({ avatarSize: '${section.size === 'default' ? 'md' : section.size}', count: ${section.overflow.count}${section.overflow.onClick === true ? ', onClick: NoOp()' : ''} }, h)`
  return `h.div(
        [h.Class(${isStyleX ? "stylex.props(styles.section).className ?? ''" : "'flex flex-col gap-1.5'"})],
        [
          h.span([h.Class(${isStyleX ? "stylex.props(styles.caption).className ?? ''" : "'text-xs text-muted-foreground'"})], ['${section.label}']),
          AvatarGroup.avatarGroup({ ${section.ariaLabel === undefined ? '' : `ariaLabel: '${section.ariaLabel}', `}avatarSize: '${section.size === 'default' ? 'md' : section.size}', children: [
            ${section.avatars.map(a => avatarSource(a, section.size, isStyleX)).join(',\n            ')}${overflow},
          ] }, h),
        ],
      )`
}

const statusDotSource = (isStyleX: boolean): string => `
      h.div(
        [h.Class(${isStyleX ? "stylex.props(styles.row).className ?? ''" : "'flex items-center gap-4'"})],
        [
          ${(avatarGroupFixtures[3]?.statusDots ?? [])
            .map(
              dot => `h.div(
            [h.Class(${isStyleX ? "stylex.props(styles.avatarWrap).className ?? ''" : "'relative'"})],
            [
              Avatar.avatar({ size: 'lg', children: [Avatar.avatarFallback({ children: ['${initials(dot.name)}'] }, h)] }, h),
              h.div(
                [h.Class(${isStyleX ? "stylex.props(styles.dotSlot).className ?? ''" : "'absolute -bottom-1 -end-1'"})],
                [AvatarGroup.avatarStatusDot({ variant: '${dot.variant}', label: '${dot.label}', avatarSize: 'lg' }, h)],
              ),
            ],
          )`,
            )
            .join(',\n          ')},
        ],
      )`

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = avatarGroupFixtures[index] ?? avatarGroupFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const componentImports = [
    `import * as Avatar from '@/${isStyleX ? 'stylex' : 'ui'}/avatar'`,
    isStyleX
      ? `import * as stylex from '@stylexjs/stylex'
import type { ComponentLayoutStyle } from '@/stylex/contracts'

const styles = stylex.create({ column: { display: 'flex', flexDirection: 'column', gap: '2rem' }, section: { display: 'flex', flexDirection: 'column', gap: '0.375rem' }, caption: { fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--muted-foreground)' }, row: { display: 'flex', gap: '1rem', alignItems: 'center' }, avatarWrap: { position: 'relative' }, dotSlot: { position: 'absolute', bottom: '-4px', insetInlineEnd: '-4px' }, memberSm: { marginInlineStart: '-0.375rem', boxSizing: 'content-box', borderColor: 'var(--background)', borderStyle: 'solid', borderWidth: '2px' }, memberDefault: { marginInlineStart: '-0.5rem', boxSizing: 'content-box', borderColor: 'var(--background)', borderStyle: 'solid', borderWidth: '2px' }, memberLg: { marginInlineStart: '-0.625rem', boxSizing: 'content-box', borderColor: 'var(--background)', borderStyle: 'solid', borderWidth: '2px' } })`
      : '',
    ...Object.entries(IMAGE_SRCS).map(
      ([name, src]) => `const ${name} = '${src}'`,
    ),
  ]
    .filter(Boolean)
    .join('\n')

  const viewBody =
    fixture.kind === 'status'
      ? statusDotSource(isStyleX)
      : `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.column).className ?? ''" : "'flex flex-col gap-8'"})],
      [
        ${fixture.sections.map(s => sectionSource(s, isStyleX)).join(',\n        ')},
      ],
    )`

  return staticComponentApplication({
    componentName: 'AvatarGroup',
    componentSlug: 'avatar-group',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const avatarGroupExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  avatarGroupFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const avatarGroupExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, avatarGroupExamplesFor(renderer))
