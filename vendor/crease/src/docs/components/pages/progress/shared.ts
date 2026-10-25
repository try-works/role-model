import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type ProgressKind = 'demo' | 'label' | 'controlled' | 'rtl' | 'specimen'

export interface ProgressSpecimen {
  readonly value: number | null
  readonly max?: number
  readonly ariaLabel: string
  readonly valueText: string
  readonly tw: string
  readonly sxStyle: 'wide' | 'narrow'
  readonly sxEmit: string
}

export interface ProgressFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: ProgressKind
  readonly specimen?: ProgressSpecimen
}

export const progressFixtures: Readonly<
  [ProgressFixture, ...Array<ProgressFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Label',
    description:
      'Pair the track with a labeled row that reports the percentage.',
    kind: 'label',
  },
  {
    title: 'Controlled',
    description: 'Drive the value from another control, here a slider.',
    kind: 'controlled',
  },
  {
    title: 'RTL',
    description: 'Fill direction mirrors in right-to-left contexts.',
    kind: 'rtl',
  },
  {
    title: 'Determinate',
    description: 'Pass a numeric percentage when total work is known.',
    kind: 'specimen',
    specimen: {
      value: 64,
      max: 80,
      ariaLabel: 'Upload progress',
      valueText: '64 of 80 files',
      tw: 'w-full max-w-md',
      sxStyle: 'wide',
      sxEmit: `{ width: '100%', maxWidth: '28rem' }`,
    },
  },
  {
    title: 'Indeterminate',
    description:
      'Pass null while work is active but its total cannot be measured.',
    kind: 'specimen',
    specimen: {
      value: null,
      ariaLabel: 'Loading report',
      valueText: 'Loading',
      tw: 'w-full max-w-md',
      sxStyle: 'wide',
      sxEmit: `{ width: '100%', maxWidth: '28rem' }`,
    },
  },
  {
    title: 'Narrow Range',
    description: 'A compact track still reports its normalized custom range.',
    kind: 'specimen',
    specimen: {
      value: 3,
      max: 4,
      ariaLabel: 'Setup progress',
      valueText: '3 of 4 steps',
      tw: 'w-24',
      sxStyle: 'narrow',
      sxEmit: `{ width: '6rem' }`,
    },
  },
]

const layout = (isStyleX: boolean, tw: string, styleName: string): string =>
  isStyleX ? `layoutStyle: styles.${styleName}` : `class: '${tw}'`

const cls = (isStyleX: boolean, tw: string, styleName: string): string =>
  isStyleX ? `h.Class(className(styles.${styleName}))` : `h.Class('${tw}')`

const emitBody = (fixture: ProgressFixture, isStyleX: boolean): string => {
  switch (fixture.kind) {
    case 'demo':
      return `  Progress.progress({ value: model.value, ${layout(isStyleX, 'w-3/5', 'track60')} }, h)`
    case 'label':
      return `  Field.field({
    ${layout(isStyleX, 'w-full max-w-sm', 'wide')},
    children: [
      Field.fieldLabel({
        for: 'progress-upload',
        children: [
          h.span([], ['Upload progress']),
          h.span([${isStyleX ? 'h.Class(className(styles.pushEnd))' : "h.Class('ml-auto')"}], ['66%']),
        ],
      }, h),
      Progress.progress({ id: 'progress-upload', value: 66 }, h),
    ],
  }, h)`
    case 'controlled':
      return `  h.div([${cls(isStyleX, 'flex w-full max-w-sm flex-col gap-4', 'stack')}], [
    Progress.progress({ value: model.value }, h),
    Slider.slider({
      model: model.slider,
      value: model.value,
      toParentMessage: message => GotSliderMessage({ message }),
    }, h),
  ])`
    case 'rtl':
      return `  Field.field({
    ${layout(isStyleX, 'w-full max-w-sm', 'wide')},
    direction: 'rtl',
    children: [
      Field.fieldLabel({
        for: 'progress-upload',
        children: [
          h.span([], ['تقدم الرفع']),
          h.span([${isStyleX ? 'h.Class(className(styles.pushEnd))' : "h.Class('ms-auto')"}], ['٦٦%']),
        ],
      }, h),
      Progress.progress({ id: 'progress-upload', value: 66, direction: 'rtl' }, h),
    ],
  }, h)`
    case 'specimen': {
      const specimen = fixture.specimen
      if (specimen === undefined) return ''
      const props = [
        `value: ${specimen.value === null ? 'null' : specimen.value}`,
        ...(specimen.max === undefined ? [] : [`max: ${specimen.max}`]),
        `ariaLabel: '${specimen.ariaLabel}'`,
        `valueText: '${specimen.valueText}'`,
        layout(isStyleX, specimen.tw, 'track'),
      ]
      return `  Progress.progress({ ${props.join(', ')} }, h)`
    }
  }
}

const emitStyles = (fixture: ProgressFixture): string => {
  switch (fixture.kind) {
    case 'demo':
      return `  track60: { width: '60%' },`
    case 'label':
    case 'rtl':
      return `  wide: { width: '100%', maxWidth: '24rem' },
  pushEnd: { marginInlineStart: 'auto' },`
    case 'controlled':
      return `  stack: { display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '24rem' },`
    case 'specimen': {
      const specimen = fixture.specimen
      if (specimen === undefined) return ''
      return `  track: ${specimen.sxEmit},`
    }
  }
}

const emitImports = (fixture: ProgressFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts = [
    `import { Schema as S } from 'effect'`,
    `import { Command, Runtime, Subscription, Update } from 'foldkit'`,
    `import { type Document, type HtmlBuilder } from 'foldkit/html'`,
    `import { taggedStruct } from 'foldkit/schema'`,
  ]
  if (fixture.kind === 'demo') {
    parts.push(`import { Effect } from 'effect'`)
  }
  if (isStyleX) {
    parts.push(`import * as stylex from '@stylexjs/stylex'`)
  }
  if (fixture.kind === 'label' || fixture.kind === 'rtl') {
    parts.push(`import * as Field from '@/${base}/field'`)
  }
  parts.push(`import * as Progress from '@/${base}/progress'`)
  if (fixture.kind === 'controlled') {
    parts.push(`import * as Slider from '@/${base}/slider'`)
  }
  if (isStyleX) {
    parts.push(`import { className } from '@/stylex/style'`)
  }
  return parts.join('\n')
}

const emitModel = (fixture: ProgressFixture): string => {
  switch (fixture.kind) {
    case 'demo':
      return `export const Model = S.Struct({ value: S.Number })
export type Model = typeof Model.Type`
    case 'controlled':
      return `export const Model = S.Struct({
  value: S.Number,
  slider: Slider.Model,
})
export type Model = typeof Model.Type`
    case 'label':
    case 'rtl':
    case 'specimen':
      return `export const Model = S.Struct({})
export type Model = typeof Model.Type`
  }
}

const emitMessages = (fixture: ProgressFixture): string => {
  switch (fixture.kind) {
    case 'demo':
      return `export const SetProgress = taggedStruct('SetProgress', { value: S.Number })
export const Message = S.Union([SetProgress])
export type Message = typeof Message.Type`
    case 'controlled':
      return `export const GotSliderMessage = taggedStruct('GotSliderMessage', { message: Slider.Message })
export const Message = S.Union([GotSliderMessage])
export type Message = typeof Message.Type`
    case 'label':
    case 'rtl':
    case 'specimen':
      return `export const NoOp = taggedStruct('NoOp')
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`
  }
}

const emitInit = (fixture: ProgressFixture): string => {
  switch (fixture.kind) {
    case 'demo':
      return `export const init = (): Update.Return<Model, Message> => ({
  model: { value: 13 },
  commands: [BumpProgress()],
})`
    case 'controlled':
      return `export const init = (): Update.Return<Model, Message> => ({
  model: { value: 50, slider: Slider.init({ id: 'progress-value', min: 0, max: 100, step: 1 }) },
})`
    case 'label':
    case 'rtl':
    case 'specimen':
      return `export const init = (): Update.Return<Model, Message> => ({ model: {} })`
  }
}

const emitUpdate = (fixture: ProgressFixture): string => {
  switch (fixture.kind) {
    case 'demo':
      return `const BumpProgress = Command.define('BumpProgress', {
  messages: [SetProgress],
  execute: Effect.sleep('500 millis').pipe(
    Effect.as(SetProgress({ value: 66 })),
  ),
})

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'SetProgress':
      return { model: { ...model, value: message.value } }
  }
}`
    case 'controlled':
      return `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotSliderMessage': {
      const sliderOp__ = Slider.update(model.slider, message.message)
      const slider = sliderOp__.model
      const commands = sliderOp__.commands ?? []
      const maybeChange = Option.fromNullishOr(sliderOp__.outMessage)
      return {
        model: {
          ...model,
          slider,
          value: Option.match(maybeChange, {
            onNone: () => model.value,
            onSome: change => change.value,
          }),
        },
        commands: Command.mapMessages(commands, next => GotSliderMessage({ message: next })),
      }
    }
  }
}`
    case 'label':
    case 'rtl':
    case 'specimen':
      return `export const update = (model: Model, _message: Message): Update.Return<Model, Message> => ({ model })`
  }
}

const emitSubscriptions = (fixture: ProgressFixture): string | undefined => {
  if (fixture.kind !== 'controlled') return undefined
  return `export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscription.lift({
    pointer: Slider.subscriptions.dragPointer,
    escape: Slider.subscriptions.dragEscape,
  })<Model, Message>({
    toChildModel: model => model.slider,
    toParentMessage: message => GotSliderMessage({ message }),
  }),
)`
}

const emitApplication = (
  fixture: ProgressFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${emitStyles(fixture)}
})`
    : ''
  const optionImport =
    fixture.kind === 'controlled' ? `\nimport { Option } from 'effect'` : ''
  return foldkitApplication({
    title: `Progress — ${fixture.title}`,
    imports: `${emitImports(fixture, isStyleX)}${optionImport}${stylesBlock}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    ...(emitSubscriptions(fixture) === undefined
      ? {}
      : { subscriptions: emitSubscriptions(fixture) as string }),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Progress — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const progressExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  progressFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const progressExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, progressExamplesFor(renderer))
