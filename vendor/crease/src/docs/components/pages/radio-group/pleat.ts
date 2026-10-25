import { Style } from '@pleat/core'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  radioGroupFixtures,
  type RadioGroupFixture,
} from '@/docs/components/pages/radio-group/shared'
import * as Field from '@/pleat/field'
import * as RadioGroup from '@/pleat/radio-group'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  fit: layoutStyle({ width: 'fit-content' }),
  wide: layoutStyle({ maxWidth: '24rem', width: '100%' }),
  wideXs: layoutStyle({ maxWidth: '20rem', width: '100%' }),
  descOffset: layoutStyle({ marginTop: '-0.375rem' }),
}

type PreviewModel = Readonly<{
  value: string
  radioGroup: RadioGroup.Model
}>

const group = <Msg>(
  fixture: RadioGroupFixture,
  model: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  RadioGroup.radioGroup(
    {
      model: model.radioGroup,
      selectedValue: Option.some(model.value),
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({ _tag: 'GotDocsRadioGroupMessage', message }),
        ),
      ariaLabel: fixture.ariaLabel,
      layoutStyle: fixture.width === 'fit' ? styles.fit : styles.wide,
      ...(fixture.direction === 'rtl' ? { direction: 'rtl' as const } : {}),
      ...(fixture.isReadOnly === true ? { isReadOnly: true } : {}),
      options: fixture.options,
    },
    h,
  )

export const radioGroupPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const previewModel = model as PreviewModel
  const fixture = radioGroupFixtures[exampleIndex] ?? radioGroupFixtures[0]
  if (fixture.kind === 'fieldset') {
    return Field.fieldSet(
      {
        layoutStyle: styles.wideXs,
        children: [
          Field.fieldLegend({ children: [fixture.fieldLegend ?? ''] }, h),
          Field.fieldDescription(
            {
              layoutStyle: styles.descOffset,
              children: [fixture.fieldDescription ?? ''],
            },
            h,
          ),
          group(fixture, previewModel, onMessageJson, h),
        ],
      },
      h,
    )
  }
  return group(fixture, previewModel, onMessageJson, h)
}
