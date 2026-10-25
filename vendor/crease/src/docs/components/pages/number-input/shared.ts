import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type NumberInputFixtureEntry = Readonly<{
  id: string
  label: string
  initialValue?: number
  placeholder?: string
  units?: string
  min?: number
  max?: number
  description?: string
  status?: Readonly<{ type: 'error' | 'warning' | 'success'; message: string }>
  hasClear?: boolean
  hasNumberSteppers?: boolean
  formatValue?: 'items'
}>

export type NumberInputFixture = Readonly<{
  title: string
  description: string
  width: number
  entries: ReadonlyArray<NumberInputFixtureEntry>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/NumberInput/*.tsx —
   same demos, same labels. */
export const numberInputFixtures: Readonly<
  [NumberInputFixture, ...Array<NumberInputFixture>]
> = [
  {
    title: 'Number Input',
    description: 'A number input for quantity entry.',
    width: 300,
    entries: [
      {
        id: 'quantity',
        label: 'Quantity',
        placeholder: 'Enter quantity',
        initialValue: 0,
        formatValue: 'items',
        hasNumberSteppers: true,
      },
    ],
  },
  {
    title: 'NumberInput — Clearable',
    description:
      'Number input with a clear button, unit suffix, and min/max constraint',
    width: 300,
    entries: [
      {
        id: 'progress',
        label: 'Progress',
        units: '%',
        min: 0,
        max: 100,
        initialValue: 75,
        hasClear: true,
      },
    ],
  },
  {
    title: 'NumberInput — Range Constrained',
    description:
      'Number input with min/max boundaries and a helper description',
    width: 300,
    entries: [
      {
        id: 'team-size',
        label: 'Team Size',
        placeholder: '1–50',
        min: 1,
        max: 50,
        description: 'Number of people on the team',
        initialValue: 3,
      },
    ],
  },
  {
    title: 'NumberInput — Status Variants',
    description:
      'Number inputs showing error, warning, and success validation states',
    width: 300,
    entries: [
      {
        id: 'budget',
        label: 'Budget',
        initialValue: -5,
        status: { type: 'error', message: 'Must be a positive amount' },
      },
      {
        id: 'headcount',
        label: 'Headcount',
        initialValue: 150,
        status: { type: 'warning', message: 'Exceeds typical team size' },
      },
      {
        id: 'completion',
        label: 'Completion',
        units: '%',
        initialValue: 25,
        status: { type: 'success', message: 'On track' },
      },
    ],
  },
  {
    title: 'NumberInput — With Units',
    description: 'Number input with a percentage unit suffix and valid range',
    width: 300,
    entries: [
      {
        id: 'discount',
        label: 'Discount',
        placeholder: 'Enter discount',
        min: 0,
        max: 100,
        units: '%',
        initialValue: 50,
      },
    ],
  },
]

const ui = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'): string =>
  renderer !== 'tailwind' ? 'stylex' : 'ui'

const numberInputCallSource = (
  entry: NumberInputFixtureEntry,
  slot: string,
): string => `NumberInput.numberInput(
        {
          model: model.inputs[${slot}]!.input,
          toParentMessage: message => GotNumberInputMessage({ index: ${slot}, message }),
          id: '${entry.id}',
          label: '${entry.label}',${entry.placeholder === undefined ? '' : `\n          placeholder: '${entry.placeholder}',`}${entry.units === undefined ? '' : `\n          units: '${entry.units}',`}${entry.min === undefined ? '' : `\n          min: ${entry.min},`}${entry.max === undefined ? '' : `\n          max: ${entry.max},`}${entry.description === undefined ? '' : `\n          description: '${entry.description}',`}${entry.status === undefined ? '' : `\n          status: { type: '${entry.status.type}', message: '${entry.status.message}' },`}${entry.formatValue === 'items' ? '\n          formatValue: number => `${number} items`,' : ''}${entry.hasClear === true ? '\n          hasClear: true,' : ''}${entry.hasNumberSteppers === true ? '\n          hasNumberSteppers: true,' : ''}
          value: model.inputs[${slot}]!.value.pipe(Option.getOrNull),
        },
        h,
      )`

const viewSource = (fixture: NumberInputFixture, styled: boolean): string => {
  const entries = fixture.entries
    .map((entry, entryIndex) =>
      numberInputCallSource(entry, String(entryIndex)),
    )
    .join(',\n      ')
  return `${styled ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main([h.Class(${styled ? 'className(shellStyles.shell)' : "'mx-auto flex min-h-screen w-full max-w-md items-center p-8'"})], [
    h.div(
      [h.Class('flex flex-col gap-4'), h.Style({ width: '${fixture.width}px' })],
      [
        ${entries},
      ],
    ),
  ]),
})`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = numberInputFixtures[index] ?? numberInputFixtures[0]
  return foldkitApplication({
    title: `NumberInput — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as NumberInput from '@/${ui(renderer)}/number-input'`,
    model: `export const Entry = S.Struct({ input: NumberInput.Model, value: S.Option(S.Number) })
export const Model = S.Struct({ inputs: S.Array(Entry) })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotNumberInputMessage = taggedStruct('GotNumberInputMessage', { index: S.Number, message: NumberInput.Message });
export const Message = S.Union([GotNumberInputMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {
    inputs: [${fixture.entries
      .map(
        entry =>
          `{ input: NumberInput.init({ id: 'docs-number-input-${entry.id}' }), value: ${entry.initialValue === undefined ? 'Option.none()' : `Option.some(${entry.initialValue})`} }`,
      )
      .join(',\n      ')}],
  } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotNumberInputMessage': {
      const entry = model.inputs[message.index]
      if (entry === undefined) return { model }
      const next = NumberInput.update(entry.input, message.message)
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
          GotNumberInputMessage({ index: message.index, message: next2 }),
        ),
      }
    }
  }
}`,
    view: viewSource(fixture, renderer !== 'tailwind'),
  })
}

const numberInputExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  numberInputFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const numberInputExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, numberInputExamplesFor(renderer))
