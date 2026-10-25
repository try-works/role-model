import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export type LinkExampleKind =
  | 'showcase'
  | 'inline'
  | 'external'
  | 'underlined'
  | 'tooltips'

export type LinkFixture = Readonly<{
  title: string
  description?: string
  kind: LinkExampleKind
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Link/*.tsx — same demos,
   same labels and copy. */
export const linkFixtures: Readonly<[LinkFixture, ...Array<LinkFixture>]> = [
  {
    title: 'Link',
    description: 'Standalone link with accent styling',
    kind: 'showcase',
  },
  {
    title: 'Link — Inline Text',
    description: 'Inline link embedded in body text',
    kind: 'inline',
  },
  {
    title: 'Link — External Links',
    description: 'External links with automatic icon and accessibility label',
    kind: 'external',
  },
  {
    title: 'Link \u2014 Underlined',
    description:
      'A persistent underline for links that should stand out in text.',
    kind: 'underlined',
  },
  {
    title: 'Link — With Tooltips',
    description: 'Links with descriptive tooltips for enhanced context',
    kind: 'tooltips',
  },
]

const externalLinks = [
  ['GitHub', 'https://github.com', false],
  ['MDN', 'https://developer.mozilla.org', false],
  ['Foldkit', 'https://foldkit.dev', true],
] as const

const tooltipLinks = [
  ['Settings', '/settings', 'Manage your application preferences'],
  ['Profile', '/profile', 'View and edit your profile'],
  ['Help', '/help', 'Browse help articles and support'],
] as const

const viewBody = (fixture: LinkFixture, isStyleX: boolean): string => {
  const stack = (items: string) =>
    `h.div(
      [h.Class(${isStyleX ? 'className(styles.column)' : "'flex flex-col gap-2 items-start'"})],
      [
        ${items},
      ],
    )`

  switch (fixture.kind) {
    case 'showcase':
      return `Link.link({ href: '#', isStandalone: true, children: ['Documentation'] }, h)`
    case 'underlined':
      return `Link.link({ href: '#', variant: 'underlined', isStandalone: true, children: ['Underlined documentation'] }, h)`
    case 'inline':
      return `Text.text(
      { type: 'body', display: 'block', children: [
        'Browse the ',
        Link.link({ href: '#', children: ['documentation'] }, h),
        ' for installation steps.',
      ] },
      h,
    )`
    case 'external':
      return stack(
        externalLinks
          .map(
            ([label, url, underlined]) =>
              `Link.link({ href: '${url}', isExternalLink: true, isStandalone: true${underlined ? ", variant: 'underlined'" : ''}, children: ['${label}'] }, h)`,
          )
          .join(',\n        '),
      )
    case 'tooltips':
      return stack(
        tooltipLinks
          .map(
            ([label, url, tip], index) =>
              `Link.link({ href: '${url}', isStandalone: true, tooltip: { model: model.tooltips[${index}]!, toParentMessage: message => Message.GotLinkTooltipMessage({ index: ${index}, message }), content: '${tip}' }${index === 2 ? ", color: 'secondary'" : ''}, children: ['${label}'] }, h)`,
          )
          .join(',\n        '),
      )
  }
}

const stylexStyles =
  "column: { alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '0.5rem' },\n  page: { marginInline: 'auto', maxWidth: '28rem', padding: '2rem' }"

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = linkFixtures[index] ?? linkFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const imports: string[] = []
  if (isStyleX) {
    imports.push(
      `import * as stylex from '@stylexjs/stylex'`,
      `import { className } from '@/stylex/style'`,
    )
  }
  if (fixture.kind === 'inline') {
    imports.push(`import * as Text from '@/${base}/text'`)
  }
  if (fixture.kind === 'tooltips') {
    return tooltipApplication(fixture, renderer)
  }
  const needsStack = fixture.kind === 'external'
  const componentImports = [
    ...imports,
    ...(isStyleX && needsStack
      ? [``, `const styles = stylex.create({\n  ${stylexStyles}\n})`]
      : []),
  ].join('\n')
  return staticComponentApplication({
    componentName: 'Link',
    componentSlug: 'link',
    renderer,
    exampleName: fixture.title,
    ...(componentImports === '' ? {} : { componentImports }),
    viewBody: viewBody(fixture, isStyleX),
  })
}

const tooltipApplication = (
  fixture: LinkFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  return foldkitApplication({
    title: fixture.title,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Link from '@/${base}/link'
import * as Tooltip from '@/${base}/tooltip'
${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
const styles = stylex.create({ ${stylexStyles} })`
    : ''
}`,
    model: `export const Model = S.Struct({ tooltips: S.Array(Tooltip.Model) })
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  GotLinkTooltipMessage: { index: S.Number, message: Tooltip.Message },
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { tooltips: Array.from({ length: 3 }, (_, index) =>
    Tooltip.init({ id: 'link-tooltip-' + String(index), showDelay: 400 })) },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  const current = model.tooltips[message.index]
  if (current === undefined) return { model }
  const result = Tooltip.update(current, message.message)
  return {
    model: { ...model, tooltips: model.tooltips.map((tip, index) => index === message.index ? result.model : tip) },
    commands: Command.mapMessages(result.commands ?? [], next =>
      Message.GotLinkTooltipMessage({ index: message.index, message: next })),
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Link with tooltips',
  body: h.main([h.Class(${isStyleX ? 'className(styles.page)' : "'mx-auto max-w-md p-8'"})], [
    ${viewBody(fixture, isStyleX)},
  ]),
})`,
  })
}

const linkExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  linkFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const linkExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, linkExamplesFor(renderer))
