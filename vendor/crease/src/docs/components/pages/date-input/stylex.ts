import { reset } from '@/stylex/reset'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { dateInputFixtures } from '@/docs/components/pages/date-input/shared'
import {
  FORMAT_EXAMPLES,
  VALIDATION_FIELDS,
} from '@/docs/components/pages/date-input/tailwind'
import * as DateInput from '@/stylex/date-input'
import { className } from '@/stylex/style'

const styles = stylex.create({
  stack: {
    gap: '1rem',
    display: 'grid',
    maxWidth: '25rem',
    minWidth: '15rem',
    width: '100%',
  },
  supporting: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})

type Preview = Readonly<{
  inputs: ReadonlyArray<DateInput.Model>
  windowLabel: string
}>

export const dateInputStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = dateInputFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview

  const inputAt = (
    slot: number,
    props: Omit<DateInput.DateInputProps<Msg>, 'model' | 'toParentMessage'>,
  ): Html =>
    DateInput.dateInput(
      {
        model: preview.inputs[slot]!,
        toParentMessage: message =>
          onMessageJson(
            JSON.stringify({
              _tag: 'GotDateInputMessage',
              slot,
              message,
            }),
          ),
        ...props,
      },
      h,
    )

  const stack = (children: ReadonlyArray<Html>): Html =>
    h.div([h.Class(className(styles.stack))], [...children])

  const supporting = (text: string): Html =>
    h.p([h.Class(className(reset.text, styles.supporting))], [text])

  const firstValue = preview.inputs[0]?.value ?? Option.none()
  const selectedText = Option.match(firstValue, {
    onNone: () => 'No date selected',
    onSome: date => `Selected: ${DateInput.dateToISO(date)}`,
  })
  const bookedText = Option.match(firstValue, {
    onNone: () => 'Pick a date in the available range',
    onSome: date => `Booked: ${DateInput.dateToISO(date)}`,
  })

  switch (fixture.example) {
    case 'DateInputClearable':
      return stack([
        supporting(selectedText),
        inputAt(0, {
          label: 'Event date',
          description: 'Pick a date for your event',
          placeholder: 'Select a date',
          hasClear: true,
        }),
      ])
    case 'DateInputDateRange':
      return stack([
        supporting(bookedText),
        inputAt(0, {
          label: 'Booking date',
          description: `Available dates: ${preview.windowLabel}`,
          placeholder: 'Select a booking date',
          presentation: 'adaptive-bottom-sheet',
        }),
      ])
    case 'DateInputFormats':
      return stack([
        supporting(
          'The same committed date, displayed with different formats.',
        ),
        ...FORMAT_EXAMPLES.map((entry, i) =>
          inputAt(i, { label: entry.label, format: entry.format }),
        ),
      ])
    case 'DateInputWithDescription':
      return stack([
        supporting('Helper text explains what the field expects'),
        inputAt(0, {
          label: 'Start date',
          description: 'Your subscription begins on this date',
          placeholder: 'Select a start date',
        }),
      ])
    case 'DateInputWithValidation':
      return stack(
        VALIDATION_FIELDS.map((field, i) =>
          inputAt(i, { label: field.label, status: field.status }),
        ),
      )
    default:
      return stack([
        inputAt(0, {
          label: 'Start date',
          placeholder: 'Select a date',
          hasClear: true,
        }),
      ])
  }
}
