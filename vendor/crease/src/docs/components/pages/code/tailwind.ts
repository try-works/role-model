import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  codeFixtures,
  type CodeFixture,
} from '@/docs/components/pages/code/shared'
import * as Code from '@/ui/code'
import * as Heading from '@/ui/heading'
import * as Text from '@/ui/text'

const InteractedWithCodePreview = defineMessageUnion({
  InteractedWithCodePreview: {},
})
type InteractedWithCodePreview = typeof InteractedWithCodePreview.Type
const CodePreviewModel = S.Struct({ _docsPage: S.Literal('code') })
type CodePreviewModel = typeof CodePreviewModel.Type

const renderFixture = <Msg>(
  fixture: CodeFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  const inline = (content: string): Html =>
    Code.code({ children: [content] }, h)
  switch (fixture.kind) {
    case 'showcase':
      return h.div(
        [h.Class('flex flex-col gap-4')],
        [
          Text.text(
            {
              type: 'body',
              display: 'block',
              children: [
                'Install dependencies with ',
                inline('npm install'),
                ' and start building.',
              ],
            },
            h,
          ),
          Text.text(
            {
              type: 'body',
              display: 'block',
              children: [
                'Use the variant: ',
                inline('v3.0.0'),
                ' release for the latest features.',
              ],
            },
            h,
          ),
        ],
      )
    case 'inline':
      return Text.text(
        {
          type: 'body',
          display: 'block',
          children: [
            'Foldkit programs use ',
            inline('Model'),
            ', ',
            inline('update'),
            ', and ',
            inline('view'),
            ' to model state, handle messages, and render HTML.',
          ],
        },
        h,
      )
    case 'textSizes':
      return h.div(
        [h.Class('flex flex-col gap-4')],
        [
          Heading.heading(
            {
              level: 3,
              children: ['Configure ', inline('config.json')],
            },
            h,
          ),
          Text.text(
            {
              type: 'body',
              display: 'block',
              children: [
                'Run ',
                inline('pnpm install'),
                ' to set up the workspace.',
              ],
            },
            h,
          ),
          Text.text(
            {
              type: 'supporting',
              display: 'block',
              children: [
                'Supports ',
                inline('ES2022'),
                ' and newer toolchains.',
              ],
            },
            h,
          ),
          Text.text(
            {
              type: 'label',
              display: 'block',
              children: ['Shortcut: ', inline('⌘ + K')],
            },
            h,
          ),
        ],
      )
    case 'various':
      return h.div(
        [h.Class('flex flex-col gap-4')],
        (
          [
            ['Variable', 'const model = { count: 0 }'],
            ['Terminal', 'npm run dev'],
            ['CSS', 'border-radius: 8px'],
            ['File path', 'src/ui/button.ts'],
            ['Shortcut', '⌘ + K'],
          ] as const
        ).map(([label, content]) =>
          h.div(
            [h.Class('flex flex-col')],
            [
              Text.text(
                {
                  type: 'supporting',
                  color: 'secondary',
                  children: [label],
                },
                h,
              ),
              inline(content),
            ],
          ),
        ),
      )
  }
}

export const codeTailwindPreviewProgram = definePreviewProgram<
  CodePreviewModel,
  InteractedWithCodePreview
>({
  Model: CodePreviewModel,
  Message: InteractedWithCodePreview,
  init: () => ({ _docsPage: 'code' }),
  update: model => ({ model: model }),
  view: (index, _model, h) =>
    renderFixture(codeFixtures[index] ?? codeFixtures[0], h),
})
