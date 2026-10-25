import { Effect, Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  toastFixtures,
  toastTitle,
  type ToastButtonSpec,
  type ToastFixture,
} from '@/docs/components/pages/toast/shared'
import * as Button from '@/ui/button'
import * as Toast from '@/ui/toast'

const GotToastPreviewMessage = defineMessageUnion({
  ClickedToastButton: { index: S.Number },
  CompletedPromiseToast: {},
  GotToastPreviewMessage: {
    message: S.Union([Toast.Message, Toast.ActivatedToastAction]),
  },
})
type PreviewMessage = typeof GotToastPreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('toast'),
  notifications: Toast.Model,
  pendingPromiseId: S.Option(S.String),
})
type PreviewModel = typeof PreviewModel.Type

const variantFactory = (
  button: ToastButtonSpec,
): ((input: Toast.ToastInput) => Toast.ShowInput) => {
  switch (button.variant) {
    case 'default':
      return Toast.plain
    case 'success':
      return Toast.success
    case 'info':
      return Toast.info
    case 'warning':
      return Toast.warning
    case 'error':
      return Toast.error
    case 'promise':
      return Toast.info
  }
}

const showInputFor = (button: ToastButtonSpec): Toast.ShowInput => {
  if (button.variant === 'promise') {
    return Toast.info({ title: 'Loading...', sticky: true })
  }
  return variantFactory(button)({
    title: toastTitle(button.variant),
    ...(button.description === undefined
      ? {}
      : { description: button.description }),
    ...(button.actionLabel === undefined
      ? {}
      : { actionLabel: button.actionLabel }),
    ...(button.position === undefined ? {} : { position: button.position }),
  })
}

const ResolvePromise = Command.define('ResolveToastPromise', {
  messages: [GotToastPreviewMessage.CompletedPromiseToast],
  execute: Effect.sleep('1200 millis').pipe(
    Effect.as(GotToastPreviewMessage.CompletedPromiseToast()),
  ),
})

const mapToast = (
  model: PreviewModel,
  result: ReturnType<typeof Toast.update>,
): {
  model: PreviewModel
  commands: ReadonlyArray<Command.Command<PreviewMessage>>
} => ({
  model: { ...model, notifications: result.model },
  commands: Command.mapMessages(result.commands ?? [], next =>
    GotToastPreviewMessage.GotToastPreviewMessage({ message: next }),
  ),
})

const buttonView = (
  button: ToastButtonSpec,
  index: number,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Button.button(
    {
      onClick: GotToastPreviewMessage.ClickedToastButton({ index }),
      variant: 'outline',
      children: [button.label],
    },
    h,
  )

const fixtureView = (
  fixture: ToastFixture,
  fixtureIndex: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const offset = toastFixtures
    .slice(0, fixtureIndex)
    .reduce((total, candidate) => total + candidate.buttons.length, 0)
  return h.div(
    [
      h.Class(
        fixture.wrap === 'center'
          ? 'flex flex-wrap justify-center gap-2'
          : 'flex flex-wrap gap-2',
      ),
    ],
    fixture.buttons
      .map((button, index) => buttonView(button, offset + index, h))
      .concat([
        Toast.toast(
          {
            model: model.notifications,
            toParentMessage: message =>
              GotToastPreviewMessage.GotToastPreviewMessage({ message }),
            ariaLabel: 'Toast notifications',
            stacked: fixture.stacked !== false,
          },
          h,
        ),
      ]),
  )
}

export const toastTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: GotToastPreviewMessage,
  init: index => ({
    _docsPage: 'toast',
    notifications: Toast.init({
      id: `docs-toast-preview-${index}`,
      limit: toastFixtures[index]?.limit ?? 3,
    }),
    pendingPromiseId: Option.none(),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ClickedToastButton': {
        const button = toastFixtures
          .flatMap(fixture => fixture.buttons)
          .at(message.index)
        if (button === undefined) {
          return { model }
        }
        if (button.dismissAll)
          return mapToast(model, Toast.dismissAll(model.notifications))
        let current = model
        const batchCommands: Array<Command.Command<PreviewMessage>> = []
        for (let index = 0; index < (button.count ?? 1); index += 1) {
          const result = mapToast(
            current,
            Toast.show(current.notifications, {
              ...showInputFor(button),
              ...(button.sticky ? { sticky: true } : {}),
              ...(button.numbered
                ? { title: `Toast ${current.notifications.nextEntryKey + 1}` }
                : {}),
            }),
          )
          current = result.model
          batchCommands.push(...result.commands)
        }
        const mapped = { model: current, commands: batchCommands }
        const commands = batchCommands
        if (button.variant !== 'promise') {
          return mapped
        }
        const next = mapped.model
        return {
          model: {
            ...next,
            pendingPromiseId: Option.fromNullishOr(
              next.notifications.entries.at(-1)?.id,
            ),
          },
          commands: [...commands, ResolvePromise()],
        }
      }
      case 'CompletedPromiseToast':
        return Option.match(model.pendingPromiseId, {
          onNone: () => ({ model }),
          onSome: id =>
            mapToast(
              { ...model, pendingPromiseId: Option.none() },
              Toast.updateToast(model.notifications, id, {
                title: 'Event has been created',
                variant: 'Success',
                sticky: false,
                duration: '4 seconds',
              }),
            ),
        })
      case 'GotToastPreviewMessage':
        return mapToast(
          model,
          Toast.update(model.notifications, message.message),
        )
    }
  },
  view: (index, model, h) =>
    fixtureView(toastFixtures[index] ?? toastFixtures[0], index, model, h),
})
