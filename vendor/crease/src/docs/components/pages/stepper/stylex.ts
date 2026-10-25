import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  stepperFixtures,
  type StepperFixturePanel,
  type StepperFixtureStep,
} from '@/docs/components/pages/stepper/shared'
import * as Icon from '@/lib/icon'
import * as Stepper from '@/stylex/stepper'
import { alert, alertDescription, alertTitle } from '@/stylex/alert'
import { badge } from '@/stylex/badge'
import { button } from '@/stylex/button'
import { card, cardContent } from '@/stylex/card'
import { input } from '@/stylex/input'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'

const styles = stylex.create({
  frame400: { width: '400px' },
  panelRow: { gap: '3rem', display: 'flex', flexWrap: 'wrap' },
  panel: { width: '220px' },
  panelHeading: {
    marginInline: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    marginBlockEnd: '0.5rem',
    marginBlockStart: 0,
  },
  column: { gap: '0.75rem', display: 'flex', flexDirection: 'column' },
  row: { gap: '0.75rem', display: 'flex' },
  rowSm: { gap: '0.5rem', display: 'flex' },
  fullWidth: { width: '100%' },
  cardStack: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  cardTitleRow: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
  cardLabel: { fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.25rem' },
  cardMeta: {
    margin: 0,
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
})

interface PreviewShape {
  readonly controls: ReadonlyArray<Stepper.Model>
  readonly activeStep: number
}

const contentFor = <Msg>(
  kind: NonNullable<StepperFixtureStep['content']>,
  toParent: (message: Stepper.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (kind) {
    case 'form':
      return h.div(
        [h.Class(className(styles.column))],
        [
          h.div(
            [h.Class(className(styles.row))],
            [
              input<Msg>(
                {
                  id: 'project-name',
                  label: 'Project name',
                  placeholder: 'My awesome project',
                  value: '',
                  layoutStyle: styles.fullWidth,
                },
                h,
              ),
              input<Msg>(
                {
                  id: 'repo-url',
                  label: 'Repository URL',
                  placeholder: 'https://github.com/...',
                  value: '',
                  layoutStyle: styles.fullWidth,
                },
                h,
              ),
            ],
          ),
          h.div(
            [],
            [
              button<Msg>(
                {
                  variant: 'default',
                  onClick: toParent(Stepper.Message.ClickedStep({ step: 1 })),
                  children: ['Continue'],
                },
                h,
              ),
            ],
          ),
        ],
      )
    case 'review':
      return h.div(
        [h.Class(className(styles.column))],
        [
          card<Msg>(
            {
              size: 'sm',
              children: [
                cardContent(
                  {
                    children: [
                      h.div(
                        [h.Class(className(styles.cardStack))],
                        [
                          h.div(
                            [h.Class(className(styles.cardTitleRow))],
                            [
                              h.span(
                                [h.Class(className(styles.cardLabel))],
                                ['Foldkit + Vite'],
                              ),
                              badge<Msg>(
                                {
                                  variant: 'secondary',
                                  children: ['Detected'],
                                },
                                h,
                              ),
                            ],
                          ),
                          h.p(
                            [h.Class(className(reset.text, styles.cardMeta))],
                            [
                              'Build command ',
                              h.code(
                                [h.Class(className(reset.code))],
                                ['vite build'],
                              ),
                              ' · Output ',
                              h.code(
                                [h.Class(className(reset.code))],
                                ['dist'],
                              ),
                              ' · Node 22',
                            ],
                          ),
                        ],
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          h.div(
            [h.Class(className(styles.rowSm))],
            [
              button<Msg>(
                {
                  variant: 'secondary',
                  onClick: toParent(Stepper.Message.ClickedStep({ step: 0 })),
                  children: ['Back'],
                },
                h,
              ),
              button<Msg>(
                {
                  variant: 'default',
                  onClick: toParent(Stepper.Message.ClickedStep({ step: 2 })),
                  children: ['Looks right'],
                },
                h,
              ),
            ],
          ),
        ],
      )
    case 'deploy':
      return h.div(
        [h.Class(className(styles.column))],
        [
          alert<Msg>(
            {
              announcement: 'static',
              children: [
                alertTitle(
                  { children: ['First deploy takes a few minutes'] },
                  h,
                ),
                alertDescription(
                  {
                    children: [
                      'Later deploys reuse the build cache and finish in under a minute.',
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          h.div(
            [h.Class(className(styles.rowSm))],
            [
              button<Msg>(
                {
                  variant: 'secondary',
                  onClick: toParent(Stepper.Message.ClickedStep({ step: 1 })),
                  children: ['Back'],
                },
                h,
              ),
              button<Msg>(
                {
                  variant: 'default',
                  onClick: toParent(Stepper.Message.ClickedStep({ step: 3 })),
                  children: ['Deploy now'],
                },
                h,
              ),
            ],
          ),
        ],
      )
  }
}

const stepConfig = <Msg>(
  step: StepperFixtureStep,
  toParent: (message: Stepper.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Stepper.StepperStep<Msg> => ({
  label: step.label,
  ...(step.description !== undefined ? { description: step.description } : {}),
  ...(step.status !== undefined ? { status: step.status } : {}),
  ...(step.isOptional === true ? { isOptional: true } : {}),
  ...(step.indicator === 'icon'
    ? { indicator: Icon.icon(step.icon ?? 'info', {}, h) }
    : step.indicator !== undefined && step.indicator !== 'auto'
      ? { indicator: step.indicator }
      : {}),
  ...(step.content !== undefined
    ? { content: contentFor(step.content, toParent, h) }
    : {}),
})

const panelNode = <Msg>(
  panel: StepperFixturePanel,
  panelIndex: number,
  model: PreviewShape,
  toParent: (message: Stepper.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Stepper.stepper<Msg>(
    {
      model:
        model.controls[panelIndex] ??
        Stepper.init({
          id: `panel-${panelIndex}`,
          activeStep: model.activeStep,
        }),
      toParentMessage: toParent,
      activeStep: model.activeStep,
      steps: panel.steps.map(step => stepConfig(step, toParent, h)),
      hasStepButtons: true,
      ...(panel.orientation !== undefined
        ? { orientation: panel.orientation }
        : {}),
      ...(panel.indicatorPosition !== undefined
        ? { indicatorPosition: panel.indicatorPosition }
        : {}),
      ...(panel.minimumStepWidth !== undefined
        ? { minimumStepWidth: panel.minimumStepWidth }
        : {}),
      ...(panel.collapsedVariant !== undefined
        ? { collapsedVariant: panel.collapsedVariant }
        : {}),
    },
    h,
  )

export const stepperStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const preview = model as PreviewShape
  const fixture = stepperFixtures[exampleIndex] ?? stepperFixtures[0]
  const toParent = (message: Stepper.Message): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'GotStepperPreviewMessage', message }))
  const panels = fixture.panels.map((panel, panelIndex) =>
    panel.heading === undefined
      ? panelNode(panel, panelIndex, preview, toParent, h)
      : h.div(
          [h.Class(className(styles.panel))],
          [
            h.p(
              [h.Class(className(reset.text, styles.panelHeading))],
              [panel.heading],
            ),
            panelNode(panel, panelIndex, preview, toParent, h),
          ],
        ),
  )
  const inner: Html =
    fixture.panels.length > 1
      ? h.div([h.Class(className(styles.panelRow))], panels)
      : (panels[0] ?? h.empty)
  return fixture.width === undefined
    ? inner
    : h.div(
        [h.Class(fixture.width === 400 ? className(styles.frame400) : '')],
        [inner],
      )
}
