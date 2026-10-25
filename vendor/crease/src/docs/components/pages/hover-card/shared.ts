import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type HoverCardKind = 'basic' | 'sides' | 'rtl'

export interface HoverCardFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: HoverCardKind
}

export const hoverCardSides = ['left', 'top', 'bottom', 'right'] as const

export const hoverCardRtlSides: Readonly<
  [
    { side: (typeof hoverCardSides)[number]; label: string },
    ...Array<{ side: (typeof hoverCardSides)[number]; label: string }>,
  ]
> = [
  { side: 'left', label: 'يسار' },
  { side: 'top', label: 'أعلى' },
  { side: 'bottom', label: 'أسفل' },
  { side: 'right', label: 'يمين' },
]

export const hoverCardRtlCopy = {
  name: 'سماعات لاسلكية',
  price: '٩٩.٩٩ $',
} as const

export const hoverCardFixtures: Readonly<
  [HoverCardFixture, ...Array<HoverCardFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'basic' },
  { title: 'Sides', kind: 'sides' },
  { title: 'RTL', kind: 'rtl' },
]

const emitSingle = (isStyleX: boolean): string =>
  foldkitApplication({
    title: 'Hover Card — Basic',
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${isStyleX ? "\nimport * as stylex from '@stylexjs/stylex'\n" : ''}
import * as HoverCard from '@/${isStyleX ? 'stylex' : 'ui'}/hover-card'${
      isStyleX
        ? `

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  content: { display: 'flex', width: '100%', flexDirection: 'column', gap: '0.125rem' },
  heading: { fontWeight: 600 },
  meta: { marginBlockStart: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--muted-foreground)' },
})`
        : ''
    }`,
    model: `export const Model = S.Struct({ hoverCard: HoverCard.Model })
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  GotHoverCardMessage: { message: HoverCard.Message },
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { hoverCard: HoverCard.init({ id: 'hover-card', showDelay: 10, closeDelay: 100 }) } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotHoverCardMessage': {
      const { model: hoverCard, commands: hoverCardCommands__ } = HoverCard.update(model.hoverCard, message.message)
      const commands = hoverCardCommands__ ?? []
      return { model: { ...model, hoverCard }, commands: Command.mapMessages(commands, next => Message.GotHoverCardMessage({ message: next })) }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Hover Card — Basic',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    HoverCard.hoverCard({
      model: model.hoverCard,
      toParentMessage: message => Message.GotHoverCardMessage({ message }),
      trigger: 'Hover Here',
      triggerButtonVariant: 'link',
      ariaLabel: 'Preview the CreaseUI profile',
      content: h.div([h.Class(${isStyleX ? "stylex.props(styles.content).className ?? ''" : "'flex w-full flex-col gap-0.5'"})], [
        h.div([h.Class(${isStyleX ? "stylex.props(styles.heading).className ?? ''" : "'font-semibold'"})], ['@creaseui']),
        h.div([], ['UI components for Foldkit, built with TypeScript and Effect.']),
        h.div([h.Class(${isStyleX ? "stylex.props(styles.meta).className ?? ''" : "'mt-1 text-xs text-muted-foreground'"})], ['Available in Tailwind and StyleX']),
      ]),
    }, h),
  ]),
})`,
  })

const emitRow = (kind: 'sides' | 'rtl', isStyleX: boolean): string => {
  const sidesDecl =
    kind === 'sides'
      ? "const SIDES = ['left', 'top', 'bottom', 'right'] as const"
      : `const SIDES = [
  { side: 'left', label: 'يسار' },
  { side: 'top', label: 'أعلى' },
  { side: 'bottom', label: 'أسفل' },
  { side: 'right', label: 'يمين' },
] as const`
  const sideExpr = kind === 'sides' ? 'entry' : 'entry.side'
  const card =
    kind === 'sides'
      ? `content: h.div([h.Class(${isStyleX ? "stylex.props(styles.gapSm).className ?? ''" : "'flex flex-col gap-1'"})], [
          h.h4([h.Class(${isStyleX ? "stylex.props(styles.heading).className ?? ''" : "'font-medium'"})], ['Hover Card']),
          h.p([], ['This hover card appears on the ' + entry + ' side of the trigger.']),
        ]),`
      : `content: h.div([h.Dir('rtl'), h.Class(${isStyleX ? "stylex.props(styles.rtlContent).className ?? ''" : "'flex w-full flex-col gap-1'"})], [
          h.div([h.Class(${isStyleX ? "stylex.props(styles.heading).className ?? ''" : "'font-semibold'"})], ['سماعات لاسلكية']),
          h.div([h.Class(${isStyleX ? "stylex.props(styles.muted).className ?? ''" : "'text-sm text-muted-foreground'"})], ['٩٩.٩٩ $']),
        ]),`
  return foldkitApplication({
    title: `Hover Card — ${kind === 'sides' ? 'Sides' : 'RTL'}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${isStyleX ? "\nimport * as stylex from '@stylexjs/stylex'\n" : ''}
import * as HoverCard from '@/${isStyleX ? 'stylex' : 'ui'}/hover-card'${
      isStyleX
        ? `

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  row: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' },
  gapSm: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  heading: { fontWeight: 500 },
  rtlContent: { display: 'flex', width: '100%', flexDirection: 'column', gap: '0.25rem' },
  muted: { fontSize: '0.875rem', lineHeight: '1.25rem', color: 'var(--muted-foreground)' },
})`
        : ''
    }

${sidesDecl}`,
    model: `export const Model = S.Struct({ hoverCards: S.Array(HoverCard.Model) })
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  GotHoverCardMessage: { index: S.Number, message: HoverCard.Message },
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { hoverCards: SIDES.map((entry, index) => HoverCard.init({ id: 'hover-card-' + String(index), showDelay: 10, closeDelay: 100 })) },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotHoverCardMessage': {
      const { model: next, commands: nextCommands__ } = HoverCard.update(model.hoverCards[message.index]!, message.message)
      const hoverCards = model.hoverCards.map((hoverCard, index) => (index === message.index ? next : hoverCard))
      const commands = Command.mapMessages(nextCommands__ ?? [], command => Message.GotHoverCardMessage({ index: message.index, message: command }))
      return { model: { ...model, hoverCards }, commands }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Hover Card — ${kind === 'sides' ? 'Sides' : 'RTL'}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    h.div([h.Class(${isStyleX ? "stylex.props(styles.row).className ?? ''" : "'flex flex-wrap justify-center gap-2'"})], SIDES.map((entry, index) =>
      HoverCard.hoverCard({
        model: model.hoverCards[index]!,
        toParentMessage: message => Message.GotHoverCardMessage({ index, message }),
        trigger: entry${kind === 'sides' ? '' : '.label'},
        triggerButtonVariant: 'outline',
        ariaLabel: ${kind === 'sides' ? "'Hover card on the ' + entry + ' side'" : 'entry.label'},
        side: ${sideExpr},
        ${card}
      }, h))),
  ]),
})`,
  })
}

const emitApplication = (
  fixture: HoverCardFixture,
  isStyleX: boolean,
): string =>
  fixture.kind === 'basic'
    ? emitSingle(isStyleX)
    : emitRow(fixture.kind, isStyleX)

const hoverCardExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  hoverCardFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer !== 'tailwind'),
  }))

export const hoverCardExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, hoverCardExamplesFor(renderer))
