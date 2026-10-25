import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  alertDialogFixtures,
  type AlertDialogFixture,
} from '@/docs/components/pages/alert-dialog/shared'
import * as Icon from '@/lib/icon'
import * as AlertDialog from '@/stylex/alert-dialog'
import * as Button from '@/stylex/button'
import { className } from '@/stylex/style'

const styles = stylex.create({
  frame: { gap: '0.75rem', display: 'grid', justifyItems: 'center' },
  frameRtl: {
    gap: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mediaIcon: { height: '2rem', width: '2rem' },
  status: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})

type PreviewSnapshot = {
  dialog: AlertDialog.Model
  dialogSmall: AlertDialog.Model
  status: 'idle' | 'pending' | 'complete'
  asyncFlow: boolean
}

const dialogView = <Msg>(
  spec: AlertDialogFixture['dialogs'][number],
  fixture: AlertDialogFixture,
  dialogModel: AlertDialog.Model,
  index: number,
  model: PreviewSnapshot,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  AlertDialog.alertDialog(
    {
      model: dialogModel,
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({
            _tag:
              index === 0
                ? 'GotAlertDialogMessage'
                : 'GotAlertDialogSmallMessage',
            message,
          }),
        ),
      title: spec.dialogTitle,
      description: spec.dialogDescription,
      actionLabel: spec.actionLabel,
      cancelLabel: spec.cancelLabel,
      ...(spec.size === undefined ? {} : { size: spec.size }),
      ...(spec.mediaIcon === undefined
        ? {}
        : {
            media: [
              Icon.icon(
                spec.mediaIcon,
                { class: className(styles.mediaIcon) },
                h,
              ),
            ],
          }),
      ...(spec.mediaVariant === undefined
        ? {}
        : { mediaVariant: spec.mediaVariant }),
      ...(spec.actionVariant === undefined
        ? {}
        : { actionVariant: spec.actionVariant }),
      ...(fixture.async === undefined
        ? {}
        : {
            pendingLabel: fixture.async.pendingLabel,
            isPending: model.status === 'pending',
          }),
    },
    h,
  )

export const alertDialogStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = alertDialogFixtures[exampleIndex] ?? alertDialogFixtures[0]
  const previewModel = model as PreviewSnapshot
  const children = fixture.dialogs.flatMap((spec, index) => [
    Button.button(
      {
        variant: spec.triggerVariant,
        onClick: onMessageJson(
          JSON.stringify({
            _tag: index === 0 ? 'OpenedAlertDialog' : 'OpenedAlertDialogSmall',
          }),
        ),
        children: [spec.triggerLabel],
      },
      h,
    ),
    dialogView(
      spec,
      fixture,
      index === 0 ? previewModel.dialog : previewModel.dialogSmall,
      index,
      previewModel,
      onMessageJson,
      h,
    ),
  ])
  if (fixture.kind === 'rtl') {
    return h.div([h.Dir('rtl'), h.Class(className(styles.frameRtl))], children)
  }
  return h.div(
    [h.Class(className(styles.frame))],
    [
      ...children,
      ...(fixture.async === undefined
        ? []
        : [
            h.p(
              [h.Role('status'), h.Class(className(reset.text, styles.status))],
              [
                previewModel.status === 'complete'
                  ? fixture.async.completeLabel
                  : previewModel.status === 'pending'
                    ? 'Working…'
                    : 'No action taken.',
              ],
            ),
          ]),
    ],
  )
}
