import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

/* Astryx VisuallyHidden example blocks ported 1:1. astryx Card variant="muted"
   (borderless muted surface) → bg-muted + transparent border + no shadow in
   Tailwind, a stylex.create'd muted panel in StyleX. astryx Badge
   success/error tints map to crease secondary/destructive. The live-region
   example's useState cycle becomes a foldkit application. */

export type VisuallyHiddenFixture = Readonly<{
  title: string
  description?: string
  kind: 'showcase' | 'liveRegion' | 'heading' | 'supplementary'
}>

export const visuallyHiddenFixtures: Readonly<
  [VisuallyHiddenFixture, ...Array<VisuallyHiddenFixture>]
> = [
  {
    title: 'VisuallyHidden',
    kind: 'showcase',
  },
  {
    title: 'VisuallyHidden — Live Region',
    description:
      'A polite aria-live region announces visual-only state changes to assistive technology.',
    kind: 'liveRegion',
  },
  {
    title: 'VisuallyHidden — Structural Heading',
    description:
      'Give a visually implicit section an accessible name so screen-reader users can navigate to it.',
    kind: 'heading',
  },
  {
    title: 'VisuallyHidden — Supplementary Context',
    description:
      'Add screen-reader-only context to terse visual data, like spelling out what a trend arrow means.',
    kind: 'supplementary',
  },
]

export const vhActions: ReadonlyArray<{ label: string; icon: string }> = [
  { label: 'Download', icon: 'download' },
  { label: 'Share', icon: 'share' },
  { label: 'Delete', icon: 'trash-2' },
]

export const vhItems: ReadonlyArray<{
  name: string
  status: string
  variant: 'success' | 'error'
}> = [
  { name: 'creaseui-core', status: 'Passing', variant: 'success' },
  { name: 'creaseui-charts', status: 'Failing', variant: 'error' },
  { name: 'creaseui-cli', status: 'Passing', variant: 'success' },
]

export const vhStats: ReadonlyArray<{
  label: string
  value: string
  delta: string
  direction: 'up' | 'down'
}> = [
  { label: 'Revenue', value: '$48.2k', delta: '+12%', direction: 'up' },
  { label: 'Churn', value: '2.1%', delta: '-4%', direction: 'down' },
]

const actionsSource = `const ACTIONS = [
  { label: 'Download', icon: 'download' },
  { label: 'Share', icon: 'share' },
  { label: 'Delete', icon: 'trash-2' },
] as const`

const itemsSource = `const ITEMS = [
  { name: 'creaseui-core', status: 'Passing', variant: 'secondary' },
  { name: 'creaseui-charts', status: 'Failing', variant: 'destructive' },
  { name: 'creaseui-cli', status: 'Passing', variant: 'secondary' },
] as const`

const statsSource = `const STATS = [
  { label: 'Revenue', value: '$48.2k', delta: '+12%', direction: 'up' },
  { label: 'Churn', value: '2.1%', delta: '-4%', direction: 'down' },
] as const`

const columnsSource = `const COLUMNS = ['Backlog', 'In progress', 'Done'] as const`

const supportingTw = (child: string): string =>
  `h.p([h.Class('text-xs text-muted-foreground')], [${child}])`
const supportingSx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.supporting).className ?? '')], [${child}])`
const bodyTw = (child: string): string =>
  `h.p([h.Class('text-sm')], [${child}])`
const bodySx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.body).className ?? '')], [${child}])`
const displayTw = (child: string): string =>
  `h.p([h.Class('text-[29px] leading-9 font-normal')], [${child}])`
const displaySx = (child: string): string =>
  `h.p([h.Class(stylex.props(styles.display).className ?? '')], [${child}])`

const mutedCardTw = (children: string): string =>
  `Card.card({ size: 'sm', class: 'bg-muted border-transparent shadow-none', children: [
            Card.cardContent({ children: [
              ${children},
            ] }, h),
          ] }, h)`
const mutedCardSx = (children: string): string =>
  `h.div([h.Class(stylex.props(styles.mutedCard).className ?? '')], [
            ${children},
          ])`

const emitShowcase = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const body = renderer === 'tailwind' ? bodyTw : bodySx
  const card = renderer === 'tailwind' ? mutedCardTw : mutedCardSx
  const speaker =
    renderer === 'tailwind'
      ? `icon('volume-2', { class: 'size-4 text-muted-foreground' }, h)`
      : `icon('volume-2', { class: stylex.props(styles.smallIcon).className ?? '' }, h)`
  const iconButton =
    renderer === 'tailwind'
      ? `Stack.hStack({ gap: 2, children: [
                ...ACTIONS.map(action =>
                  Button.button({ variant: 'ghost', size: 'icon', ariaLabel: action.label, children: [
                    icon(action.icon, { class: 'size-4' }, h),
                  ] }, h),
                ),
              ] }, h)`
      : `Stack.hStack({ gap: 2, children: [
                ...ACTIONS.map(action =>
                  Button.button({ variant: 'ghost', size: 'icon', ariaLabel: action.label, children: [
                    icon(action.icon, {}, h),
                  ] }, h),
                ),
              ] }, h)`
  return `Stack.vStack({ gap: 5, hAlign: 'center', children: [
        Stack.hStack({ gap: 6, vAlign: 'stretch', wrap: 'wrap', hAlign: 'center', children: [
          ${card(`Stack.vStack({ gap: 4, hAlign: 'center', children: [
              ${supporting(`'What you see'`)},
              ${iconButton},
            ] }, h)`)},
          ${card(`Stack.vStack({ gap: 4, hAlign: 'start', children: [
              Stack.hStack({ gap: 2, vAlign: 'center', children: [
                ${speaker},
                ${supporting(`'What a screen reader hears'`)},
              ] }, h),
              Stack.vStack({ gap: 2, children: [
                ...ACTIONS.map(action =>
                  ${body('`${action.label}, button`')},
                ),
              ] }, h),
            ] }, h)`)},
        ] }, h),
        /* A real live region: silent to sighted users, announced by AT. */
        VisuallyHidden.visuallyHidden(
          { as: 'div', ariaLive: 'polite', children: ['Actions available: Download, Share, Delete.'] },
          h,
        ),
      ] }, h)`
}

const emitLiveRegion = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const mod = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const stylesSource =
    renderer !== 'tailwind'
      ? `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  shell: { alignItems: 'flex-start', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  shellWrap: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
  },
  supporting: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' },
  body: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  bodyBold: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 700 },
})`
      : ''
  const bodyMarkup =
    renderer === 'tailwind'
      ? `h.p([h.Class('text-sm')], [
                'Task is in ',
                h.span([h.Class('font-bold')], [COLUMNS[model.column] ?? '']),
              ])`
      : `h.p([h.Class(stylex.props(styles.body).className ?? '')], [
                'Task is in ',
                h.span([h.Class(stylex.props(styles.bodyBold).className ?? '')], [COLUMNS[model.column] ?? '']),
              ])`
  const wrapClass =
    renderer === 'tailwind'
      ? `h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen flex-col items-start justify-center p-8'"})`
      : `h.Class(stylex.props(styles.shellWrap).className ?? '')`
  return foldkitApplication({
    title: 'VisuallyHidden — Live Region',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${stylesSource === '' ? '' : `\n${stylesSource}`}
import * as Stack from '@/${mod}/stack'
import * as Button from '@/${mod}/button'
import * as VisuallyHidden from '@/${mod}/visually-hidden'

${columnsSource}`,
    model: `export const Model = S.Struct({
  column: S.Number,
})
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  MovedTask: {},
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { column: 0 },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'MovedTask':
      return { model: { column: (model.column + 1) % COLUMNS.length } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'VisuallyHidden — Live Region',
  body: h.main([${wrapClass}], [
    Stack.vStack({ gap: 4, hAlign: 'start', children: [
      ${supporting(`'Drag-and-drop and other visual-only changes are silent to screen readers. A live region narrates them.'`)},
      Stack.hStack({ gap: 3, vAlign: 'center', children: [
        Button.button({ variant: 'secondary', children: ['Move task'], onClick: Message.MovedTask() }, h),
        ${bodyMarkup},
      ] }, h),
      VisuallyHidden.visuallyHidden(
        { as: 'div', ariaLive: 'polite', children: [\`Task moved to \${COLUMNS[model.column] ?? ''}\`] },
        h,
      ),
    ] }, h),
  ]),
})`,
  })
}

const emitHeading = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const body = renderer === 'tailwind' ? bodyTw : bodySx
  const card = renderer === 'tailwind' ? mutedCardTw : mutedCardSx
  return `Stack.vStack({ gap: 3, hAlign: 'start', children: [
        ${supporting(`'The layout makes this group obvious to sighted users. A hidden heading gives screen-reader users the same landmark to jump to.'`)},
        /* No visible heading is needed here, but AT users navigate by heading. */
        VisuallyHidden.visuallyHidden({ as: 'h2', children: ['Build status'] }, h),
        Stack.vStack({ gap: 2, children: [
          ...ITEMS.map(item =>
            ${card(`Stack.hStack({ gap: 3, vAlign: 'center', children: [
                ${body('item.name')},
                Badge.badge({ variant: item.variant, children: [item.status] }, h),
              ] }, h)`)},
          ),
        ] }, h),
      ] }, h)`
}

const emitSupplementary = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const supporting = renderer === 'tailwind' ? supportingTw : supportingSx
  const body = renderer === 'tailwind' ? bodyTw : bodySx
  const display = renderer === 'tailwind' ? displayTw : displaySx
  const card = renderer === 'tailwind' ? mutedCardTw : mutedCardSx
  const arrowIcon =
    renderer === 'tailwind'
      ? `icon(stat.direction === 'up' ? 'arrow-up' : 'arrow-down', { class: stat.direction === 'up' ? 'size-4 text-accent-foreground' : 'size-4 text-muted-foreground' }, h)`
      : `icon(stat.direction === 'up' ? 'arrow-up' : 'arrow-down', { class: stat.direction === 'up' ? stylex.props(styles.upIcon).className ?? '' : stylex.props(styles.smallIcon).className ?? '' }, h)`
  return `Stack.hStack({ gap: 4, wrap: 'wrap', children: [
        ...STATS.map(stat =>
          ${card(`Stack.vStack({ gap: 1, children: [
              ${supporting('stat.label')},
              ${display('stat.value')},
              Stack.hStack({ gap: 1, vAlign: 'center', children: [
                ${arrowIcon},
                ${body('stat.delta')},
                /* The arrow is decorative; spell out the trend for AT. */
                VisuallyHidden.visuallyHidden({ children: [
                  stat.direction === 'up' ? ' increase' : ' decrease',
                  ' from last month',
                ] }, h),
              ] }, h),
            ] }, h)`)},
        ),
      ] }, h)`
}

const emitBody = (
  fixture: VisuallyHiddenFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'showcase':
      return emitShowcase(renderer)
    case 'heading':
      return emitHeading(renderer)
    case 'supplementary':
      return emitSupplementary(renderer)
    case 'liveRegion':
      return ''
  }
}

const stylexStylesFor = (kind: VisuallyHiddenFixture['kind']): string => {
  const entries: Array<string> = [
    `  supporting: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' }`,
    `  body: { fontSize: '0.875rem', lineHeight: '1.25rem' }`,
    `  smallIcon: {
    color: 'var(--muted-foreground)',
    height: '1rem',
    width: '1rem',
  }`,
  ]
  if (kind === 'supplementary') {
    entries.push(
      `  display: { fontSize: '1.8125rem', fontWeight: 400, lineHeight: '1.2414' }`,
    )
    entries.push(
      `  upIcon: { color: 'var(--accent-foreground)', height: '1rem', width: '1rem' }`,
    )
  }
  if (kind !== 'liveRegion') {
    entries.push(`  mutedCard: {
    backgroundColor: 'var(--muted)',
    borderRadius: '0.75rem',
    padding: '1rem',
  }`)
  }
  return `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  shell: { alignItems: 'flex-start', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${entries.join(',\n')},
})`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = visuallyHiddenFixtures[index] ?? visuallyHiddenFixtures[0]
  if (fixture.kind === 'liveRegion') return emitLiveRegion(renderer)
  const mod = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const componentImports = [
    `import * as Stack from '@/${mod}/stack'`,
    fixture.kind === 'heading' ? `import * as Badge from '@/${mod}/badge'` : '',
    fixture.kind === 'showcase'
      ? `import * as Button from '@/${mod}/button'`
      : '',
    fixture.kind === 'showcase' || fixture.kind === 'supplementary'
      ? `import { icon } from '@/lib/icon'`
      : '',
    fixture.kind === 'showcase' ||
    fixture.kind === 'heading' ||
    fixture.kind === 'supplementary'
      ? `import * as Card from '@/${mod}/card'`
      : '',
    fixture.kind === 'showcase'
      ? actionsSource
      : fixture.kind === 'heading'
        ? itemsSource
        : fixture.kind === 'supplementary'
          ? statsSource
          : '',
    renderer !== 'tailwind' ? stylexStylesFor(fixture.kind) : '',
  ]
    .filter(Boolean)
    .join('\n')
  return staticComponentApplication({
    componentName: 'VisuallyHidden',
    componentSlug: 'visually-hidden',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody: emitBody(fixture, renderer),
  })
}

const visuallyHiddenExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  visuallyHiddenFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const visuallyHiddenExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, visuallyHiddenExamplesFor(renderer))
