import * as stylex from '@stylexjs/stylex'
import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  codeBlockFixtures,
  type CodeBlockFixture,
} from '@/docs/components/pages/code-block/shared'
import * as CodeBlock from '@/stylex/code-block'
import { className } from '@/stylex/style'

const Message = defineMessageUnion({
  GotCodeBlockMessage: { id: S.String, message: CodeBlock.Message },
})
const { GotCodeBlockMessage } = Message

const styles = stylex.create({
  column: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '400px',
    width: '100%',
  },
  block: {
    width: '100%',
  },
})

type PreviewModel = Readonly<{
  codeBlocks: Readonly<Record<string, CodeBlock.Model>>
}>

const renderFixture = <Msg>(
  fixture: CodeBlockFixture,
  model: PreviewModel,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const block = (id: string, spec: (typeof fixture.blocks)[number]): Html =>
    CodeBlock.codeBlock(
      {
        model: model.codeBlocks[id] ?? CodeBlock.init(),
        toParentMessage: message =>
          onMessageJson(JSON.stringify(GotCodeBlockMessage({ id, message }))),
        code: spec.code,
        ...(spec.language === undefined ? {} : { language: spec.language }),
        ...(spec.title === undefined ? {} : { title: spec.title }),
        ...(spec.hasLineNumbers === true ? { hasLineNumbers: true } : {}),
        ...(spec.hasCopyButton === true ? { hasCopyButton: true } : {}),
        ...(spec.highlightLines === undefined
          ? {}
          : { highlightLines: spec.highlightLines }),
        ...(spec.maxHeight === undefined ? {} : { maxHeight: spec.maxHeight }),
        layoutStyle: styles.block,
      },
      h,
    )

  if (fixture.blocks.length === 1 && fixture.blocks[0] !== undefined) {
    return block(fixture.blocks[0].id, fixture.blocks[0])
  }
  return h.div(
    [h.Class(className(styles.column))],
    fixture.blocks.map(spec => block(spec.id, spec)),
  )
}

export const codeBlockStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  renderFixture(
    codeBlockFixtures[exampleIndex] ?? codeBlockFixtures[0],
    model as PreviewModel,
    onMessageJson,
    h,
  )
