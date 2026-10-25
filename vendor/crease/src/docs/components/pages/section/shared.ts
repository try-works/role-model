import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

/* Astryx Section example blocks ported 1:1. astryx display-3 (29px/36px) →
   text-[29px] leading-9; body bold → text-sm font-semibold; supporting
   secondary → text-xs text-muted-foreground. */

export type SectionFixture = Readonly<{
  title: string
  description?: string
  kind: 'variants' | 'wash' | 'dividers'
}>

export const sectionFixtures: Readonly<
  [SectionFixture, ...Array<SectionFixture>]
> = [
  {
    title: 'Section — Variants',
    description:
      'All three background variants stacked: section (default surface), muted, and transparent. A quick visual reference for choosing the right variant.',
    kind: 'variants',
  },
  {
    title: 'Section — Default with Wash',
    description:
      'A default section stacked with a full-width muted section. Shows how muted draws attention to a specific region like an upgrade prompt or banner.',
    kind: 'wash',
  },
  {
    title: 'Section — With Dividers',
    description:
      'Adjacent sections separated by bottom dividers, like a settings page. Use dividers when stacking same-variant sections that need visual separation without a background change.',
    kind: 'dividers',
  },
]

export const sectionFeatures: ReadonlyArray<string> = [
  '10 team members',
  'Unlimited projects',
  'Priority support',
  'Advanced analytics',
]

const featuresSource = `const FEATURES = [
  '10 team members',
  'Unlimited projects',
  'Priority support',
  'Advanced analytics',
]`

const boldBodyTw = (child: string): string =>
  `h.p([h.Class('text-sm font-semibold')], [${child}])`
const boldBodySx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.boldBody).className ?? '')], [${child}])`
const supportingTw = (child: string): string =>
  `h.p([h.Class('text-xs text-muted-foreground')], [${child}])`
const supportingSx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.supporting).className ?? '')], [${child}])`
const bodyTw = (child: string): string =>
  `h.p([h.Class('text-sm')], [${child}])`
const bodySx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.body).className ?? '')], [${child}])`
const bodyMutedTw = (child: string): string =>
  `h.p([h.Class('text-sm text-muted-foreground')], [${child}])`
const bodyMutedSx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.bodyMuted).className ?? '')], [${child}])`
const displayTw = (child: string): string =>
  `h.p([h.Class('text-[29px] leading-9 font-normal')], [${child}])`
const displaySx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.display).className ?? '')], [${child}])`
const headingTw = (child: string): string =>
  `h.h4([h.Class('text-sm font-semibold')], [${child}])`
const headingSx = boldBodySx

const emitVariants = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const bold = renderer === 'tailwind' ? boldBodyTw : boldBodySx
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const inner = (title: string, desc: string): string =>
    `Stack.vStack({ gap: 1, children: [
            ${bold(`'${title}'`)},
            ${supporting(`'${desc}'`)},
          ] }, h)`
  return `Stack.vStack({ gap: 6, children: [
        Section.section({ variant: 'section', padding: 5, children: [
          ${inner('Section', 'White background.')},
        ] }, h),
        Section.section({ variant: 'muted', padding: 5, children: [
          ${inner('Wash', 'Gray background.')},
        ] }, h),
        Section.section({ variant: 'transparent', padding: 5, children: [
          ${inner('Transparent', 'No background, shows the color behind it.')},
        ] }, h),
      ] }, h)`
}

const emitWash = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const display = renderer === 'tailwind' ? displayTw : displaySx
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const bodyMuted = renderer === 'tailwind' ? bodyMutedTw : bodyMutedSx
  const body = renderer === 'tailwind' ? bodyTw : bodySx
  const checkIcon =
    renderer === 'tailwind'
      ? `icon('check', { class: 'size-4' }, h)`
      : `icon('check', {}, h)`
  return `Stack.vStack({ gap: 2, children: [
        Section.section({ variant: 'section', padding: 4, children: [
          Stack.vStack({ gap: 3, hAlign: 'center', children: [
            Stack.vStack({ gap: 1, hAlign: 'center', children: [
              ${display(`'Pro Plan'`)},
              ${bodyMuted(`'Everything you need to scale your team.'`)},
            ] }, h),
            Stack.vStack({ gap: 2, children: [
              ...FEATURES.map(feature =>
                Stack.hStack({ gap: 2, vAlign: 'center', children: [
                  ${checkIcon},
                  ${body('feature')},
                ] }, h),
              ),
            ] }, h),
          ] }, h),
        ] }, h),
        Section.section({ variant: 'muted', padding: 6, children: [
          Stack.vStack({ gap: 2, hAlign: 'center', children: [
            Stack.hStack({ gap: 2, vAlign: 'center', children: [
              ${display(`'$49'`)},
              ${supporting(`'/ month'`)},
            ] }, h),
            Button.button({ children: ['Upgrade'] }, h),
          ] }, h),
        ] }, h),
      ] }, h)`
}

const emitDividers = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const heading = renderer === 'tailwind' ? headingTw : headingSx
  const bodyMuted = renderer === 'tailwind' ? bodyMutedTw : bodyMutedSx
  const row = (title: string, desc: string, dividers: string): string =>
    `Section.section({ variant: 'section', padding: 5${dividers}, children: [
          Stack.vStack({ gap: 1, children: [
            ${heading(`'${title}'`)},
            ${bodyMuted(`'${desc}'`)},
          ] }, h),
        ] }, h)`
  return `Stack.vStack({ gap: 0, children: [
        ${row('Account', 'Manage your profile, email, and password.', `, dividers: ['bottom']`)},
        ${row('Notifications', 'Choose what updates you receive and how.', `, dividers: ['bottom']`)},
        ${row('Privacy', 'Control who can see your activity and data.', '')},
      ] }, h)`
}

const emitBody = (
  fixture: SectionFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'variants':
      return emitVariants(renderer)
    case 'wash':
      return emitWash(renderer)
    case 'dividers':
      return emitDividers(renderer)
  }
}

const stylexStylesFor = (kind: SectionFixture['kind']): string => {
  const entries: Array<string> = []
  entries.push(
    `  boldBody: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 600 }`,
  )
  entries.push(
    `  supporting: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' }`,
  )
  entries.push(
    `  bodyMuted: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' }`,
  )
  if (kind === 'wash') {
    entries.push(
      `  display: { fontSize: '1.8125rem', fontWeight: 400, lineHeight: '1.2414' }`,
    )
    entries.push(`  body: { fontSize: '0.875rem', lineHeight: '1.25rem' }`)
  }
  return `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
${entries.join(',\n')},
})`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = sectionFixtures[index] ?? sectionFixtures[0]
  const mod = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const componentImports = [
    `import * as Stack from '@/${mod}/stack'`,
    fixture.kind === 'wash'
      ? `import * as Button from '@/${mod}/button'
import { icon } from '@/lib/icon'

${featuresSource}`
      : '',
    renderer !== 'tailwind' ? stylexStylesFor(fixture.kind) : '',
  ]
    .filter(Boolean)
    .join('\n')
  return staticComponentApplication({
    componentName: 'Section',
    componentSlug: 'section',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody: emitBody(fixture, renderer),
  })
}

const sectionExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  sectionFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const sectionExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, sectionExamplesFor(renderer))
