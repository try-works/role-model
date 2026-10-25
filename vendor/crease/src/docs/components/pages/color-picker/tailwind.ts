import { Option, Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  colorPickerFixtures,
  type ColorPickerFixture,
} from '@/docs/components/pages/color-picker/shared'
import * as ColorPicker from '@/ui/color-picker'

const Got = defineMessageUnion({
  GotColorPickerMessage: { id: S.String, message: ColorPicker.Message },
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('color-picker'),
  pickers: S.Record(S.String, ColorPicker.Model),
  values: S.Record(S.String, S.String),
})
type Model = typeof Model.Type

const FALLBACK = ColorPicker.init({ id: 'docs-color-picker-fallback' })

const pickerView = (
  fixture: ColorPickerFixture,
  picker: ColorPicker.Model,
  model: Model,
  h: HtmlBuilder<Got>,
): Html => {
  const toParentMessage = (message: ColorPicker.Message): Got =>
    Got.GotColorPickerMessage({ id: fixture.id, message })
  const base = { model: picker, toParentMessage }
  switch (fixture.trigger) {
    case 'button':
      return ColorPicker.colorPicker(
        {
          ...base,
          trigger: h.span(
            [h.Class('flex items-center gap-2 whitespace-nowrap')],
            [
              ColorPicker.colorPickerSwatch(
                { color: ColorPicker.hex(picker) },
                h,
              ),
              'Pick a color',
            ],
          ),
          triggerClass:
            'inline-flex h-9 items-center rounded-md border bg-background px-3 shadow-xs hover:bg-accent',
        },
        h,
      )
    case 'input':
      return ColorPicker.colorPicker(
        {
          ...base,
          trigger: h.span(
            [h.Class('flex items-center gap-2 whitespace-nowrap')],
            [
              ColorPicker.colorPickerSwatch(
                { color: ColorPicker.hex(picker) },
                h,
              ),
              h.span(
                [h.Class('font-mono text-xs')],
                [model.values[fixture.id] ?? fixture.initialValue],
              ),
            ],
          ),
          triggerClass:
            'inline-flex h-9 w-36 items-center gap-2 rounded-md border bg-background px-3 shadow-xs hover:bg-accent',
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

export const colorPickerTailwindPreviewProgram = definePreviewProgram<
  Model,
  Got
>({
  Model,
  Message: Got,
  init: index => {
    const fixture = colorPickerFixtures[index] ?? colorPickerFixtures[0]
    return {
      _docsPage: 'color-picker',
      pickers: Object.fromEntries(
        colorPickerFixtures.map(f => [
          f.id,
          ColorPicker.init({
            id: `docs-color-picker-${f.id}`,
            value: f.initialValue,
            withoutAlpha: f.withoutAlpha ?? false,
            disabled: f.disabled ?? false,
          }),
        ]),
      ),
      values: Object.fromEntries(
        colorPickerFixtures.map(f => [f.id, f.initialValue]),
      ),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotColorPickerMessage': {
        const picker = model.pickers[message.id] ?? FALLBACK
        const next = ColorPicker.update(picker, message.message)
        const change = Option.fromNullishOr(next.outMessage)
        return {
          model: {
            ...model,
            pickers: { ...model.pickers, [message.id]: next.model },
            values: Option.match(change, {
              onNone: () => model.values,
              onSome: out => ({
                ...model.values,
                [message.id]: out.value,
              }),
            }),
          },
          commands: Command.mapMessages(next.commands ?? [], next =>
            Got.GotColorPickerMessage({ id: message.id, message: next }),
          ),
        }
      }
    }
  },
  subscriptions: Subscription.aggregate<Model, Got>()(
    ...colorPickerFixtures.map(fixture =>
      ColorPicker.subscriptions<Model, Got>({
        id: fixture.id,
        toChildModel: model => model.pickers[fixture.id] ?? FALLBACK,
        toParentMessage: message =>
          Got.GotColorPickerMessage({ id: fixture.id, message }),
      }),
    ),
  ),
  view: (index, model, h) => {
    const fixture = colorPickerFixtures[index] ?? colorPickerFixtures[0]
    const picker = model.pickers[fixture.id] ?? FALLBACK
    const pickerNode = pickerView(fixture, picker, model, h)
    return fixture.controlled === true
      ? h.div(
          [h.Class('flex items-center gap-3')],
          [
            pickerNode,
            h.span(
              [h.Class('font-mono text-xs text-muted-foreground')],
              [model.values[fixture.id] ?? fixture.initialValue],
            ),
          ],
        )
      : pickerNode
  },
})
