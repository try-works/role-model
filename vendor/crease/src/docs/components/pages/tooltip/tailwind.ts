import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  tooltipFixtures,
  type TooltipTipSpec,
} from '@/docs/components/pages/tooltip/shared'
import * as Icon from '@/lib/icon'
import * as Kbd from '@/ui/kbd'
import * as Tooltip from '@/ui/tooltip'

const GotTooltipMessage = taggedStruct('GotDocsTooltipMessage', {
  id: S.String,
  message: Tooltip.Message,
})
const PreviewMessage = S.Union([GotTooltipMessage])
type PreviewMessage = typeof PreviewMessage.Type

const TooltipPreviewModel = S.Struct({
  _docsPage: S.Literal('tooltip'),
  tooltips: S.Record(S.String, Tooltip.Model),
})
type TooltipPreviewModel = typeof TooltipPreviewModel.Type

const tipView = (
  tip: TooltipTipSpec,
  content: string,
  model: TooltipPreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Tooltip.tooltip(
    {
      model: model.tooltips[tip.id] ?? Tooltip.init({ id: tip.id }),
      toParentMessage: message => GotTooltipMessage({ id: tip.id, message }),
      trigger: tip.iconTrigger === true ? Icon.icon('save', {}, h) : tip.label,
      content:
        tip.kbd === undefined
          ? content
          : h.span([], [`${content} `, Kbd.kbd({ children: [tip.kbd] }, h)]),
      side: tip.side ?? 'top',
      triggerClass:
        tip.iconTrigger === true
          ? 'inline-flex size-9 items-center justify-center rounded-md border'
          : 'w-fit rounded-md border px-3 py-2 text-sm capitalize',
      ...(tip.isDisabled === true ? { isDisabled: true } : {}),
    },
    h,
  )

export const tooltipTailwindPreviewProgram = definePreviewProgram<
  TooltipPreviewModel,
  PreviewMessage
>({
  Model: TooltipPreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = tooltipFixtures[index] ?? tooltipFixtures[0]
    return {
      _docsPage: 'tooltip',
      tooltips: Object.fromEntries(
        fixture.tips.map(tip => [
          tip.id,
          Tooltip.init({ id: tip.id, showDelay: 400, closeDelay: 100 }),
        ]),
      ),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDocsTooltipMessage': {
        const current = model.tooltips[message.id]
        if (current === undefined) {
          return { model }
        }
        const tooltipOp__ = Tooltip.update(current, message.message)
        const commands = tooltipOp__.commands ?? []
        return {
          model: {
            ...model,
            tooltips: {
              ...model.tooltips,
              [message.id]: tooltipOp__.model,
            },
          },
          commands: Command.mapMessages(commands, next =>
            GotTooltipMessage({ id: message.id, message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = tooltipFixtures[index] ?? tooltipFixtures[0]
    if (fixture.kind === 'sides' || fixture.kind === 'rtl') {
      return h.div(
        [
          h.Class('flex flex-wrap gap-2'),
          ...(fixture.kind === 'rtl' ? [h.Dir('rtl')] : []),
        ],
        fixture.tips.map(tip => tipView(tip, fixture.content, model, h)),
      )
    }
    const tip = fixture.tips[0]
    return tipView(
      tip === undefined ? { id: 'tip', label: 'Hover' } : tip,
      fixture.content,
      model,
      h,
    )
  },
})
