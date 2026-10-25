import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type DateRangeInputFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: 'presets' | 'validation'
  /** Astrryx block id, kept for tracing against the source templates. */
  example: string
}>

export const dateRangeInputFixtures: ReadonlyArray<DateRangeInputFixture> = [
  {
    title: 'Date Range Input',
    heroOnly: true,
    kind: 'presets',
    example: 'DateRangeInputShowcase',
    description:
      'A date range picker with a button trigger and dual-month calendar popover with preset ranges.',
  },
  {
    title: 'With Presets',
    kind: 'presets',
    example: 'DateRangeInputWithPresets',
    description:
      'Date range picker with quick-select presets for common periods. Use for analytics dashboards, report filters, or any context where users frequently select standard time windows.',
  },
  {
    title: 'Validation',
    kind: 'validation',
    example: 'DateRangeInputWithValidation',
    description:
      'Date range input in all three status states: error, warning, and success. Use to surface booking conflicts, flag high-demand periods, or confirm an available range.',
  },
]

const PRESET_SETS: Readonly<Record<string, ReadonlyArray<number>>> = {
  DateRangeInputShowcase: [7, 30],
  DateRangeInputWithPresets: [7, 14, 30, 90],
}

export const presetDaysFor = (example: string): ReadonlyArray<number> =>
  PRESET_SETS[example] ?? [7, 30]

const VALIDATION_FIELDS = [
  {
    label: 'Booking period',
    value: { start: '2026-01-01', end: '2026-01-31' },
    status: {
      type: 'error',
      message: 'Selected dates are no longer available',
    },
  },
  {
    label: 'Preferred period',
    value: { start: '2026-06-01', end: '2026-06-30' },
    status: { type: 'warning', message: 'High demand — limited availability' },
  },
  {
    label: 'Confirmed period',
    value: { start: '2026-03-01', end: '2026-03-31' },
    status: { type: 'success', message: 'Dates confirmed and available' },
  },
] as const

const imports = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  extra: string,
): string =>
  `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as DateRangeInput from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/date-range-input'${extra}`

const stylexPreamble = `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'

const styles = stylex.create({
  shell: { alignItems: 'flex-start', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  stack: {
    display: 'grid',
    gap: '1rem',
    maxWidth: '25rem',
    width: '100%',
  },
  supporting: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },
})`

const stackClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.stack))`
    : `h.Class('grid w-full max-w-[400px] gap-4')`

const supportingClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.supporting))`
    : `h.Class('text-muted-foreground text-sm')`

const messages = (multiSlot: boolean): string =>
  `import { taggedStruct } from 'foldkit/schema'
export const GotDateRangeInputMessage = taggedStruct('GotDateRangeInputMessage', { ${multiSlot ? 'slot: S.Number, ' : ''}message: DateRangeInput.Message });
export const Message = S.Union([GotDateRangeInputMessage])
export type Message = typeof Message.Type`

const singleUpdate = `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDateRangeInputMessage': {
      const next = DateRangeInput.update(model.dateRangeInput, message.message)
      return {
        model: { ...model, dateRangeInput: next.model },
        commands: Command.mapMessages(next.commands ?? [], m => GotDateRangeInputMessage({ message: m })),
      }
    }
  }
}`

const presetsSource = (
  fixture: DateRangeInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const isShowcase = fixture.example === 'DateRangeInputShowcase'
  const days = presetDaysFor(fixture.example)
  const presetLines = days
    .map(
      n =>
        `  { label: 'Last ${String(n)} days', getRange: () => ({ start: Calendar.subtractDays(TODAY, ${String(n)}), end: TODAY }) },`,
    )
    .join('\n')
  return foldkitApplication({
    title: `DateRangeInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  dateRangeInput: DateRangeInput.Model,
})
export type Model = typeof Model.Type

const TODAY = Calendar.fromDateInZone(new Date(), 'UTC')
const PRESETS: ReadonlyArray<DateRangeInput.DateRangePreset> = [
${presetLines}
]`,
    messages: messages(false),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    dateRangeInput: DateRangeInput.init({
      id: 'docs-date-range-input',
      today: TODAY,
    }),
  },
})`,
    update: singleUpdate,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateRangeInput — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [${
      isShowcase
        ? ''
        : `
      h.p([${supportingClass(isStyleX)}], [
        Option.match(model.dateRangeInput.value, {
          onNone: () => 'No range selected',
          onSome: range =>
            \`\${DateRangeInput.dateToISO(range.start)} → \${DateRangeInput.dateToISO(range.end)}\`,
        }),
      ]),`
    }
      DateRangeInput.dateRangeInput({
        model: model.dateRangeInput,
        toParentMessage: message => GotDateRangeInputMessage({ message }),
        label: '${isShowcase ? 'Date range' : 'Report period'}',${
          isShowcase
            ? ''
            : `
        description: 'Use a preset or pick a custom range',`
        }
        presets: PRESETS,
      }, h),
    ]),
  ]),
})`,
  })
}

const validationSource = (
  fixture: DateRangeInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const fieldLines = VALIDATION_FIELDS.map(
    f =>
      `  { label: '${f.label}', value: { start: '${f.value.start}', end: '${f.value.end}' }, status: { type: '${f.status.type}', message: '${f.status.message}' } },`,
  ).join('\n')
  return foldkitApplication({
    title: `DateRangeInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  inputs: S.Array(DateRangeInput.Model),
})
export type Model = typeof Model.Type

const TODAY = Calendar.fromDateInZone(new Date(), 'UTC')

const toRange = (value: { start: string; end: string }): DateRangeInput.Range | undefined =>
  Option.match(
    Option.all({
      start: DateRangeInput.dateFromISO(value.start),
      end: DateRangeInput.dateFromISO(value.end),
    }),
    { onNone: () => undefined, onSome: range => range },
  )

const FIELDS = [
${fieldLines}
] as const satisfies ReadonlyArray<{ label: string; value: { start: string; end: string }; status: DateRangeInput.DateRangeInputStatus }>`,
    messages: messages(true),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    inputs: FIELDS.map((field, i) =>
      DateRangeInput.init({
        id: \`docs-date-range-input-\${String(i)}\`,
        today: TODAY,
        value: toRange(field.value),
      }),
    ),
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDateRangeInputMessage': {
      const target = model.inputs[message.slot]
      if (target === undefined) return { model }
      const next = DateRangeInput.update(target, message.message)
      const inputs = model.inputs.map((input, i) =>
        i === message.slot ? next.model : input,
      )
      return {
        model: { ...model, inputs },
        commands: Command.mapMessages(next.commands ?? [], m => GotDateRangeInputMessage({ slot: message.slot, message: m })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateRangeInput — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      ...FIELDS.map((field, i) =>
        DateRangeInput.dateRangeInput({
          model: model.inputs[i]!,
          toParentMessage: message => GotDateRangeInputMessage({ slot: i, message }),
          label: field.label,
          status: field.status,
        }, h),
      ),
    ]),
  ]),
})`,
  })
}

const dateRangeInputSource = (
  fixture: DateRangeInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  fixture.kind === 'validation'
    ? validationSource(fixture, renderer)
    : presetsSource(fixture, renderer)

const dateRangeInputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  dateRangeInputFixtures.map((fixture, index) => ({
    title: fixture.title,
    keepIdsCanonical: index === 0,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: dateRangeInputSource(fixture, renderer),
  }))

export const dateRangeInputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, dateRangeInputExamplesFor(renderer))
