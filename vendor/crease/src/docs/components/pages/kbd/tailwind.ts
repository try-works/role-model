import * as S from 'effect/Schema'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { kbdFixtures, type KbdKind } from '@/docs/components/pages/kbd/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import * as ButtonGroup from '@/ui/button-group'
import * as InputGroup from '@/ui/input-group'
import * as Kbd from '@/ui/kbd'
import * as Tooltip from '@/ui/tooltip'

const KbdPreviewModel = S.Struct({
  _docsPage: S.Literal('kbd'),
  search: S.String,
  tooltipA: Tooltip.Model,
  tooltipB: Tooltip.Model,
})
type KbdPreviewModel = S.Schema.Type<typeof KbdPreviewModel>

const KbdPreviewMessage = defineMessageUnion({
  ChangedSearch: { value: S.String },
  GotTooltipAMessage: { message: Tooltip.Message },
  GotTooltipBMessage: { message: Tooltip.Message },
})
type KbdPreviewMessage = typeof KbdPreviewMessage.Type

const kbdView = (
  kind: KbdKind,
  model: KbdPreviewModel,
  h: HtmlBuilder<KbdPreviewMessage>,
): Html => {
  switch (kind) {
    case 'demo':
      return h.div(
        [h.Class('flex flex-col items-center gap-4')],
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
        [h.Class('flex flex-col items-center gap-4')],
        [
          h.p(
            [h.Class('text-sm text-muted-foreground')],
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
        [h.Class('flex flex-col items-center gap-4')],
        [
          Button.button(
            {
              variant: 'outline',
              children: [
                'Accept ',
                Kbd.kbd(
                  {
                    icon: 'inline-end',
                    class: 'translate-x-0.5',
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
        [h.Class('flex flex-wrap gap-4')],
        [
          ButtonGroup.buttonGroup(
            {
              children: [
                Tooltip.tooltip(
                  {
                    model: model.tooltipA,
                    toParentMessage: message =>
                      KbdPreviewMessage.GotTooltipAMessage({ message }),
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
                      [h.Class('inline-flex items-center gap-1')],
                      ['Save Changes ', Kbd.kbd({ children: ['S'] }, h)],
                    ),
                  },
                  h,
                ),
                Tooltip.tooltip(
                  {
                    model: model.tooltipB,
                    toParentMessage: message =>
                      KbdPreviewMessage.GotTooltipBMessage({ message }),
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
                      [h.Class('inline-flex items-center gap-1')],
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
        [h.Class('flex w-full max-w-xs flex-col gap-6')],
        [
          InputGroup.inputGroup(
            {
              children: [
                InputGroup.inputGroupInput(
                  {
                    id: 'kbd-search',
                    value: model.search,
                    onInput: value =>
                      KbdPreviewMessage.ChangedSearch({ value }),
                    placeholder: 'Search...',
                    ariaLabel: 'Search',
                  },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  { children: [Icon.icon('search', {}, h)] },
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
        [
          h.Class('flex flex-col items-center gap-4'),
          h.Attribute('dir', 'rtl'),
        ],
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

export const kbdTailwindPreviewProgram = definePreviewProgram<
  KbdPreviewModel,
  KbdPreviewMessage
>({
  Model: KbdPreviewModel,
  Message: KbdPreviewMessage,
  init: index => ({
    _docsPage: 'kbd',
    search: '',
    tooltipA: Tooltip.init({
      id: `docs-kbd-${String(index)}-a`,
      showDelay: 400,
      closeDelay: 100,
    }),
    tooltipB: Tooltip.init({
      id: `docs-kbd-${String(index)}-b`,
      showDelay: 400,
      closeDelay: 100,
    }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedSearch':
        return { model: { ...model, search: message.value }, commands: [] }
      case 'GotTooltipAMessage': {
        const { model: tooltipA, commands: tooltipCommands__ } = Tooltip.update(
          model.tooltipA,
          message.message,
        )
        const commands = tooltipCommands__ ?? []
        return {
          model: { ...model, tooltipA },
          commands: Command.mapMessages(commands, next =>
            KbdPreviewMessage.GotTooltipAMessage({ message: next }),
          ),
        }
      }
      case 'GotTooltipBMessage': {
        const { model: tooltipB, commands: tooltipCommands__ } = Tooltip.update(
          model.tooltipB,
          message.message,
        )
        const commands = tooltipCommands__ ?? []
        return {
          model: { ...model, tooltipB },
          commands: Command.mapMessages(commands, next =>
            KbdPreviewMessage.GotTooltipBMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    kbdView((kbdFixtures[index] ?? kbdFixtures[0]).kind, model, h),
})
