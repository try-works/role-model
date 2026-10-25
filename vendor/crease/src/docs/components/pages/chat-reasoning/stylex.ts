import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  chatReasoningFixtures,
  type ChatReasoningFixture,
} from '@/docs/components/pages/chat-reasoning/shared'
import * as ChatReasoning from '@/stylex/chat-reasoning'
import * as Message from '@/stylex/message'
import { className } from '@/stylex/style'

const styles = stylex.create({
  page: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '36rem',
    width: '100%',
  },
  column: {
    maxWidth: '36rem',
    width: '100%',
  },
  reply: {
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
  },
})

interface PreviewShape {
  readonly reasoning: ChatReasoning.Model
}

const reasoningView = <Msg>(
  fixture: ChatReasoningFixture,
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  ChatReasoning.chatReasoning(
    {
      model: model.reasoning,
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({ _tag: 'GotChatReasoningMessage', message }),
        ),
      ...(fixture.label === undefined ? {} : { label: fixture.label }),
      ...(fixture.duration === undefined ? {} : { duration: fixture.duration }),
      ...(fixture.isStreaming === true ? { isStreaming: true } : {}),
      children: [...fixture.content],
    },
    h,
  )

export const chatReasoningStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = chatReasoningFixtures[index] ?? chatReasoningFixtures[0]
  if (fixture.kind === 'inMessage') {
    return h.div(
      [h.Class(className(styles.page))],
      [
        Message.message(
          {
            children: [
              Message.messageContent(
                {
                  children: [
                    reasoningView(fixture, preview, onMessageJson, h),
                    h.p(
                      [h.Class(className(reset.text, styles.reply))],
                      [
                        'There are 42 valid planting arrangements over 3 years.',
                      ],
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    )
  }
  return h.div(
    [h.Class(className(styles.column))],
    [reasoningView(fixture, preview, onMessageJson, h)],
  )
}
