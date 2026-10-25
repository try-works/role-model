import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type StepperFixtureStep = Readonly<{
  label: string
  description?: string
  status?: 'accent' | 'success' | 'warning' | 'error'
  isOptional?: boolean
  indicator?: 'number' | 'auto' | 'none' | 'icon'
  icon?: string
  content?: 'form' | 'review' | 'deploy'
}>

export type StepperFixturePanel = Readonly<{
  id: string
  heading?: string
  orientation?: 'horizontal' | 'vertical'
  indicatorPosition?: 'separated' | 'on-track'
  minimumStepWidth?: number
  collapsedVariant?: 'withLabelAndControls'
  steps: ReadonlyArray<StepperFixtureStep>
}>

export type StepperFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  width?: number
  activeStep: number
  panels: ReadonlyArray<StepperFixturePanel>
}>

const checkoutSteps: ReadonlyArray<StepperFixtureStep> = [
  { label: 'Cart' },
  { label: 'Shipping' },
  { label: 'Payment' },
  { label: 'Review' },
  { label: 'Confirm' },
]

const indicatorModeSteps = (
  indicator: StepperFixtureStep['indicator'],
  icons?: ReadonlyArray<string>,
): ReadonlyArray<StepperFixtureStep> =>
  ['Account', 'Profile', 'Settings', 'Review'].map((label, index) => ({
    label,
    ...(indicator === 'auto' || indicator === undefined
      ? {}
      : indicator === 'icon'
        ? { indicator: 'icon' as const, icon: icons?.[index] ?? 'info' }
        : { indicator }),
  }))

export const stepperFixtures: Readonly<
  [StepperFixture, ...Array<StepperFixture>]
> = [
  {
    title: 'Stepper — Checkout Progress',
    heroOnly: true,
    width: 640,
    activeStep: 2,
    panels: [
      {
        id: 'checkout',
        orientation: 'horizontal',
        steps: checkoutSteps,
      },
    ],
  },
  {
    title: 'Stepper — Indicator Modes',
    description:
      'The indicator prop side by side: none (the bar and label carry the progress on their own), auto (check when done, ring when current, number ahead), always-number, and a custom icon per step.',
    activeStep: 2,
    panels: [
      {
        id: 'none',
        heading: 'None',
        orientation: 'vertical',
        steps: indicatorModeSteps('none'),
      },
      {
        id: 'auto',
        heading: 'Auto',
        orientation: 'vertical',
        steps: indicatorModeSteps('auto'),
      },
      {
        id: 'number',
        heading: 'Number',
        orientation: 'vertical',
        steps: indicatorModeSteps('number'),
      },
      {
        id: 'custom',
        heading: 'Custom icon',
        orientation: 'vertical',
        steps: indicatorModeSteps('icon', [
          'info',
          'search',
          'wrench',
          'check',
        ]),
      },
    ],
  },
  {
    title: 'Stepper — On-Track Horizontal',
    description:
      'The on-track layout in horizontal orientation: instead of sitting beside the label, each indicator is slotted into the connector itself, so the numbered nodes read as beads on one continuous line. Labels center under their node.',
    width: 560,
    activeStep: 2,
    panels: [
      {
        id: 'on-track-h',
        orientation: 'horizontal',
        indicatorPosition: 'on-track',
        steps: [
          { label: 'Workspace', indicator: 'number' },
          { label: 'Team', indicator: 'number' },
          { label: 'Integrations', indicator: 'number' },
          { label: 'Import', indicator: 'number' },
          { label: 'Launch', indicator: 'number' },
        ],
      },
    ],
  },
  {
    title: 'Stepper — On-Track Vertical',
    description:
      'The on-track layout in vertical orientation: indicators sit inline on a continuous connector rail, with each label and description beside its node.',
    width: 400,
    activeStep: 2,
    panels: [
      {
        id: 'on-track-v',
        orientation: 'vertical',
        indicatorPosition: 'on-track',
        steps: [
          {
            label: 'Create workspace',
            description: 'Name and configure your workspace',
          },
          {
            label: 'Invite team members',
            description: 'Add collaborators by email',
          },
          {
            label: 'Set up integrations',
            description: 'Connect Slack, GitHub, Jira',
          },
          { label: 'Import data', description: 'Bring in existing projects' },
          { label: 'Launch', description: 'Go live with your team' },
        ],
      },
    ],
  },
  {
    title: 'Stepper — Validation Status',
    description:
      'Semantic status per step in a verification flow: success shows a green check, error a red glyph, accent the in-progress step. Status sets the indicator color and glyph only, never the connector, and is announced to assistive tech as text.',
    width: 400,
    activeStep: 3,
    panels: [
      {
        id: 'status',
        orientation: 'vertical',
        steps: [
          {
            label: 'Email verified',
            description: 'you@example.com',
            status: 'success',
          },
          {
            label: 'Phone verified',
            description: '+1 (555) 012-3456',
            status: 'success',
          },
          {
            label: 'Identity document',
            description: 'Passport upload failed',
            status: 'error',
          },
          {
            label: 'Address verification',
            description: 'Pending review',
            status: 'accent',
          },
          {
            label: 'Background check',
            description: 'Skipped',
            isOptional: true,
          },
          { label: 'Account activated' },
        ],
      },
    ],
  },
  {
    title: 'Stepper — Horizontal Narrow Collapsed',
    description:
      'A narrow horizontal stepper using minimumStepWidth. At 320px wide, four steps fall below the 112px minimum and collapse into a current-step summary with Previous and Next controls.',
    width: 320,
    activeStep: 1,
    panels: [
      {
        id: 'collapsed',
        orientation: 'horizontal',
        minimumStepWidth: 112,
        collapsedVariant: 'withLabelAndControls',
        steps: [
          { label: 'Cart' },
          { label: 'Shipping', description: 'Where it goes' },
          { label: 'Delivery' },
          { label: 'Payment' },
        ],
      },
    ],
  },
  {
    title: 'Stepper — Custom Content',
    description:
      'A vertical stepper where each step owns a slice of the page. The content slot takes any node (form fields, a summary panel, a banner), so a stepper is not limited to multi-step forms.',
    width: 680,
    activeStep: 0,
    panels: [
      {
        id: 'custom-content',
        orientation: 'vertical',
        steps: [
          {
            label: 'Project details',
            description: 'Name it and point us at the source',
            indicator: 'number',
            content: 'form',
          },
          {
            label: 'Review the build',
            description: 'What we detected from your default branch',
            indicator: 'number',
            content: 'review',
          },
          {
            label: 'Deploy',
            description: 'Ships to production',
            indicator: 'number',
            content: 'deploy',
          },
          { label: 'Live', indicator: 'number' },
        ],
      },
    ],
  },
]

const stepEmit = (step: StepperFixtureStep): string => `        {
          label: '${step.label}',${
            step.description !== undefined
              ? `
          description: '${step.description}',`
              : ''
          }${
            step.status !== undefined
              ? `
          status: '${step.status}',`
              : ''
          }${
            step.isOptional === true
              ? `
          isOptional: true,`
              : ''
          }${
            step.indicator !== undefined &&
            step.indicator !== 'auto' &&
            step.indicator !== 'icon'
              ? `
          indicator: '${step.indicator}',`
              : ''
          }${
            step.indicator === 'icon'
              ? `
          indicator: Icon.icon('${step.icon ?? 'info'}', {}, h),`
              : ''
          }
        }`

const panelEmit = (
  panel: StepperFixturePanel,
  index: number,
): string => `      Stepper.stepper({
        model: model.controls[${index}]!,
        toParentMessage: message => GotStepperMessage({ message }),
        activeStep: model.activeStep,
        steps: [
${panel.steps.map(stepEmit).join(',\n')},
        ],${
          panel.orientation === 'vertical'
            ? `
        orientation: 'vertical',`
            : ''
        }${
          panel.indicatorPosition === 'on-track'
            ? `
        indicatorPosition: 'on-track',`
            : ''
        }${
          panel.minimumStepWidth !== undefined
            ? `
        minimumStepWidth: ${panel.minimumStepWidth},`
            : ''
        }${
          panel.collapsedVariant !== undefined
            ? `
        collapsedVariant: '${panel.collapsedVariant}',`
            : ''
        }
        hasStepButtons: true,
      }, h)`

const emitSource = (fixture: StepperFixture, isStyleX: boolean): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const lib = isStyleX ? 'stylex' : 'ui'
  const usesIcon = fixture.panels.some(panel =>
    panel.steps.some(step => step.indicator === 'icon'),
  )
  const panelCount = fixture.panels.length
  const panelCalls = fixture.panels
    .map((panel, index) => {
      const call = panelEmit(panel, index)
      return panel.heading !== undefined
        ? `      h.div([h.Class(${isStyleX ? 'className(styles.panel)' : `'w-[220px]'`})], [
        h.p([h.Class(${isStyleX ? 'className(styles.panelHeading)' : `'text-sm font-medium'`})], ['${panel.heading}']),
${call},
      ])`
        : call
    })
    .join(',\n')
  const viewInner =
    panelCount > 1
      ? `    h.div([h.Class(${isStyleX ? 'className(styles.panelRow)' : `'flex flex-wrap gap-12'`})], [
${panelCalls},
    ])`
      : fixture.width !== undefined
        ? `    h.div([h.Class(${isStyleX ? 'className(styles.frame)' : `'w-[${fixture.width}px]'`})], [
${panelCalls},
    ])`
        : panelCalls
  return foldkitApplication({
    title: `${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
`
    : ''
}${
      usesIcon
        ? `import * as Icon from '@/lib/icon'
`
        : ''
    }import * as Stepper from '@/${lib}/stepper'
${
  isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  frame: { width: '${fixture.width ?? 640}px' },
  panelRow: { display: 'flex', flexWrap: 'wrap', gap: '3rem' },
  panel: { width: '220px' },
  panelHeading: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },
})
`
    : ''
}`,
    model: `export const Model = S.Struct({
  controls: S.Array(Stepper.Model),
  activeStep: S.Number,
})
export type Model = typeof Model.Type`,
    messages: `export const GotStepperMessage = taggedStruct('GotStepperMessage${tag}', {
  message: Stepper.Message,
})
export const Message = S.Union([GotStepperMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    controls: Array.from({ length: ${panelCount} }, (_, index) =>
      Stepper.init({ id: 'stepper-' + index, activeStep: ${fixture.activeStep} })),
    activeStep: ${fixture.activeStep},
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotStepperMessage${tag}': {
      const results = model.controls.map(control =>
        Stepper.update(control, message.message))
      const selection = results
        .map(result => result.outMessage)
        .find(out => out !== undefined)
      return {
        model: {
          ...model,
          controls: results.map(result => result.model),
          ...(selection?._tag === 'ClickedStep'
            ? { activeStep: selection.step }
            : {}),
        },
        commands: results.flatMap(result =>
          Command.mapMessages(result.commands ?? [], next =>
            GotStepperMessage({ message: next }))),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${viewInner},
  ]),
})`,
  })
}

const stepperExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  stepperFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitSource(fixture, renderer !== 'tailwind'),
  }))

export const stepperExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, stepperExamplesFor(renderer))
