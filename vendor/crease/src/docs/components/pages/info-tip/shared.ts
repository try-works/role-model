import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

// InfoTip ships no blocks under packages/cli/assets/templates/blocks — the
// fixtures below derive from InfoTip.doc.mjs (@example usage, prop table,
// best practices) and the behaviors exercised by InfoTip.test.tsx.

export interface InfoTipSpec {
  readonly id: string
  readonly content: string
  readonly label?: string
  readonly size?: 'xsm' | 'sm' | 'md' | 'lg'
}

export type InfoTipKind = 'basic' | 'sizes' | 'label' | 'context'

export interface InfoTipFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: InfoTipKind
  readonly tips: ReadonlyArray<InfoTipSpec>
}

export const infoTipFixtures: Readonly<
  [InfoTipFixture, ...Array<InfoTipFixture>]
> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'basic',
    tips: [
      {
        id: 'tip-access',
        content: 'Editors can change this field; viewers cannot.',
      },
    ],
  },
  {
    title: 'Sizes',
    description:
      'The info icon maps 1:1 to icon sizes: xsm 12px, sm 14px, md 16px, lg 18px.',
    kind: 'sizes',
    tips: [
      { id: 'tip-xsm', content: 'Extra small tip', size: 'xsm' },
      { id: 'tip-sm', content: 'Small tip (default)', size: 'sm' },
      { id: 'tip-md', content: 'Medium tip', size: 'md' },
      { id: 'tip-lg', content: 'Large tip', size: 'lg' },
    ],
  },
  {
    title: 'Custom Label',
    description:
      'Override the default "More information" accessible name so screen readers announce what the tip explains.',
    kind: 'label',
    tips: [
      {
        id: 'tip-metric',
        content: '30-day rolling average.',
        label: 'About this metric',
      },
    ],
  },
  {
    title: 'Field Help',
    description:
      'Place an InfoTip next to a form label to explain permissions or constraints without crowding the label itself.',
    kind: 'context',
    tips: [
      {
        id: 'tip-field',
        content: 'Editors can change this field; viewers cannot.',
        label: 'About the access level field',
      },
    ],
  },
]

const esc = (value: string): string => value.replace(/'/g, "\\'")

const tipCall = (
  tip: InfoTipSpec,
  isStyleX: boolean,
  indent: string,
): string => {
  const optional = [
    tip.label === undefined ? '' : `    label: '${esc(tip.label)}',\n`,
    tip.size === undefined ? '' : `    size: '${tip.size}',\n`,
  ].join('')
  return `${indent}InfoTip.infoTip({
    model: model.tips['${tip.id}'] ?? InfoTip.init({ id: '${tip.id}' }),
    toParentMessage: message => GotInfoTipMessage({ id: '${tip.id}', message }),
    content: '${esc(tip.content)}',
${optional}  }, h)`
}

const emitBody = (fixture: InfoTipFixture, isStyleX: boolean): string => {
  const rowClass = isStyleX
    ? 'className(styles.row)'
    : "'flex flex-wrap items-center gap-4'"
  const inlineClass = isStyleX
    ? 'className(styles.inline)'
    : "'flex items-center gap-1.5'"
  const labelClass = isStyleX
    ? 'className(styles.label)'
    : "'text-sm font-medium'"
  const textClass = isStyleX ? 'className(styles.text)' : "'text-sm'"

  switch (fixture.kind) {
    case 'sizes':
      return `  h.div([h.Class(${rowClass})], [
${fixture.tips.map(tip => tipCall(tip, isStyleX, '    ')).join(',\n')}
  ])`
    case 'label':
      return `  h.div([h.Class(${inlineClass})], [
    h.span([h.Class(${textClass})], ['Active sessions']),
${tipCall(fixture.tips[0]!, isStyleX, '    ')},
  ])`
    case 'context':
      return `  h.div([h.Class(${isStyleX ? 'className(styles.column)' : "'flex flex-col gap-1.5'"})], [
    h.div([h.Class(${inlineClass})], [
      h.label([h.Class(${labelClass})], ['Access level']),
${tipCall(fixture.tips[0]!, isStyleX, '      ')},
    ]),
    Input.input({ id: 'access-level', value: '', placeholder: 'Editor', ${isStyleX ? 'layoutStyle: layoutStyle({ width: "14rem" })' : "class: 'w-56'"} }, h),
  ])`
    case 'basic':
    default:
      return `  h.div([h.Class(${inlineClass})], [
    h.span([h.Class(${textClass})], ['Access level']),
${tipCall(fixture.tips[0]!, isStyleX, '    ')},
  ])`
  }
}

const emitApplication = (
  fixture: InfoTipFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const stylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem' },
  inline: { alignItems: 'center', display: 'flex', gap: '0.375rem' },
  column: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },
  text: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  input: { width: '14rem' },
})`
    : ''
  return foldkitApplication({
    title: `Info Tip — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${isStyleX ? "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'\n" : ''}import * as InfoTip from '@/${base}/info-tip'${fixture.kind === 'context' ? `\nimport * as Input from '@/${base}/input'` : ''}${stylesBlock}`,
    model: `export const Model = S.Struct({
  tips: S.Record(S.String, InfoTip.Model),
})
export type Model = typeof Model.Type`,
    messages: `export const GotInfoTipMessage = taggedStruct('GotInfoTipMessage', {
  id: S.String,
  message: InfoTip.Message,
})
export const Message = S.Union([GotInfoTipMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    tips: {
${fixture.tips
  .map(
    tip =>
      `      '${tip.id}': InfoTip.init({ id: '${tip.id}', showDelay: 400, closeDelay: 100 }),`,
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
    case 'GotInfoTipMessage': {
      const current = model.tips[message.id]
      if (current === undefined) {
        return { model }
      }
      const infoTipOp__ = InfoTip.update(current, message.message)
      const commands = infoTipOp__.commands ?? []
      return {
        model: {
          ...model,
          tips: { ...model.tips, [message.id]: infoTipOp__.model },
        },
        commands: Command.mapMessages(commands, next =>
          GotInfoTipMessage({ id: message.id, message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Info Tip — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const infoTipExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  infoTipFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const infoTipExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, infoTipExamplesFor(renderer))
