import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  chatReasoningFixtures,
  type ChatReasoningFixture,
} from '@/docs/components/pages/chat-reasoning/shared'
import * as ChatReasoning from '@/ui/chat-reasoning'
import * as Message from '@/ui/message'

const Got = defineMessageUnion({
  GotChatReasoningMessage: { message: ChatReasoning.Message },
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('chat-reasoning'),
  reasoning: ChatReasoning.Model,
})
type Model = typeof Model.Type

const reasoningView = (
  fixture: ChatReasoningFixture,
  model: Model,
  h: HtmlBuilder<Got>,
): Html =>
  ChatReasoning.chatReasoning(
    {
      model: model.reasoning,
      toParentMessage: message => Got.GotChatReasoningMessage({ message }),
      ...(fixture.label === undefined ? {} : { label: fixture.label }),
      ...(fixture.duration === undefined ? {} : { duration: fixture.duration }),
      ...(fixture.isStreaming === true ? { isStreaming: true } : {}),
      children: [...fixture.content],
    },
    h,
  )

export const chatReasoningTailwindPreviewProgram = definePreviewProgram<
  Model,
  Got
>({
  Model,
  Message: Got,
  init: index => {
    const fixture = chatReasoningFixtures[index] ?? chatReasoningFixtures[0]
    return {
      _docsPage: 'chat-reasoning',
      reasoning: ChatReasoning.init({
        id: `docs-chat-reasoning-${String(index)}`,
        isExpanded: fixture.isExpanded === true,
      }),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotChatReasoningMessage': {
        const next = ChatReasoning.update(model.reasoning, message.message)
        return {
          model: { ...model, reasoning: next.model },
          commands: Command.mapMessages(next.commands ?? [], next =>
            Got.GotChatReasoningMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = chatReasoningFixtures[index] ?? chatReasoningFixtures[0]
    if (fixture.kind === 'inMessage') {
      return h.div(
        [h.Class('flex w-full max-w-xl flex-col gap-2')],
        [
          Message.message(
            {
              children: [
                Message.messageContent(
                  {
                    children: [
                      reasoningView(fixture, model, h),
                      h.p(
                        [h.Class('text-sm leading-6 text-foreground')],
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
      [h.Class('w-full max-w-xl')],
      [reasoningView(fixture, model, h)],
    )
  },
})
