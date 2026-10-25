import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type DateTimeInputFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: 'single' | 'validation'
  /** Astrryx block id, kept for tracing against the source templates. */
  example: string
  /** Minutes between preset-time options; enables the time listbox. */
  timeOptionInterval?: number
  /** ISO date+time the field starts committed to. */
  initialValue?: Readonly<{ date: string; time: string }>
}>

export const dateTimeInputFixtures: ReadonlyArray<DateTimeInputFixture> = [
  {
    title: 'Date Time Input',
    heroOnly: true,
    kind: 'single',
    example: 'DateTimeInputShowcase',
    description:
      'A combined date and time picker. Desktop opens a calendar popover with a time input; touch devices open a Date/Time bottom sheet.',
  },
  {
    title: 'DateTimeInput — Validation',
    kind: 'validation',
    example: 'DateTimeInputWithValidation',
    description:
      'DateTimeInput in all three status states: error, warning, and success. Use to surface scheduling conflicts, caution the user about edge cases, or confirm a valid datetime.',
  },
  {
    /* Derived from astryx's storybook `WithTimeOptions` story — the docs
       blocks never enable the preset-time listbox, so without this fixture
       the listbox path has no docs coverage. */
    title: 'DateTimeInput — Time options',
    kind: 'single',
    example: 'DateTimeInputWithTimeOptions',
    timeOptionInterval: 30,
    /* astryx's story starts committed ('2026-03-15T09:00') — a date is
       required for a time pick to land, mirroring commitTimeOption's
       valueParts.date guard. */
    initialValue: { date: '2026-03-15', time: '09:00' },
    description:
      'DateTimeInput with preset-time suggestions — the time half opens a listbox of half-hour options alongside typed entry.',
  },
]

export const VALIDATION_FIELDS = [
  {
    label: 'Meeting time',
    value: { date: '2026-01-25', time: '09:00' },
    status: { type: 'error', message: 'This time slot is already booked' },
  },
  {
    label: 'Preferred time',
    value: { date: '2026-12-25', time: '14:00' },
    status: {
      type: 'warning',
      message: 'This falls outside business hours',
    },
  },
  {
    label: 'Start time',
    value: { date: '2026-03-10', time: '10:30' },
    status: { type: 'success', message: 'Time confirmed' },
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

import * as DateTimeInput from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/date-time-input'${extra}`

const stylexPreamble = `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'

const styles = stylex.create({
  shell: { alignItems: 'flex-start', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  stack: {
    display: 'grid',
    gap: '1rem',
    maxWidth: '25rem',
    minWidth: '15rem',
    width: '100%',
  },
})`

const stackClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.stack))`
    : `h.Class('grid w-full min-w-[240px] max-w-[400px] gap-4')`

const messages = (multiSlot: boolean): string =>
  `import { taggedStruct } from 'foldkit/schema'
export const GotDateTimeInputMessage = taggedStruct('GotDateTimeInputMessage', { ${multiSlot ? 'slot: S.Number, ' : ''}message: DateTimeInput.Message });
export const Message = S.Union([GotDateTimeInputMessage])
export type Message = typeof Message.Type`

const singleSource = (
  fixture: DateTimeInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `DateTimeInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  dateTimeInput: DateTimeInput.Model,
})
export type Model = typeof Model.Type

const TODAY = Calendar.fromDateInZone(new Date(), 'UTC')${
      fixture.initialValue === undefined
        ? ''
        : `

const INITIAL_DATE = DateTimeInput.dateFromISO('${fixture.initialValue.date}')`
    }`,
    messages: messages(false),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    dateTimeInput: DateTimeInput.init({
      id: 'docs-date-time-input',
      today: TODAY,${
        fixture.timeOptionInterval === undefined
          ? ''
          : `
      hasTimeOptions: true,`
      }${
        fixture.initialValue === undefined
          ? ''
          : `
      value: Option.match(INITIAL_DATE, {
        onNone: () => undefined,
        onSome: date => ({ date, time: '${fixture.initialValue!.time}' }),
      }),`
      }
    }),
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDateTimeInputMessage': {
      const next = DateTimeInput.update(model.dateTimeInput, message.message)
      return {
        model: { ...model, dateTimeInput: next.model },
        commands: Command.mapMessages(next.commands ?? [], m => GotDateTimeInputMessage({ message: m })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateTimeInput — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      DateTimeInput.dateTimeInput({
        model: model.dateTimeInput,
        toParentMessage: message => GotDateTimeInputMessage({ message }),
        label: 'Meeting time',
        placeholder: 'Select a date',
        hasClear: true,${
          fixture.timeOptionInterval === undefined
            ? ''
            : `
        timeOptionInterval: ${String(fixture.timeOptionInterval)},`
        }
      }, h),
    ]),
  ]),
})`,
  })
}

const validationSource = (
  fixture: DateTimeInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const fieldLines = VALIDATION_FIELDS.map(
    f =>
      `  { label: '${f.label}', value: { date: '${f.value.date}', time: '${f.value.time}' }, status: { type: '${f.status.type}', message: '${f.status.message}' } },`,
  ).join('\n')
  return foldkitApplication({
    title: `DateTimeInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  inputs: S.Array(DateTimeInput.Model),
})
export type Model = typeof Model.Type

const TODAY = Calendar.fromDateInZone(new Date(), 'UTC')

const toDateTime = (value: { date: string; time: string }): DateTimeInput.DateTime | undefined =>
  Option.match(DateTimeInput.dateFromISO(value.date), {
    onNone: () => undefined,
    onSome: date => ({ date, time: value.time }),
  })

const FIELDS = [
${fieldLines}
] as const satisfies ReadonlyArray<{ label: string; value: { date: string; time: string }; status: DateTimeInput.DateTimeInputStatus }>`,
    messages: messages(true),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    inputs: FIELDS.map((field, i) =>
      DateTimeInput.init({
        id: \`docs-date-time-input-\${String(i)}\`,
        today: TODAY,
        value: toDateTime(field.value),
      }),
    ),
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDateTimeInputMessage': {
      const target = model.inputs[message.slot]
      if (target === undefined) return { model }
      const next = DateTimeInput.update(target, message.message)
      const inputs = model.inputs.map((input, i) =>
        i === message.slot ? next.model : input,
      )
      return {
        model: { ...model, inputs },
        commands: Command.mapMessages(next.commands ?? [], m => GotDateTimeInputMessage({ slot: message.slot, message: m })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateTimeInput — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      ...FIELDS.map((field, i) =>
        DateTimeInput.dateTimeInput({
          model: model.inputs[i]!,
          toParentMessage: message => GotDateTimeInputMessage({ slot: i, message }),
          label: field.label,
          status: field.status,
        }, h),
      ),
    ]),
  ]),
})`,
  })
}

const dateTimeInputSource = (
  fixture: DateTimeInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  fixture.kind === 'validation'
    ? validationSource(fixture, renderer)
    : singleSource(fixture, renderer)

const dateTimeInputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  dateTimeInputFixtures.map((fixture, index) => ({
    title: fixture.title,
    keepIdsCanonical: index === 0,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: dateTimeInputSource(fixture, renderer),
  }))

export const dateTimeInputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, dateTimeInputExamplesFor(renderer))
