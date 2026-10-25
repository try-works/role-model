import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  VALIDATION_FIELDS,
  dateTimeInputFixtures,
} from '@/docs/components/pages/date-time-input/shared'
import * as DateTimeInput from '@/stylex/date-time-input'
import { className } from '@/stylex/style'

const styles = stylex.create({
  stack: {
    gap: '1rem',
    display: 'grid',
    maxWidth: '25rem',
    minWidth: '15rem',
    width: '100%',
  },
})

type Preview = Readonly<{
  inputs: ReadonlyArray<DateTimeInput.Model>
}>

export const dateTimeInputStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = dateTimeInputFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview

  const inputAt = (
    slot: number,
    props: Omit<
      DateTimeInput.DateTimeInputProps<Msg>,
      'model' | 'toParentMessage' | 'label'
    > & { label: string },
  ): Html =>
    DateTimeInput.dateTimeInput(
      {
        model: preview.inputs[slot]!,
        toParentMessage: message =>
          onMessageJson(
            JSON.stringify({
              _tag: 'GotDateTimeInputMessage',
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

  switch (fixture.example) {
    case 'DateTimeInputWithValidation':
      return stack(
        VALIDATION_FIELDS.map((field, i) =>
          inputAt(i, { label: field.label, status: field.status }),
        ),
      )
    default:
      return stack([
        inputAt(0, {
          label: 'Meeting time',
          placeholder: 'Select a date',
          hasClear: true,
          ...(fixture.timeOptionInterval === undefined
            ? {}
            : { timeOptionInterval: fixture.timeOptionInterval }),
        }),
      ])
  }
}
