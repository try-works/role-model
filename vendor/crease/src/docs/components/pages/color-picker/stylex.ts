import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  colorPickerFixtures,
  type ColorPickerFixture,
} from '@/docs/components/pages/color-picker/shared'
import { className } from '@/stylex/style'
import { tokens } from '@/stylex/tokens.stylex'
import * as ColorPicker from '@/stylex/color-picker'
import type { Model as PickerModel } from '@/stylex/color-picker'

type PreviewShape = Readonly<{
  pickers: Readonly<Record<string, PickerModel>>
  values: Readonly<Record<string, string>>
}>

const FALLBACK = ColorPicker.init({ id: 'docs-color-picker-fallback' })

const styles = stylex.create({
  stack: { gap: '0.75rem', alignItems: 'center', display: 'flex' },
  value: {
    color: tokens.mutedForeground,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.75rem',
  },
  triggerContent: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
  triggerLabel: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.75rem',
  },
  triggerInput: { width: '9rem' },
})

const pickerView = <Msg>(
  fixture: ColorPickerFixture,
  preview: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const picker = preview.pickers[fixture.id] ?? FALLBACK
  const toParentMessage = (message: ColorPicker.Message): Msg =>
    onMessageJson(
      JSON.stringify({
        _tag: 'GotColorPickerMessage',
        id: fixture.id,
        message,
      }),
    )
  const base = { model: picker, toParentMessage }
  switch (fixture.trigger) {
    case 'button':
      return ColorPicker.colorPicker(
        {
          ...base,
          trigger: h.span(
            [h.Class(className(styles.triggerContent))],
            [
              ColorPicker.colorPickerSwatch(
                { color: ColorPicker.hex(picker) },
                h,
              ),
              'Pick a color',
            ],
          ),
          triggerButtonVariant: 'outline',
        },
        h,
      )
    case 'input':
      return ColorPicker.colorPicker(
        {
          ...base,
          trigger: h.span(
            [h.Class(className(styles.triggerContent))],
            [
              ColorPicker.colorPickerSwatch(
                { color: ColorPicker.hex(picker) },
                h,
              ),
              h.span(
                [h.Class(className(styles.triggerLabel))],
                [preview.values[fixture.id] ?? fixture.initialValue],
              ),
            ],
          ),
          triggerButtonVariant: 'outline',
          triggerLayoutStyle: styles.triggerInput,
        },
        h,
      )
    default:
      return ColorPicker.colorPicker(
        { ...base, ...(fixture.kind === 'inline' ? { inline: true } : {}) },
        h,
      )
  }
}

export const colorPickerStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = colorPickerFixtures[index] ?? colorPickerFixtures[0]
  const pickerNode = pickerView(fixture, preview, onMessageJson, h)
  return fixture.controlled === true
    ? h.div(
        [h.Class(className(styles.stack))],
        [
          pickerNode,
          h.span(
            [h.Class(className(styles.value))],
            [preview.values[fixture.id] ?? fixture.initialValue],
          ),
        ],
      )
    : pickerNode
}
