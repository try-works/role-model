import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export interface TooltipTipSpec {
  readonly id: string
  readonly label: string
  readonly side?: 'top' | 'right' | 'bottom' | 'left'
  readonly isDisabled?: boolean
  readonly iconTrigger?: boolean
  readonly kbd?: string
}

export type TooltipKind = 'demo' | 'sides' | 'kbd' | 'disabled' | 'rtl'

export interface TooltipFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: TooltipKind
  readonly content: string
  readonly tips: ReadonlyArray<TooltipTipSpec>
}

const sideTips = (
  labels: Readonly<[string, string, string, string]>,
  prefix: string,
): ReadonlyArray<TooltipTipSpec> =>
  (['left', 'top', 'bottom', 'right'] as const).map((side, index) => ({
    id: `${prefix}-${side}`,
    label: labels[index] ?? side,
    side,
  }))

export const tooltipFixtures: Readonly<
  [TooltipFixture, ...Array<TooltipFixture>]
> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'demo',
    content: 'Add to library',
    tips: [{ id: 'tip-hover', label: 'Hover', side: 'top' }],
  },
  {
    title: 'Side',
    description: 'Placement follows the side input per tooltip.',
    kind: 'sides',
    content: 'Add to library',
    tips: sideTips(['Left', 'Top', 'Bottom', 'Right'], 'tip'),
  },
  {
    title: 'With Keyboard Shortcut',
    description: 'Content composes with other primitives such as Kbd.',
    kind: 'kbd',
    content: 'Save Changes',
    tips: [
      { id: 'tip-save', label: '', side: 'top', iconTrigger: true, kbd: 'S' },
    ],
  },
  {
    title: 'Disabled Button',
    description:
      'A span trigger explains why the action is unavailable on hover.',
    kind: 'disabled',
    content: 'This feature is currently unavailable',
    tips: [
      { id: 'tip-disabled', label: 'Disabled', side: 'top', isDisabled: true },
    ],
  },
  {
    title: 'RTL',
    description: 'Side labels and content mirror in right-to-left contexts.',
    kind: 'rtl',
    content: 'إضافة إلى المكتبة',
    tips: sideTips(['يسار', 'أعلى', 'أسفل', 'يمين'], 'tip-rtl'),
  },
]

const esc = (value: string): string => value.replace(/'/g, "\\'")

const tipCall = (
  tip: TooltipTipSpec,
  fixture: TooltipFixture,
  isStyleX: boolean,
  indent: string,
): string => {
  const trigger =
    tip.iconTrigger === true
      ? "Icon.icon('save', {}, h)"
      : `'${esc(tip.label)}'`
  const content =
    tip.kbd === undefined
      ? `'${esc(fixture.content)}'`
      : `h.span([], ['${esc(fixture.content)} ', Kbd.kbd({ children: ['${tip.kbd}'] }, h)])`
  const triggerClass = isStyleX
    ? `    triggerButtonVariant: 'outline',\n    triggerButtonSize: '${tip.iconTrigger === true ? 'icon' : 'default'}',`
    : tip.iconTrigger === true
      ? "    triggerClass: 'inline-flex size-9 items-center justify-center rounded-md border',"
      : "    triggerClass: 'w-fit rounded-md border px-3 py-2 text-sm capitalize',"
  return `${indent}Tooltip.tooltip({
    model: model.tooltips['${tip.id}'] ?? Tooltip.init({ id: '${tip.id}' }),
    toParentMessage: message => GotTooltipMessage({ id: '${tip.id}', message }),
    trigger: ${trigger},
    content: ${content},
    side: '${tip.side ?? 'top'}',
${tip.isDisabled === true ? '    isDisabled: true,\n' : ''}${triggerClass}\n  }, h)`
}

const emitBody = (fixture: TooltipFixture, isStyleX: boolean): string => {
  if (fixture.kind === 'sides' || fixture.kind === 'rtl') {
    const wrapClass = isStyleX
      ? 'className(styles.row)'
      : "'flex flex-wrap gap-2'"
    const dir = fixture.kind === 'rtl' ? ", h.Dir('rtl')" : ''
    return `  h.div([h.Class(${wrapClass})${dir}], [
${fixture.tips.map(tip => tipCall(tip, fixture, isStyleX, '    ')).join(',\n')}
  ])`
  }
  const tip = fixture.tips[0]
  return tipCall(
    tip === undefined ? { id: 'tip', label: 'Hover' } : tip,
    fixture,
    isStyleX,
    '  ',
  )
}

const emitApplication = (
  fixture: TooltipFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const usesIcon = fixture.tips.some(tip => tip.iconTrigger === true)
  const usesKbd = fixture.tips.some(tip => tip.kbd !== undefined)
  const usesRow = fixture.kind === 'sides' || fixture.kind === 'rtl'
  const stylesBlock =
    isStyleX && usesRow
      ? "\n\nconst styles = stylex.create({ row: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' } })"
      : ''
  return foldkitApplication({
    title: `Tooltip — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${isStyleX && usesRow ? "import * as stylex from '@stylexjs/stylex'\n" : ''}${isStyleX && usesRow ? "import { className } from '@/stylex/style'\n" : ''}${usesIcon ? `import * as Icon from '@/lib/icon'\n` : ''}${usesKbd ? `import * as Kbd from '@/${base}/kbd'\n` : ''}import * as Tooltip from '@/${base}/tooltip'${stylesBlock}`,
    model: `export const Model = S.Struct({
  tooltips: S.Record(S.String, Tooltip.Model),
})
export type Model = typeof Model.Type`,
    messages: `export const GotTooltipMessage = taggedStruct('GotTooltipMessage', {
  id: S.String,
  message: Tooltip.Message,
})
export const Message = S.Union([GotTooltipMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    tooltips: {
${fixture.tips
  .map(
    tip =>
      `      '${tip.id}': Tooltip.init({ id: '${tip.id}', showDelay: 400, closeDelay: 100 }),`,
  )
  .join('\n')}
    },
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotTooltipMessage': {
      const current = model.tooltips[message.id]
      if (current === undefined) {
        return { model }
      }
      const tooltipOp__ = Tooltip.update(current, message.message)
      const commands = tooltipOp__.commands ?? []
      return {
        model: {
          ...model,
          tooltips: { ...model.tooltips, [message.id]: tooltipOp__.model },
        },
        commands: Command.mapMessages(commands, next =>
          GotTooltipMessage({ id: message.id, message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Tooltip — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const tooltipExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  tooltipFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const tooltipExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, tooltipExamplesFor(renderer))
