import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  markdownFixtures,
  type MarkdownFixture,
} from '@/docs/components/pages/markdown/shared'
import * as Markdown from '@/ui/markdown'

const Message = defineMessageUnion({
  GotMarkdownMessage: { message: Markdown.Message },
})
type Message = typeof Message.Type
const { GotMarkdownMessage } = Message

const MarkdownPreviewModel = S.Struct({
  _docsPage: S.Literal('markdown'),
  markdown: Markdown.Model,
})
type MarkdownPreviewModel = typeof MarkdownPreviewModel.Type

const renderFixture = (
  fixture: MarkdownFixture,
  model: MarkdownPreviewModel,
  h: HtmlBuilder<Message>,
): Html =>
  Markdown.markdown(
    {
      model: model.markdown,
      toParentMessage: message => GotMarkdownMessage({ message }),
      children: fixture.content,
      ...(fixture.density === undefined ? {} : { density: fixture.density }),
      ...(fixture.headingLevelStart === undefined
        ? {}
        : { headingLevelStart: fixture.headingLevelStart as 3 }),
      ...(fixture.sources === undefined ? {} : { sources: fixture.sources }),
      ...(fixture.contentWidth === undefined
        ? {}
        : { contentWidth: fixture.contentWidth }),
      ...(fixture.contentAlign === undefined
        ? {}
        : { contentAlign: fixture.contentAlign }),
    },
    h,
  )

export const markdownTailwindPreviewProgram = definePreviewProgram<
  MarkdownPreviewModel,
  Message
>({
  Model: MarkdownPreviewModel,
  Message,
  init: () => ({ _docsPage: 'markdown', markdown: Markdown.init() }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotMarkdownMessage': {
        const nextOp = Markdown.update(model.markdown, message.message)
        return {
          model: { ...model, markdown: nextOp.model },
          commands: Command.mapMessages(nextOp.commands ?? [], child =>
            GotMarkdownMessage({ message: child }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    renderFixture(markdownFixtures[index] ?? markdownFixtures[0], model, h),
})
