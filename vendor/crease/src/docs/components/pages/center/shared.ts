import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

/* Astryx Center example blocks ported 1:1. astryx Card default padding →
   crease Card size 'sm' (16px); astryx Card padding={2} (8px) has no crease
   size — nearest is 'sm' (PORT-NOTE). astryx IconButton ghost sm becomes a
   ghost icon-sm Button with ariaLabel. */

export type CenterFixture = Readonly<{
  title: string
  description?: string
  kind: 'showcase' | 'horizontal' | 'insideCard'
}>

export const centerFixtures: Readonly<
  [CenterFixture, ...Array<CenterFixture>]
> = [
  {
    title: 'Center',
    description:
      'Content centered horizontally and vertically inside a fixed-height container.',
    kind: 'showcase',
  },
  {
    title: 'Center — Horizontal Center',
    description:
      'A formatting control group centered with axis="horizontal" in the default horizontal writing mode. In other writing modes, Center currently follows the flex main axis rather than guaranteeing physical horizontal centering.',
    kind: 'horizontal',
  },
  {
    title: 'Center — Vertical & Horizontal Center',
    description:
      'An empty state with an icon, heading, and description centered both vertically and horizontally inside a card. This is the most common use of Center: placing content in the middle of a fixed-height area like a panel, card, or content region. The height prop defines the centering space.',
    kind: 'insideCard',
  },
]

const emitShowcase = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const heading =
    renderer === 'tailwind'
      ? `h.h4([h.Class('text-sm font-semibold')], ['Centered content'])`
      : `h.h4([h.Class(stylex.props(styles.heading).className ?? '')], ['Centered content'])`
  const body =
    renderer === 'tailwind'
      ? `h.p([h.Class('text-sm text-muted-foreground')], ['Horizontally and vertically aligned.'])`
      : `h.p([h.Class(stylex.props(styles.body).className ?? '')], ['Horizontally and vertically aligned.'])`
  return `Center.center(
      { axis: 'both', width: '100%', height: 240, children: [
        Stack.vStack({ gap: 2, hAlign: 'center', children: [
          ${heading},
          ${body},
        ] }, h),
      ] },
      h,
    )`
}

const emitHorizontal = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const icon = (name: string): string =>
    renderer === 'tailwind'
      ? `icon('${name}', { class: 'size-4' }, h)`
      : `icon('${name}', {}, h)`
  const iconButton = (name: string, label: string): string =>
    `Button.button({ variant: 'ghost', size: 'icon-sm', ariaLabel: '${label}', children: [
                ${icon(name)},
              ] }, h)`
  const cardClass =
    renderer === 'tailwind'
      ? `class: 'w-[520px]'`
      : `layoutStyle: layoutStyle({ width: '32.5rem' })`
  return `Card.card(
      { size: 'sm', ${cardClass}, children: [
        Card.cardContent({ children: [
          Center.center(
            { axis: 'horizontal', width: '100%', children: [
              Stack.hStack({ gap: 0, vAlign: 'center', children: [
                ${iconButton('bold', 'Bold')},
                ${iconButton('italic', 'Italic')},
                ${iconButton('underline', 'Underline')},
                ${iconButton('list', 'List')},
                ${iconButton('link', 'Link')},
                ${iconButton('image', 'Image')},
              ] }, h),
            ] },
            h,
          ),
        ] }, h),
      ] },
      h,
    )`
}

const emitInsideCard = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const inboxIcon =
    renderer === 'tailwind'
      ? `icon('inbox', { class: 'size-6 text-muted-foreground' }, h)`
      : `icon('inbox', { class: stylex.props(styles.icon).className ?? '' }, h)`
  const heading =
    renderer === 'tailwind'
      ? `h.p([h.Class('text-sm font-semibold')], ['No messages yet'])`
      : `h.p([h.Class(stylex.props(styles.heading).className ?? '')], ['No messages yet'])`
  const body =
    renderer === 'tailwind'
      ? `h.p([h.Class('text-xs text-muted-foreground')], ['Messages from your team will appear here.'])`
      : `h.p([h.Class(stylex.props(styles.body).className ?? '')], ['Messages from your team will appear here.'])`
  const cardClass =
    renderer === 'tailwind'
      ? `class: 'w-[400px]'`
      : `layoutStyle: layoutStyle({ width: '25rem' })`
  return `Card.card(
      { size: 'sm', ${cardClass}, children: [
        Card.cardContent({ children: [
          Center.center(
            { height: 200, children: [
              Stack.vStack({ gap: 2, hAlign: 'center', children: [
                ${inboxIcon},
                ${heading},
                ${body},
              ] }, h),
            ] },
            h,
          ),
        ] }, h),
      ] },
      h,
    )`
}

const emitBody = (
  fixture: CenterFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'showcase':
      return emitShowcase(renderer)
    case 'horizontal':
      return emitHorizontal(renderer)
    case 'insideCard':
      return emitInsideCard(renderer)
  }
}

const stylexStylesFor = (kind: CenterFixture['kind']): string => {
  const entries: Array<string> = []
  if (kind === 'showcase') {
    entries.push(
      `  heading: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 600 }`,
    )
    entries.push(
      `  body: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' }`,
    )
  }
  if (kind === 'horizontal' || kind === 'insideCard') {
    entries.push(
      `  card: { width: '${kind === 'horizontal' ? '32.5rem' : '25rem'}' }`,
    )
  }
  if (kind === 'insideCard') {
    entries.push(
      `  icon: { color: 'var(--muted-foreground)', height: '1.5rem', width: '1.5rem' }`,
    )
    entries.push(
      `  heading: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 600 }`,
    )
    entries.push(
      `  body: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' }`,
    )
  }
  if (entries.length === 0) return ''
  return `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
${entries.join(',\n')},
})`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = centerFixtures[index] ?? centerFixtures[0]
  const mod = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const componentImports = [
    `import * as Stack from '@/${mod}/stack'`,
    fixture.kind !== 'showcase' ? `import * as Card from '@/${mod}/card'` : '',
    fixture.kind === 'horizontal'
      ? `import * as Button from '@/${mod}/button'
import { icon } from '@/lib/icon'`
      : '',
    fixture.kind === 'insideCard' ? `import { icon } from '@/lib/icon'` : '',
    renderer !== 'tailwind' ? stylexStylesFor(fixture.kind) : '',
  ]
    .filter(Boolean)
    .join('\n')
  return staticComponentApplication({
    componentName: 'Center',
    componentSlug: 'center',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody: emitBody(fixture, renderer),
  })
}

const centerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  centerFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const centerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, centerExamplesFor(renderer))
