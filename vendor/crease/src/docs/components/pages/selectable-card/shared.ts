import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  controlledStringApplication,
  foldkitApplication,
} from '@/docs/components/pages/authored-page'
import type { CardVariant } from '@/lib/card-surface'

export type SelectablePlan = Readonly<{
  id: string
  name: string
  price?: string
  desc?: string
}>

export type SelectableTag = Readonly<{
  id: string
  name: string
  variant: CardVariant
}>

export type SelectableCardFixture = Readonly<{
  title: string
  description: string
  kind: 'plans' | 'elevated' | 'multi'
  initialSelected: ReadonlyArray<string>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Card/SelectableCard*.tsx —
   same demos, same option sets and copy. */
export const selectableCardFixtures: Readonly<
  [SelectableCardFixture, ...Array<SelectableCardFixture>]
> = [
  {
    title: 'SelectableCard',
    description:
      'A plan picker with single-select radio behavior. Cards show an accent border when selected.',
    kind: 'plans',
    initialSelected: ['pro'],
  },
  {
    title: 'SelectableCard — Elevated',
    description:
      'Raised selectable cards with `elevation="low"`. The inset selection ring composes on top of the shadow, so a selected card keeps its elevation.',
    kind: 'elevated',
    initialSelected: ['pro'],
  },
  {
    title: 'SelectableCardMulti',
    description:
      'Multi-select tag picker using color variant selectable cards with color-matched selection borders.',
    kind: 'multi',
    initialSelected: ['foldkit', 'typescript'],
  },
]

export const selectableCardPlans: ReadonlyArray<SelectablePlan> = [
  { id: 'basic', name: 'Basic', price: '$9/mo', desc: 'For individuals' },
  { id: 'pro', name: 'Pro', price: '$29/mo', desc: 'For small teams' },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99/mo',
    desc: 'For organizations',
  },
]

export const selectableCardElevatedPlans: ReadonlyArray<SelectablePlan> = [
  { id: 'starter', name: 'Starter' },
  { id: 'pro', name: 'Pro' },
]

export const selectableCardTags: ReadonlyArray<SelectableTag> = [
  { id: 'foldkit', name: 'Foldkit', variant: 'blue' },
  { id: 'typescript', name: 'TypeScript', variant: 'cyan' },
  { id: 'node', name: 'Node.js', variant: 'green' },
  { id: 'python', name: 'Python', variant: 'yellow' },
  { id: 'rust', name: 'Rust', variant: 'orange' },
  { id: 'go', name: 'Go', variant: 'teal' },
]

const ui = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'): string =>
  renderer !== 'tailwind' ? 'stylex' : 'ui'

const cls = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  tailwindValue: string,
  styleKey: string,
): string =>
  renderer === 'tailwind'
    ? `h.Class('${tailwindValue}')`
    : `h.Class(stylex.props(styles.${styleKey}).className ?? '')`

const STYLEX_STYLES = {
  row: `{ display: 'flex', gap: '0.75rem' }`,
  grid2: `{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', width: '26.25rem' }`,
  grid3: `{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem', width: '25rem' }`,
  stack1: `{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }`,
  heading: `{ fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600, letterSpacing: '-0.01em' }`,
  price: `{ fontSize: '1.125rem', lineHeight: '1.75rem', fontWeight: 600 }`,
  bodyBold: `{ fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 700 }`,
  supporting: `{ fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--muted-foreground)' }`,
  page: `{ marginInline: 'auto', maxWidth: '28rem', padding: '2rem' }`,
} as const
type StylexStyleKey = keyof typeof STYLEX_STYLES

const stylexImports = (keys: ReadonlyArray<StylexStyleKey>): string =>
  `import * as stylex from '@stylexjs/stylex'\n\nconst styles = stylex.create({\n${keys.map(k => `  ${k}: ${STYLEX_STYLES[k]},`).join('\n')}\n})`

const planCardSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  elevated: boolean,
): string => `SelectableCard.selectableCard({
          label: plan.name,
          isSelected: model.selected === plan.id,
          onChange: SelectedPlan({ value: plan.id }),
          ${elevated ? `elevation: 'low',` : `width: '11.25rem',`}
          children: [
            ${
              elevated
                ? `h.p([${cls(renderer, 'text-sm font-bold', 'bodyBold')}], [plan.name]),
            h.p([${cls(renderer, 'text-xs text-muted-foreground', 'supporting')}], ['The resting shadow stays put — the selection ring layers on top.']),`
                : `h.div([${cls(renderer, 'flex flex-col gap-1', 'stack1')}], [
              h.h4([${cls(renderer, 'scroll-m-20 text-xl font-semibold tracking-tight', 'heading')}], [plan.name]),
              h.p([${cls(renderer, 'text-lg font-semibold', 'price')}], [plan.price ?? '']),
              h.p([${cls(renderer, 'text-xs text-muted-foreground', 'supporting')}], [plan.desc ?? '']),
            ]),`
            }
          ],
        }, h)`

const singleSelectSource = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = selectableCardFixtures[index] ?? selectableCardFixtures[0]
  const elevated = fixture.kind === 'elevated'
  const plans = elevated ? selectableCardElevatedPlans : selectableCardPlans
  const componentImports = [
    `const plans = ${JSON.stringify(plans)}`,
    ...(renderer !== 'tailwind'
      ? [
          stylexImports(
            elevated
              ? ['grid2', 'bodyBold', 'supporting']
              : ['row', 'stack1', 'heading', 'price', 'supporting'],
          ),
        ]
      : []),
  ].join('\n')
  return controlledStringApplication({
    componentName: 'SelectableCard',
    componentSlug: 'selectable-card',
    renderer,
    exampleName: fixture.title,
    field: 'selected',
    initialValue: 'pro',
    messageName: 'SelectedPlan',
    messageField: 'value',
    componentImports,
    viewBody: `h.div([${cls(renderer, elevated ? 'grid grid-cols-2 gap-3 w-[26.25rem]' : 'flex gap-3', elevated ? 'grid2' : 'row')}],
    plans.map(plan =>
      ${planCardSource(renderer, elevated)},
    ),
  )`,
  })
}

const multiSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = selectableCardFixtures[2] ?? selectableCardFixtures[0]
  const componentImports = [
    `const tags = ${JSON.stringify(selectableCardTags)} as const`,
    ...(renderer !== 'tailwind'
      ? [stylexImports(['grid3', 'bodyBold', 'page'])]
      : []),
  ].join('\n')
  return foldkitApplication({
    title: `SelectableCard — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as SelectableCard from '@/${ui(renderer)}/selectable-card'
${componentImports}`,
    model: `export const Model = S.Struct({ selected: S.Array(S.String) })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const ToggledTag = taggedStruct('ToggledTagSelectableCardMulti', { tag: S.String })
export const Message = S.Union([ToggledTag])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { selected: ['foldkit', 'typescript'] },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledTagSelectableCardMulti':
      return {
        model: {
          selected: model.selected.includes(message.tag)
            ? model.selected.filter(tag => tag !== message.tag)
            : [...model.selected, message.tag],
        },
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'SelectableCard — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? "stylex.props(styles.page).className ?? ''" : "'mx-auto max-w-md p-8'"})], [
    h.div([${cls(renderer, 'grid grid-cols-3 gap-2 w-[25rem]', 'grid3')}],
      tags.map(tag =>
        SelectableCard.selectableCard({
          label: tag.name,
          isSelected: model.selected.includes(tag.id),
          onChange: ToggledTag({ tag: tag.id }),
          variant: tag.variant,
          children: [
            h.p([${cls(renderer, 'text-sm font-bold', 'bodyBold')}], [tag.name]),
          ],
        }, h),
      ),
    ),
  ]),
})`,
  })
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = selectableCardFixtures[index] ?? selectableCardFixtures[0]
  return fixture.kind === 'multi'
    ? multiSource(renderer)
    : singleSelectSource(index, renderer)
}

const selectableCardExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  selectableCardFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const selectableCardExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, selectableCardExamplesFor(renderer))
