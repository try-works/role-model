import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type SkeletonKind =
  | 'demo'
  | 'avatar'
  | 'card'
  | 'text'
  | 'form'
  | 'table'
  | 'rtl'

export interface SkeletonFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: SkeletonKind
}

export const skeletonFixtures: Readonly<
  [SkeletonFixture, ...Array<SkeletonFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Avatar',
    description: 'Mirror the avatar and text geometry of the eventual row.',
    kind: 'avatar',
  },
  {
    title: 'Card',
    description: 'Reserve a card header and media block while content loads.',
    kind: 'card',
  },
  {
    title: 'Text',
    description: 'Stack text-width bars to stand in for paragraph copy.',
    kind: 'text',
  },
  {
    title: 'Form',
    description: 'Hold the label, input, and button geometry of a form.',
    kind: 'form',
  },
  {
    title: 'Table',
    description: 'Repeat column-width rows to reserve table space.',
    kind: 'table',
  },
  {
    title: 'RTL',
    description:
      'Skeleton compositions render mirrored in right-to-left contexts.',
    kind: 'rtl',
  },
]

const emitMarkup = (kind: SkeletonKind, isStyleX: boolean): string => {
  const sk = (styleName: string, tw: string, shape?: string): string =>
    isStyleX
      ? `Skeleton.skeleton({ ${shape === undefined ? '' : `shape: '${shape}', `}layoutStyle: styles.${styleName} }, h)`
      : `Skeleton.skeleton({ ${shape === undefined ? '' : `shape: '${shape}', `}class: '${tw}' }, h)`
  const cls = (tw: string, styleName: string): string =>
    isStyleX ? `h.Class(className(styles.${styleName}))` : `h.Class('${tw}')`

  switch (kind) {
    case 'demo':
    case 'rtl': {
      const dir = kind === 'rtl' ? `, h.Dir('rtl')` : ''
      return `    h.div([${cls('flex items-center gap-4', 'row')}${dir}], [
      ${sk('circleLg', 'h-12 w-12 rounded-full', 'circle')},
      h.div([${cls('space-y-2', 'lines')}], [
        ${sk('lineWide', 'h-4 w-62.5')},
        ${sk('lineMid', 'h-4 w-50')},
      ]),
    ])`
    }
    case 'avatar':
      return `    h.div([${cls('flex w-fit items-center gap-4', 'avatarRow')}], [
      ${sk('circleSm', 'size-10 shrink-0 rounded-full', 'circle')},
      h.div([${cls('grid gap-2', 'lines')}], [
        ${sk('line150', 'h-4 w-37.5')},
        ${sk('line100', 'h-4 w-25')},
      ]),
    ])`
    case 'card':
      return `    Card.card({${isStyleX ? ' layoutStyle: layoutStyle({ width: "100%", maxWidth: "20rem" }),' : ` class: 'w-full max-w-xs',`}
      children: [
        Card.cardHeader({
          children: [
            ${sk('lineTwoThirds', 'h-4 w-2/3')},
            ${sk('lineHalf', 'h-4 w-1/2')},
          ],
        }, h),
        Card.cardContent({
          children: [
            ${sk('media', 'aspect-video w-full')},
          ],
        }, h),
      ],
    }, h)`
    case 'text':
      return `    h.div([${cls('flex w-full max-w-xs flex-col gap-2', 'textStack')}], [
      ${sk('lineFull', 'h-4 w-full')},
      ${sk('lineFull', 'h-4 w-full')},
      ${sk('lineThreeQuarters', 'h-4 w-3/4')},
    ])`
    case 'form':
      return `    h.div([${cls('flex w-full max-w-xs flex-col gap-7', 'formStack')}], [
      h.div([${cls('flex flex-col gap-3', 'fieldStack')}], [
        ${sk('labelA', 'h-4 w-20')},
        ${sk('inputFull', 'h-8 w-full')},
      ]),
      h.div([${cls('flex flex-col gap-3', 'fieldStack')}], [
        ${sk('labelB', 'h-4 w-24')},
        ${sk('inputFull', 'h-8 w-full')},
      ]),
      ${sk('buttonBar', 'h-8 w-24')},
    ])`
    case 'table': {
      const rows = [0, 1, 2, 3, 4]
        .map(
          () => `      h.div([${cls('flex gap-4', 'tableRow')}], [
        ${sk('cellGrow', 'h-4 flex-1')},
        ${sk('cellW24', 'h-4 w-24')},
        ${sk('cellW20', 'h-4 w-20')},
      ])`,
        )
        .join(',\n')
      return `    h.div([${cls('flex w-full max-w-sm flex-col gap-2', 'tableStack')}], [\n${rows}\n    ])`
    }
  }
}

const emitStyles = (kind: SkeletonKind): string => {
  switch (kind) {
    case 'demo':
    case 'rtl':
      return `  row: { display: 'flex', alignItems: 'center', gap: '1rem' },
  circleLg: { height: '3rem', width: '3rem' },
  lines: { display: 'grid', gap: '0.5rem' },
  lineWide: { height: '1rem', width: '15.625rem' },
  lineMid: { height: '1rem', width: '12.5rem' },`
    case 'avatar':
      return `  avatarRow: { display: 'flex', alignItems: 'center', gap: '1rem', width: 'fit-content' },
  circleSm: { height: '2.5rem', width: '2.5rem', flexShrink: 0 },
  lines: { display: 'grid', gap: '0.5rem' },
  line150: { height: '1rem', width: '9.375rem' },
  line100: { height: '1rem', width: '6.25rem' },`
    case 'card':
      return `  card: { width: '100%', maxWidth: '20rem' },
  lineTwoThirds: { height: '1rem', width: '66.666667%' },
  lineHalf: { height: '1rem', width: '50%' },
  media: { aspectRatio: '16 / 9', width: '100%' },`
    case 'text':
      return `  textStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '20rem' },
  lineFull: { height: '1rem', width: '100%' },
  lineThreeQuarters: { height: '1rem', width: '75%' },`
    case 'form':
      return `  formStack: { display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '20rem' },
  fieldStack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  labelA: { height: '1rem', width: '5rem' },
  labelB: { height: '1rem', width: '6rem' },
  inputFull: { height: '2rem', width: '100%' },
  buttonBar: { height: '2rem', width: '6rem' },`
    case 'table':
      return `  tableStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '24rem' },
  tableRow: { display: 'flex', gap: '1rem' },
  cellGrow: { height: '1rem', flexGrow: 1 },
  cellW24: { height: '1rem', width: '6rem' },
  cellW20: { height: '1rem', width: '5rem' },`
  }
}

const emitApplication = (
  fixture: SkeletonFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const cardImport =
    fixture.kind === 'card' ? `\nimport * as Card from '@/${base}/card'` : ''
  const stylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${emitStyles(fixture.kind)}
})`
    : ''
  return foldkitApplication({
    title: `Skeleton — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${isStyleX ? `import * as stylex from '@stylexjs/stylex'` : ''}${cardImport}
import * as Skeleton from '@/${base}/skeleton'${isStyleX ? `\nimport { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'` : ''}${stylesBlock}`,
    model: `export const Model = S.Struct({})
export type Model = typeof Model.Type`,
    messages: `export const NoOp = taggedStruct('NoOp')
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {} })`,
    update: `export const update = (model: Model, _message: Message): Update.Return<Model, Message> => ({ model })`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Skeleton — ${fixture.title.replaceAll("'", "\\'")}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitMarkup(fixture.kind, isStyleX)}
  ]),
})`,
  })
}

const skeletonExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  skeletonFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const skeletonExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, skeletonExamplesFor(renderer))
