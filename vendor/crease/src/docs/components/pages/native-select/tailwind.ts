import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  nativeSelectFixtures,
  nativeSelectSpecs,
} from '@/docs/components/pages/native-select/shared'
import * as NativeSelect from '@/ui/native-select'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('native-select'),
  value: S.String,
})
type PreviewModel = typeof PreviewModel.Type
const PreviewMessage = defineMessageUnion({
  ChangedValue: { value: S.String },
})
type PreviewMessage = typeof PreviewMessage.Type

export const nativeSelectTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: () => ({ _docsPage: 'native-select', value: '' }),
  update: (model, message) => ({
    model: { ...model, value: message.value },
    commands: [],
  }),
  view: (index, model, h) => {
    const fixture = nativeSelectFixtures[index] ?? nativeSelectFixtures[0]
    const spec = nativeSelectSpecs[fixture.kind]
    return NativeSelect.nativeSelect(
      {
        id: `docs-native-select-${String(index)}`,
        value: model.value,
        onChange: value => PreviewMessage.ChangedValue({ value }),
        options: [{ value: '', label: spec.placeholder }, ...spec.options],
        ...(spec.groups === undefined ? {} : { groups: spec.groups }),
        ...(spec.isDisabled === true ? { isDisabled: true } : {}),
        ...(spec.isInvalid === true ? { isInvalid: true } : {}),
        ...(spec.direction === undefined ? {} : { direction: spec.direction }),
      },
      h,
    )
  },
})
