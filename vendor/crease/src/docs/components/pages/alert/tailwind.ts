import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { alertFixtures } from '@/docs/components/pages/alert/shared'
import * as Icon from '@/lib/icon'
import * as Alert from '@/ui/alert'
import * as Button from '@/ui/button'

const InteractedWithAlertPreview = defineMessageUnion({
  InteractedWithAlertPreview: {},
})
type InteractedWithAlertPreview = typeof InteractedWithAlertPreview.Type
const AlertPreviewModel = S.Struct({ _docsPage: S.Literal('alert') })
type AlertPreviewModel = typeof AlertPreviewModel.Type

export const alertTailwindPreviewProgram = definePreviewProgram<
  AlertPreviewModel,
  InteractedWithAlertPreview
>({
  Model: AlertPreviewModel,
  Message: InteractedWithAlertPreview,
  init: () => ({ _docsPage: 'alert' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = alertFixtures[index] ?? alertFixtures[0]
    return h.div(
      [
        h.Class('grid w-full max-w-md gap-4'),
        ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
      ],
      fixture.alerts.map(item =>
        Alert.alert(
          {
            severity: item.severity,
            announcement: item.announcement,
            ...(fixture.colors === undefined ? {} : { class: fixture.colors }),
            children: [
              Alert.alertIcon(
                { children: [Icon.icon(item.icon, { class: 'size-4' }, h)] },
                h,
              ),
              Alert.alertTitle({ children: [item.title] }, h),
              Alert.alertDescription({ children: [item.description] }, h),
              ...(item.actionLabel === undefined
                ? []
                : [
                    h.div(
                      [h.Class('col-start-2 mt-2')],
                      [
                        Button.button(
                          { size: 'sm', children: [item.actionLabel] },
                          h,
                        ),
                      ],
                    ),
                  ]),
            ],
          },
          h,
        ),
      ),
    )
  },
})
