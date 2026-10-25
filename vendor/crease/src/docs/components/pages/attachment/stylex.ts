import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  attachmentFixtures,
  type AttachmentFixture,
  type AttachmentItemSpec,
  type AttachmentRowSpec,
} from '@/docs/components/pages/attachment/shared'
import * as Icon from '@/lib/icon'
import * as Attachment from '@/stylex/attachment'
import * as Dialog from '@/stylex/dialog'
import * as Spinner from '@/stylex/spinner'
import { className } from '@/stylex/style'

const styles = stylex.create({
  frame: {
    gap: '0.5rem',
    marginInline: 'auto',
    paddingBlock: '3rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    width: '100%',
  },
  frameLoose: {
    gap: '0.75rem',
    marginInline: 'auto',
    paddingBlock: '3rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    width: '100%',
  },
  framePlain: {
    marginInline: 'auto',
    paddingBlock: '3rem',
    maxWidth: '24rem',
    width: '100%',
  },
  fullWidth: { width: '100%' },
  itemWidth: { width: '16rem' },
  mediaImg: { aspectRatio: '1', objectFit: 'cover', width: '100%' },
  mediaIcon: { height: '1rem', width: '1rem' },
  actionIcon: { flexShrink: 0, height: '0.75rem', width: '0.75rem' },
})

type PreviewSnapshot = {
  removed: ReadonlyArray<string>
  preview: Dialog.Model
  previewFor: string
}

const itemView = <Msg>(
  row: AttachmentRowSpec,
  item: AttachmentItemSpec,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
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
          : { layoutStyle: styles.itemWidth }
        : { layoutStyle: styles.fullWidth }),
      children: [
        Attachment.attachmentMedia(
          {
            variant: item.src === undefined ? 'icon' : 'image',
            children: [
              item.spinner === true
                ? Spinner.spinner({ size: 'md', isDecorative: true }, h)
                : item.src !== undefined
                  ? h.img([
                      h.Src(item.src),
                      h.Alt(item.alt ?? item.name),
                      h.Class(className(reset.media, styles.mediaImg)),
                    ])
                  : Icon.icon(
                      item.icon ?? 'file',
                      { class: className(styles.mediaIcon) },
                      h,
                    ),
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
                        onClick: onMessageJson(
                          JSON.stringify({
                            _tag:
                              action.icon === 'refresh-cw'
                                ? 'ClickedRetry'
                                : action.icon === 'copy'
                                  ? 'ClickedCopy'
                                  : 'ClickedRemove',
                            name: item.name,
                          }),
                        ),
                        label: action.label,
                        children: [
                          Icon.icon(
                            action.icon,
                            { class: className(styles.actionIcon) },
                            h,
                          ),
                        ],
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
                  onClick: onMessageJson(
                    JSON.stringify({
                      _tag: 'ClickedPreview',
                      name: item.name,
                    }),
                  ),
                  label: item.triggerLabel,
                },
                h,
              ),
            ]),
      ],
    },
    h,
  )

const frameStyle = (fixture: AttachmentFixture) =>
  fixture.frame === 'plain'
    ? styles.framePlain
    : fixture.frame === 'gap-3'
      ? styles.frameLoose
      : styles.frame

export const attachmentStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = attachmentFixtures[exampleIndex] ?? attachmentFixtures[0]
  const previewModel = model as PreviewSnapshot
  const rows = fixture.rows.flatMap(row => {
    const visible = row.items.filter(
      item => !previewModel.removed.includes(item.name),
    )
    return row.grouped === true
      ? [
          Attachment.attachmentGroup(
            {
              ...(row.groupFullWidth === true
                ? { layoutStyle: styles.fullWidth }
                : {}),
              children: visible.map(item =>
                itemView(row, item, onMessageJson, h),
              ),
            },
            h,
          ),
        ]
      : visible.map(item => itemView(row, item, onMessageJson, h))
  })
  return h.div(
    [h.Class(className(frameStyle(fixture)))],
    [
      ...rows,
      ...(fixture.rows.some(row =>
        row.items.some(item => item.triggerLabel !== undefined),
      )
        ? [
            Dialog.dialog(
              {
                model: previewModel.preview,
                toParentMessage: message =>
                  onMessageJson(
                    JSON.stringify({ _tag: 'GotDialogMessage', message }),
                  ),
                title: previewModel.previewFor,
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
