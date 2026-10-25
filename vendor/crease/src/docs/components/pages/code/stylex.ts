import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  codeFixtures,
  type CodeFixture,
} from '@/docs/components/pages/code/shared'
import * as Code from '@/stylex/code'
import * as Heading from '@/stylex/heading'
import { className } from '@/stylex/style'
import * as Text from '@/stylex/text'

const styles = stylex.create({
  column: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  rowGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
})

const renderFixture = <Msg>(
  fixture: CodeFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  const inline = (content: string): Html =>
    Code.code({ children: [content] }, h)
  switch (fixture.kind) {
    case 'showcase':
      return h.div(
        [h.Class(className(styles.column))],
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
        [h.Class(className(styles.column))],
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
        [h.Class(className(styles.column))],
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
            [h.Class(className(styles.rowGroup))],
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

export const codeStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => renderFixture(codeFixtures[exampleIndex] ?? codeFixtures[0], h)
