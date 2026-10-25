import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  selectableCardElevatedPlans,
  selectableCardFixtures,
  selectableCardPlans,
  selectableCardTags,
  type SelectableCardFixture,
  type SelectablePlan,
} from '@/docs/components/pages/selectable-card/shared'
import * as SelectableCard from '@/ui/selectable-card'

const SelectableCardPreviewMessage = defineMessageUnion({
  SelectedPlan: { value: S.String },
  ToggledTag: { tag: S.String },
})
type SelectableCardPreviewMessage = typeof SelectableCardPreviewMessage.Type
const SelectableCardPreviewModel = S.Struct({
  _docsPage: S.Literal('selectable-card'),
  selected: S.String,
  multi: S.Array(S.String),
})
type SelectableCardPreviewModel = typeof SelectableCardPreviewModel.Type

const planBody = <Msg>(plan: SelectablePlan, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class('flex flex-col gap-1')],
    [
      h.h4(
        [h.Class('scroll-m-20 text-xl font-semibold tracking-tight')],
        [plan.name],
      ),
      h.p([h.Class('text-lg font-semibold')], [plan.price ?? '']),
      h.p([h.Class('text-xs text-muted-foreground')], [plan.desc ?? '']),
    ],
  )

const view = (
  fixture: SelectableCardFixture,
  model: SelectableCardPreviewModel,
  h: HtmlBuilder<SelectableCardPreviewMessage>,
): Html => {
  switch (fixture.kind) {
    case 'plans':
      return h.div(
        [h.Class('flex gap-3')],
        selectableCardPlans.map(plan =>
          SelectableCard.selectableCard(
            {
              label: plan.name,
              isSelected: model.selected === plan.id,
              onChange: SelectableCardPreviewMessage.SelectedPlan({
                value: plan.id,
              }),
              width: '11.25rem',
              children: [planBody(plan, h)],
            },
            h,
          ),
        ),
      )
    case 'elevated':
      return h.div(
        [h.Class('grid grid-cols-2 gap-3 w-[26.25rem]')],
        selectableCardElevatedPlans.map(plan =>
          SelectableCard.selectableCard(
            {
              label: plan.name,
              isSelected: model.selected === plan.id,
              onChange: SelectableCardPreviewMessage.SelectedPlan({
                value: plan.id,
              }),
              elevation: 'low',
              children: [
                h.p([h.Class('text-sm font-bold')], [plan.name]),
                h.p(
                  [h.Class('text-xs text-muted-foreground')],
                  [
                    'The resting shadow stays put — the selection ring layers on top.',
                  ],
                ),
              ],
            },
            h,
          ),
        ),
      )
    case 'multi':
      return h.div(
        [h.Class('grid grid-cols-3 gap-2 w-[25rem]')],
        selectableCardTags.map(tag =>
          SelectableCard.selectableCard(
            {
              label: tag.name,
              isSelected: model.multi.includes(tag.id),
              onChange: SelectableCardPreviewMessage.ToggledTag({
                tag: tag.id,
              }),
              variant: tag.variant,
              children: [h.p([h.Class('text-sm font-bold')], [tag.name])],
            },
            h,
          ),
        ),
      )
  }
}

export const selectableCardTailwindPreviewProgram = definePreviewProgram<
  SelectableCardPreviewModel,
  SelectableCardPreviewMessage
>({
  Model: SelectableCardPreviewModel,
  Message: SelectableCardPreviewMessage,
  init: index => {
    const fixture = selectableCardFixtures[index] ?? selectableCardFixtures[0]
    return {
      _docsPage: 'selectable-card',
      selected: fixture.initialSelected[0] ?? '',
      multi: fixture.kind === 'multi' ? fixture.initialSelected : [],
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'SelectedPlan':
        return { model: { ...model, selected: message.value } }
      case 'ToggledTag':
        return {
          model: {
            ...model,
            multi: model.multi.includes(message.tag)
              ? model.multi.filter(tag => tag !== message.tag)
              : [...model.multi, message.tag],
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = selectableCardFixtures[index] ?? selectableCardFixtures[0]
    return view(fixture, model, h)
  },
})
