import * as S from 'effect/Schema'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  messageFixtures,
  specFor,
  type BubblePart,
  type MessagePart,
  type MessageSpec,
} from '@/docs/components/pages/message/shared'
import * as Attachment from '@/ui/attachment'
import * as Avatar from '@/ui/avatar'
import * as Bubble from '@/ui/bubble'
import * as Button from '@/ui/button'
import * as Icon from '@/lib/icon'
import * as Marker from '@/ui/marker'
import * as Message from '@/ui/message'

const MessagePreviewModel = S.Struct({
  _docsPage: S.Literal('message'),
})
type MessagePreviewModel = S.Schema.Type<typeof MessagePreviewModel>

const MessagePreviewMessage = defineMessageUnion({
  ClickedAction: {},
})
type MessagePreviewMessage = typeof MessagePreviewMessage.Type

type H = HtmlBuilder<MessagePreviewMessage>

const ATTACHMENT_IMAGE_URL =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80'

const bubble = (part: BubblePart, h: H): Html =>
  Bubble.bubble(
    {
      ...(part.variant === 'muted' ? { variant: 'muted' as const } : {}),
      children: [
        Bubble.bubbleContent({ children: [part.content] }, h),
        ...(part.reactions === undefined
          ? []
          : [
              Bubble.bubbleReactions(
                {
                  ariaLabel: 'Reactions: thumbs up',
                  children: [part.reactions],
                },
                h,
              ),
            ]),
      ],
    },
    h,
  )

const part = (part: MessagePart, h: H): Html => {
  switch (part.type) {
    case 'bubble':
      return bubble(part, h)
    case 'bubble-group':
      return Bubble.bubbleGroup(
        { children: part.bubbles.map(b => bubble(b, h)) },
        h,
      )
    case 'attachment-image':
      return Attachment.attachment(
        {
          orientation: 'vertical',
          children: [
            Attachment.attachmentMedia(
              {
                variant: 'image',
                children: [
                  h.img([h.Src(ATTACHMENT_IMAGE_URL), h.Alt('Workspace')]),
                ],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'attachment-file':
      return Attachment.attachment(
        {
          children: [
            Attachment.attachmentMedia(
              { children: [Icon.icon('file-text', {}, h)] },
              h,
            ),
            Attachment.attachmentContent(
              {
                children: [
                  Attachment.attachmentTitle(
                    { children: ['sales-dashboard.pdf'] },
                    h,
                  ),
                  Attachment.attachmentDescription(
                    { children: ['PDF · 2.4 MB'] },
                    h,
                  ),
                ],
              },
              h,
            ),
            Attachment.attachmentActions(
              {
                children: [
                  Attachment.attachmentAction(
                    {
                      onClick: MessagePreviewMessage.ClickedAction(),
                      label: 'Download',
                      children: [Icon.icon('download', {}, h)],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      )
  }
}

const footer = (spec: MessageSpec, h: H): Html | undefined => {
  if (spec.footer === 'Read Yesterday') {
    return Message.messageFooter(
      {
        children: [
          h.div(
            [h.Class('flex items-center gap-1')],
            ['Read ', h.span([h.Class('font-normal')], ['Yesterday'])],
          ),
        ],
      },
      h,
    )
  }
  if (spec.footer !== undefined) {
    return Message.messageFooter({ children: [spec.footer] }, h)
  }
  if (spec.footerActions === 'copyLikeDislike') {
    const btn = (icon: string, label: string): Html =>
      Button.button(
        {
          variant: 'ghost',
          size: 'icon',
          ariaLabel: label,
          onClick: MessagePreviewMessage.ClickedAction(),
          children: [Icon.icon(icon, {}, h)],
        },
        h,
      )
    return Message.messageFooter(
      {
        children: [
          btn('copy', 'Copy'),
          btn('thumbs-up', 'Like'),
          btn('thumbs-down', 'Dislike'),
        ],
      },
      h,
    )
  }
  if (spec.footerActions === 'failedRetry') {
    return Message.messageFooter(
      {
        children: [
          h.span([h.Class('font-normal text-destructive')], ['Failed to send']),
          Button.button(
            {
              variant: 'ghost',
              size: 'icon-xs',
              ariaLabel: 'Retry',
              onClick: MessagePreviewMessage.ClickedAction(),
              children: [Icon.icon('refresh-ccw', {}, h)],
            },
            h,
          ),
        ],
      },
      h,
    )
  }
  return undefined
}

const message = (spec: MessageSpec, h: H): Html => {
  const foot = footer(spec, h)
  return Message.message(
    {
      ...(spec.align === 'end' ? { align: 'end' as const } : {}),
      children: [
        ...(spec.avatar === 'empty'
          ? [Message.messageAvatar({ children: [] }, h)]
          : spec.avatar === undefined
            ? []
            : [
                Message.messageAvatar(
                  {
                    children: [
                      Avatar.avatar(
                        {
                          children: [
                            Avatar.avatarImage(
                              { src: spec.avatar.src, alt: spec.avatar.alt },
                              h,
                            ),
                            Avatar.avatarFallback(
                              { children: [spec.avatar.fallback] },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ]),
        Message.messageContent(
          {
            children: [
              ...(spec.header === undefined
                ? []
                : [Message.messageHeader({ children: [spec.header] }, h)]),
              ...spec.parts.map(p => part(p, h)),
              ...(foot === undefined ? [] : [foot]),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

export const messageTailwindPreviewProgram = definePreviewProgram<
  MessagePreviewModel,
  MessagePreviewMessage
>({
  Model: MessagePreviewModel,
  Message: MessagePreviewMessage,
  init: () => ({ _docsPage: 'message' }),
  update: model => ({ model, commands: [] }),
  view: (index, _model, h) => {
    const fixture = messageFixtures[index] ?? messageFixtures[0]
    const spec = specFor(fixture.kind)
    const gap =
      fixture.kind === 'demo' || fixture.kind === 'group'
        ? 'flex w-full max-w-sm flex-col gap-6 py-12'
        : 'flex w-full max-w-sm flex-col gap-8 py-12'
    const messages = spec.map(m => message(m, h))
    return h.div(
      [h.Class(gap)],
      [
        ...(fixture.kind === 'group'
          ? [Message.messageGroup({ children: messages }, h)]
          : messages),
        ...(fixture.kind === 'demo'
          ? [
              Marker.marker(
                {
                  purpose: 'status',
                  children: [
                    Marker.markerContent(
                      {
                        shimmer: true,
                        children: [
                          h.span([h.Class('font-medium')], ['Oliver']),
                          ' is typing...',
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ]
          : []),
      ],
    )
  },
})
