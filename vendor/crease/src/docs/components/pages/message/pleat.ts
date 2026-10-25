import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  messageFixtures,
  specFor,
  type BubblePart,
  type MessagePart,
  type MessageSpec,
} from '@/docs/components/pages/message/shared'
import * as Attachment from '@/pleat/attachment'
import * as Avatar from '@/pleat/avatar'
import * as Bubble from '@/pleat/bubble'
import * as Button from '@/pleat/button'
import * as Icon from '@/lib/icon'
import * as Marker from '@/pleat/marker'
import * as Message from '@/pleat/message'
import { className } from '@/pleat/style'

const styles = {
  stack: Style.make({
    gap: '2rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    paddingBottom: '3rem',
    paddingTop: '3rem',
    width: '100%',
  }),
  stackGroup: Style.make({
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    paddingBottom: '3rem',
    paddingTop: '3rem',
    width: '100%',
  }),
  row: Style.make({ gap: '0.25rem', alignItems: 'center', display: 'flex' }),
  fontNormal: Style.make({ fontWeight: 400 }),
  destructive: Style.make({ color: 'var(--destructive)', fontWeight: 400 }),
  fontMedium: Style.make({ fontWeight: 500 }),
  mediaImage: Style.make({
    aspectRatio: '1',
    objectFit: 'cover',
    width: '100%',
  }),
  iconMd: Style.make({ height: '1rem', width: '1rem' }),
}

const sx = (style: Style.Style): string => className(style)

const send = <Msg>(
  onMessageJson: (messageJson: string) => Msg,
  tag: string,
): Msg => onMessageJson(JSON.stringify({ _tag: tag }))

const ATTACHMENT_IMAGE_URL =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80'

const bubble = <Msg>(part: BubblePart, h: HtmlBuilder<Msg>): Html =>
  Bubble.bubble(
    {
      ...(part.variant === 'muted' ? { variant: 'muted' as const } : {}),
      children: [
        Bubble.bubbleContent(
          {
            ...(part.variant === 'muted' ? { variant: 'muted' as const } : {}),
            children: [part.content],
          },
          h,
        ),
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

const part = <Msg>(
  part: MessagePart,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
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
                  h.img([
                    h.Src(ATTACHMENT_IMAGE_URL),
                    h.Alt('Workspace'),
                    h.Class(className(reset.media, styles.mediaImage)),
                  ]),
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
              {
                children: [
                  Icon.icon(
                    'file-text',
                    { class: className(styles.iconMd) },
                    h,
                  ),
                ],
              },
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
                      onClick: send(onMessageJson, 'ClickedAction'),
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

const footer = <Msg>(
  spec: MessageSpec,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  if (spec.footer === 'Read Yesterday') {
    return Message.messageFooter(
      {
        children: [
          h.div(
            [h.Class(sx(styles.row))],
            ['Read ', h.span([h.Class(sx(styles.fontNormal))], ['Yesterday'])],
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
          onClick: send(onMessageJson, 'ClickedAction'),
          children: [Icon.icon(icon, { class: className(styles.iconMd) }, h)],
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
          h.span(
            [
              h.Class(sx(styles.destructive)),
              h.DataAttribute('variant', 'ghost'),
            ],
            ['Failed to send'],
          ),
          Button.button(
            {
              variant: 'ghost',
              size: 'icon-xs',
              ariaLabel: 'Retry',
              onClick: send(onMessageJson, 'ClickedAction'),
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

const message = <Msg>(
  spec: MessageSpec,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const foot = footer(spec, onMessageJson, h)
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
              ...spec.parts.map(p => part(p, onMessageJson, h)),
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

const messageSxView = <Msg>(
  index: number,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = messageFixtures[index] ?? messageFixtures[0]
  const spec = specFor(fixture.kind)
  const isGroupGap = fixture.kind === 'demo' || fixture.kind === 'group'
  const messages = spec.map(m => message(m, onMessageJson, h))
  return h.div(
    [h.Class(sx(isGroupGap ? styles.stackGroup : styles.stack))],
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
                        h.span([h.Class(sx(styles.fontMedium))], ['Oliver']),
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
}

export const messagePleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => messageSxView(exampleIndex, onMessageJson, h)
