import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import * as Button from '@/stylex/button'
import * as ButtonGroup from '@/stylex/button-group'
import * as Icon from '@/lib/icon'
import * as InputGroup from '@/stylex/input-group'
import * as Kbd from '@/stylex/kbd'
import * as Tooltip from '@/stylex/tooltip'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'
import { kbdFixtures, type KbdKind } from './shared'

const styles = stylex.create({
  stack: {
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  row: { gap: '1rem', display: 'flex', flexWrap: 'wrap' },
  muted: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  kbdShift: { transform: 'translateX(0.125rem)' },
  tooltipContent: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'inline-flex',
  },
  iconMd: { height: '1rem', width: '1rem' },
  inputStack: {
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '20rem',
    width: '100%',
  },
})

const sx = (style: stylex.StaticStyles): string => className(style)

interface KbdPreviewShape {
  readonly search: string
  readonly tooltipA: Tooltip.Model
  readonly tooltipB: Tooltip.Model
}

const kbdSxView = <Msg>(
  kind: KbdKind,
  model: KbdPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  switch (kind) {
    case 'demo':
      return h.div(
        [h.Class(sx(styles.stack))],
        [
          Kbd.kbdGroup(
            {
              children: [
                Kbd.kbd({ children: ['⌘'] }, h),
                Kbd.kbd({ children: ['⇧'] }, h),
                Kbd.kbd({ children: ['⌥'] }, h),
                Kbd.kbd({ children: ['⌃'] }, h),
              ],
            },
            h,
          ),
          Kbd.kbdGroup(
            {
              children: [
                Kbd.kbd({ children: ['Ctrl'] }, h),
                h.span([], ['+']),
                Kbd.kbd({ children: ['B'] }, h),
              ],
            },
            h,
          ),
        ],
      )
    case 'group':
      return h.div(
        [h.Class(sx(styles.stack))],
        [
          h.p(
            [h.Class(className(reset.text, styles.muted))],
            [
              'Use ',
              Kbd.kbdGroup(
                {
                  children: [
                    Kbd.kbd({ children: ['Ctrl + B'] }, h),
                    Kbd.kbd({ children: ['Ctrl + K'] }, h),
                  ],
                },
                h,
              ),
              ' to open the command palette',
            ],
          ),
        ],
      )
    case 'button':
      return h.div(
        [h.Class(sx(styles.stack))],
        [
          Button.button(
            {
              variant: 'outline',
              iconInset: 'end',
              children: [
                'Accept ',
                Kbd.kbd(
                  {
                    icon: 'inline-end',
                    layoutStyle: styles.kbdShift as ComponentLayoutStyle,
                    children: ['⏎'],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'tooltip':
      return h.div(
        [h.Class(sx(styles.row))],
        [
          ButtonGroup.buttonGroup(
            {
              children: [
                Tooltip.tooltip(
                  {
                    model: model.tooltipA,
                    toParentMessage: message =>
                      onMessageJson(
                        JSON.stringify({ _tag: 'GotTooltipAMessage', message }),
                      ),
                    renderTrigger: attributes =>
                      Button.button(
                        {
                          buttonAttributes: attributes,
                          variant: 'outline',
                          children: ['Save'],
                        },
                        h,
                      ),
                    content: h.span(
                      [h.Class(sx(styles.tooltipContent))],
                      ['Save Changes ', Kbd.kbd({ children: ['S'] }, h)],
                    ),
                  },
                  h,
                ),
                Tooltip.tooltip(
                  {
                    model: model.tooltipB,
                    toParentMessage: message =>
                      onMessageJson(
                        JSON.stringify({ _tag: 'GotTooltipBMessage', message }),
                      ),
                    renderTrigger: attributes =>
                      Button.button(
                        {
                          buttonAttributes: attributes,
                          variant: 'outline',
                          children: ['Print'],
                        },
                        h,
                      ),
                    content: h.span(
                      [h.Class(sx(styles.tooltipContent))],
                      [
                        'Print Document ',
                        Kbd.kbdGroup(
                          {
                            children: [
                              Kbd.kbd({ children: ['Ctrl'] }, h),
                              Kbd.kbd({ children: ['P'] }, h),
                            ],
                          },
                          h,
                        ),
                      ],
                    ),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
    case 'inputGroup':
      return h.div(
        [h.Class(sx(styles.inputStack))],
        [
          InputGroup.inputGroup(
            {
              children: [
                InputGroup.inputGroupInput(
                  {
                    id: 'kbd-search',
                    value: model.search,
                    onInput: value =>
                      onMessageJson(
                        JSON.stringify({ _tag: 'ChangedSearch', value }),
                      ),
                    placeholder: 'Search...',
                    ariaLabel: 'Search',
                  },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    children: [
                      Icon.icon(
                        'search',
                        { class: className(styles.iconMd) },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      Kbd.kbd({ children: ['⌘'] }, h),
                      Kbd.kbd({ children: ['K'] }, h),
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
    case 'rtl':
      return h.div(
        [h.Class(sx(styles.stack)), h.Attribute('dir', 'rtl')],
        [
          Kbd.kbdGroup(
            {
              children: [
                Kbd.kbd({ children: ['⌘'] }, h),
                Kbd.kbd({ children: ['⇧'] }, h),
                Kbd.kbd({ children: ['⌥'] }, h),
                Kbd.kbd({ children: ['⌃'] }, h),
              ],
            },
            h,
          ),
          Kbd.kbdGroup(
            {
              children: [
                Kbd.kbd({ children: ['Ctrl'] }, h),
                h.span([], ['+']),
                Kbd.kbd({ children: ['B'] }, h),
              ],
            },
            h,
          ),
        ],
      )
  }
}

export const kbdStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  kbdSxView(
    (kbdFixtures[exampleIndex] ?? kbdFixtures[0]).kind,
    model as KbdPreviewShape,
    onMessageJson,
    h,
  )
