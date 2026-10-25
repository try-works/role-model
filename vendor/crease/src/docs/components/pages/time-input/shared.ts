import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type TimeInputFixtureEntry = Readonly<{
  id: string
  label: string
  initialValue?: string
  placeholder?: string
  min?: string
  max?: string
  increment?: number
  hourFormat?: '12h' | '24h'
  presentation?: 'input' | 'select'
  hasSeconds?: boolean
  hasClear?: boolean
  isDisabled?: boolean
  description?: string
  status?: Readonly<{ type: 'error' | 'warning' | 'success'; message: string }>
}>

export type TimeInputFixture = Readonly<{
  title: string
  description: string
  heading?: string
  maxWidth: number
  entries: ReadonlyArray<TimeInputFixtureEntry>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/TimeInput/*.tsx —
   same demos, same labels. */
export const timeInputFixtures: Readonly<
  [TimeInputFixture, ...Array<TimeInputFixture>]
> = [
  {
    title: 'Time Input',
    description:
      'A styled text input for flexible time entry. Use the selector presentation for hour and minute dropdowns.',
    maxWidth: 400,
    entries: [{ id: 'time', label: 'Time', placeholder: 'Select a time' }],
  },
  {
    title: 'TimeInput — Constrained',
    description:
      'Time inputs with min/max constraints limiting selection to specific windows. Use to prevent out-of-bounds selections for appointments, reservations, or shift scheduling.',
    maxWidth: 400,
    entries: [
      {
        id: 'dinner',
        label: 'Dinner reservation',
        min: '17:00',
        max: '22:00',
        description: 'Evening seating: 5 PM – 10 PM',
        placeholder: 'Select reservation time',
        hasClear: true,
      },
    ],
  },
  {
    title: 'TimeInput — Formats',
    description:
      '12-hour, 24-hour, and seconds formats side by side. Use 12h for US-centric UIs, 24h for international or technical contexts, and seconds for precise timing.',
    heading: 'Format variations for different contexts',
    maxWidth: 400,
    entries: [
      { id: '24h', label: '24-hour', hourFormat: '24h', initialValue: '14:30' },
      {
        id: 'seconds',
        label: 'With seconds',
        hasSeconds: true,
        initialValue: '14:30:45',
      },
    ],
  },
  {
    title: 'TimeInput — Increment',
    description:
      'Time input with a custom step increment. Arrow keys jump by the specified interval (e.g. 15 minutes) for quick slot-based scheduling.',
    maxWidth: 400,
    entries: [
      {
        id: 'slot',
        label: 'Appointment slot',
        increment: 15,
        description: 'Use arrow keys to change by 15 minutes',
        initialValue: '09:00',
        hasClear: true,
      },
    ],
  },
  {
    title: 'TimeInput — States',
    description:
      'Default, disabled, error, warning, and success states. Use status messages to give users clear feedback about their time selection.',
    maxWidth: 400,
    entries: [
      {
        id: 'disabled',
        label: 'Disabled field',
        initialValue: '10:00',
        isDisabled: true,
      },
      {
        id: 'error',
        label: 'Error message',
        initialValue: '22:00',
        status: {
          type: 'error',
          message: 'Time must be during business hours',
        },
      },
      {
        id: 'warning',
        label: 'Warning message',
        initialValue: '07:00',
        status: { type: 'warning', message: 'Early morning — are you sure?' },
      },
      {
        id: 'success',
        label: 'Success message',
        initialValue: '10:00',
        status: { type: 'success', message: 'Time slot is available' },
      },
    ],
  },
  {
    title: 'Hour and Minute Picker',
    description:
      'Styled hour and minute dropdowns with keyboard selection. Supports 24-hour time, AM/PM, seconds, and time windows.',
    maxWidth: 400,
    entries: [
      {
        id: 'picker-24h',
        label: '24-hour time',
        presentation: 'select',
        hourFormat: '24h',
        initialValue: '10:30',
        hasClear: true,
      },
      {
        id: 'picker-12h',
        label: '12-hour time with seconds',
        presentation: 'select',
        hasSeconds: true,
        initialValue: '14:30:45',
      },
      {
        id: 'picker-constrained',
        label: 'Business hours',
        presentation: 'select',
        hourFormat: '24h',
        initialValue: '10:30',
        min: '09:15',
        max: '17:45',
        description: 'Available from 09:15 to 17:45',
      },
      {
        id: 'picker-disabled',
        label: 'Disabled picker',
        presentation: 'select',
        hourFormat: '24h',
        initialValue: '10:30',
        isDisabled: true,
      },
    ],
  },
]

const ui = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'): string =>
  renderer !== 'tailwind' ? 'stylex' : 'ui'

const timeInputCallSource = (
  entry: TimeInputFixtureEntry,
  slot: string,
): string => `TimeInput.timeInput(
          {
            model: model.inputs[${slot}]!.input,
            toParentMessage: message => GotTimeInputMessage({ index: ${slot}, message }),
            id: '${entry.id}',
            ${entry.presentation === undefined ? '' : `presentation: '${entry.presentation}',`}
            label: '${entry.label}',${entry.placeholder === undefined ? '' : `\n            placeholder: '${entry.placeholder}',`}${entry.min === undefined ? '' : `\n            min: '${entry.min}',`}${entry.max === undefined ? '' : `\n            max: '${entry.max}',`}${entry.increment === undefined ? '' : `\n            increment: ${entry.increment},`}${entry.hourFormat === undefined ? '' : `\n            hourFormat: '${entry.hourFormat}',`}${entry.hasSeconds === true ? '\n            hasSeconds: true,' : ''}${entry.hasClear === true ? '\n            hasClear: true,' : ''}${entry.isDisabled === true ? '\n            isDisabled: true,' : ''}${entry.description === undefined ? '' : `\n            description: '${entry.description}',`}${entry.status === undefined ? '' : `\n            status: { type: '${entry.status.type}', message: '${entry.status.message}' },`}
            value: model.inputs[${slot}]!.value.pipe(Option.getOrNull),
          },
          h,
        )`

const viewSource = (fixture: TimeInputFixture, styled: boolean): string => {
  const entries = fixture.entries
    .map((entry, entryIndex) => timeInputCallSource(entry, String(entryIndex)))
    .join(',\n        ')
  const heading =
    fixture.heading === undefined
      ? ''
      : `      h.p([h.Class('text-xs text-muted-foreground')], ['${fixture.heading}']),\n      `
  return `${styled ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main([h.Class(${styled ? 'className(shellStyles.shell)' : "'mx-auto flex min-h-screen w-full max-w-md items-center p-8'"})], [
    h.div(
      [h.Class('flex w-full flex-col gap-3'), h.Style({ maxWidth: '${String(fixture.maxWidth)}px' })],
      [
        ${heading}${entries},
      ],
    ),
  ]),
})`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = timeInputFixtures[index] ?? timeInputFixtures[0]
  return foldkitApplication({
    title: `TimeInput — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as TimeInput from '@/${ui(renderer)}/time-input'`,
    model: `export const Entry = S.Struct({ input: TimeInput.Model, value: S.Option(S.String) })
export const Model = S.Struct({ inputs: S.Array(Entry) })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotTimeInputMessage = taggedStruct('GotTimeInputMessage', { index: S.Number, message: TimeInput.Message });
export const Message = S.Union([GotTimeInputMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {
    inputs: [${fixture.entries
      .map(
        entry =>
          `{ input: TimeInput.init({ id: 'docs-time-input-${entry.id}' }), value: ${entry.initialValue === undefined ? 'Option.none()' : `Option.some('${entry.initialValue}')`} }`,
      )
      .join(',\n      ')}],
  } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotTimeInputMessage': {
      const entry = model.inputs[message.index]
      if (entry === undefined) return { model }
      const next = TimeInput.update(entry.input, message.message)
      const commands = next.commands ?? []
      const value = Option.match(Option.fromNullishOr(next.outMessage), {
        onNone: () => entry.value,
        onSome: changed => changed.value,
      })
      const inputs = model.inputs.map((candidate, i) =>
        i === message.index ? { input: next.model, value } : candidate,
      )
      return {
        model: { ...model, inputs },
        commands: Command.mapMessages(commands, next2 =>
          GotTimeInputMessage({ index: message.index, message: next2 }),
        ),
      }
    }
  }
}`,
    view: viewSource(fixture, renderer !== 'tailwind'),
  })
}

const timeInputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  timeInputFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const timeInputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, timeInputExamplesFor(renderer))
