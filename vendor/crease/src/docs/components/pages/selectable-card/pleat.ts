import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  selectableCardElevatedPlans,
  selectableCardFixtures,
  selectableCardPlans,
  selectableCardTags,
  type SelectableCardFixture,
  type SelectablePlan,
} from '@/docs/components/pages/selectable-card/shared'
import { className } from '@/pleat/style'
import * as SelectableCard from '@/pleat/selectable-card'

const styles = {
  row: Style.make({ gap: '0.75rem', display: 'flex' }),
  grid2: Style.make({
    gap: '0.75rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    width: '26.25rem',
  }),
  grid3: Style.make({
    gap: '0.5rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    width: '25rem',
  }),
  stack1: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  heading: Style.make({
    fontSize: '1.25rem',
    fontWeight: 600,
    letterSpacing: '-0.025em',
    lineHeight: '1.75rem',
  }),
  price: Style.make({
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: '1.75rem',
  }),
  bodyBold: Style.make({
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: '1.25rem',
  }),
  supporting: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
}

type Preview = Readonly<{
  selected: string
  multi: ReadonlyArray<string>
}>

const planBody = <Msg>(plan: SelectablePlan, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.stack1))],
    [
      h.h4([h.Class(className(reset.text, styles.heading))], [plan.name]),
      h.p([h.Class(className(reset.text, styles.price))], [plan.price ?? '']),
      h.p(
        [h.Class(className(reset.text, styles.supporting))],
        [plan.desc ?? ''],
      ),
    ],
  )

const view = <Msg>(
  fixture: SelectableCardFixture,
  preview: Preview,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'plans':
      return h.div(
        [h.Class(className(styles.row))],
        selectableCardPlans.map(plan =>
          SelectableCard.selectableCard(
            {
              label: plan.name,
              isSelected: preview.selected === plan.id,
              onChange: onMessageJson(
                JSON.stringify({ _tag: 'SelectedPlan', value: plan.id }),
              ),
              width: '11.25rem',
              children: [planBody(plan, h)],
            },
            h,
          ),
        ),
      )
    case 'elevated':
      return h.div(
        [h.Class(className(styles.grid2))],
        selectableCardElevatedPlans.map(plan =>
          SelectableCard.selectableCard(
            {
              label: plan.name,
              isSelected: preview.selected === plan.id,
              onChange: onMessageJson(
                JSON.stringify({ _tag: 'SelectedPlan', value: plan.id }),
              ),
              elevation: 'low',
              children: [
                h.p(
                  [h.Class(className(reset.text, styles.bodyBold))],
                  [plan.name],
                ),
                h.p(
                  [h.Class(className(reset.text, styles.supporting))],
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
        [h.Class(className(styles.grid3))],
        selectableCardTags.map(tag =>
          SelectableCard.selectableCard(
            {
              label: tag.name,
              isSelected: preview.multi.includes(tag.id),
              onChange: onMessageJson(
                JSON.stringify({ _tag: 'ToggledTag', tag: tag.id }),
              ),
              variant: tag.variant,
              children: [
                h.p(
                  [h.Class(className(reset.text, styles.bodyBold))],
                  [tag.name],
                ),
              ],
            },
            h,
          ),
        ),
      )
  }
}

export const selectableCardPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = selectableCardFixtures[exampleIndex]
  if (fixture === undefined) return undefined
  return view(fixture, model as Preview, onMessageJson, h)
}
