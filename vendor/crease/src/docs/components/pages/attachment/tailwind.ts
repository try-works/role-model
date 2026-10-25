import { Schema as S } from 'effect'
import { Command, type Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  attachmentFixtures,
  type AttachmentFixture,
  type AttachmentItemSpec,
  type AttachmentRowSpec,
} from '@/docs/components/pages/attachment/shared'
import * as Icon from '@/lib/icon'
import * as Attachment from '@/ui/attachment'
import * as Dialog from '@/ui/dialog'
import * as Spinner from '@/ui/spinner'

const PreviewMessage = defineMessageUnion({
  ClickedRemove: { name: S.String },
  ClickedRetry: { name: S.String },
  ClickedCopy: { name: S.String },
  ClickedPreview: { name: S.String },
  GotDialogMessage: { message: Dialog.Message },
})
type PreviewMessage = typeof PreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('attachment'),
  removed: S.Array(S.String),
  preview: Dialog.Model,
  previewFor: S.String,
})
type PreviewModel = typeof PreviewModel.Type

const mapDialog = (
  model: PreviewModel,
  result: ReturnType<typeof Dialog.update>,
): Update.Return<PreviewModel, PreviewMessage> => ({
  model: { ...model, preview: result.model },
  commands: Command.mapMessages(result.commands ?? [], next =>
    PreviewMessage['GotDialogMessage']({ message: next }),
  ),
})

const itemView = (
  row: AttachmentRowSpec,
  item: AttachmentItemSpec,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Attachment.attachment(
    {
      ...(item.state === undefined ? {} : { state: item.state }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.orientation === undefined
        ? {}
        : { orientation: item.orientation }),
      ...(row.grouped === true
        ? row.itemWidth === undefined
          ? {}
          : { class: row.itemWidth }
        : { class: 'w-full' }),
      children: [
        Attachment.attachmentMedia(
          {
            variant: item.src === undefined ? 'icon' : 'image',
            children: [
              item.spinner === true
                ? Spinner.spinner({ size: 'md', isDecorative: true }, h)
                : item.src !== undefined
                  ? h.img([h.Src(item.src), h.Alt(item.alt ?? item.name)])
                  : Icon.icon(item.icon ?? 'file', {}, h),
            ],
          },
          h,
        ),
        Attachment.attachmentContent(
          {
            children: [
              Attachment.attachmentTitle({ children: [item.name] }, h),
              ...(item.meta === undefined
                ? []
                : [
                    Attachment.attachmentDescription(
                      { children: [item.meta] },
                      h,
                    ),
                  ]),
            ],
          },
          h,
        ),
        ...(item.actions.length === 0
          ? []
          : [
              Attachment.attachmentActions(
                {
                  children: item.actions.map(action =>
                    Attachment.attachmentAction(
                      {
                        onClick:
                          action.icon === 'refresh-cw'
                            ? PreviewMessage['ClickedRetry']({
                                name: item.name,
                              })
                            : action.icon === 'copy'
                              ? PreviewMessage['ClickedCopy']({
                                  name: item.name,
                                })
                              : PreviewMessage['ClickedRemove']({
                                  name: item.name,
                                }),
                        label: action.label,
                        children: [Icon.icon(action.icon, {}, h)],
                      },
                      h,
                    ),
                  ),
                },
                h,
              ),
            ]),
        ...(item.triggerLabel === undefined
          ? []
          : [
              Attachment.attachmentTrigger(
                {
                  onClick: PreviewMessage['ClickedPreview']({
                    name: item.name,
                  }),
                  label: item.triggerLabel,
                },
                h,
              ),
            ]),
      ],
    },
    h,
  )

const frameClass = (fixture: AttachmentFixture): string =>
  fixture.frame === 'plain'
    ? 'mx-auto w-full max-w-sm py-12'
    : `mx-auto flex w-full max-w-sm flex-col ${fixture.frame} py-12`

const fixtureView = (
  fixture: AttachmentFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const rows = fixture.rows.flatMap(row => {
    const visible = row.items.filter(item => !model.removed.includes(item.name))
    return row.grouped === true
      ? [
          Attachment.attachmentGroup(
            {
              ...(row.groupFullWidth === true ? { class: 'w-full' } : {}),
              children: visible.map(item => itemView(row, item, h)),
            },
            h,
          ),
        ]
      : visible.map(item => itemView(row, item, h))
  })
  return h.div(
    [h.Class(frameClass(fixture))],
    [
      ...rows,
      ...(fixture.rows.some(row =>
        row.items.some(item => item.triggerLabel !== undefined),
      )
        ? [
            Dialog.dialog(
              {
                model: model.preview,
                toParentMessage: message =>
                  PreviewMessage['GotDialogMessage']({ message }),
                title: model.previewFor,
                description:
                  'The attachment trigger fills the card and opens the dialog, while the actions stay independently clickable above it.',
              },
              h,
            ),
          ]
        : []),
    ],
  )
}

export const attachmentTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => ({
    _docsPage: 'attachment',
    removed: [],
    preview: Dialog.init({
      id: `docs-attachment-preview-${String(index)}`,
      isAnimated: true,
    }),
    previewFor: '',
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ClickedRemove':
        return {
          model: { ...model, removed: [...model.removed, message.name] },
        }
      case 'ClickedRetry':
        return {
          model: {
            ...model,
            removed: model.removed.filter(name => name !== message.name),
          },
        }
      case 'ClickedCopy':
        return { model }
      case 'ClickedPreview': {
        const opened = Dialog.open(model.preview)
        return mapDialog({ ...model, previewFor: message.name }, opened)
      }
      case 'GotDialogMessage':
        return mapDialog(model, Dialog.update(model.preview, message.message))
    }
  },
  view: (index, model, h) =>
    fixtureView(attachmentFixtures[index] ?? attachmentFixtures[0], model, h),
})
