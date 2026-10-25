import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  markdownFixtures,
  type MarkdownFixture,
} from '@/docs/components/pages/markdown/shared'
import * as Markdown from '@/stylex/markdown'

const Message = defineMessageUnion({
  GotMarkdownMessage: { message: Markdown.Message },
})
const { GotMarkdownMessage } = Message

type PreviewModel = Readonly<{
  markdown: Markdown.Model
}>

const renderFixture = <Msg>(
  fixture: MarkdownFixture,
  model: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Markdown.markdown(
    {
      model: model.markdown,
      toParentMessage: message =>
        onMessageJson(JSON.stringify(GotMarkdownMessage({ message }))),
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

export const markdownStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  renderFixture(
    markdownFixtures[exampleIndex] ?? markdownFixtures[0],
    model as PreviewModel,
    onMessageJson,
    h,
  )
