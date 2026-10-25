import type { Html, HtmlBuilder } from 'foldkit/html'

import * as BoardStyleX from '@/demo/board-stylex'
import { box, grid, inline, stack, text } from '@/stylex/composition'
import type { ResponsiveSpaceToken } from '@/stylex/composition/types'
import * as ToggleGroup from '@/stylex/toggle-group'

export const Model = BoardStyleX.Model
export type Model = BoardStyleX.Model
export const Message = BoardStyleX.Message
export type Message = BoardStyleX.Message

export const init = BoardStyleX.init
export const update = BoardStyleX.update
export const subscriptions = BoardStyleX.subscriptions

const options = <Value extends string>(
  label: string,
  value: Value,
  values: ReadonlyArray<Value>,
  onToggle: (next: Value) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  stack(
    {
      gap: 'xs',
      data: { 'primitive-control': label.toLowerCase().replaceAll(' ', '-') },
      children: [
        text(
          {
            as: 'span',
            children: [label],
            tone: 'secondary',
            variant: 'caption',
          },
          h,
        ),
        ToggleGroup.toggleGroup<Message, Value>(
          {
            ariaLabel: `${label} options`,
            arrangement: 'wrapped',
            items: values.map(item => ({
              children: [item.replace(/([A-Z])/gu, ' $1').trim()],
              value: item,
            })),
            onToggle,
            size: 'lg',
            value,
            variant: 'outline',
          },
          h,
        ),
      ],
    },
    h,
  )

const boardSpace = (
  value:
    | Model['primitiveInspector']['boxPadding']
    | Model['primitiveInspector']['stackGap'],
): ResponsiveSpaceToken => (value === 'responsive' ? 'createBoard' : value)

const primitiveInspector = (model: Model, h: HtmlBuilder<Message>): Html => {
  const settings = model.primitiveInspector
  return stack(
    {
      gap: 'lg',
      data: { 'primitive-inspector': '' },
      children: [
        stack(
          {
            gap: 'xs',
            children: [
              text(
                {
                  as: 'h2',
                  children: ['Primitive inspector'],
                  variant: 'headingSm',
                },
                h,
              ),
              text(
                {
                  as: 'p',
                  children: [
                    'Change one constrained prop and watch the real board.',
                  ],
                  tone: 'secondary',
                  variant: 'caption',
                },
                h,
              ),
            ],
          },
          h,
        ),
        options(
          'Canvas padding (Box)',
          settings.boxPadding,
          ['responsive', 'none', 'sm', 'md', 'xl'],
          value => BoardStyleX.Message.ChangedPrimitiveBoxPadding({ value }),
          h,
        ),
        options(
          'Canvas surface (Box)',
          settings.boxSurface,
          ['card', 'muted', 'section'],
          value => BoardStyleX.Message.ChangedPrimitiveBoxSurface({ value }),
          h,
        ),
        options(
          'Card spacing (Stack)',
          settings.stackGap,
          ['responsive', 'sm', 'md', 'xl'],
          value => BoardStyleX.Message.ChangedPrimitiveStackGap({ value }),
          h,
        ),
        options(
          'Board alignment (Inline)',
          settings.inlineJustify,
          ['start', 'center', 'end', 'between'],
          value => BoardStyleX.Message.ChangedPrimitiveInlineJustify({ value }),
          h,
        ),
        options(
          'Split layout (Grid)',
          settings.gridColumns,
          ['one', 'two'],
          value => BoardStyleX.Message.ChangedPrimitiveGridColumns({ value }),
          h,
        ),
        options(
          'Board text scale (Text)',
          settings.textVariant,
          ['inherit', 'caption', 'headingSm', 'headingMd'],
          value => BoardStyleX.Message.ChangedPrimitiveTextVariant({ value }),
          h,
        ),
      ],
    },
    h,
  )
}

const column = (
  specification: BoardStyleX.BoardColumn,
  settings: Model['primitiveInspector'],
  h: HtmlBuilder<Message>,
): Html =>
  stack(
    {
      data: { 'primitive-stack': '' },
      gap: boardSpace(settings.stackGap),
      gridColumn: specification.span === 2 ? 'span2' : 'auto',
      padding: 'xs',
      rendering: 'deferred',
      children: specification.items.map(item =>
        BoardStyleX.isBoardSplit(item)
          ? grid(
              {
                align: 'start',
                columns: settings.gridColumns,
                data: { 'primitive-grid': '' },
                gap: boardSpace(settings.stackGap),
                children: item.columns.map(items =>
                  stack(
                    {
                      gap: boardSpace(settings.stackGap),
                      children: items,
                    },
                    h,
                  ),
                ),
              },
              h,
            )
          : item,
      ),
    },
    h,
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  box(
    {
      as: 'main',
      minHeight: 'createPage',
      position: 'relative',
      children: [
        BoardStyleX.presetThemeStyle(model, h),
        box(
          {
            contain: 'paint',
            overflowX: 'auto',
            overflowY: 'hidden',
            rail: 'customizer',
            surface: 'canvas',
            children: [
              inline(
                {
                  data: { 'primitive-inline': '' },
                  justify: model.primitiveInspector.inlineJustify,
                  minWidth: 'maxContent',
                  width: 'full',
                  children: [
                    box(
                      {
                        data: {
                          'crease-board-theme': '',
                          'crease-style': model.preset.style,
                          'icon-library': model.preset.iconLibrary,
                          'primitive-box': '',
                        },
                        padding: boardSpace(
                          model.primitiveInspector.boxPadding,
                        ),
                        slot: 'capture-target',
                        surface: model.primitiveInspector.boxSurface,
                        width: 'createBoard',
                        children: [
                          text(
                            {
                              as: 'div',
                              children: [
                                grid(
                                  {
                                    align: 'start',
                                    columns: 'createBoard',
                                    data: { 'primitive-board-grid': '' },
                                    gap: boardSpace(
                                      model.primitiveInspector.stackGap,
                                    ),
                                    width: 'full',
                                    children: [
                                      BoardStyleX.boardSpriteDefinitions(h),
                                      ...BoardStyleX.boardColumns(model, h).map(
                                        specification =>
                                          column(
                                            specification,
                                            model.primitiveInspector,
                                            h,
                                          ),
                                      ),
                                    ],
                                  },
                                  h,
                                ),
                              ],
                              data: { 'primitive-text': '' },
                              variant: model.primitiveInspector.textVariant,
                            },
                            h,
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
          },
          h,
        ),
        BoardStyleX.presetCustomizer(model, h, primitiveInspector(model, h)),
      ],
    },
    h,
  )
