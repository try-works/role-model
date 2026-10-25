import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { fieldStatusFixtures } from '@/docs/components/pages/field-status/shared'
import * as FieldStatus from '@/ui/field-status'

const FieldStatusPreviewMessage = defineMessageUnion({
  FieldStatusPreviewMessage: {},
})
type FieldStatusPreviewMessage = typeof FieldStatusPreviewMessage.Type
const FieldStatusPreviewModel = S.Struct({
  _docsPage: S.Literal('field-status'),
})
type FieldStatusPreviewModel = typeof FieldStatusPreviewModel.Type

export const fieldStatusTailwindPreviewProgram = definePreviewProgram<
  FieldStatusPreviewModel,
  FieldStatusPreviewMessage
>({
  Model: FieldStatusPreviewModel,
  Message: FieldStatusPreviewMessage,
  init: () => ({ _docsPage: 'field-status' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = fieldStatusFixtures[index] ?? fieldStatusFixtures[0]
    return h.div(
      [h.Class('flex w-full max-w-md flex-col gap-4')],
      [
        ...fixture.items.map(item =>
          FieldStatus.fieldStatus(
            {
              type: item.type,
              message: item.message,
              ...(item.variant === undefined ? {} : { variant: item.variant }),
            },
            h,
          ),
        ),
      ],
    )
  },
})
