import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'
import type { Html } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  LONG_TEXT,
  textFixtures,
  type TextFixture,
  type TextRow,
} from '@/docs/components/pages/text/shared'
import * as Heading from '@/stylex/heading'
import { className } from '@/stylex/style'
import * as Text from '@/stylex/text'

const styles = stylex.create({
  column: {
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  },
  columnTight: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  rowGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  demoColumn: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '300px',
  },
  demoColumnWide: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '400px',
  },
  box: {
    padding: '0.5rem',
    borderColor: 'var(--border)',
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  boxNarrow: {
    padding: '0.5rem',
    borderColor: 'var(--border)',
    borderStyle: 'solid',
    borderWidth: '1px',
    width: '200px',
  },
  boxNarrowClipped: {
    padding: '0.5rem',
    borderColor: 'var(--border)',
    borderStyle: 'solid',
    borderWidth: '1px',
    overflow: 'hidden',
    width: '200px',
  },
})

const textRow = <Msg>(row: TextRow, h: HtmlBuilder<Msg>): Html =>
  Text.text(
    {
      ...(row.type === undefined ? {} : { type: row.type }),
      ...(row.color === undefined ? {} : { color: row.color }),
      ...(row.weight === undefined ? {} : { weight: row.weight }),
      ...(row.display === undefined ? {} : { display: row.display }),
      ...(row.maxLines === undefined ? {} : { maxLines: row.maxLines }),
      ...(row.wordBreak === undefined ? {} : { wordBreak: row.wordBreak }),
      ...(row.textWrap === undefined ? {} : { textWrap: row.textWrap }),
      ...(row.hasStrikethrough === undefined
        ? {}
        : { hasStrikethrough: row.hasStrikethrough }),
      ...(row.hasTabularNumbers === undefined
        ? {}
        : { hasTabularNumbers: row.hasTabularNumbers }),
      children: [row.content],
    },
    h,
  )

const typesLabels = [
  'Body text',
  'Large text',
  'Label text',
  'Supporting text',
  'Code text',
  'Strikethrough',
  'Tabular numbers',
]

const wrapBoxes: ReadonlyArray<
  readonly [string, 'wrap' | 'nowrap' | 'balance' | 'pretty', string, boolean]
> = [
  [
    'Wrap (default)',
    'wrap',
    'This text wraps normally at word boundaries when it reaches the edge.',
    false,
  ],
  [
    'Nowrap',
    'nowrap',
    'This text does not wrap and will overflow its container.',
    true,
  ],
  [
    'Balance',
    'balance',
    'This text is balanced for better visual appearance across lines.',
    false,
  ],
  [
    'Pretty',
    'pretty',
    'This text uses pretty wrap to avoid orphans at the end of paragraphs.',
    false,
  ],
]

const renderFixture = <Msg>(
  fixture: TextFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return h.div(
        [h.Class(className(styles.columnTight))],
        fixture.rows.map(row => textRow(row, h)),
      )
    case 'colors':
    case 'weight':
      return h.div(
        [h.Class(className(styles.column))],
        fixture.rows.map(row => textRow(row, h)),
      )
    case 'headingLevels':
      return h.div(
        [h.Class(className(styles.column))],
        ([1, 2, 3, 4, 5, 6] as const).map(level =>
          Heading.heading({ level, children: [`Heading ${level}`] }, h),
        ),
      )
    case 'inline':
      return Text.text(
        {
          type: 'body',
          display: 'block',
          children: [
            'Design tokens are ',
            Text.text({ type: 'code', children: ['themeable'] }, h),
            ' and shared across every surface.',
          ],
        },
        h,
      )
    case 'types':
      return h.div(
        [h.Class(className(styles.column))],
        fixture.rows.map((row, index) =>
          h.div(
            [h.Class(className(styles.rowGroup))],
            [
              Text.text(
                {
                  type: 'supporting',
                  color: 'secondary',
                  children: [typesLabels[index] ?? ''],
                },
                h,
              ),
              textRow({ ...row, display: 'block' }, h),
            ],
          ),
        ),
      )
    case 'truncation':
      return h.div(
        [h.Class(className(styles.demoColumn))],
        fixture.rows.map(row =>
          h.div(
            [],
            [
              Text.text(
                {
                  type: 'supporting',
                  color: 'secondary',
                  display: 'block',
                  children: [row.content],
                },
                h,
              ),
              h.div(
                [h.Class(className(styles.box))],
                [
                  Text.text(
                    {
                      type: 'body',
                      ...(row.maxLines === undefined
                        ? {}
                        : { maxLines: row.maxLines }),
                      children: [LONG_TEXT],
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
        ),
      )
    case 'wordBreak':
      return h.div(
        [h.Class(className(styles.demoColumnWide))],
        [
          h.div(
            [],
            [
              Text.text(
                {
                  type: 'label',
                  display: 'block',
                  children: ['Break-word (default for multi-line)'],
                },
                h,
              ),
              h.div(
                [h.Class(className(styles.boxNarrow))],
                [
                  Text.text(
                    {
                      type: 'body',
                      maxLines: 2,
                      wordBreak: 'break-word',
                      children: [
                        'This is a verylongunbreakableword for a break-word example',
                      ],
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [],
            [
              Text.text(
                {
                  type: 'label',
                  display: 'block',
                  children: ['Break-all (default for single-line)'],
                },
                h,
              ),
              h.div(
                [h.Class(className(styles.boxNarrow))],
                [
                  Text.text(
                    {
                      type: 'body',
                      maxLines: 2,
                      wordBreak: 'break-all',
                      children: [
                        'Breaks anywhere: abcdefghijklmnopqrstuvwxyz0123456789',
                      ],
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
        ],
      )
    case 'wrap':
      return h.div(
        [h.Class(className(styles.demoColumnWide))],
        wrapBoxes.map(([label, wrap, content, clipped]) =>
          h.div(
            [],
            [
              Text.text(
                { type: 'label', display: 'block', children: [label] },
                h,
              ),
              h.div(
                [
                  h.Class(
                    className(
                      clipped ? styles.boxNarrowClipped : styles.boxNarrow,
                    ),
                  ),
                ],
                [
                  Text.text(
                    {
                      type: 'body',
                      textWrap: wrap,
                      children: [content],
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
        ),
      )
  }
}

export const textStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => renderFixture(textFixtures[exampleIndex] ?? textFixtures[0], h)
