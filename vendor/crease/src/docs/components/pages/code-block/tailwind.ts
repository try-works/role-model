import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  codeBlockFixtures,
  type CodeBlockFixture,
} from '@/docs/components/pages/code-block/shared'
import * as CodeBlock from '@/ui/code-block'

const Message = defineMessageUnion({
  GotCodeBlockMessage: { id: S.String, message: CodeBlock.Message },
})
type Message = typeof Message.Type
const { GotCodeBlockMessage } = Message

const CodeBlockPreviewModel = S.Struct({
  _docsPage: S.Literal('code-block'),
  codeBlocks: S.Record(S.String, CodeBlock.Model),
})
type CodeBlockPreviewModel = typeof CodeBlockPreviewModel.Type

const renderFixture = (
  fixture: CodeBlockFixture,
  model: CodeBlockPreviewModel,
  h: HtmlBuilder<Message>,
): Html => {
  const block = (id: string, spec: (typeof fixture.blocks)[number]): Html =>
    CodeBlock.codeBlock(
      {
        model: model.codeBlocks[id] ?? CodeBlock.init(),
        toParentMessage: message => GotCodeBlockMessage({ id, message }),
        code: spec.code,
        ...(spec.language === undefined ? {} : { language: spec.language }),
        ...(spec.title === undefined ? {} : { title: spec.title }),
        ...(spec.hasLineNumbers === true ? { hasLineNumbers: true } : {}),
        ...(spec.hasCopyButton === true ? { hasCopyButton: true } : {}),
        ...(spec.highlightLines === undefined
          ? {}
          : { highlightLines: spec.highlightLines }),
        ...(spec.maxHeight === undefined ? {} : { maxHeight: spec.maxHeight }),
        class: 'w-full',
      },
      h,
    )

  if (fixture.blocks.length === 1 && fixture.blocks[0] !== undefined) {
    return block(fixture.blocks[0].id, fixture.blocks[0])
  }
  return h.div(
    [h.Class('flex flex-col gap-4 w-full max-w-100')],
    fixture.blocks.map(spec => block(spec.id, spec)),
  )
}

export const codeBlockTailwindPreviewProgram = definePreviewProgram<
  CodeBlockPreviewModel,
  Message
>({
  Model: CodeBlockPreviewModel,
  Message,
  init: index => ({
    _docsPage: 'code-block',
    codeBlocks: Object.fromEntries(
      (codeBlockFixtures[index] ?? codeBlockFixtures[0]).blocks.map(block => [
        block.id,
        CodeBlock.init(),
      ]),
    ),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotCodeBlockMessage': {
        const current = model.codeBlocks[message.id]
        if (current === undefined) {
          return { model }
        }
        const nextOp = CodeBlock.update(current, message.message)
        return {
          model: {
            ...model,
            codeBlocks: {
              ...model.codeBlocks,
              [message.id]: nextOp.model,
            },
          },
          commands: Command.mapMessages(nextOp.commands ?? [], child =>
            GotCodeBlockMessage({ id: message.id, message: child }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    renderFixture(codeBlockFixtures[index] ?? codeBlockFixtures[0], model, h),
})
