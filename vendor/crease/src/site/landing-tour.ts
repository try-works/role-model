import { tourSkin } from '@/site/landing-tour-skin'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, type Update } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Preset from '@/demo/create-preset'
import * as Chart from '@/lib/echarts'
import * as Icon from '@/lib/icon'
import { MapMessage } from '@/lib/map-runtime'
import { COMPONENT_COUNT, CHART_EXAMPLE_COUNT } from '@/lib/project-facts'
import { componentDocsPath } from '@/route'
import {
  button,
  buttonLink,
  badge,
  input,
  switchControl,
  Tabs,
  Dialog,
  Combobox,
  Palette,
  DateRange,
  Table,
  createShowcaseTabs,
  numberCell,
  exploreChart,
  map,
  mapControls,
  mapMarker,
  markerContent,
  markerTooltip,
  mapRoute,
  studioThemeCss,
} from '@/site/landing-tour-ui'
import { renderer } from '@/site/config'

// Both renderers share the tour model, messages, and view composition.
const Showcase = S.Literals(['dashboard', 'inbox', 'kanban', 'checkout'])
const Color = S.Literals([
  'neutral',
  'emerald',
  'blue',
  'violet',
  'orange',
  'rose',
])
const StudioField = S.Literals(['radius', 'font'])
const Period = S.Literals(['week', 'month', 'quarter'])
const Series = S.Literals(['both', 'visitors', 'signups'])
const showcaseTabs = createShowcaseTabs<typeof Showcase.Type>()
const appCombobox = Combobox.create<string>()
const appPalette = Palette.create<string>()

export const Model = S.Struct({
  showcase: Showcase,
  tabs: Tabs.Model,
  studioColor: Color,
  studioRadius: S.String,
  studioFont: S.String,
  studioNotifications: S.Boolean,
  studioInvited: S.Boolean,
  projectName: S.String,
  notifications: S.Boolean,
  stateDialog: Dialog.Model,
  events: S.Array(S.String),
  playgroundDialog: Dialog.Model,
  combobox: Combobox.Model,
  selectedFramework: S.Option(S.String),
  dateRange: DateRange.Model,
  command: Palette.Model,
  selectedCommand: S.Option(S.String),
  sortDescending: S.Boolean,
  formEmail: S.String,
  formStatus: S.Literals(['idle', 'error', 'success']),
  chartPeriod: Period,
  chartSeries: Series,
  copied: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotShowcaseTabs: { message: Tabs.Message },
  SelectedStudioColor: { color: Color },
  ChangedStudioSetting: { field: StudioField, value: S.String },
  ToggledStudioNotifications: { isChecked: S.Boolean },
  ClickedStudioInvite: {},
  ChangedProjectName: { value: S.String },
  ToggledNotifications: { isChecked: S.Boolean },
  OpenedStateDialog: {},
  GotStateDialog: { message: Dialog.Message },
  ResetStateDemo: {},
  OpenedPlaygroundDialog: {},
  GotPlaygroundDialog: { message: Dialog.Message },
  GotCombobox: { message: Combobox.Message },
  GotDateRange: { message: DateRange.Message },
  GotCommand: { message: Palette.Message },
  ToggledSort: {},
  ChangedFormEmail: { value: S.String },
  SubmittedForm: {},
  ChangedChartPeriod: { period: Period },
  ChangedChartSeries: { series: Series },
  GotChart: { message: Chart.ChartMessage },
  GotMap: { message: MapMessage },
  ClickedCopyInstall: {},
  CompletedCopyInstall: { success: S.Boolean },
  ClearedCopyFeedback: {},
})
export type Message = typeof Message.Type

export const init = (): Model => ({
  showcase: 'dashboard',
  tabs: Tabs.init({ id: 'landing-showcase' }),
  studioColor: 'emerald',
  studioRadius: 'large',
  studioFont: 'inter',
  studioNotifications: true,
  studioInvited: false,
  projectName: 'My next project',
  notifications: true,
  stateDialog: Dialog.init({ id: 'landing-state-dialog', isAnimated: true }),
  events: ['Initialized'],
  playgroundDialog: Dialog.init({
    id: 'landing-playground-dialog',
    isAnimated: true,
  }),
  combobox: Combobox.init({ id: 'landing-framework', isAnimated: true }),
  selectedFramework: Option.none(),
  dateRange: DateRange.init({
    id: 'landing-date-range',
    today: Calendar.fromDateInZone(new Date(), 'UTC'),
    isAnimated: true,
  }),
  command: Palette.init({ id: 'landing-command', isAnimated: true }),
  selectedCommand: Option.none(),
  sortDescending: true,
  formEmail: '',
  formStatus: 'idle',
  chartPeriod: 'month',
  chartSeries: 'both',
  copied: false,
})

const INSTALL = 'npx --yes shadcn@latest add Potti1234/creaseui/button --yes'
const CHART_ID = 'landing-explore-chart'
const logEvent = (model: Model, event: string): ReadonlyArray<string> =>
  [event, ...model.events].slice(0, 4)
const chartVariant = (
  period: typeof Period.Type,
  series: typeof Series.Type,
): string => `${period}:${series}`

const CopyInstall = Command.define('LandingCopyInstall', {
  args: {},
  messages: [Message.CompletedCopyInstall],
  execute: () =>
    Effect.tryPromise(() => navigator.clipboard.writeText(INSTALL)).pipe(
      Effect.match({
        onFailure: () => Message.CompletedCopyInstall({ success: false }),
        onSuccess: () => Message.CompletedCopyInstall({ success: true }),
      }),
    ),
})
const ClearCopyFeedback = Command.define('LandingClearCopyFeedback', {
  args: {},
  messages: [Message.ClearedCopyFeedback],
  execute: () =>
    Effect.sleep('2 seconds').pipe(Effect.as(Message.ClearedCopyFeedback())),
})

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> =>
  M.value(message).pipe(
    M.withReturnType<Update.Return<Model, Message>>(),
    M.tagsExhaustive({
      GotShowcaseTabs: ({ message }) => {
        const next = showcaseTabs.update(model.tabs, message)
        return {
          model: {
            ...model,
            tabs: next.model,
            showcase: next.outMessage?.value ?? model.showcase,
          },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotShowcaseTabs({ message }),
          ),
        }
      },
      SelectedStudioColor: ({ color }) => ({
        model: { ...model, studioColor: color },
      }),
      ChangedStudioSetting: ({ field, value }) => ({
        model:
          field === 'radius'
            ? { ...model, studioRadius: value }
            : { ...model, studioFont: value },
      }),
      ToggledStudioNotifications: ({ isChecked }) => ({
        model: { ...model, studioNotifications: isChecked },
      }),
      ClickedStudioInvite: () => ({
        model: { ...model, studioInvited: !model.studioInvited },
      }),
      ChangedProjectName: ({ value }) => ({
        model: {
          ...model,
          projectName: value,
          events: logEvent(model, 'ChangedProjectName'),
        },
      }),
      ToggledNotifications: ({ isChecked }) => ({
        model: {
          ...model,
          notifications: isChecked,
          events: logEvent(model, 'ToggledNotifications'),
        },
      }),
      OpenedStateDialog: () => {
        const next = Dialog.open(model.stateDialog)
        return {
          model: {
            ...model,
            stateDialog: next.model,
            events: logEvent(model, 'OpenedDialog'),
          },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotStateDialog({ message }),
          ),
        }
      },
      GotStateDialog: ({ message }) => {
        const next = Dialog.update(model.stateDialog, message)
        return {
          model: {
            ...model,
            stateDialog: next.model,
            events:
              next.model.isOpen !== model.stateDialog.isOpen
                ? logEvent(
                    model,
                    next.model.isOpen ? 'OpenedDialog' : 'ClosedDialog',
                  )
                : model.events,
          },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotStateDialog({ message }),
          ),
        }
      },
      ResetStateDemo: () => ({
        model: {
          ...model,
          projectName: 'My next project',
          notifications: true,
          events: ['ResetDemo'],
        },
      }),
      OpenedPlaygroundDialog: () => {
        const next = Dialog.open(model.playgroundDialog)
        return {
          model: { ...model, playgroundDialog: next.model },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotPlaygroundDialog({ message }),
          ),
        }
      },
      GotPlaygroundDialog: ({ message }) => {
        const next = Dialog.update(model.playgroundDialog, message)
        return {
          model: { ...model, playgroundDialog: next.model },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotPlaygroundDialog({ message }),
          ),
        }
      },
      GotCombobox: ({ message }) => {
        const next = appCombobox.update(model.combobox, message)
        const selected =
          next.outMessage === undefined
            ? model.selectedFramework
            : next.outMessage._tag === 'Selected'
              ? Option.some(next.outMessage.value)
              : Option.none<string>()
        return {
          model: {
            ...model,
            combobox: next.model,
            selectedFramework: selected,
          },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotCombobox({ message }),
          ),
        }
      },
      GotDateRange: ({ message }) => {
        const next = DateRange.update(model.dateRange, message)
        return {
          model: { ...model, dateRange: next.model },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotDateRange({ message }),
          ),
        }
      },
      GotCommand: ({ message }) => {
        const next = appPalette.update(model.command, message)
        const selected =
          next.outMessage === undefined
            ? model.selectedCommand
            : next.outMessage._tag === 'Selected'
              ? Option.some(next.outMessage.value)
              : Option.none<string>()
        return {
          model: { ...model, command: next.model, selectedCommand: selected },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotCommand({ message }),
          ),
        }
      },
      ToggledSort: () => ({
        model: { ...model, sortDescending: !model.sortDescending },
      }),
      ChangedFormEmail: ({ value }) => ({
        model: { ...model, formEmail: value, formStatus: 'idle' },
      }),
      SubmittedForm: () => ({
        model: {
          ...model,
          formStatus: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.formEmail.trim())
            ? 'success'
            : 'error',
        },
      }),
      ChangedChartPeriod: ({ period }) => ({
        model: { ...model, chartPeriod: period },
        commands: Command.mapMessages(
          [
            Chart.SyncChart({
              hostId: CHART_ID,
              variant: chartVariant(period, model.chartSeries),
            }),
          ],
          message => Message.GotChart({ message }),
        ),
      }),
      ChangedChartSeries: ({ series }) => ({
        model: { ...model, chartSeries: series },
        commands: Command.mapMessages(
          [
            Chart.SyncChart({
              hostId: CHART_ID,
              variant: chartVariant(model.chartPeriod, series),
            }),
          ],
          message => Message.GotChart({ message }),
        ),
      }),
      GotChart: () => ({ model }),
      GotMap: () => ({ model }),
      ClickedCopyInstall: () => ({ model, commands: [CopyInstall({})] }),
      CompletedCopyInstall: ({ success }) => ({
        model: { ...model, copied: success },
        commands: success ? [ClearCopyFeedback({})] : [],
      }),
      ClearedCopyFeedback: () => ({ model: { ...model, copied: false } }),
    }),
  )

const COLORS: ReadonlyArray<
  Readonly<{ value: typeof Color.Type; label: string; paint: string }>
> = [
  { value: 'neutral', label: 'Neutral', paint: '#52525b' },
  { value: 'emerald', label: 'Emerald', paint: '#059669' },
  { value: 'blue', label: 'Blue', paint: '#2563eb' },
  { value: 'violet', label: 'Violet', paint: '#7c3aed' },
  { value: 'orange', label: 'Orange', paint: '#ea580c' },
  { value: 'rose', label: 'Rose', paint: '#e11d48' },
]
const APPS = [
  {
    value: 'dashboard',
    label: 'Dashboard',
    block: 'dashboard-01',
    description: 'The whole picture, in one place.',
  },
  {
    value: 'inbox',
    label: 'Inbox',
    block: 'creaseui-inbox-table',
    description: 'A calmer place for the next conversation.',
  },
  {
    value: 'kanban',
    label: 'Kanban',
    block: 'creaseui-kanban-board',
    description: 'Give your next project a little structure.',
  },
  {
    value: 'checkout',
    label: 'Checkout',
    block: 'creaseui-checkout-form',
    description: 'Every detail, from the cart to confirmation.',
  },
] as const
const FRAMEWORKS = ['Foldkit', 'Elm', 'React', 'Vue', 'Svelte']
const ACTIONS = [
  'Create project',
  'Invite a teammate',
  'Open settings',
  'View documentation',
]
const icon = (name: string, h: HtmlBuilder<Message>): Html =>
  Icon.icon(name, { class: tourSkin.icon }, h)

const sectionHeader = (
  title: string,
  copy: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class(tourSkin.sectionHeader)],
    [
      h.h2([h.Class(tourSkin.sectionTitle)], [title]),
      h.p([h.Class(tourSkin.sectionCopy)], [copy]),
    ],
  )

const colorPicker = (
  selected: typeof Color.Type,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Role('group'),
      h.AriaLabel('Theme studio accent color'),
      h.Class(tourSkin.colorPicker),
    ],
    COLORS.map(color =>
      h.button(
        [
          h.Type('button'),
          h.AriaLabel(`Studio ${color.label}`),
          h.AriaPressed(String(selected === color.value)),
          h.OnClick(Message.SelectedStudioColor({ color: color.value })),
          h.Class(tourSkin.colorButton),
        ],
        [
          h.span(
            [
              h.Class(
                selected === color.value
                  ? tourSkin.colorSelected
                  : tourSkin.colorIdle,
              ),
              h.Style({ backgroundColor: color.paint }),
            ],
            selected === color.value
              ? [Icon.icon('check', { class: tourSkin.checkIcon }, h)]
              : [],
          ),
        ],
      ),
    ),
  )

const STUDIO_RADIUS: Readonly<Record<string, number>> = {
  none: 0,
  medium: 1,
  large: 1.4,
}

const themeConfig = (
  color: typeof Color.Type,
  radius = 'large',
  font = 'inter',
): Preset.Config => ({
  ...Preset.DEFAULT_CONFIG,
  ...Preset.accentForTheme(color),
  chartColor: color,
  radius: STUDIO_RADIUS[radius] ?? 1,
  font,
})
const previewUrl = (block: string, isDark: boolean): string =>
  `/blocks/preview/${renderer}--${block}?preset=${Preset.encodePreset(themeConfig('neutral'))}&appearance=${isDark ? 'dark' : 'light'}`

const showcaseFrame = (
  app: (typeof APPS)[number],
  isDark: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class(tourSkin.showcaseFrame)],
    [
      h.div(
        [h.Class(tourSkin.frameToolbar)],
        [
          h.div(
            [h.AriaHidden(true), h.Class(tourSkin.frameDots)],
            [
              h.span([h.Class(tourSkin.frameDot)], []),
              h.span([h.Class(tourSkin.frameDot)], []),
              h.span([h.Class(tourSkin.frameDot)], []),
            ],
          ),
          h.span([h.Class(tourSkin.frameTitle)], [app.label]),
          h.span(
            [h.Class(tourSkin.frameStatus)],
            [h.span([h.Class(tourSkin.statusDot)], []), 'Live preview'],
          ),
        ],
      ),
      h.div(
        [h.Class(tourSkin.frameContent)],
        [
          h.keyed('iframe')(
            `${app.block}-${isDark}`,
            [
              h.Src(previewUrl(app.block, isDark)),
              h.Title(`${app.label} application preview`),
              h.Attribute('loading', 'lazy'),
              h.Class(tourSkin.iframe),
            ],
            [],
          ),
        ],
      ),
    ],
  )

const showcaseView = (
  model: Model,
  isDark: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const selected = APPS.find(app => app.value === model.showcase) ?? APPS[0]
  return h.section(
    [h.Id('showcase'), h.Class(tourSkin.section)],
    [
      sectionHeader(
        'See what you can build.',
        'Complete interfaces made from the same components you can copy into your app. Pick one. Make yourself at home.',
        h,
      ),
      h.div(
        [h.Class(tourSkin.showcaseBody)],
        [
          showcaseTabs.tabs(
            {
              model: model.tabs,
              selectedValue: model.showcase,
              ariaLabel: 'Application showcase',
              toParentMessage: message => Message.GotShowcaseTabs({ message }),
              tabs: APPS.map(app => ({
                value: app.value,
                label: app.label,
                content:
                  app.value === model.showcase
                    ? showcaseFrame(app, isDark, h)
                    : h.empty,
              })),
            },
            h,
          ),
          h.div(
            [h.Class(tourSkin.showcaseFooter)],
            [
              h.p([h.Class(tourSkin.mutedSmall)], [selected.description]),
              h.div(
                [h.Class(tourSkin.showcaseLinks)],
                [
                  h.a(
                    [
                      h.Href(`/blocks#${selected.block}`),
                      h.Class(tourSkin.subtleLink),
                    ],
                    [icon('code-xml', h), 'View code'],
                  ),
                  h.a(
                    [
                      h.Href(previewUrl(selected.block, isDark)),
                      h.Class(tourSkin.subtleLink),
                    ],
                    ['Open example', icon('arrow-up-right', h)],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const choices = (
  label: string,
  values: ReadonlyArray<readonly [string, string]>,
  selected: string,
  field: typeof StudioField.Type,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class(tourSkin.choices)],
    [
      h.p([h.Class(tourSkin.label)], [label]),
      h.div(
        [h.Role('group'), h.AriaLabel(label), h.Class(tourSkin.choiceRow)],
        values.map(([value, text]) =>
          h.button(
            [
              h.Type('button'),
              h.AriaPressed(String(value === selected)),
              h.OnClick(Message.ChangedStudioSetting({ field, value })),
              h.Class(
                value === selected
                  ? tourSkin.choiceSelected
                  : tourSkin.choiceIdle,
              ),
            ],
            [text],
          ),
        ),
      ),
    ],
  )
const initials = (text: string, h: HtmlBuilder<Message>): Html =>
  h.span([h.Class(tourSkin.initials)], [text])

const studioView = (
  model: Model,
  isDark: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const config = themeConfig(
    model.studioColor,
    model.studioRadius,
    model.studioFont,
  )
  const css = Preset.presetCss(config)
    .replaceAll(
      '.dark .create-board-theme',
      '.landing-studio[data-appearance="dark"] .create-board-theme',
    )
    .replaceAll('.create-board-theme', '.landing-studio .create-board-theme')
  // Accent, radius and font stay scoped to the preview; appearance follows the site.
  const scopedCss = css.replaceAll(
    '.landing-studio[data-appearance="dark"] .landing-studio .create-board-theme',
    '.landing-studio[data-appearance="dark"] .create-board-theme',
  )
  return h.section(
    [h.Id('theme-studio'), h.Class(tourSkin.section)],
    [
      sectionHeader(
        'Make it yours.',
        'A different color, a softer corner, a new typeface. Same components. A completely different feeling.',
        h,
      ),
      h.div(
        [h.Class(tourSkin.studioLayout)],
        [
          h.div(
            [h.Class(tourSkin.studioControls)],
            [
              h.div(
                [h.Class(tourSkin.gridTight)],
                [
                  h.p([h.Class(tourSkin.label)], ['Accent color']),
                  colorPicker(model.studioColor, h),
                ],
              ),
              choices(
                'Corner radius',
                [
                  ['none', 'Square'],
                  ['medium', 'Soft'],
                  ['large', 'Round'],
                ],
                model.studioRadius,
                'radius',
                h,
              ),
              choices(
                'Typeface',
                [
                  ['inter', 'Inter'],
                  ['geist', 'Geist'],
                  ['geist-mono', 'Mono'],
                ],
                model.studioFont,
                'font',
                h,
              ),
              h.a(
                [h.Href('/create'), h.Class(tourSkin.subtleLink)],
                ['Open the theme builder', icon('arrow-up-right', h)],
              ),
            ],
          ),
          h.div(
            [
              h.Class(tourSkin.studioRoot),
              h.DataAttribute('appearance', isDark ? 'dark' : 'light'),
            ],
            [
              h.style([], [scopedCss, studioThemeCss()]),
              h.div(
                [
                  h.Class(tourSkin.studioPreview),
                  h.DataAttribute('studio-preview', ''),
                ],
                [
                  h.div(
                    [h.Class(tourSkin.studioCard)],
                    [
                      h.div(
                        [h.Class(tourSkin.studioHeader)],
                        [
                          h.span(
                            [h.Class(tourSkin.studioLogo)],
                            [icon('blocks', h)],
                          ),
                          h.div(
                            [],
                            [
                              h.h3(
                                [h.Class(tourSkin.cardTitle)],
                                ['Studio workspace'],
                              ),
                              h.p(
                                [h.Class(tourSkin.caption)],
                                ['A space for your best ideas.'],
                              ),
                            ],
                          ),
                          h.span(
                            [h.Class(tourSkin.pushRight)],
                            [
                              badge(
                                { variant: 'secondary', children: ['Pro'] },
                                h,
                              ),
                            ],
                          ),
                        ],
                      ),
                      h.div(
                        [h.Class(tourSkin.studioBody)],
                        [
                          ...[
                            ['AL', 'Alex Lee', 'Designer'],
                            ['JM', 'Jamie Morgan', 'Developer'],
                          ].map(([initial, name, role]) =>
                            h.div(
                              [h.Class(tourSkin.row)],
                              [
                                initials(initial ?? '', h),
                                h.div(
                                  [],
                                  [
                                    h.p(
                                      [h.Class(tourSkin.label)],
                                      [name ?? ''],
                                    ),
                                    h.p(
                                      [h.Class(tourSkin.mutedCaption)],
                                      [role ?? ''],
                                    ),
                                  ],
                                ),
                                h.span(
                                  [h.Class(tourSkin.memberRole)],
                                  ['Member'],
                                ),
                              ],
                            ),
                          ),
                          ...(model.studioInvited
                            ? [
                                h.div(
                                  [h.Role('status'), h.Class(tourSkin.row)],
                                  [
                                    initials('YOU', h),
                                    h.p(
                                      [h.Class(tourSkin.label)],
                                      ['You joined the workspace'],
                                    ),
                                    icon('check', h),
                                  ],
                                ),
                              ]
                            : []),
                          h.div(
                            [h.Class(tourSkin.studioNotifications)],
                            [
                              switchControl(
                                {
                                  id: 'studio-notifications',
                                  isChecked: model.studioNotifications,
                                  onToggle: isChecked =>
                                    Message.ToggledStudioNotifications({
                                      isChecked,
                                    }),
                                  label: 'Workspace notifications',
                                  description: 'Keep up with your team.',
                                },
                                h,
                              ),
                            ],
                          ),
                          button(
                            {
                              appearance: 'studio',
                              onClick: Message.ClickedStudioInvite(),
                              children: [
                                icon(model.studioInvited ? 'check' : 'plus', h),
                                model.studioInvited
                                  ? 'Joined the workspace'
                                  : 'Join this workspace',
                              ],
                            },
                            h,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              h.p(
                [h.Class(tourSkin.studioPreset)],
                [
                  `--primary · --radius · --font-sans / ${Preset.encodePreset(config)}`,
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const inspectorLine = (
  key: string,
  value: string,
  isString: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class(tourSkin.inspectorLine)],
    [
      h.span([h.Class(tourSkin.inspectorKey)], [`  ${key}:`]),
      h.span(
        [
          h.Class(
            isString ? tourSkin.inspectorString : tourSkin.inspectorValue,
          ),
        ],
        [value],
      ),
      h.span([h.Class(tourSkin.inspectorPunctuation)], [',']),
    ],
  )
const stateView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Id('state-demo'), h.Class(tourSkin.section)],
    [
      sectionHeader(
        'See every state change.',
        'Type, toggle, open a dialog. The interface on the left and the model on the right tell the same story.',
        h,
      ),
      h.div(
        [h.Class(tourSkin.stateLayout)],
        [
          h.div(
            [h.Class(tourSkin.stateControls)],
            [
              h.div(
                [h.Class(tourSkin.between)],
                [
                  h.h3([h.Class(tourSkin.cardTitle)], ['Project settings']),
                  button(
                    {
                      variant: 'ghost',
                      size: 'sm',
                      appearance: 'control',
                      onClick: Message.ResetStateDemo(),
                      ariaLabel: 'Reset state demo',
                      children: [icon('rotate-ccw', h), 'Reset'],
                    },
                    h,
                  ),
                ],
              ),
              input(
                {
                  id: 'landing-project-name',
                  label: 'Project name',
                  value: model.projectName,
                  onInput: value => Message.ChangedProjectName({ value }),
                  appearance: 'surface',
                  placeholder: 'Give your project a name',
                },
                h,
              ),
              switchControl(
                {
                  id: 'landing-state-notifications',
                  label: 'Email notifications',
                  description: 'A heads-up when something changes.',
                  isChecked: model.notifications,
                  onToggle: isChecked =>
                    Message.ToggledNotifications({ isChecked }),
                },
                h,
              ),
              h.div(
                [h.Class(tourSkin.stateFooter)],
                [
                  h.p(
                    [h.Class(tourSkin.mutedCaption)],
                    ['Your model owns the interaction.'],
                  ),
                  button(
                    {
                      variant: 'outline',
                      appearance: 'pill',
                      onClick: Message.OpenedStateDialog(),
                      children: ['Open dialog', icon('arrow-up-right', h)],
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [h.Class(tourSkin.inspector)],
            [
              h.div(
                [h.Class(tourSkin.inspectorHeader)],
                [
                  h.span([h.Class(tourSkin.inspectorLabel)], ['Model']),
                  h.span(
                    [h.Class(tourSkin.liveLabel)],
                    [h.span([h.Class(tourSkin.liveDot)], []), 'Live'],
                  ),
                ],
              ),
              h.div(
                [
                  h.Class(tourSkin.inspectorBody),
                  h.DataAttribute('model-inspector', ''),
                ],
                [
                  h.p([h.Class(tourSkin.inspectorPunctuation)], ['{']),
                  inspectorLine(
                    'projectName',
                    JSON.stringify(model.projectName),
                    true,
                    h,
                  ),
                  inspectorLine(
                    'notifications',
                    String(model.notifications),
                    false,
                    h,
                  ),
                  inspectorLine(
                    'dialog.isOpen',
                    String(model.stateDialog.isOpen),
                    false,
                    h,
                  ),
                  h.p([h.Class(tourSkin.inspectorPunctuation)], ['}']),
                ],
              ),
              h.div(
                [h.Class(tourSkin.eventLog)],
                [
                  h.p([h.Class(tourSkin.eventLogLabel)], ['Recent messages']),
                  h.ol(
                    [
                      h.Class(tourSkin.gridTight),
                      h.DataAttribute('event-log', ''),
                    ],
                    model.events.map((event, index) =>
                      h.li(
                        [h.Class(tourSkin.eventRow)],
                        [
                          h.span(
                            [
                              h.Class(
                                index === 0
                                  ? tourSkin.eventActiveDot
                                  : tourSkin.eventIdleDot,
                              ),
                            ],
                            [],
                          ),
                          h.span(
                            [
                              h.Class(
                                index === 0
                                  ? tourSkin.eventActive
                                  : tourSkin.inspectorPunctuation,
                              ),
                            ],
                            [event],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      Dialog.dialog(
        {
          model: model.stateDialog,
          toParentMessage: message => Message.GotStateDialog({ message }),
          title: model.projectName.trim() || 'Your project',
          description:
            'This dialog is part of your model, too. Press Escape to close it and watch the state change.',
          content: () => [
            h.pre(
              [h.Class(tourSkin.dialogCode)],
              [`dialog.isOpen: ${String(model.stateDialog.isOpen)}`],
            ),
          ],
          footer: slots => [
            h.button(
              [...slots.closeButton, h.Class(tourSkin.dialogClose)],
              ['Back to the model'],
            ),
          ],
        },
        h,
      ),
    ],
  )

const demoCard = (
  number: string,
  title: string,
  description: string,
  slug: string,
  content: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.article(
    [h.Class(tourSkin.demoCard)],
    [
      h.div([h.Class(tourSkin.demoContent)], [...content]),
      h.div(
        [h.Class(tourSkin.demoFooter)],
        [
          h.div(
            [],
            [
              h.h3([h.Class(tourSkin.demoTitle)], [title]),
              h.p([h.Class(tourSkin.demoDescription)], [description]),
            ],
          ),
          h.a(
            [
              h.Href(`/docs/components/${slug}`),
              h.AriaLabel(`${title} documentation`),
              h.Class(tourSkin.demoLink),
            ],
            [icon('arrow-up-right', h)],
          ),
          h.span([h.Class(tourSkin.srOnly)], [number]),
        ],
      ),
    ],
  )

const sortableTable = (model: Model, h: HtmlBuilder<Message>): Html => {
  const rows = [
    { name: 'Design system', members: 12 },
    { name: 'Website', members: 8 },
    { name: 'Mobile app', members: 5 },
  ].sort((a, b) =>
    model.sortDescending ? b.members - a.members : a.members - b.members,
  )
  return Table.table(
    {
      children: [
        Table.tableHeader(
          {
            children: [
              Table.tableRow(
                {
                  children: [
                    Table.tableHead({ children: ['Project'] }, h),
                    h.th(
                      [
                        h.Attribute(
                          'aria-sort',
                          model.sortDescending ? 'descending' : 'ascending',
                        ),
                        h.Class(tourSkin.tableSort),
                      ],
                      [
                        button(
                          {
                            variant: 'ghost',
                            size: 'sm',
                            appearance: 'control',
                            onClick: Message.ToggledSort(),
                            ariaLabel: 'Sort projects by members',
                            children: [
                              'Members',
                              icon(
                                model.sortDescending
                                  ? 'arrow-down'
                                  : 'arrow-up',
                                h,
                              ),
                            ],
                          },
                          h,
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
        Table.tableBody(
          {
            children: rows.map(row =>
              Table.tableRow(
                {
                  children: [
                    Table.tableCell({ children: [row.name] }, h),
                    numberCell(
                      {
                        children: [String(row.members)],
                      },
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
  )
}

const playgroundView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Id('playground'), h.Class(tourSkin.section)],
    [
      h.div(
        [h.Class(tourSkin.playgroundHeader)],
        [
          sectionHeader(
            'Try the details.',
            'Search, select, sort. A few of the little interactions that make an interface feel right.',
            h,
          ),
          h.a(
            [
              h.Href('/docs/components/accordion'),
              h.Class(tourSkin.playgroundLink),
            ],
            [
              `Browse ${String(COMPONENT_COUNT)} components`,
              icon('arrow-right', h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class(tourSkin.playgroundGrid)],
        [
          demoCard(
            '01',
            'Combobox',
            'Find your framework. Keyboard included.',
            'combobox',
            [
              appCombobox.combobox(
                {
                  model: model.combobox,
                  maybeSelectedValue: model.selectedFramework,
                  restingInputValue: Option.getOrElse(
                    model.selectedFramework,
                    () => '',
                  ),
                  items: FRAMEWORKS,
                  itemToValue: value => value,
                  itemToLabel: value => value,
                  placeholder: 'Search frameworks…',
                  ariaLabel: 'Search frameworks',
                  toParentMessage: message => Message.GotCombobox({ message }),
                },
                h,
              ),
              h.p(
                [h.Class(tourSkin.mutedCaption)],
                [
                  Option.match(model.selectedFramework, {
                    onNone: () => 'Try typing “Foldkit”.',
                    onSome: value => `${value} selected.`,
                  }),
                ],
              ),
            ],
            h,
          ),
          demoCard(
            '02',
            'Date range',
            'Two clicks. One well-defined range.',
            'date-range-input',
            [
              DateRange.dateRangeInput(
                {
                  model: model.dateRange,
                  label: 'Project timeline',
                  placeholder: 'Pick your dates',
                  toParentMessage: message => Message.GotDateRange({ message }),
                },
                h,
              ),
              h.p(
                [h.Class(tourSkin.mutedCaption)],
                ['Pick a start date, then an end date.'],
              ),
            ],
            h,
          ),
          demoCard(
            '03',
            'Dialog',
            'Focus goes in. Focus comes back.',
            'dialog',
            [
              h.div(
                [h.Class(tourSkin.center)],
                [
                  button(
                    {
                      variant: 'outline',
                      appearance: 'pillWide',
                      onClick: Message.OpenedPlaygroundDialog(),
                      children: [icon('app-window', h), 'Try a dialog'],
                    },
                    h,
                  ),
                ],
              ),
              h.p(
                [h.Class(tourSkin.centeredCaption)],
                ['Open it. Tab around. Press Escape.'],
              ),
            ],
            h,
          ),
          demoCard(
            '04',
            'Data table',
            'A little order for your information.',
            'data-table',
            [sortableTable(model, h)],
            h,
          ),
          demoCard(
            '05',
            'Command',
            'The shortest route to the next action.',
            'command',
            [
              appPalette.command(
                {
                  model: model.command,
                  maybeSelectedValue: model.selectedCommand,
                  restingInputValue: Option.getOrElse(
                    model.selectedCommand,
                    () => '',
                  ),
                  items: ACTIONS,
                  itemToConfig: action => ({
                    content: action,
                    searchText: action,
                  }),
                  placeholder: 'Find an action…',
                  ariaLabel: 'Find an action',
                  toParentMessage: message => Message.GotCommand({ message }),
                },
                h,
              ),
              h.p(
                [h.Class(tourSkin.mutedCaption)],
                [
                  Option.getOrElse(
                    model.selectedCommand,
                    () => 'Search, then use ↑ ↓ and Enter.',
                  ),
                ],
              ),
            ],
            h,
          ),
          demoCard(
            '06',
            'Form validation',
            'Helpful feedback, exactly when needed.',
            'form',
            [
              h.form(
                [
                  h.AriaLabel('Email validation demo'),
                  h.Attribute('novalidate', ''),
                  h.OnSubmit(Message.SubmittedForm()),
                  h.Class(tourSkin.choices),
                ],
                [
                  input(
                    {
                      id: 'landing-form-email',
                      label: 'Your email',
                      type: 'email',
                      value: model.formEmail,
                      placeholder: 'you@example.com',
                      appearance: 'control',
                      onInput: value => Message.ChangedFormEmail({ value }),
                      isInvalid: model.formStatus === 'error',
                      describedBy: 'landing-email-feedback',
                    },
                    h,
                  ),
                  button(
                    {
                      type: 'submit',
                      variant: 'secondary',
                      appearance: 'control',
                      children: ['Check email', icon('arrow-right', h)],
                    },
                    h,
                  ),
                  h.p(
                    [
                      h.Id('landing-email-feedback'),
                      h.Role('status'),
                      h.Class(
                        model.formStatus === 'error'
                          ? tourSkin.formError
                          : model.formStatus === 'success'
                            ? tourSkin.formSuccess
                            : tourSkin.mutedCaption,
                      ),
                    ],
                    [
                      model.formStatus === 'error'
                        ? 'Enter a valid email address.'
                        : model.formStatus === 'success'
                          ? 'Looks good. You’re ready to go.'
                          : 'Try a valid address, or an incomplete one.',
                    ],
                  ),
                ],
              ),
            ],
            h,
          ),
        ],
      ),
      Dialog.dialog(
        {
          model: model.playgroundDialog,
          toParentMessage: message => Message.GotPlaygroundDialog({ message }),
          title: 'A little room to focus.',
          description:
            'The rest of the page can wait. Your keyboard focus stays here until you close the dialog.',
          content: () => [
            input(
              {
                id: 'landing-dialog-note',
                label: 'A read-only example',
                value: 'Hello from crease/ui',
                isReadOnly: true,
              },
              h,
            ),
          ],
          footer: slots => [
            h.button(
              [...slots.closeButton, h.Class(tourSkin.dialogClose)],
              ['Done'],
            ),
          ],
        },
        h,
      ),
    ],
  )

const CHART_DATA = {
  week: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    visitors: [184, 230, 195, 286, 312, 249, 340],
    signups: [62, 84, 71, 104, 117, 96, 128],
  },
  month: {
    labels: [
      'Jun 1',
      'Jun 5',
      'Jun 10',
      'Jun 15',
      'Jun 20',
      'Jun 25',
      'Jun 30',
    ],
    visitors: [820, 1140, 960, 1530, 1210, 1780, 2040],
    signups: [250, 390, 320, 570, 430, 680, 820],
  },
  quarter: {
    labels: ['Apr 1', 'Apr 15', 'May 1', 'May 15', 'Jun 1', 'Jun 15', 'Jun 30'],
    visitors: [2300, 2840, 2520, 3710, 3280, 4250, 4860],
    signups: [780, 940, 830, 1320, 1140, 1670, 1960],
  },
} as const
/* Stable slot ids keep every period's 7 points name-matched so merge-mode
   updates morph the shape in place; real labels come from the formatter. */
const CHART_SLOT_NAMES = Chart.slotIds(7)
Chart.registerChart(CHART_ID, (theme, variant) => {
  const [period, series] = variant.split(':')
  const data = CHART_DATA[period as keyof typeof CHART_DATA] ?? CHART_DATA.month
  /* Both series keep a stable slot so merge-mode updates morph — a removed
     entry would leave its line rendered forever; data:[] animates it out. */
  return {
    ...Chart.updateAnimation(),
    grid: { left: 8, right: 8, top: 18, bottom: 34, containLabel: true },
    xAxis: Chart.categoryAxis(theme, CHART_SLOT_NAMES, {
      axisLabel: { formatter: (_name, index) => data.labels[index] ?? '' },
    }),
    yAxis: Chart.valueAxis(theme, { showLabels: true }),
    tooltip: Chart.shadcnTooltip(theme, {
      formatHeading: (_name, index) => data.labels[index] ?? '',
    }),
    series: [
      {
        id: 'visitors',
        name: 'Visitors',
        type: 'line' as const,
        smooth: 0.35,
        showSymbol: false,
        lineStyle: { width: 2, color: theme.chart1 },
        itemStyle: { color: theme.chart1 },
        areaStyle: { color: Chart.areaGradient(theme.chart1) },
        data: series === 'signups' ? [] : [...data.visitors],
      },
      {
        id: 'signups',
        name: 'Signups',
        type: 'line' as const,
        smooth: 0.35,
        showSymbol: false,
        lineStyle: { width: 2, color: theme.chart2 },
        itemStyle: { color: theme.chart2 },
        areaStyle: { color: Chart.areaGradient(theme.chart2) },
        data: series === 'visitors' ? [] : [...data.signups],
      },
    ],
  }
})

const chartView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const data = CHART_DATA[model.chartPeriod]
  const total =
    model.chartSeries === 'signups'
      ? data.signups.reduce<number>((sum, value) => sum + value, 0)
      : data.visitors.reduce<number>((sum, value) => sum + value, 0)
  return h.section(
    [h.Id('charts-preview'), h.Class(tourSkin.section)],
    [
      sectionHeader(
        'Explore the data.',
        'Charts with the same attention to the axes, the tooltips, and everything in between. Move your cursor. Change the view.',
        h,
      ),
      h.div(
        [h.Class(tourSkin.chartCard)],
        [
          h.div(
            [h.Class(tourSkin.chartHeader)],
            [
              h.div(
                [],
                [
                  h.p(
                    [h.Class(tourSkin.mutedSmall)],
                    [
                      model.chartSeries === 'signups'
                        ? 'Total signups'
                        : 'Total visitors',
                    ],
                  ),
                  h.p(
                    [h.Class(tourSkin.chartTotal)],
                    [total.toLocaleString('en-US')],
                  ),
                  h.p(
                    [h.Class(tourSkin.caption)],
                    ['Sample data · Your next application'],
                  ),
                ],
              ),
              h.div(
                [
                  h.Role('group'),
                  h.AriaLabel('Chart period'),
                  h.Class(tourSkin.chartPeriods),
                ],
                (
                  [
                    ['week', '7 days'],
                    ['month', '30 days'],
                    ['quarter', '90 days'],
                  ] as const
                ).map(([period, label]) =>
                  h.button(
                    [
                      h.Type('button'),
                      h.AriaPressed(String(model.chartPeriod === period)),
                      h.OnClick(Message.ChangedChartPeriod({ period })),
                      h.Class(
                        model.chartPeriod === period
                          ? tourSkin.periodSelected
                          : tourSkin.periodIdle,
                      ),
                    ],
                    [label],
                  ),
                ),
              ),
            ],
          ),
          h.div(
            [
              h.Class(tourSkin.chartSeries),
              h.Role('group'),
              h.AriaLabel('Chart series'),
            ],
            (
              [
                ['both', 'Both series'],
                ['visitors', 'Visitors'],
                ['signups', 'Signups'],
              ] as const
            ).map(([series, label]) =>
              h.button(
                [
                  h.Type('button'),
                  h.AriaPressed(String(model.chartSeries === series)),
                  h.OnClick(Message.ChangedChartSeries({ series })),
                  h.Class(
                    model.chartSeries === series
                      ? tourSkin.seriesSelected
                      : tourSkin.seriesIdle,
                  ),
                ],
                [label],
              ),
            ),
          ),
          exploreChart(
            {
              hostId: CHART_ID,
              ariaLabel: `Visitors and signups over ${model.chartPeriod === 'week' ? '7' : model.chartPeriod === 'month' ? '30' : '90'} days`,
              variant: chartVariant(model.chartPeriod, model.chartSeries),
              toMessage: message => Message.GotChart({ message }),
              accessibleAlternative: h.table(
                [h.Class(tourSkin.srOnly)],
                [
                  h.caption([], ['Chart data']),
                  h.thead(
                    [],
                    [
                      h.tr(
                        [],
                        [
                          h.th([], ['Date']),
                          h.th([], ['Visitors']),
                          h.th([], ['Signups']),
                        ],
                      ),
                    ],
                  ),
                  h.tbody(
                    [],
                    data.labels.map((label, index) =>
                      h.tr(
                        [],
                        [
                          h.td([], [label]),
                          h.td([], [String(data.visitors[index])]),
                          h.td([], [String(data.signups[index])]),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            },
            h,
          ),
          h.div(
            [h.Class(tourSkin.chartFooter)],
            [
              h.div(
                [h.Class(tourSkin.chartLegend)],
                [
                  h.span(
                    [h.Class(tourSkin.legendItem)],
                    [h.span([h.Class(tourSkin.visitorsDot)], []), 'Visitors'],
                  ),
                  h.span(
                    [h.Class(tourSkin.legendItem)],
                    [h.span([h.Class(tourSkin.signupsDot)], []), 'Signups'],
                  ),
                ],
              ),
              h.a(
                [h.Href('/charts/area'), h.Class(tourSkin.subtleLink)],
                [
                  `Explore ${String(CHART_EXAMPLE_COUNT)} chart examples`,
                  icon('arrow-up-right', h),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const mapView = (isDark: boolean, h: HtmlBuilder<Message>): Html => {
  const liveMap = map(
    {
      center: [11.576124, 48.137154],
      zoom: 13,
      theme: isDark ? 'dark' : 'light',
      language: 'en',
      ariaLabel: 'Map of central Munich, Germany',
      toMessage: message => Message.GotMap({ message }),
      children: [
        mapControls(
          { position: 'top-right', showFullscreen: true, language: 'en' },
          h,
        ),
        mapRoute(
          {
            id: 'landing-munich-route',
            coordinates: [
              [11.576124, 48.137154],
              [11.577248, 48.142751],
            ],
            color: '#0f766e',
            width: 4,
          },
          h,
        ),
        mapMarker(
          {
            id: 'landing-marienplatz',
            longitude: 11.576124,
            latitude: 48.137154,
            ariaLabel: 'Marienplatz, Munich',
            children: [
              markerContent({ children: ['1'] }, h),
              markerTooltip({ children: ['Marienplatz'] }, h),
            ],
          },
          h,
        ),
        mapMarker(
          {
            id: 'landing-odeonsplatz',
            longitude: 11.577248,
            latitude: 48.142751,
            ariaLabel: 'Odeonsplatz, Munich',
            children: [
              markerContent({ children: ['2'] }, h),
              markerTooltip({ children: ['Odeonsplatz'] }, h),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

  return h.section(
    [h.Id('map-preview'), h.Class(tourSkin.section)],
    [
      sectionHeader(
        'An interactive map, built from parts.',
        'A live OpenFreeMap basemap with controls, a route, and named markers. Each layer is composed in the view, with no map API key.',
        h,
      ),
      liveMap,
      h.div(
        [h.Class(tourSkin.showcaseFooter)],
        [
          h.p(
            [h.Class(tourSkin.mutedSmall)],
            ['Pan, zoom, or focus a marker with your keyboard.'],
          ),
          h.div(
            [h.Class(tourSkin.showcaseLinks)],
            [
              h.a(
                [
                  h.Href(componentDocsPath('map')),
                  h.Class(tourSkin.subtleLink),
                ],
                ['Explore map docs', icon('arrow-up-right', h)],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const gettingStartedView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Id('get-started'), h.Class(tourSkin.section)],
    [
      h.div(
        [h.Class(tourSkin.gettingStarted)],
        [
          h.div(
            [h.Class(tourSkin.grid)],
            [
              h.h2(
                [h.Class(tourSkin.gettingStartedTitle)],
                ['Take it from here.'],
              ),
              h.p(
                [h.Class(tourSkin.gettingStartedCopy)],
                [
                  'Add a component. Read the source. Make it your own. The next interface is yours to build.',
                ],
              ),
              h.div(
                [h.Class(tourSkin.actions)],
                [
                  buttonLink(
                    {
                      href: '/docs/components/button',
                      appearance: 'pillWide',
                      children: ['Get started', icon('arrow-right', h)],
                    },
                    h,
                  ),
                  buttonLink(
                    {
                      href: '/create',
                      variant: 'ghost',
                      appearance: 'pillWide',
                      children: ['Choose a theme'],
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [h.Class(tourSkin.terminal)],
            [
              h.div(
                [h.Class(tourSkin.terminalHeader)],
                [
                  h.span([h.Class(tourSkin.terminalLabel)], ['Terminal']),
                  badge(
                    { variant: 'secondary', children: ['registry available'] },
                    h,
                  ),
                ],
              ),
              h.div(
                [h.Class(tourSkin.terminalRow)],
                [
                  h.span([h.Class(tourSkin.terminalPrompt)], ['$']),
                  h.code([h.Class(tourSkin.terminalCode)], [INSTALL]),
                  button(
                    {
                      variant: 'ghost',
                      size: 'icon',
                      ariaLabel: model.copied
                        ? 'Install command copied'
                        : 'Copy install command',
                      onClick: Message.ClickedCopyInstall(),
                      children: [icon(model.copied ? 'check' : 'copy', h)],
                    },
                    h,
                  ),
                ],
              ),
              h.p(
                [h.Class(tourSkin.terminalFooter)],
                ['MIT licensed. Source in your project. Built on Foldkit UI.'],
              ),
            ],
          ),
        ],
      ),
    ],
  )

export const view = (
  model: Model,
  h: HtmlBuilder<Message>,
  isDark = false,
): Html =>
  h.div(
    [h.DataAttribute('landing-tour', '')],
    [
      h.link([
        h.Rel('stylesheet'),
        h.Href(
          'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap',
        ),
      ]),
      showcaseView(model, isDark, h),
      studioView(model, isDark, h),
      stateView(model, h),
      playgroundView(model, h),
      chartView(model, h),
      mapView(isDark, h),
      gettingStartedView(model, h),
    ],
  )
