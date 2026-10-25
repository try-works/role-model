import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type VisuallyHiddenFixture,
  vhActions,
  vhItems,
  visuallyHiddenFixtures,
  vhStats,
} from '@/docs/components/pages/visually-hidden/shared'
import { icon } from '@/lib/icon'
import { className } from '@/stylex/style'
import * as Badge from '@/stylex/badge'
import * as Button from '@/stylex/button'
import * as Stack from '@/stylex/stack'
import * as VisuallyHidden from '@/stylex/visually-hidden'

const styles = stylex.create({
  supporting: {
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  body: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  bodyBold: { fontSize: '0.875rem', fontWeight: 700, lineHeight: '1.25rem' },
  display: { fontSize: '1.8125rem', fontWeight: 400, lineHeight: '1.2414' },
  smallIcon: {
    color: 'var(--muted-foreground)',
    height: '1rem',
    width: '1rem',
  },
  upIcon: {
    color: 'var(--accent-foreground)',
    height: '1rem',
    width: '1rem',
  },
  mutedCard: {
    borderColor: 'rgba(0, 0, 0, 0)',
    borderRadius: '0.875rem',
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '1rem',
    overflow: 'hidden',
    paddingBlock: '1rem',
    backgroundColor: 'var(--muted)',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  mutedCardContent: {
    gap: '0.75rem',
    paddingInline: '1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  iconBtn4: { flexShrink: 0, height: '1rem', width: '1rem' },
})

const COLUMNS = ['Backlog', 'In progress', 'Done'] as const

type PreviewModel = Readonly<{
  column: number
}>

const supporting = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.supporting))], [text])
const body = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.body))], [text])
const display = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.p([h.Class(className(reset.text, styles.display))], [text])

const mutedCard = <Msg>(
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.mutedCard))],
    [h.div([h.Class(className(styles.mutedCardContent))], [...children])],
  )

const showcaseView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 5,
      hAlign: 'center',
      children: [
        Stack.hStack(
          {
            gap: 6,
            vAlign: 'stretch',
            wrap: 'wrap',
            hAlign: 'center',
            children: [
              mutedCard(
                [
                  Stack.vStack(
                    {
                      gap: 4,
                      hAlign: 'center',
                      children: [
                        supporting('What you see', h),
                        Stack.hStack(
                          {
                            gap: 2,
                            children: vhActions.map(action =>
                              Button.button(
                                {
                                  variant: 'ghost',
                                  size: 'icon',
                                  ariaLabel: action.label,
                                  children: [
                                    icon(
                                      action.icon,
                                      { class: className(styles.iconBtn4) },
                                      h,
                                    ),
                                  ],
                                },
                                h,
                              ),
                            ),
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
                h,
              ),
              mutedCard(
                [
                  Stack.vStack(
                    {
                      gap: 4,
                      hAlign: 'start',
                      children: [
                        Stack.hStack(
                          {
                            gap: 2,
                            vAlign: 'center',
                            children: [
                              icon(
                                'volume-2',
                                { class: className(styles.smallIcon) },
                                h,
                              ),
                              supporting('What a screen reader hears', h),
                            ],
                          },
                          h,
                        ),
                        Stack.vStack(
                          {
                            gap: 2,
                            children: vhActions.map(action =>
                              body(`${action.label}, button`, h),
                            ),
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
                h,
              ),
            ],
          },
          h,
        ),
        VisuallyHidden.visuallyHidden(
          {
            as: 'div',
            ariaLive: 'polite',
            children: ['Actions available: Download, Share, Delete.'],
          },
          h,
        ),
      ],
    },
    h,
  )

const liveRegionView = <Msg>(
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const current = COLUMNS[model.column] ?? COLUMNS[0]
  return Stack.vStack(
    {
      gap: 4,
      hAlign: 'start',
      children: [
        supporting(
          'Drag-and-drop and other visual-only changes are silent to screen readers. A live region narrates them.',
          h,
        ),
        Stack.hStack(
          {
            gap: 3,
            vAlign: 'center',
            children: [
              Button.button(
                {
                  variant: 'secondary',
                  children: ['Move task'],
                  onClick: onMessageJson(JSON.stringify({ _tag: 'MovedTask' })),
                },
                h,
              ),
              h.p(
                [h.Class(className(reset.text, styles.body))],
                [
                  'Task is in ',
                  h.span([h.Class(className(styles.bodyBold))], [current]),
                ],
              ),
            ],
          },
          h,
        ),
        VisuallyHidden.visuallyHidden(
          {
            as: 'div',
            ariaLive: 'polite',
            children: [`Task moved to ${current}`],
          },
          h,
        ),
      ],
    },
    h,
  )
}

const headingView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.vStack(
    {
      gap: 3,
      hAlign: 'start',
      children: [
        supporting(
          'The layout makes this group obvious to sighted users. A hidden heading gives screen-reader users the same landmark to jump to.',
          h,
        ),
        VisuallyHidden.visuallyHidden(
          { as: 'h2', children: ['Build status'] },
          h,
        ),
        Stack.vStack(
          {
            gap: 2,
            children: vhItems.map(item =>
              mutedCard(
                [
                  Stack.hStack(
                    {
                      gap: 3,
                      vAlign: 'center',
                      children: [
                        body(item.name, h),
                        Badge.badge(
                          {
                            variant:
                              item.variant === 'error'
                                ? 'destructive'
                                : 'secondary',
                            children: [item.status],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
                h,
              ),
            ),
          },
          h,
        ),
      ],
    },
    h,
  )

const supplementaryView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Stack.hStack(
    {
      gap: 4,
      wrap: 'wrap',
      children: vhStats.map(stat =>
        mutedCard(
          [
            Stack.vStack(
              {
                gap: 1,
                children: [
                  supporting(stat.label, h),
                  display(stat.value, h),
                  Stack.hStack(
                    {
                      gap: 1,
                      vAlign: 'center',
                      children: [
                        icon(
                          stat.direction === 'up' ? 'arrow-up' : 'arrow-down',
                          {
                            class: className(
                              stat.direction === 'up'
                                ? styles.upIcon
                                : styles.smallIcon,
                            ),
                          },
                          h,
                        ),
                        body(stat.delta, h),
                        VisuallyHidden.visuallyHidden(
                          {
                            children: [
                              stat.direction === 'up'
                                ? ' increase'
                                : ' decrease',
                              ' from last month',
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
          ],
          h,
        ),
      ),
    },
    h,
  )

const viewFor = <Msg>(
  fixture: VisuallyHiddenFixture,
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return showcaseView(h)
    case 'liveRegion':
      return liveRegionView(model, onMessageJson, h)
    case 'heading':
      return headingView(h)
    case 'supplementary':
      return supplementaryView(h)
  }
}

export const visuallyHiddenStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  viewFor(
    visuallyHiddenFixtures[exampleIndex] ?? visuallyHiddenFixtures[0],
    model as PreviewModel,
    onMessageJson,
    h,
  )
