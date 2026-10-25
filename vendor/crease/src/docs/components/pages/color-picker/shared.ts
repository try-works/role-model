import type { DocsExample } from '@/docs/components/page-definition'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type ColorPickerFixture = Readonly<{
  id: string
  title: string
  description?: string
  /** 'popover' renders trigger + panel; 'inline' renders the panel directly. */
  kind: 'popover' | 'inline'
  trigger?: 'swatch' | 'button' | 'input'
  initialValue: string
  withoutAlpha?: boolean
  disabled?: boolean
  controlled?: boolean
  /** Renders only as the page hero, with its own model instance — needed
      for popover fixtures so the hero and a named twin never share ids. */
  heroOnly?: boolean
}>

export const colorPickerFixtures: Readonly<
  [ColorPickerFixture, ...ReadonlyArray<ColorPickerFixture>]
> = [
  {
    id: 'hero',
    title: 'Swatch Trigger',
    kind: 'popover',
    trigger: 'swatch',
    initialValue: '#3b82f6',
    heroOnly: true,
  },
  {
    id: 'swatch',
    title: 'Swatch Trigger',
    description:
      'The default trigger is a compact swatch button that opens the picker popover.',
    kind: 'popover',
    trigger: 'swatch',
    initialValue: '#3b82f6',
  },
  {
    id: 'button-trigger',
    title: 'Button Trigger',
    description:
      'Pass `trigger` content to pair the swatch with a label, like diceui’s button render.',
    kind: 'popover',
    trigger: 'button',
    initialValue: '#22c55e',
  },
  {
    id: 'input-trigger',
    title: 'Input Trigger',
    description:
      'An input-styled trigger shows the formatted value next to the swatch.',
    kind: 'popover',
    trigger: 'input',
    initialValue: '#a855f7',
  },
  {
    id: 'inline',
    title: 'Inline',
    description:
      '`inline` renders the panel without a trigger or popover — for embedded editors like /create.',
    kind: 'inline',
    initialValue: '#f97316',
  },
  {
    id: 'controlled',
    title: 'Controlled',
    description:
      'The emitted ChangedValue out message feeds a parent-owned value, here echoed beside the picker.',
    kind: 'popover',
    controlled: true,
    initialValue: '#0ea5e9',
  },
  {
    id: 'without-alpha',
    title: 'Without Alpha',
    description: '`withoutAlpha` drops the alpha slider from the panel.',
    kind: 'popover',
    withoutAlpha: true,
    initialValue: '#ef4444',
  },
  {
    id: 'disabled',
    title: 'Disabled',
    description: 'A disabled picker blocks all channels and dims the trigger.',
    kind: 'popover',
    disabled: true,
    initialValue: '#64748b',
  },
]

const STYLES_BLOCK = `
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  stack: { alignItems: 'center', display: 'flex', gap: '0.75rem' },
  value: { color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem' },
})
`

const pickerSource = (
  fixture: ColorPickerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat',
): string => {
  const styled = renderer !== 'tailwind'
  const mod = renderer === 'tailwind' ? 'ui' : renderer
  const stackClass = styled
    ? 'className(styles.stack)'
    : "'flex items-center gap-3'"
  const valueClass = styled
    ? 'className(styles.value)'
    : "'font-mono text-xs text-muted-foreground'"
  const initFlags = [
    `value: '${fixture.initialValue}'`,
    fixture.withoutAlpha === true ? 'withoutAlpha: true' : undefined,
    fixture.disabled === true ? 'disabled: true' : undefined,
  ]
    .filter((flag): flag is string => flag !== undefined)
    .join(',\n    ')
  const viewCall =
    fixture.kind === 'inline'
      ? `ColorPicker.colorPicker({
      model: model.picker,
      toParentMessage: message => GotColorPickerMessage({ message }),
      inline: true,
    }, h)`
      : fixture.trigger === 'button'
        ? `ColorPicker.colorPicker({
      model: model.picker,
      toParentMessage: message => GotColorPickerMessage({ message }),
      trigger: h.span([h.Class('flex items-center gap-2 whitespace-nowrap')], [
        ColorPicker.colorPickerSwatch({ color: ColorPicker.hex(model.picker) }, h),
        'Pick a color',
      ]),
      ${styled ? "triggerButtonVariant: 'outline'," : "triggerClass: 'inline-flex h-9 items-center rounded-md border bg-background px-3 shadow-xs hover:bg-accent',"}
    }, h)`
        : fixture.trigger === 'input'
          ? `ColorPicker.colorPicker({
      model: model.picker,
      toParentMessage: message => GotColorPickerMessage({ message }),
      trigger: h.span([h.Class('flex items-center gap-2 whitespace-nowrap')], [
        ColorPicker.colorPickerSwatch({ color: ColorPicker.hex(model.picker) }, h),
        h.span([h.Class('font-mono text-xs')], [model.value]),
      ]),
      ${styled ? "triggerButtonVariant: 'outline'," : "triggerClass: 'inline-flex h-9 w-36 items-center gap-2 rounded-md border bg-background px-3 shadow-xs hover:bg-accent',"}
    }, h)`
          : `ColorPicker.colorPicker({
      model: model.picker,
      toParentMessage: message => GotColorPickerMessage({ message }),
    }, h)`
  const viewBody =
    fixture.controlled === true
      ? `h.div([h.Class(${stackClass})], [
    ${viewCall},
    h.span([h.Class(${valueClass})], [model.value]),
  ])`
      : viewCall
  return foldkitApplication({
    title: `Color Picker — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  styled
    ? `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
`
    : ''
}
import * as ColorPicker from '@/${mod}/color-picker'${styled ? STYLES_BLOCK : ''}`,
    model: `export const Model = S.Struct({
  picker: ColorPicker.Model,
  value: S.String,
})
export type Model = typeof Model.Type`,
    messages: `export const GotColorPickerMessage = taggedStruct('GotColorPickerMessage${fixture.id.replaceAll(/[^a-zA-Z0-9]/g, '')}', {
  message: ColorPicker.Message,
})
export const Message = S.Union([GotColorPickerMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    picker: ColorPicker.init({
      id: 'color-picker',
      ${initFlags},
    }),
    value: '${fixture.initialValue}',
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotColorPickerMessage${fixture.id.replaceAll(/[^a-zA-Z0-9]/g, '')}': {
      const next = ColorPicker.update(model.picker, message.message)
      const commands = next.commands ?? []
      const maybeChange = Option.fromNullishOr(next.outMessage)
      return {
        model: {
          ...model,
          picker: next.model,
          value: Option.match(maybeChange, {
            onNone: () => model.value,
            onSome: change => change.value,
          }),
        },
        commands: Command.mapMessages(commands, next =>
          GotColorPickerMessage({ message: next })),
      }
    }
  }
}`,
    subscriptions: `export const subscriptions = Subscription.aggregate<Model, Message>()(
  ColorPicker.subscriptions<Model, Message>({
    id: 'color-picker',
    toChildModel: model => model.picker,
    toParentMessage: message => GotColorPickerMessage({ message }),
  }),
)`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Color Picker — ${fixture.title}',
  body: h.main([h.Class(${styled ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${viewBody},
  ]),
})`,
  })
}

export const colorPickerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> =>
  colorPickerFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: pickerSource(fixture, renderer),
  }))
