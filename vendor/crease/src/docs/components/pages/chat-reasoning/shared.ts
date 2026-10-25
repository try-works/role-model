import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type ChatReasoningFixture = Readonly<{
  title: string
  description: string
  kind: 'standalone' | 'inMessage'
  label?: string
  duration?: string
  isStreaming?: boolean
  isExpanded?: boolean
  content: ReadonlyArray<string>
}>

/* No astryx example blocks ship under ChatReasoning/ — the example set is
   derived from apps/storybook/stories/ChatReasoning.stories.tsx (Collapsed,
   Expanded, Streaming, CustomLabel, InMessage). */
export const chatReasoningFixtures: Readonly<
  [ChatReasoningFixture, ...Array<ChatReasoningFixture>]
> = [
  {
    title: 'Chat Reasoning',
    description:
      'A compact collapsible reasoning trace that shows a single-line summary and expands to reveal the full thinking.',
    kind: 'standalone',
    duration: '12s',
    content: [
      'Let me work through the constraints systematically. The farmer has 3 fields and rotates wheat, corn, soy. No same crop in adjacent fields and no same crop in the same field two years in a row...',
    ],
  },
  {
    title: 'Expanded',
    description:
      'Expand the reasoning panel to show the full chain of thought.',
    kind: 'standalone',
    duration: '8s',
    isExpanded: true,
    content: [
      'First, I need to understand the constraints:',
      '1. Three fields, three crops (wheat, corn, soy)',
      '2. No adjacent fields can have the same crop',
      '3. No field can repeat its crop from the previous year',
      'For Year 1: 3 × 2 × 2 = 12 arrangements...',
    ],
  },
  {
    title: 'Streaming',
    description:
      'While reasoning streams in, the label shimmers and duration and preview stay hidden.',
    kind: 'standalone',
    isStreaming: true,
    content: ['Working through the combinatorial constraints...'],
  },
  {
    title: 'Custom Label',
    description: 'Rename the header label to match the model or activity.',
    kind: 'standalone',
    label: 'Analyzing',
    duration: '3s',
    content: ['Checking the codebase for similar patterns...'],
  },
  {
    title: 'In a Message',
    description:
      'Reasoning sits above the assistant response inside a chat message.',
    kind: 'inMessage',
    duration: '12s',
    content: ['Let me work through the constraints systematically...'],
  },
]

const IMPORTS_TAILWIND = `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'`

const IMPORTS_STYLEX = `import { Option, Schema as S } from 'effect'
import * as stylex from '@stylexjs/stylex'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
import { className } from '@/stylex/style'

const styles = stylex.create({
  shell: { alignItems: 'flex-start', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  page: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '36rem', width: '100%' },
  message: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  reply: { color: 'var(--foreground)', fontSize: '0.875rem', lineHeight: '1.5rem' },
})`

const reasoningSource = (
  fixture: ChatReasoningFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const componentModule = isStyleX
    ? '@/stylex/chat-reasoning'
    : '@/ui/chat-reasoning'
  const props: Array<string> = [
    'model: model.reasoning',
    'toParentMessage: message => GotChatReasoningMessage({ message })',
  ]
  if (fixture.label !== undefined) props.push(`label: '${fixture.label}'`)
  if (fixture.duration !== undefined)
    props.push(`duration: '${fixture.duration}'`)
  if (fixture.isStreaming === true) props.push('isStreaming: true')
  const contentChildren = fixture.content
    .map(line => `'${line}'`)
    .join(',\n          ')
  const reasoningCall = `ChatReasoning.chatReasoning(
        {
          ${props.join(',\n          ')},
          children: [
            ${contentChildren},
          ],
        },
        h,
      )`

  const viewBody =
    fixture.kind === 'inMessage'
      ? `h.div(${isStyleX ? "[h.Class(stylex.props(styles.page).className ?? '')]" : "[h.Class('flex w-full max-w-xl flex-col gap-2')]"}, [
      MessageBox.message({ children: [
        MessageBox.messageContent({ children: [
          ${reasoningCall},
          h.p(${isStyleX ? "[h.Class(stylex.props(styles.reply).className ?? '')]" : "[h.Class('text-sm leading-6 text-foreground')]"}, [
            'There are <b>42</b> valid planting arrangements over 3 years.',
          ]),
        ] }, h),
      ] }, h),
    ])`
      : `h.div(${isStyleX ? "[h.Class(stylex.props(styles.page).className ?? '')]" : "[h.Class('w-full max-w-xl')]"}, [
      ${reasoningCall},
    ])`

  const messageImports =
    fixture.kind === 'inMessage'
      ? `\nimport * as MessageBox from '@/${isStyleX ? 'stylex' : 'ui'}/message'`
      : ''

  return foldkitApplication({
    title: `Chat Reasoning — ${fixture.title}`,
    imports: `${isStyleX ? IMPORTS_STYLEX : IMPORTS_TAILWIND}

import * as ChatReasoning from '${componentModule}'${messageImports}`,
    model: `export const Model = S.Struct({
  reasoning: ChatReasoning.Model,
})
export type Model = typeof Model.Type`,
    messages: `export const GotChatReasoningMessage = taggedStruct('GotChatReasoningMessage${fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')}', {
  message: ChatReasoning.Message,
})
export const Message = S.Union([GotChatReasoningMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    reasoning: ChatReasoning.init({
      id: 'reasoning',
      isExpanded: ${String(fixture.isExpanded === true)},
    }),
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotChatReasoningMessage${fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')}': {
      const next = ChatReasoning.update(model.reasoning, message.message)
      return {
        model: { ...model, reasoning: next.model },
        commands: Command.mapMessages(next.commands ?? [], inner =>
          GotChatReasoningMessage({ message: inner })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Chat Reasoning — ${fixture.title}',
  body: h.main(
    [h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})],
    [
      ${viewBody.split('\n').join('\n      ')},
    ],
  ),
})`,
  })
}

const chatReasoningExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  chatReasoningFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: reasoningSource(fixture, renderer),
    ...(index === 0 ? {} : {}),
  }))

export const chatReasoningExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, chatReasoningExamplesFor(renderer))
