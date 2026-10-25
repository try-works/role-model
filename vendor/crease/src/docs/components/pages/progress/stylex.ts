import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { progressFixtures } from '@/docs/components/pages/progress/shared'
import * as Field from '@/stylex/field'
import * as Progress from '@/stylex/progress'
import * as Slider from '@/stylex/slider'
import { className } from '@/stylex/style'

const styles = stylex.create({
  track60: { width: '60%' },
  wide: { maxWidth: '24rem', width: '100%' },
  specimenWide: { maxWidth: '28rem', width: '100%' },
  specimenNarrow: { width: '6rem' },
  pushEnd: { marginInlineStart: 'auto' },
  stack: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    width: '100%',
  },
})

interface ProgressPreviewShape {
  readonly value: number
  readonly controlledValue: number
  readonly slider: Slider.Model
}

const labelField = <Msg>(
  label: string,
  percent: string,
  direction: 'ltr' | 'rtl' | undefined,
  h: HtmlBuilder<Msg>,
) =>
  Field.field(
    {
      layoutStyle: styles.wide,
      ...(direction === undefined ? {} : { direction }),
      children: [
        Field.fieldLabel(
          {
            for: 'progress-upload',
            children: [
              h.span([], [label]),
              h.span([h.Class(className(styles.pushEnd))], [percent]),
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

export const progressStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const shape = model as ProgressPreviewShape
  const fixture = progressFixtures[exampleIndex] ?? progressFixtures[0]
  switch (fixture.kind) {
    case 'demo':
      return Progress.progress(
        { value: shape.value, layoutStyle: styles.track60 },
        h,
      )
    case 'label':
      return labelField('Upload progress', '66%', undefined, h)
    case 'controlled':
      return h.div(
        [h.Class(className(styles.stack))],
        [
          Progress.progress({ value: shape.controlledValue }, h),
          Slider.slider(
            {
              model: shape.slider,
              value: shape.controlledValue,
              toParentMessage: message =>
                onMessageJson(
                  JSON.stringify({
                    _tag: 'GotProgressSliderMessage',
                    message,
                  }),
                ),
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
          layoutStyle:
            specimen.sxStyle === 'narrow'
              ? styles.specimenNarrow
              : styles.specimenWide,
        },
        h,
      )
    }
  }
}
