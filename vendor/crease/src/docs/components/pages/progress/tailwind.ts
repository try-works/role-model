import { Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import { taggedStruct } from 'foldkit/schema'
import type { HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { progressFixtures } from '@/docs/components/pages/progress/shared'
import * as Field from '@/ui/field'
import * as Progress from '@/ui/progress'
import * as Slider from '@/ui/slider'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('progress'),
  value: S.Number,
  controlledValue: S.Number,
  slider: Slider.Model,
})
type PreviewModel = typeof PreviewModel.Type

const GotSliderMessage = taggedStruct('GotProgressSliderMessage', {
  message: Slider.Message,
})
const PreviewMessage = S.Union([GotSliderMessage])
type PreviewMessage = typeof PreviewMessage.Type

const labelField = (
  label: string,
  percent: string,
  direction: 'ltr' | 'rtl' | undefined,
  h: HtmlBuilder<PreviewMessage>,
) =>
  Field.field(
    {
      class: 'w-full max-w-sm',
      ...(direction === undefined ? {} : { direction }),
      children: [
        Field.fieldLabel(
          {
            for: 'progress-upload',
            children: [
              h.span([], [label]),
              h.span(
                [h.Class(direction === 'rtl' ? 'ms-auto' : 'ml-auto')],
                [percent],
              ),
            ],
          },
          h,
        ),
        Progress.progress(
          {
            id: 'progress-upload',
            value: 66,
            ...(direction === undefined ? {} : { direction }),
          },
          h,
        ),
      ],
    },
    h,
  )

export const progressTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: () => ({
    _docsPage: 'progress',
    value: 66,
    controlledValue: 50,
    slider: Slider.init({ id: 'progress-value', min: 0, max: 100, step: 1 }),
  }),
  update: (model, message): Update.Return<PreviewModel, PreviewMessage> => {
    switch (message._tag) {
      case 'GotProgressSliderMessage': {
        const sliderOp = Slider.update(model.slider, message.message)
        const slider = sliderOp.model
        const commands = sliderOp.commands ?? []
        const maybeChange = Option.fromNullishOr(sliderOp.outMessage)
        return {
          model: {
            ...model,
            slider,
            controlledValue: Option.match(maybeChange, {
              onNone: () => model.controlledValue,
              onSome: change => change.value,
            }),
          },
          commands: Command.mapMessages(commands, next =>
            GotSliderMessage({ message: next }),
          ),
        }
      }
    }
  },
  subscriptions: Subscription.lift({
    pointer: Slider.subscriptions.dragPointer,
    escape: Slider.subscriptions.dragEscape,
  })<PreviewModel, PreviewMessage>({
    toChildModel: model => model.slider,
    toParentMessage: message => GotSliderMessage({ message }),
  }),
  view: (index, model, h) => {
    const fixture = progressFixtures[index] ?? progressFixtures[0]
    switch (fixture.kind) {
      case 'demo':
        return Progress.progress({ value: model.value, class: 'w-3/5' }, h)
      case 'label':
        return labelField('Upload progress', '66%', undefined, h)
      case 'controlled':
        return h.div(
          [h.Class('flex w-full max-w-sm flex-col gap-4')],
          [
            Progress.progress({ value: model.controlledValue }, h),
            Slider.slider(
              {
                model: model.slider,
                value: model.controlledValue,
                toParentMessage: message => GotSliderMessage({ message }),
              },
              h,
            ),
          ],
        )
      case 'rtl':
        return labelField('تقدم الرفع', '٦٦%', 'rtl', h)
      case 'specimen': {
        const specimen = fixture.specimen
        if (specimen === undefined) return h.div([], [])
        return Progress.progress(
          {
            value: specimen.value,
            ...(specimen.max === undefined ? {} : { max: specimen.max }),
            ariaLabel: specimen.ariaLabel,
            valueText: specimen.valueText,
            class: specimen.sxStyle === 'narrow' ? 'w-24' : 'w-full max-w-md',
          },
          h,
        )
      }
    }
  },
})
