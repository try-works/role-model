import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  toggleFixtures,
  type ToggleItem,
} from '@/docs/components/pages/toggle/shared'
import { taggedStruct } from 'foldkit/schema'
import * as Icon from '@/lib/icon'
import * as Toggle from '@/ui/toggle'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('toggle'),
  states: S.Record(S.String, S.Boolean),
})
type PreviewModel = typeof PreviewModel.Type

const ToggledPreview = taggedStruct('ToggledTogglePreview', {
  id: S.String,
})
type PreviewMessage = typeof ToggledPreview.Type
const PreviewMessage = S.Union([ToggledPreview])

const itemToggle = (
  item: ToggleItem,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Toggle.toggle(
    {
      isPressed: model.states[item.key] ?? false,
      onToggle: ToggledPreview({ id: item.key }),
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ariaLabel: item.ariaLabel,
      ...(item.isDisabled === true ? { isDisabled: true } : {}),
      ...(item.direction === undefined ? {} : { direction: item.direction }),
      children:
        item.icon === undefined
          ? [item.label]
          : [Icon.icon(item.icon, {}, h), item.label],
    },
    h,
  )

export const toggleTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = toggleFixtures[index] ?? toggleFixtures[0]
    return {
      _docsPage: 'toggle',
      states: Object.fromEntries(fixture.items.map(item => [item.key, false])),
    }
  },
  update: (model, message): Update.Return<PreviewModel, PreviewMessage> => {
    switch (message._tag) {
      case 'ToggledTogglePreview':
        return {
          model: {
            ...model,
            states: {
              ...model.states,
              [message.id]: !(model.states[message.id] ?? false),
            },
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = toggleFixtures[index] ?? toggleFixtures[0]
    const toggles = fixture.items.map(item => itemToggle(item, model, h))
    if (fixture.kind === 'single') {
      return toggles[0] ?? h.div([], [])
    }
    return h.div([h.Class('flex flex-wrap items-center gap-2')], toggles)
  },
})
