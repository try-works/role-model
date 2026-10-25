import { Effect, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  alertDialogFixtures,
  type AlertDialogFixture,
} from '@/docs/components/pages/alert-dialog/shared'
import * as Icon from '@/lib/icon'
import * as AlertDialog from '@/ui/alert-dialog'
import * as Button from '@/ui/button'

const PreviewMessage = defineMessageUnion({
  OpenedAlertDialog: {},
  OpenedAlertDialogSmall: {},
  CompletedAlertDialogAction: {},
  GotAlertDialogMessage: { message: AlertDialog.Message },
  GotAlertDialogSmallMessage: { message: AlertDialog.Message },
})
type PreviewMessage = typeof PreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('alert-dialog'),
  dialog: AlertDialog.Model,
  dialogSmall: AlertDialog.Model,
  status: S.Literals(['idle', 'pending', 'complete']),
  asyncFlow: S.Boolean,
})
type PreviewModel = typeof PreviewModel.Type

const FinishAction = Command.define('FinishAlertDialogAction', {
  messages: [PreviewMessage['CompletedAlertDialogAction']],
  execute: Effect.sleep('350 millis').pipe(
    Effect.as(PreviewMessage['CompletedAlertDialogAction']()),
  ),
})

type PreviewCommands = NonNullable<
  Update.Return<PreviewModel, PreviewMessage>['commands']
>

const applyDialogClose = (
  model: PreviewModel,
  field: 'dialog' | 'dialogSmall',
  dialogModel: AlertDialog.Model,
  tag: 'GotAlertDialogMessage' | 'GotAlertDialogSmallMessage',
  commands: PreviewCommands,
): Update.Return<PreviewModel, PreviewMessage> => {
  const closed = AlertDialog.close(dialogModel)
  return {
    model: { ...model, [field]: closed.model },
    commands: [
      ...commands,
      ...Command.mapMessages(closed.commands ?? [], message =>
        PreviewMessage[tag]({ message }),
      ),
    ],
  }
}

const applyDialog = (
  model: PreviewModel,
  field: 'dialog' | 'dialogSmall',
  result: ReturnType<typeof AlertDialog.update>,
  tag: 'GotAlertDialogMessage' | 'GotAlertDialogSmallMessage',
): Update.Return<PreviewModel, PreviewMessage> => {
  const commands = Command.mapMessages(result.commands ?? [], message =>
    PreviewMessage[tag]({ message }),
  )
  const out = Option.fromNullishOr(result.outMessage)
  if (Option.isNone(out)) {
    return { model: { ...model, [field]: result.model }, commands }
  }
  if (out.value._tag === 'ConfirmedAlertDialog') {
    return model.asyncFlow
      ? {
          model: { ...model, [field]: result.model, status: 'pending' },
          commands: [...commands, FinishAction()],
        }
      : applyDialogClose(model, field, result.model, tag, commands)
  }
  return {
    model: { ...model, [field]: result.model, status: 'idle' },
    commands,
  }
}

const dialogView = (
  spec: AlertDialogFixture['dialogs'][number],
  fixture: AlertDialogFixture,
  dialogModel: AlertDialog.Model,
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  AlertDialog.alertDialog(
    {
      model: dialogModel,
      toParentMessage: message =>
        index === 0
          ? PreviewMessage['GotAlertDialogMessage']({ message })
          : PreviewMessage['GotAlertDialogSmallMessage']({ message }),
      title: spec.dialogTitle,
      description: spec.dialogDescription,
      actionLabel: spec.actionLabel,
      cancelLabel: spec.cancelLabel,
      ...(spec.size === undefined ? {} : { size: spec.size }),
      ...(spec.mediaIcon === undefined
        ? {}
        : { media: [Icon.icon(spec.mediaIcon, {}, h)] }),
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

const fixtureView = (
  fixture: AlertDialogFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const children = fixture.dialogs.flatMap((spec, index) => [
    Button.button(
      {
        variant: spec.triggerVariant,
        onClick:
          index === 0
            ? PreviewMessage['OpenedAlertDialog']()
            : PreviewMessage['OpenedAlertDialogSmall'](),
        children: [spec.triggerLabel],
      },
      h,
    ),
    dialogView(
      spec,
      fixture,
      index === 0 ? model.dialog : model.dialogSmall,
      index,
      model,
      h,
    ),
  ])
  if (fixture.kind === 'rtl') {
    return h.div(
      [
        h.Dir('rtl'),
        h.Class('flex flex-wrap items-center justify-center gap-3'),
      ],
      children,
    )
  }
  return h.div(
    [h.Class('grid justify-items-center gap-3')],
    [
      ...children,
      ...(fixture.async === undefined
        ? []
        : [
            h.p(
              [h.Role('status'), h.Class('text-sm text-muted-foreground')],
              [
                model.status === 'complete'
                  ? fixture.async.completeLabel
                  : model.status === 'pending'
                    ? 'Working…'
                    : 'No action taken.',
              ],
            ),
          ]),
    ],
  )
}

export const alertDialogTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => ({
    _docsPage: 'alert-dialog',
    dialog: AlertDialog.init({
      id: `docs-alert-dialog-${String(index)}`,
      isAnimated: true,
    }),
    dialogSmall: AlertDialog.init({
      id: `docs-alert-dialog-small-${String(index)}`,
      isAnimated: true,
    }),
    status: 'idle',
    asyncFlow: alertDialogFixtures[index]?.kind === 'async',
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'OpenedAlertDialog':
        return applyDialog(
          model,
          'dialog',
          AlertDialog.open(model.dialog),
          'GotAlertDialogMessage',
        )
      case 'OpenedAlertDialogSmall':
        return applyDialog(
          model,
          'dialogSmall',
          AlertDialog.open(model.dialogSmall),
          'GotAlertDialogSmallMessage',
        )
      case 'CompletedAlertDialogAction':
        return applyDialogClose(
          { ...model, status: 'complete' },
          'dialog',
          model.dialog,
          'GotAlertDialogMessage',
          [],
        )
      case 'GotAlertDialogMessage':
        return applyDialog(
          model,
          'dialog',
          AlertDialog.update(model.dialog, message.message),
          'GotAlertDialogMessage',
        )
      case 'GotAlertDialogSmallMessage':
        return applyDialog(
          model,
          'dialogSmall',
          AlertDialog.update(model.dialogSmall, message.message),
          'GotAlertDialogSmallMessage',
        )
    }
  },
  view: (index, model, h) =>
    fixtureView(alertDialogFixtures[index] ?? alertDialogFixtures[0], model, h),
})
