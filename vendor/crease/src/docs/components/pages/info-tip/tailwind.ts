import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  infoTipFixtures,
  type InfoTipFixture,
  type InfoTipSpec,
} from '@/docs/components/pages/info-tip/shared'
import { input } from '@/ui/input'
import * as InfoTip from '@/ui/info-tip'

const GotInfoTipMessage = taggedStruct('GotDocsInfoTipMessage', {
  id: S.String,
  message: InfoTip.Message,
})
const PreviewMessage = S.Union([GotInfoTipMessage])
type PreviewMessage = typeof PreviewMessage.Type

const InfoTipPreviewModel = S.Struct({
  _docsPage: S.Literal('info-tip'),
  tips: S.Record(S.String, InfoTip.Model),
})
type InfoTipPreviewModel = typeof InfoTipPreviewModel.Type

const tipView = (
  tip: InfoTipSpec,
  model: InfoTipPreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  InfoTip.infoTip(
    {
      model: model.tips[tip.id] ?? InfoTip.init({ id: tip.id }),
      toParentMessage: message => GotInfoTipMessage({ id: tip.id, message }),
      content: tip.content,
      ...(tip.label === undefined ? {} : { label: tip.label }),
      ...(tip.size === undefined ? {} : { size: tip.size }),
    },
    h,
  )

const bodyFor = (
  fixture: InfoTipFixture,
  model: InfoTipPreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const inline = 'flex items-center gap-1.5'
  switch (fixture.kind) {
    case 'sizes':
      return h.div(
        [h.Class('flex flex-wrap items-center gap-4')],
        fixture.tips.map(tip => tipView(tip, model, h)),
      )
    case 'label':
      return h.div(
        [h.Class(inline)],
        [
          h.span([h.Class('text-sm')], ['Active sessions']),
          tipView(fixture.tips[0]!, model, h),
        ],
      )
    case 'context':
      return h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          h.div(
            [h.Class(inline)],
            [
              h.label([h.Class('text-sm font-medium')], ['Access level']),
              tipView(fixture.tips[0]!, model, h),
            ],
          ),
          input(
            {
              id: 'access-level',
              value: '',
              placeholder: 'Editor',
              class: 'w-56',
            },
            h,
          ),
        ],
      )
    case 'basic':
    default:
      return h.div(
        [h.Class(inline)],
        [
          h.span([h.Class('text-sm')], ['Access level']),
          tipView(fixture.tips[0]!, model, h),
        ],
      )
  }
}

export const infoTipTailwindPreviewProgram = definePreviewProgram<
  InfoTipPreviewModel,
  PreviewMessage
>({
  Model: InfoTipPreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = infoTipFixtures[index] ?? infoTipFixtures[0]
    return {
      _docsPage: 'info-tip',
      tips: Object.fromEntries(
        fixture.tips.map(tip => [
          tip.id,
          InfoTip.init({ id: tip.id, showDelay: 400, closeDelay: 100 }),
        ]),
      ),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDocsInfoTipMessage': {
        const current = model.tips[message.id]
        if (current === undefined) {
          return { model }
        }
        const infoTipResult = InfoTip.update(current, message.message)
        return {
          model: {
            ...model,
            tips: { ...model.tips, [message.id]: infoTipResult.model },
          },
          commands: Command.mapMessages(infoTipResult.commands ?? [], next =>
            GotInfoTipMessage({ id: message.id, message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    bodyFor(infoTipFixtures[index] ?? infoTipFixtures[0], model, h),
})
