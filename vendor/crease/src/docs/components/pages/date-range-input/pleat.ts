import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import * as Calendar from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { dateRangeInputFixtures } from '@/docs/components/pages/date-range-input/shared'
import {
  PRESETS_FOR,
  VALIDATION_FIELDS,
} from '@/docs/components/pages/date-range-input/tailwind'
import * as DateRangeInput from '@/pleat/date-range-input'
import { className } from '@/pleat/style'

const styles = {
  stack: Style.make({
    gap: '1rem',
    display: 'grid',
    maxWidth: '25rem',
    width: '100%',
  }),
  supporting: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

type Preview = Readonly<{
  inputs: ReadonlyArray<DateRangeInput.Model>
}>

export const dateRangeInputPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = dateRangeInputFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview
  const today = Calendar.fromDateInZone(new Date(), 'UTC')

  const inputAt = (
    slot: number,
    props: Omit<
      DateRangeInput.DateRangeInputProps<Msg>,
      'model' | 'toParentMessage' | 'label'
    > & { label: string },
  ): Html =>
    DateRangeInput.dateRangeInput(
      {
        model: preview.inputs[slot]!,
        toParentMessage: message =>
          onMessageJson(
            JSON.stringify({
              _tag: 'GotDateRangeInputMessage',
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

  switch (fixture.example) {
    case 'DateRangeInputWithPresets':
      return stack([
        supporting(
          Option.match(preview.inputs[0]?.value ?? Option.none(), {
            onNone: () => 'No range selected',
            onSome: range =>
              `${DateRangeInput.dateToISO(range.start)} → ${DateRangeInput.dateToISO(range.end)}`,
          }),
        ),
        inputAt(0, {
          label: 'Report period',
          description: 'Use a preset or pick a custom range',
          presets: PRESETS_FOR(fixture.example, today),
        }),
      ])
    case 'DateRangeInputWithValidation':
      return stack(
        VALIDATION_FIELDS.map((field, i) =>
          inputAt(i, { label: field.label, status: field.status }),
        ),
      )
    default:
      return stack([
        inputAt(0, {
          label: 'Date range',
          presets: PRESETS_FOR(fixture.example, today),
        }),
      ])
  }
}
