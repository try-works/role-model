import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type DateInputFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: 'single' | 'constraints' | 'formats' | 'validation'
  /** Astrryx block id, kept for tracing against the source templates. */
  example: string
}>

export const dateInputFixtures: ReadonlyArray<DateInputFixture> = [
  {
    title: 'Date Input',
    heroOnly: true,
    kind: 'single',
    example: 'DateInputShowcase',
    description:
      'A date input field with a calendar popover. Type a date or click the calendar icon to pick one.',
  },
  {
    title: 'Clearable',
    kind: 'single',
    example: 'DateInputClearable',
    description:
      'Date input with a clear button that resets the value. Use when the date field is optional and the user may need to undo their selection.',
  },
  {
    title: 'Min/Max Constraints',
    kind: 'constraints',
    example: 'DateInputDateRange',
    description:
      'Date input constrained to a min/max window. Use when only certain dates are valid, like booking availability or a fiscal quarter.',
  },
  {
    title: 'Formats',
    kind: 'formats',
    example: 'DateInputFormats',
    description:
      "The format prop reuses Timestamp's format vocabulary to control how the committed value is displayed: date, date_long (default), date_weekday, and system_date, or a function for a fully custom string. Formatting applies only to the committed value, never to text the user is actively typing.",
  },
  {
    title: 'Description',
    kind: 'single',
    example: 'DateInputWithDescription',
    description:
      'Date input with helper text below the label explaining what the field expects. Use when the purpose of the date is not obvious from the label alone.',
  },
  {
    title: 'Validation',
    kind: 'validation',
    example: 'DateInputWithValidation',
    description:
      'Date input in all three status states: error, warning, and success. Use to surface validation issues, caution the user, or confirm a valid selection.',
  },
]

const imports = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  extra: string,
): string =>
  `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as DateInput from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/date-input'${extra}`

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
  supporting: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },
})`

const stackClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.stack))`
    : `h.Class('grid w-full max-w-[400px] min-w-[240px] gap-4')`

const supportingClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.supporting))`
    : `h.Class('text-muted-foreground text-sm')`

const messages = (multiSlot: boolean): string =>
  `import { taggedStruct } from 'foldkit/schema'
export const GotDateInputMessage = taggedStruct('GotDateInputMessage', { ${multiSlot ? 'slot: S.Number, ' : ''}message: DateInput.Message });
export const Message = S.Union([GotDateInputMessage])
export type Message = typeof Message.Type`

const singleUpdate = `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDateInputMessage': {
      const next = DateInput.update(model.dateInput, message.message)
      return {
        model: { ...model, dateInput: next.model },
        commands: Command.mapMessages(next.commands ?? [], m => GotDateInputMessage({ message: m })),
      }
    }
  }
}`

const singleSource = (
  fixture: DateInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const isClearable = fixture.example === 'DateInputClearable'
  const isDescription = fixture.example === 'DateInputWithDescription'
  const inputCall = `DateInput.dateInput({
        model: model.dateInput,
        toParentMessage: message => GotDateInputMessage({ message }),
        label: '${isClearable ? 'Event date' : 'Start date'}',
        ${isClearable ? `description: 'Pick a date for your event',` : isDescription ? `description: 'Your subscription begins on this date',` : ''}
        placeholder: '${isDescription ? 'Select a start date' : 'Select a date'}',
        ${!isDescription ? 'hasClear: true,' : ''}
      }, h)`
  const supporting = isClearable
    ? `Option.match(model.dateInput.value, {
            onNone: () => 'No date selected',
            onSome: date => \`Selected: \${DateInput.dateToISO(date)}\`,
          })`
    : `'Helper text explains what the field expects'`
  return foldkitApplication({
    title: `DateInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  dateInput: DateInput.Model,
})
export type Model = typeof Model.Type`,
    messages: messages(false),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    dateInput: DateInput.init({
      id: 'docs-date-input',
      today: Calendar.fromDateInZone(new Date(), 'UTC'),${
        isClearable
          ? `
      value: Option.getOrUndefined(DateInput.dateFromISO('2026-04-06')),`
          : ''
      }
    }),
  },
})`,
    update: singleUpdate,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateInput — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [${
      isClearable || isDescription
        ? `
      h.p([${supportingClass(isStyleX)}], [
        ${supporting},
      ]),`
        : ''
    }
      ${inputCall},
    ]),
  ]),
})`,
  })
}

const constraintsSource = (
  fixture: DateInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `DateInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  dateInput: DateInput.Model,
})
export type Model = typeof Model.Type

const TODAY = Calendar.fromDateInZone(new Date(), 'UTC')
const MIN = Calendar.make(TODAY.year, TODAY.month, 8)
const MAX = Calendar.make(TODAY.year, TODAY.month, 21)
const MONTH_NAME = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(Calendar.toDateLocal(TODAY))
const WINDOW_LABEL = \`\${MONTH_NAME} 8 – 21, \${String(TODAY.year)}\``,
    messages: messages(false),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    dateInput: DateInput.init({
      id: 'docs-date-input',
      today: TODAY,
      minDate: MIN,
      maxDate: MAX,
    }),
  },
})`,
    update: singleUpdate,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateInput — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      h.p([${supportingClass(isStyleX)}], [
        Option.match(model.dateInput.value, {
          onNone: () => 'Pick a date in the available range',
          onSome: date => \`Booked: \${DateInput.dateToISO(date)}\`,
        }),
      ]),
      DateInput.dateInput({
        model: model.dateInput,
        toParentMessage: message => GotDateInputMessage({ message }),
        label: 'Booking date',
        description: \`Available dates: \${WINDOW_LABEL}\`,
        placeholder: 'Select a booking date',
      }, h),
    ]),
  ]),
})`,
  })
}

const formatsSource = (
  fixture: DateInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `DateInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  inputs: S.Array(DateInput.Model),
})
export type Model = typeof Model.Type

const FORMATS = [
  { label: 'Short month (date)', format: 'date' },
  { label: 'Long month (date_long, default)', format: 'date_long' },
  { label: 'With weekday (date_weekday)', format: 'date_weekday' },
  { label: 'ISO 8601 (system_date)', format: 'system_date' },
  { label: 'Custom function', format: (iso: string) => \`Ship by \${iso}\` },
] as const satisfies ReadonlyArray<{ label: string; format: DateInput.SharedDateFormat | ((iso: string) => string) }>`,
    messages: messages(true),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    inputs: FORMATS.map((_, i) =>
      DateInput.init({
        id: \`docs-date-input-format-\${String(i)}\`,
        today: Calendar.fromDateInZone(new Date(), 'UTC'),
        value: Option.getOrUndefined(DateInput.dateFromISO('2026-03-21')),
      }),
    ),
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDateInputMessage': {
      const target = model.inputs[message.slot]
      if (target === undefined) return { model }
      const next = DateInput.update(target, message.message)
      const maybeOut = Option.fromNullishOr(next.outMessage)
      // The five fields share one committed date — reflect syncs the others.
      const inputs = model.inputs.map((input, i) =>
        i === message.slot
          ? next.model
          : maybeOut._tag === 'Some' && maybeOut.value._tag === 'ChangedValue'
            ? DateInput.reflect(input, maybeOut.value.value)
            : input,
      )
      return {
        model: { ...model, inputs },
        commands: Command.mapMessages(next.commands ?? [], m => GotDateInputMessage({ slot: message.slot, message: m })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateInput — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      h.p([${supportingClass(isStyleX)}], [
        'The same committed date, displayed with different formats.',
      ]),
      ...FORMATS.map((entry, i) =>
        DateInput.dateInput({
          model: model.inputs[i]!,
          toParentMessage: message => GotDateInputMessage({ slot: i, message }),
          label: entry.label,
          format: entry.format,
        }, h),
      ),
    ]),
  ]),
})`,
  })
}

const validationSource = (
  fixture: DateInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `DateInput — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: `export const Model = S.Struct({
  inputs: S.Array(DateInput.Model),
})
export type Model = typeof Model.Type

const FIELDS = [
  { label: 'Event date', value: '2026-01-25', status: { type: 'error', message: 'This date is already booked' } },
  { label: 'Preferred date', value: '2026-12-25', status: { type: 'warning', message: 'This date falls on a holiday' } },
  { label: 'Start date', value: '2026-03-10', status: { type: 'success', message: 'Date confirmed' } },
] as const satisfies ReadonlyArray<{ label: string; value: string; status: DateInput.DateInputStatus }>`,
    messages: messages(true),
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    inputs: FIELDS.map((field, i) =>
      DateInput.init({
        id: \`docs-date-input-status-\${String(i)}\`,
        today: Calendar.fromDateInZone(new Date(), 'UTC'),
        value: Option.getOrUndefined(DateInput.dateFromISO(field.value)),
      }),
    ),
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDateInputMessage': {
      const target = model.inputs[message.slot]
      if (target === undefined) return { model }
      const next = DateInput.update(target, message.message)
      const inputs = model.inputs.map((input, i) =>
        i === message.slot ? next.model : input,
      )
      return {
        model: { ...model, inputs },
        commands: Command.mapMessages(next.commands ?? [], m => GotDateInputMessage({ slot: message.slot, message: m })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'DateInput — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      ...FIELDS.map((field, i) =>
        DateInput.dateInput({
          model: model.inputs[i]!,
          toParentMessage: message => GotDateInputMessage({ slot: i, message }),
          label: field.label,
          status: field.status,
        }, h),
      ),
    ]),
  ]),
})`,
  })
}

const dateInputSource = (
  fixture: DateInputFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'constraints':
      return constraintsSource(fixture, renderer)
    case 'formats':
      return formatsSource(fixture, renderer)
    case 'validation':
      return validationSource(fixture, renderer)
    default:
      return singleSource(fixture, renderer)
  }
}

const dateInputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  dateInputFixtures.map((fixture, index) => ({
    title: fixture.title,
    keepIdsCanonical: index === 0,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: dateInputSource(fixture, renderer),
  }))

export const dateInputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, dateInputExamplesFor(renderer))
