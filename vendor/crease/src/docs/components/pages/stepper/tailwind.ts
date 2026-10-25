import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  stepperFixtures,
  type StepperFixturePanel,
  type StepperFixtureStep,
} from '@/docs/components/pages/stepper/shared'
import * as Icon from '@/lib/icon'
import { alert, alertDescription, alertTitle } from '@/ui/alert'
import { badge } from '@/ui/badge'
import { button } from '@/ui/button'
import { card, cardContent } from '@/ui/card'
import { input } from '@/ui/input'
import * as Stepper from '@/ui/stepper'

const GotStepperPreviewMessage = defineMessageUnion({
  GotStepperPreviewMessage: {
    message: Stepper.Message,
  },
})
type PreviewMessage = typeof GotStepperPreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('stepper'),
  controls: S.Array(Stepper.Model),
  activeStep: S.Number,
})
type PreviewModel = typeof PreviewModel.Type

const toParent = (message: Stepper.Message): PreviewMessage =>
  GotStepperPreviewMessage.GotStepperPreviewMessage({ message })

const contentFor = (
  kind: NonNullable<StepperFixtureStep['content']>,
  h: HtmlBuilder<PreviewMessage>,
): Html | ReadonlyArray<Html | string> => {
  switch (kind) {
    case 'form':
      return h.div(
        [h.Class('flex flex-col gap-3')],
        [
          h.div(
            [h.Class('flex gap-3')],
            [
              input<PreviewMessage>(
                {
                  id: 'project-name',
                  label: 'Project name',
                  placeholder: 'My awesome project',
                  value: '',
                  class: 'w-full',
                },
                h,
              ),
              input<PreviewMessage>(
                {
                  id: 'repo-url',
                  label: 'Repository URL',
                  placeholder: 'https://github.com/...',
                  value: '',
                  class: 'w-full',
                },
                h,
              ),
            ],
          ),
          h.div(
            [],
            [
              button<PreviewMessage>(
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
        [h.Class('flex flex-col gap-3')],
        [
          reviewCard(h),
          h.div(
            [h.Class('flex gap-2')],
            [
              button<PreviewMessage>(
                {
                  variant: 'secondary',
                  onClick: toParent(Stepper.Message.ClickedStep({ step: 0 })),
                  children: ['Back'],
                },
                h,
              ),
              button<PreviewMessage>(
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
        [h.Class('flex flex-col gap-3')],
        [
          alert<PreviewMessage>(
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
            [h.Class('flex gap-2')],
            [
              button<PreviewMessage>(
                {
                  variant: 'secondary',
                  onClick: toParent(Stepper.Message.ClickedStep({ step: 1 })),
                  children: ['Back'],
                },
                h,
              ),
              button<PreviewMessage>(
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

const reviewCard = (h: HtmlBuilder<PreviewMessage>): Html =>
  card<PreviewMessage>(
    {
      size: 'sm',
      children: [
        cardContent(
          {
            children: [
              h.div(
                [h.Class('flex flex-col gap-2')],
                [
                  h.div(
                    [h.Class('flex items-center gap-2')],
                    [
                      h.span(
                        [h.Class('text-sm font-medium')],
                        ['Foldkit + Vite'],
                      ),
                      badge<PreviewMessage>(
                        { variant: 'secondary', children: ['Detected'] },
                        h,
                      ),
                    ],
                  ),
                  h.p(
                    [h.Class('text-muted-foreground text-xs')],
                    [
                      'Build command ',
                      h.code([], ['vite build']),
                      ' · Output ',
                      h.code([], ['dist']),
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
  )

const stepConfig = (
  step: StepperFixtureStep,
  h: HtmlBuilder<PreviewMessage>,
): Stepper.StepperStep<PreviewMessage> => ({
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
    ? { content: contentFor(step.content, h) }
    : {}),
})

const panelNode = (
  panel: StepperFixturePanel,
  panelIndex: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  Stepper.stepper<PreviewMessage>(
    {
      model:
        model.controls[panelIndex] ??
        Stepper.init({
          id: `panel-${panelIndex}`,
          activeStep: model.activeStep,
        }),
      toParentMessage: toParent,
      activeStep: model.activeStep,
      steps: panel.steps.map(step => stepConfig(step, h)),
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

export const stepperTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: GotStepperPreviewMessage,
  init: index => {
    const fixture = stepperFixtures[index] ?? stepperFixtures[0]
    return {
      _docsPage: 'stepper',
      controls: fixture.panels.map((panel, panelIndex) =>
        Stepper.init({
          id: `docs-stepper-${panel.id ?? panelIndex}`,
          activeStep: fixture.activeStep,
        }),
      ),
      activeStep: fixture.activeStep,
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotStepperPreviewMessage': {
        const results = model.controls.map(control =>
          Stepper.update(control, message.message),
        )
        const selection = results
          .map(result => result.outMessage)
          .find(out => out !== undefined)
        return {
          model: {
            ...model,
            controls: results.map(result => result.model),
            ...(selection !== undefined && selection._tag === 'ClickedStep'
              ? { activeStep: selection.step }
              : {}),
          },
          commands: results.flatMap(result =>
            Command.mapMessages(result.commands ?? [], toParent),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = stepperFixtures[index] ?? stepperFixtures[0]
    const panels = fixture.panels.map((panel, panelIndex) =>
      panel.heading === undefined
        ? panelNode(panel, panelIndex, model, h)
        : h.div(
            [h.Class('w-55')],
            [
              h.p([h.Class('mb-2 text-sm font-medium')], [panel.heading]),
              panelNode(panel, panelIndex, model, h),
            ],
          ),
    )
    const inner: Html =
      fixture.panels.length > 1
        ? h.div([h.Class('flex flex-wrap gap-12')], panels)
        : (panels[0] ?? h.empty)
    return fixture.width === undefined
      ? inner
      : h.div([h.Class(`w-[${fixture.width}px]`)], [inner])
  },
})
