import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  radioGroupFixtures,
  type RadioGroupFixture,
} from '@/docs/components/pages/radio-group/shared'
import * as Field from '@/ui/field'
import * as RadioGroup from '@/ui/radio-group'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('radio-group'),
  value: S.String,
  radioGroup: RadioGroup.Model,
})
type PreviewModel = typeof PreviewModel.Type

const PreviewMessage = defineMessageUnion({
  GotDocsRadioGroupMessage: { message: RadioGroup.Message },
})
type PreviewMessage = typeof PreviewMessage.Type

const group = (
  fixture: RadioGroupFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  RadioGroup.radioGroup(
    {
      model: model.radioGroup,
      selectedValue: Option.some(model.value),
      toParentMessage: message =>
        PreviewMessage['GotDocsRadioGroupMessage']({ message }),
      ariaLabel: fixture.ariaLabel,
      class: fixture.width === 'fit' ? 'w-fit' : 'w-full max-w-sm',
      ...(fixture.direction === 'rtl' ? { direction: 'rtl' as const } : {}),
      ...(fixture.isReadOnly === true ? { isReadOnly: true } : {}),
      options: fixture.options,
    },
    h,
  )

export const radioGroupTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = radioGroupFixtures[index] ?? radioGroupFixtures[0]
    return {
      _docsPage: 'radio-group',
      value: fixture.selected,
      radioGroup: RadioGroup.init({ id: `docs-radio-${String(index)}` }),
    }
  },
  update: (model, message) => {
    const {
      model: radioGroup,
      commands: radioGroupCommands__,
      outMessage: radioGroupOut__,
    } = RadioGroup.update(model.radioGroup, message.message)
    const commands = radioGroupCommands__ ?? []
    const maybeSelection = Option.fromNullishOr(radioGroupOut__)
    return {
      model: {
        ...model,
        radioGroup,
        value: Option.match(maybeSelection, {
          onNone: () => model.value,
          onSome: selection => selection.value,
        }),
      },
      commands: Command.mapMessages(commands, child =>
        PreviewMessage['GotDocsRadioGroupMessage']({ message: child }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = radioGroupFixtures[index] ?? radioGroupFixtures[0]
    if (fixture.kind === 'fieldset') {
      return Field.fieldSet(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldLegend({ children: [fixture.fieldLegend ?? ''] }, h),
            Field.fieldDescription(
              { children: [fixture.fieldDescription ?? ''] },
              h,
            ),
            group(fixture, model, h),
          ],
        },
        h,
      )
    }
    return group(fixture, model, h)
  },
})
