import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type MessageKind =
  | 'demo'
  | 'avatar'
  | 'group'
  | 'headerFooter'
  | 'actions'
  | 'attachment'

export interface MessageFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: MessageKind
}

export type BubblePart = {
  readonly type: 'bubble'
  readonly variant?: 'muted'
  readonly content: string
  readonly reactions?: string
}
export type MessagePart =
  | BubblePart
  | {
      readonly type: 'bubble-group'
      readonly bubbles: ReadonlyArray<BubblePart>
    }
  | { readonly type: 'attachment-image' }
  | { readonly type: 'attachment-file' }

export interface MessageSpec {
  readonly align: 'start' | 'end'
  readonly avatar?:
    | 'empty'
    | { readonly src: string; readonly alt: string; readonly fallback: string }
  readonly header?: string
  readonly parts: ReadonlyArray<MessagePart>
  readonly footer?: string
  readonly footerActions?: 'copyLikeDislike' | 'failedRetry'
}

const me = { src: '/logo-mark.svg', alt: '@me', fallback: 'ME' }
const rabbit = {
  src: 'https://github.com/evilrabbit.png',
  alt: '@rabbit',
  fallback: 'R',
}
const cn = {
  src: 'https://github.com/pranathip.png',
  alt: '@cn',
  fallback: 'CN',
}

const demoSpec: ReadonlyArray<MessageSpec> = [
  {
    align: 'end',
    avatar: me,
    parts: [{ type: 'bubble', content: 'Deploying to prod real quick.' }],
  },
  {
    align: 'start',
    avatar: rabbit,
    parts: [
      {
        type: 'bubble',
        variant: 'muted',
        content: "It's 4:55 PM. On a Friday.",
      },
    ],
  },
  {
    align: 'end',
    avatar: me,
    parts: [{ type: 'bubble', content: "It's a one-line change." }],
    footer: 'Delivered',
  },
  {
    align: 'start',
    avatar: rabbit,
    parts: [
      {
        type: 'bubble-group',
        bubbles: [
          {
            type: 'bubble',
            variant: 'muted',
            content: "It's always a one-line change 😭.",
          },
          {
            type: 'bubble',
            variant: 'muted',
            content: 'Alright, let me take a look.',
            reactions: '👍',
          },
        ],
      },
    ],
  },
]

const avatarSpec: ReadonlyArray<MessageSpec> = [
  {
    align: 'start',
    avatar: rabbit,
    parts: [
      {
        type: 'bubble',
        variant: 'muted',
        content: 'The build failed during dependency installation.',
      },
    ],
  },
  {
    align: 'end',
    avatar: {
      src: 'https://github.com/maxleiter.png',
      alt: '@avatar',
      fallback: 'R',
    },
    parts: [{ type: 'bubble', content: 'Can you share the exact error?' }],
  },
]

const groupSpec: ReadonlyArray<MessageSpec> = [
  {
    align: 'start',
    avatar: 'empty',
    parts: [
      {
        type: 'bubble',
        variant: 'muted',
        content: 'I checked the registry addresses.',
      },
    ],
  },
  {
    align: 'start',
    avatar: cn,
    parts: [
      {
        type: 'bubble',
        variant: 'muted',
        content:
          'The component and example JSON now live under the UI registry.',
      },
    ],
  },
]

const headerFooterSpec: ReadonlyArray<MessageSpec> = [
  {
    align: 'start',
    header: 'Olivia',
    parts: [
      {
        type: 'bubble',
        variant: 'muted',
        content: 'I already checked the logs.',
      },
    ],
  },
  {
    align: 'end',
    parts: [
      {
        type: 'bubble',
        content:
          'Send the report to the team. Ping @creaseui if you need help.',
      },
    ],
    footer: 'Read Yesterday',
  },
]

const actionsSpec: ReadonlyArray<MessageSpec> = [
  {
    align: 'start',
    parts: [
      {
        type: 'bubble',
        variant: 'muted',
        content: 'The install failure is coming from the workspace package.',
      },
    ],
    footerActions: 'copyLikeDislike',
  },
  {
    align: 'end',
    parts: [
      { type: 'bubble', content: 'Okay drop me a link. Taking a look...' },
    ],
    footerActions: 'failedRetry',
  },
]

const attachmentSpec: ReadonlyArray<MessageSpec> = [
  {
    align: 'end',
    parts: [
      { type: 'attachment-image' },
      {
        type: 'bubble',
        content:
          "Here's the image. Can you add it to the PDF? Use it for the cover page.",
      },
    ],
  },
  {
    align: 'start',
    parts: [
      {
        type: 'bubble',
        variant: 'muted',
        content: "Done. Here's the PDF with the image added as the cover page.",
      },
      { type: 'attachment-file' },
    ],
  },
  {
    align: 'end',
    parts: [{ type: 'bubble', content: 'Thanks. Looks good.' }],
  },
]

export const messageFixtures: Readonly<
  [MessageFixture, ...Array<MessageFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Avatar',
    description: 'Pair each message with the participant avatar.',
    kind: 'avatar',
  },
  {
    title: 'Group',
    description: 'Group consecutive messages from the same participant.',
    kind: 'group',
  },
  {
    title: 'Header and Footer',
    description: 'Add sender names, timestamps, and read state around bubbles.',
    kind: 'headerFooter',
  },
  {
    title: 'Actions',
    description: 'Attach copy, reaction, and retry affordances to the footer.',
    kind: 'actions',
  },
  {
    title: 'Attachment',
    description: 'Render images and file cards alongside message bubbles.',
    kind: 'attachment',
  },
]

export const specFor = (kind: MessageKind): ReadonlyArray<MessageSpec> => {
  switch (kind) {
    case 'demo':
      return demoSpec
    case 'avatar':
      return avatarSpec
    case 'group':
      return groupSpec
    case 'headerFooter':
      return headerFooterSpec
    case 'actions':
      return actionsSpec
    case 'attachment':
      return attachmentSpec
  }
}

const sq = (value: string): string => value.replaceAll("'", "\\'")

const emitStyles = (fixture: MessageFixture): string => {
  const gap =
    fixture.kind === 'demo' || fixture.kind === 'group' ? '1.5rem' : '2rem'
  return `  stack: { display: 'flex', flexDirection: 'column', gap: '${gap}', width: '100%', maxWidth: '24rem', paddingTop: '3rem', paddingBottom: '3rem' },`
}

const emitImports = (fixture: MessageFixture, isStyleX: boolean): string => {
  const dir = isStyleX ? 'stylex' : 'ui'
  const spec = specFor(fixture.kind)
  const usesAvatar = spec.some(message => message.avatar !== undefined)
  const usesBubbleGroup = spec.some(message =>
    message.parts.some(part => part.type === 'bubble-group'),
  )
  const usesActions = spec.some(message => message.footerActions !== undefined)
  const usesAttachment = spec.some(message =>
    message.parts.some(
      part =>
        part.type === 'attachment-image' || part.type === 'attachment-file',
    ),
  )
  const imports: Array<string> = []
  if (isStyleX) {
    imports.push(`import * as stylex from '@stylexjs/stylex'`)
  }
  if (usesAttachment) {
    imports.push(`import * as Attachment from '@/${dir}/attachment'`)
  }
  if (usesAvatar) {
    imports.push(`import * as Avatar from '@/${dir}/avatar'`)
  }
  imports.push(`import * as Bubble from '@/${dir}/bubble'`)
  if (usesActions || usesAttachment) {
    imports.push(`import * as Button from '@/${dir}/button'`)
  }
  if (usesActions || usesAttachment) {
    imports.push(`import * as Icon from '@/lib/icon'`)
  }
  if (fixture.kind === 'demo') {
    imports.push(`import * as Marker from '@/${dir}/marker'`)
  }
  imports.push(`import * as MessageUi from '@/${dir}/message'`)
  return imports.join('\n')
}

const emitBubble = (part: BubblePart, indent: string): string => {
  const variant = part.variant === 'muted' ? `variant: 'muted', ` : ''
  const reactions =
    part.reactions === undefined
      ? ''
      : `\n${indent}    Bubble.bubbleReactions({ ariaLabel: 'Reactions: thumbs up', children: ['${part.reactions}'] }, h),`
  return `Bubble.bubble({ ${variant}children: [
${indent}    Bubble.bubbleContent({ children: ['${sq(part.content)}'] }, h),${reactions}
${indent}  ] }, h)`
}

const emitPart = (part: MessagePart, indent: string): string => {
  switch (part.type) {
    case 'bubble':
      return emitBubble(part, indent)
    case 'bubble-group':
      return `Bubble.bubbleGroup({ children: [
${part.bubbles
  .map(b => `${indent}    ${emitBubble(b, indent + '    ')}`)
  .join(',\n')}
${indent}  ] }, h)`
    case 'attachment-image':
      return `Attachment.attachment({ orientation: 'vertical', children: [
${indent}    Attachment.attachmentMedia({ variant: 'image', children: [
${indent}      h.img([h.Src('https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80'), h.Alt('Workspace')]),
${indent}    ] }, h),
${indent}  ] }, h)`
    case 'attachment-file':
      return `Attachment.attachment({ children: [
${indent}    Attachment.attachmentMedia({ children: [Icon.icon('file-text', {}, h)] }, h),
${indent}    Attachment.attachmentContent({ children: [
${indent}      Attachment.attachmentTitle({ children: ['sales-dashboard.pdf'] }, h),
${indent}      Attachment.attachmentDescription({ children: ['PDF · 2.4 MB'] }, h),
${indent}    ] }, h),
${indent}    Attachment.attachmentActions({ children: [
${indent}      Attachment.attachmentAction({ onClick: NoOp(), label: 'Download', children: [Icon.icon('download', {}, h)] }, h),
${indent}    ] }, h),
${indent}  ] }, h)`
  }
}

const emitFooter = (spec: MessageSpec, indent: string): string => {
  if (spec.footer === 'Read Yesterday') {
    return `MessageUi.messageFooter({ children: [
${indent}    h.div([h.Class('flex items-center gap-1')], [
${indent}      'Read ',
${indent}      h.span([h.Class('font-normal')], ['Yesterday']),
${indent}    ]),
${indent}  ] }, h)`
  }
  if (spec.footer !== undefined) {
    return `MessageUi.messageFooter({ children: ['${sq(spec.footer)}'] }, h)`
  }
  if (spec.footerActions === 'copyLikeDislike') {
    const btn = (icon: string, label: string): string =>
      `Button.button({ variant: 'ghost', size: 'icon', ariaLabel: '${label}', children: [Icon.icon('${icon}', {}, h)] }, h)`
    return `MessageUi.messageFooter({ children: [
${indent}    ${btn('copy', 'Copy')},
${indent}    ${btn('thumbs-up', 'Like')},
${indent}    ${btn('thumbs-down', 'Dislike')},
${indent}  ] }, h)`
  }
  if (spec.footerActions === 'failedRetry') {
    return `MessageUi.messageFooter({ children: [
${indent}    h.span([h.Class('font-normal text-destructive')], ['Failed to send']),
${indent}    Button.button({ variant: 'ghost', size: 'icon-xs', ariaLabel: 'Retry', children: [Icon.icon('refresh-ccw', {}, h)] }, h),
${indent}  ] }, h)`
  }
  return ''
}

const emitAvatar = (spec: MessageSpec, indent: string): string => {
  if (spec.avatar === 'empty') {
    return `MessageUi.messageAvatar({ children: [] }, h)`
  }
  if (spec.avatar === undefined) {
    return ''
  }
  const avatar = spec.avatar
  return `MessageUi.messageAvatar({ children: [
${indent}    Avatar.avatar({ children: [
${indent}      Avatar.avatarImage({ src: '${avatar.src}', alt: '${avatar.alt}' }, h),
${indent}      Avatar.avatarFallback({ children: ['${avatar.fallback}'] }, h),
${indent}    ] }, h),
${indent}  ] }, h)`
}

const emitMessage = (spec: MessageSpec, indent: string): string => {
  const align = spec.align === 'end' ? `align: 'end', ` : ''
  const children: Array<string> = []
  const avatar = emitAvatar(spec, indent + '    ')
  if (avatar !== '') children.push(avatar)
  const contentChildren: Array<string> = []
  if (spec.header !== undefined) {
    contentChildren.push(
      `MessageUi.messageHeader({ children: ['${sq(spec.header)}'] }, h)`,
    )
  }
  contentChildren.push(
    ...spec.parts.map(part => emitPart(part, indent + '      ')),
  )
  const footer = emitFooter(spec, indent + '      ')
  if (footer !== '') contentChildren.push(footer)
  children.push(
    `MessageUi.messageContent({ children: [
${contentChildren.map(child => `${indent}      ${child}`).join(',\n')}
${indent}    ] }, h)`,
  )
  return `MessageUi.message({ ${align}children: [
${children.map(child => `${indent}    ${child}`).join(',\n')}
${indent}  ] }, h)`
}

const emitBody = (fixture: MessageFixture, isStyleX: boolean): string => {
  const cls = (twClass: string, sxName: string): string =>
    isStyleX ? `stylex.props(styles.${sxName}).className ?? ''` : `'${twClass}'`
  const spec = specFor(fixture.kind)
  const gapTw =
    fixture.kind === 'demo' || fixture.kind === 'group'
      ? 'flex w-full max-w-sm flex-col gap-6 py-12'
      : 'flex w-full max-w-sm flex-col gap-8 py-12'
  const messages = spec
    .map(message => `      ${emitMessage(message, '      ')}`)
    .join(',\n')
  const inner =
    fixture.kind === 'group'
      ? `      MessageUi.messageGroup({ children: [
${messages},
      ] }, h)`
      : messages
  const tail =
    fixture.kind === 'demo'
      ? `,
      Marker.marker({ purpose: 'status', children: [
        Marker.markerContent({ shimmer: true, children: [
          h.span([h.Class('font-medium')], ['Oliver']),
          ' is typing...',
        ] }, h),
      ] }, h)`
      : ''
  return `    h.div([h.Class(${cls(gapTw, 'stack')})], [
${inner}${tail}
    ])`
}

const emitApplication = (
  fixture: MessageFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX
    ? `\nconst styles = stylex.create({\n${emitStyles(fixture)}\n})\n`
    : ''
  return foldkitApplication({
    title: `Message — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${emitImports(fixture, isStyleX)}${stylesBlock}`,
    model: `export const Model = S.Struct({})
export type Model = typeof Model.Type`,
    messages: `// This example has no interaction. Runtime applications still expose a
// closed Message schema so the program boundary remains explicit.
export const NoOp = taggedStruct('NoOpMessage${fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')}');
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {} })`,
    update: `export const update = (
  model: Model,
  _message: Message,
): Update.Return<Model, Message> => ({ model: model })`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Message — ${sq(fixture.title)}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const messageExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  messageFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const messageExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, messageExamplesFor(renderer))
