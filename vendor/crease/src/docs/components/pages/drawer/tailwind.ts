import { Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type DrawerFixture,
  type DrawerSide,
  drawerFixtures,
  drawerLorem,
  drawerRtlCopy,
  drawerSides,
  usesDirectionTriggers,
} from '@/docs/components/pages/drawer/shared'
import * as Chart from '@/lib/echarts'
import * as Button from '@/ui/button'
import * as Dialog from '@/ui/dialog'
import * as Drawer from '@/ui/drawer'
import * as Field from '@/ui/field'
import * as Input from '@/ui/input'

Chart.registerChart('docs-drawer-rtl-chart', theme => ({
  grid: Chart.compactGrid(),
  series: [
    {
      data: [350, 350, 350, 350, 350, 350, 350],
      itemStyle: { color: theme.chart2 },
      name: 'Goal',
      type: 'bar',
    },
  ],
  tooltip: Chart.tooltipOptions(theme),
  xAxis: {
    ...Chart.categoryAxis(
      theme,
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      { boundaryGap: true },
    ),
    inverse: true,
  },
  yAxis: Chart.valueAxis(theme, { showLabels: false }),
}))

const DrawerPreviewMessageUnion = defineMessageUnion({
  OpenedDrawerPreview: {},
  OpenedDrawerSide: { side: S.Literals(['up', 'right', 'down', 'left']) },
  OpenedNested2: {},
  OpenedNested3: {},
  GotDrawerPreviewMessage: { message: Drawer.Message },
  GotDrawer2PreviewMessage: { message: Drawer.Message },
  GotDrawer3PreviewMessage: { message: Drawer.Message },
  GotDialogPreviewMessage: { message: Dialog.Message },
  ChangedViewport: { isDesktop: S.Boolean },
  ChangedName: { value: S.String },
  ChangedUsername: { value: S.String },
  AdjustedGoal: { delta: S.Number },
})
const DrawerPreviewMessage = S.Union([
  DrawerPreviewMessageUnion,
  Chart.ChartMessage,
])
type DrawerPreviewMessage = typeof DrawerPreviewMessage.Type
const DrawerPreviewModel = S.Struct({
  _docsPage: S.Literal('drawer'),
  kind: S.Literals([
    'goal',
    'side',
    'scroll',
    'sides',
    'swipe-handle',
    'custom-size',
    'snap-points',
    'nested',
    'non-modal',
    'responsive',
    'rtl',
  ]),
  drawer: Drawer.Model,
  drawer2: Drawer.Model,
  drawer3: Drawer.Model,
  dialog: Dialog.Model,
  side: S.Literals(['up', 'right', 'down', 'left']),
  isDesktop: S.Boolean,
  name: S.String,
  username: S.String,
  goal: S.Number,
})
type DrawerPreviewModel = typeof DrawerPreviewModel.Type

const isDesktop = (): boolean =>
  typeof window === 'undefined'
    ? true
    : window.matchMedia('(min-width: 768px)').matches

const subscriptions =
  typeof window === 'undefined'
    ? undefined
    : Subscription.make<DrawerPreviewModel, DrawerPreviewMessage>()(() => ({
        viewport: Subscription.persistent(
          Subscription.fromEvent({
            target: () => window,
            type: 'resize',
            mapEvent: () =>
              DrawerPreviewMessageUnion.ChangedViewport({
                isDesktop: isDesktop(),
              }),
          }),
        ),
      }))

const scrollableContent = (h: HtmlBuilder<DrawerPreviewMessage>): Html =>
  h.div(
    [h.Class('flex-1 overflow-y-auto p-4')],
    Array.from({ length: 20 }).map((_, index) =>
      h.p(
        [h.Key(String(index)), h.Class('mb-4 leading-normal')],
        [drawerLorem],
      ),
    ),
  )

/** Plain muted fill block — sizes itself off the popup's swipe axis like the
    shadcn examples (`group-data-[swipe-axis=…]/drawer-popup`). */
const mutedBlock = (h: HtmlBuilder<DrawerPreviewMessage>): Html =>
  h.div(
    [h.Class('flex-1 p-4')],
    [
      h.div(
        [
          h.Class(
            'bg-muted group-data-[swipe-axis=x]/drawer-popup:size-full group-data-[swipe-axis=y]/drawer-popup:h-80 group-data-[swipe-axis=y]/drawer-popup:w-full',
          ),
        ],
        [],
      ),
    ],
  )

/** Grid of muted blocks used by the snap-points example. */
const snapBlocks = (h: HtmlBuilder<DrawerPreviewMessage>): Html =>
  h.div(
    [h.Class('grid flex-1 gap-3 overflow-y-auto p-4')],
    Array.from({ length: 16 }).map((_, index) =>
      h.div([h.Key(String(index)), h.Class('h-12 bg-muted')], []),
    ),
  )

const goalContent = (h: HtmlBuilder<DrawerPreviewMessage>): Html =>
  h.div(
    [h.Class('px-4 pb-6 text-center')],
    [
      h.p([h.Class('text-5xl font-bold tabular-nums')], ['350']),
      h.p([h.Class('text-sm text-muted-foreground')], ['Calories per day']),
    ],
  )

const profileFields = (
  index: number,
  model: DrawerPreviewModel,
  h: HtmlBuilder<DrawerPreviewMessage>,
): Html =>
  Field.fieldGroup(
    {
      children: (
        [
          {
            id: 'name',
            label: 'Name',
            value: model.name,
            toMessage: DrawerPreviewMessageUnion.ChangedName,
          },
          {
            id: 'username',
            label: 'Username',
            value: model.username,
            toMessage: DrawerPreviewMessageUnion.ChangedUsername,
          },
        ] as const
      ).map(field =>
        Field.field(
          {
            children: [
              Field.fieldLabel(
                {
                  for: `docs-drawer-${String(index)}-${field.id}`,
                  children: [field.label],
                },
                h,
              ),
              Field.fieldContent(
                {
                  children: [
                    Input.input(
                      {
                        id: `docs-drawer-${String(index)}-${field.id}`,
                        value: field.value,
                        onInput: value => field.toMessage({ value }),
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
      ),
    },
    h,
  )

const rtlContent = (
  model: DrawerPreviewModel,
  h: HtmlBuilder<DrawerPreviewMessage>,
): Html =>
  h.div(
    [h.Dir('rtl'), h.Class('mx-auto w-full max-w-sm')],
    [
      h.div(
        [h.Class('p-4 pb-0')],
        [
          h.div(
            [h.Class('flex items-center justify-center gap-2')],
            [
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(
                    DrawerPreviewMessageUnion.AdjustedGoal({ delta: -10 }),
                  ),
                  h.Disabled(model.goal <= 200),
                  h.AriaLabel(drawerRtlCopy.decrease),
                  h.Class('h-8 w-8 shrink-0 rounded-full border'),
                ],
                ['−'],
              ),
              h.div(
                [h.Class('flex-1 text-center')],
                [
                  h.p(
                    [h.Class('text-7xl font-bold tracking-tighter')],
                    [String(model.goal)],
                  ),
                  h.p(
                    [
                      // eslint-disable-next-line shadcn/no-arbitrary-values -- reason: mirrors the shadcn drawer goal example's text-[0.70rem] label verbatim.
                      h.Class('text-[0.70rem] uppercase text-muted-foreground'),
                    ],
                    [drawerRtlCopy.calories],
                  ),
                ],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(
                    DrawerPreviewMessageUnion.AdjustedGoal({ delta: 10 }),
                  ),
                  h.Disabled(model.goal >= 400),
                  h.AriaLabel(drawerRtlCopy.increase),
                  h.Class('h-8 w-8 shrink-0 rounded-full border'),
                ],
                ['+'],
              ),
            ],
          ),
          h.div(
            [h.Class('mt-3 h-30')],
            [
              Chart.chart(
                {
                  accessibleAlternative: h.p(
                    [],
                    ['Bar chart of daily activity goals.'],
                  ),
                  ariaLabel: 'Activity goal chart',
                  hostId: 'docs-drawer-rtl-chart',
                  toMessage: (
                    message: Chart.ChartMessage,
                  ): DrawerPreviewMessage => message,
                },
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )

type Slots<Msg> = Parameters<NonNullable<Drawer.DrawerProps<Msg>['footer']>>[0]

const footerActions = (
  slots: Slots<DrawerPreviewMessage>,
  h: HtmlBuilder<DrawerPreviewMessage>,
  primary: string,
  outline: string,
): ReadonlyArray<Html> => [
  h.button(
    [
      ...slots.closeButton,
      h.Type('button'),
      h.Class(
        'rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground',
      ),
    ],
    [primary],
  ),
  h.button(
    [
      ...slots.closeButton,
      h.Type('button'),
      h.Class('rounded-md border px-4 py-2 text-sm'),
    ],
    [outline],
  ),
]

const cancelOnlyFooter = (
  slots: Slots<DrawerPreviewMessage>,
  h: HtmlBuilder<DrawerPreviewMessage>,
): ReadonlyArray<Html> => [
  h.button(
    [
      ...slots.closeButton,
      h.Type('button'),
      h.Class('rounded-md border px-4 py-2 text-sm'),
    ],
    ['Cancel'],
  ),
]

const closeOnlyFooter = (
  slots: Slots<DrawerPreviewMessage>,
  h: HtmlBuilder<DrawerPreviewMessage>,
): ReadonlyArray<Html> => [
  h.button(
    [
      ...slots.closeButton,
      h.Type('button'),
      h.Class('rounded-md border px-4 py-2 text-sm'),
    ],
    ['Close'],
  ),
]

const primaryButton = (
  label: string,
  onClick: DrawerPreviewMessage,
  h: HtmlBuilder<DrawerPreviewMessage>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(onClick),
      h.Class(
        'rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground',
      ),
    ],
    [label],
  )

/** One nested drawer level — renders its own footer with either the next
    nested drawer or a plain close button at the deepest level. */
const nestedDrawerView = (
  model: DrawerPreviewModel,
  h: HtmlBuilder<DrawerPreviewMessage>,
  depth: 2 | 3,
): Html => {
  const drawerModel = depth === 2 ? model.drawer2 : model.drawer3
  const toMessage =
    depth === 2
      ? (message: Drawer.Message): DrawerPreviewMessage =>
          DrawerPreviewMessageUnion.GotDrawer2PreviewMessage({ message })
      : (message: Drawer.Message): DrawerPreviewMessage =>
          DrawerPreviewMessageUnion.GotDrawer3PreviewMessage({ message })
  const title = depth === 2 ? 'Nested drawer' : 'Third drawer'
  const description =
    depth === 2
      ? 'The parent drawer stays mounted behind this one.'
      : 'This is the frontmost drawer in the stack.'
  return Drawer.drawer(
    {
      model: drawerModel,
      toParentMessage: toMessage,
      title,
      description,
      content: () => [mutedBlock(h)],
      footer: slots => [
        ...(depth === 2
          ? [
              primaryButton(
                'Open third drawer',
                DrawerPreviewMessageUnion.OpenedNested3(),
                h,
              ),
              nestedDrawerView(model, h, 3),
            ]
          : []),
        ...closeOnlyFooter(slots, h),
      ],
    },
    h,
  )
}

/** Custom-size overrides per swipe direction (shadcn Custom Width and Height). */
const CUSTOM_SIZE_CLASS =
  // eslint-disable-next-line shadcn/no-arbitrary-values -- reason: h-[50vh] mirrors the shadcn Custom Height drawer example verbatim.
  'data-[swipe-direction=down]:h-64 data-[swipe-direction=up]:h-[50vh] data-[swipe-direction=left]:w-xl data-[swipe-direction=right]:w-xs'

const drawerView = (
  index: number,
  fixture: DrawerFixture,
  model: DrawerPreviewModel,
  h: HtmlBuilder<DrawerPreviewMessage>,
): Html => {
  const shared = {
    model: model.drawer,
    toParentMessage: (message: Drawer.Message): DrawerPreviewMessage =>
      DrawerPreviewMessageUnion.GotDrawerPreviewMessage({ message }),
    title: 'Move goal',
    description: 'Set your daily activity goal.',
  } as const
  switch (fixture.kind) {
    case 'goal':
    case 'side':
      return Drawer.drawer(
        {
          ...shared,
          content: () => [goalContent(h)],
          footer: slots => footerActions(slots, h, 'Save goal', 'Cancel'),
        },
        h,
      )
    case 'scroll':
      return Drawer.drawer(
        {
          ...shared,
          title: 'Move Goal',
          content: () => [scrollableContent(h)],
          footer: slots => footerActions(slots, h, 'Submit', 'Cancel'),
        },
        h,
      )
    case 'sides':
      return Drawer.drawer(
        {
          ...shared,
          title: 'Move Goal',
          content: () => [mutedBlock(h)],
          footer: slots => footerActions(slots, h, 'Submit', 'Cancel'),
        },
        h,
      )
    case 'swipe-handle':
      return Drawer.drawer(
        {
          ...shared,
          showSwipeHandle: true,
          title: 'Drawer',
          description: 'Drawer with a swipe handle.',
          content: () => [mutedBlock(h)],
        },
        h,
      )
    case 'custom-size':
      return Drawer.drawer(
        {
          ...shared,
          class: CUSTOM_SIZE_CLASS,
          title: `${model.side} drawer`,
          description: 'Drawer with a custom size.',
          content: () => [scrollableContent(h)],
          footer: slots => closeOnlyFooter(slots, h),
        },
        h,
      )
    case 'snap-points':
      return Drawer.drawer(
        {
          ...shared,
          showSwipeHandle: true,
          // eslint-disable-next-line shadcn/no-arbitrary-values -- reason: the snap-points panel caps at 100dvh-1rem per the shadcn snap-points example.
          class: 'max-h-[calc(100dvh-1rem)]',
          title: 'Snap points',
          description:
            'Drag the drawer to snap between a compact peek and a near full-height view.',
          content: () => [snapBlocks(h)],
        },
        h,
      )
    case 'nested':
      return Drawer.drawer(
        {
          ...shared,
          title: 'Drawer',
          description: 'Open another drawer from the same direction.',
          content: () => [mutedBlock(h)],
          footer: slots => [
            primaryButton(
              'Open nested drawer',
              DrawerPreviewMessageUnion.OpenedNested2(),
              h,
            ),
            nestedDrawerView(model, h, 2),
            ...closeOnlyFooter(slots, h),
          ],
        },
        h,
      )
    case 'non-modal':
      return Drawer.drawer(
        {
          ...shared,
          title: 'Non Modal Drawer',
          content: () => [mutedBlock(h)],
          footer: slots => closeOnlyFooter(slots, h),
        },
        h,
      )
    case 'rtl':
      return Drawer.drawer(
        {
          model: model.drawer,
          toParentMessage: (message: Drawer.Message): DrawerPreviewMessage =>
            DrawerPreviewMessageUnion.GotDrawerPreviewMessage({ message }),
          title: drawerRtlCopy.title,
          description: drawerRtlCopy.description,
          content: () => [rtlContent(model, h)],
          footer: slots =>
            footerActions(slots, h, drawerRtlCopy.submit, drawerRtlCopy.cancel),
        },
        h,
      )
    case 'responsive':
      return h.div(
        [],
        [
          Dialog.dialog(
            {
              model: model.dialog,
              toParentMessage: (
                message: Dialog.Message,
              ): DrawerPreviewMessage =>
                DrawerPreviewMessageUnion.GotDialogPreviewMessage({ message }),
              title: 'Edit profile',
              description:
                "Make changes to your profile here. Click save when you're done.",
              class: 'sm:max-w-sm',
              content: () => [profileFields(index, model, h)],
            },
            h,
          ),
          Drawer.drawer(
            {
              ...shared,
              title: 'Edit profile',
              description:
                "Make changes to your profile here. Click save when you're done.",
              content: () => [profileFields(index, model, h)],
              footer: slots => cancelOnlyFooter(slots, h),
            },
            h,
          ),
        ],
      )
  }
}

const triggerView = (
  fixture: DrawerFixture,
  index: number,
  h: HtmlBuilder<DrawerPreviewMessage>,
): Html => {
  if (usesDirectionTriggers(fixture.kind)) {
    return h.div(
      [h.Class('flex flex-wrap gap-2')],
      drawerSides.map(side =>
        Button.button(
          {
            variant: 'outline',
            onClick: DrawerPreviewMessageUnion.OpenedDrawerSide({ side }),
            children: [side],
          },
          h,
        ),
      ),
    )
  }
  return Button.button(
    {
      variant: 'outline',
      onClick: DrawerPreviewMessageUnion.OpenedDrawerPreview(),
      children: [fixture.triggerLabel],
    },
    h,
  )
}

/** Per-example Drawer.init config — swipeDirection baked for single-trigger
    kinds; direction-triggered kinds set it on open. */
const drawerInitFor = (fixture: DrawerFixture, id: string): Drawer.Model => {
  const common = { id, isAnimated: true }
  switch (fixture.kind) {
    case 'side':
      return Drawer.init({ ...common, swipeDirection: 'right' })
    case 'snap-points':
      return Drawer.init({ ...common, snapPoints: ['31rem', 1] })
    case 'non-modal':
      return Drawer.init({
        ...common,
        swipeDirection: 'right',
        modal: false,
        disablePointerDismissal: true,
      })
    case 'rtl':
      return Drawer.init({ ...common, swipeDirection: 'left' })
    default:
      return Drawer.init(common)
  }
}

export const drawerTailwindPreviewProgram = definePreviewProgram<
  DrawerPreviewModel,
  DrawerPreviewMessage
>({
  Model: DrawerPreviewModel,
  Message: DrawerPreviewMessage,
  init: index => {
    const fixture = drawerFixtures[index] ?? drawerFixtures[0]!
    return {
      _docsPage: 'drawer' as const,
      kind: fixture.kind,
      drawer: drawerInitFor(fixture, `docs-drawer-${String(index)}`),
      drawer2: Drawer.init({
        id: `docs-drawer-${String(index)}-nested-2`,
        isAnimated: true,
      }),
      drawer3: Drawer.init({
        id: `docs-drawer-${String(index)}-nested-3`,
        isAnimated: true,
      }),
      dialog: Dialog.init({
        id: `docs-drawer-dialog-${String(index)}`,
        isAnimated: true,
      }),
      side: 'down' as const,
      isDesktop: isDesktop(),
      name: 'Pedro Duarte',
      username: '@peduarte',
      goal: 350,
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'OpenedDrawerPreview': {
        if (model.kind === 'responsive' && model.isDesktop) {
          const result = Dialog.open(model.dialog)
          return {
            model: { ...model, dialog: result.model },
            commands: Command.mapMessages(result.commands ?? [], next =>
              DrawerPreviewMessageUnion.GotDialogPreviewMessage({
                message: next,
              }),
            ),
          }
        }
        const result = Drawer.open(model.drawer)
        return {
          model: { ...model, drawer: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            DrawerPreviewMessageUnion.GotDrawerPreviewMessage({
              message: next,
            }),
          ),
        }
      }
      case 'OpenedDrawerSide': {
        const next = { ...model, side: message.side }
        const result = Drawer.open({
          ...next.drawer,
          swipeDirection: message.side,
        })
        return {
          model: { ...next, drawer: result.model },
          commands: Command.mapMessages(result.commands ?? [], n =>
            DrawerPreviewMessageUnion.GotDrawerPreviewMessage({ message: n }),
          ),
        }
      }
      case 'OpenedNested2': {
        const result = Drawer.open({
          ...model.drawer2,
          swipeDirection: model.side,
        })
        return {
          model: { ...model, drawer2: result.model },
          commands: Command.mapMessages(result.commands ?? [], n =>
            DrawerPreviewMessageUnion.GotDrawer2PreviewMessage({ message: n }),
          ),
        }
      }
      case 'OpenedNested3': {
        const result = Drawer.open({
          ...model.drawer3,
          swipeDirection: model.side,
        })
        return {
          model: { ...model, drawer3: result.model },
          commands: Command.mapMessages(result.commands ?? [], n =>
            DrawerPreviewMessageUnion.GotDrawer3PreviewMessage({ message: n }),
          ),
        }
      }
      case 'GotDrawer2PreviewMessage': {
        const result = Drawer.update(model.drawer2, message.message)
        return {
          model: { ...model, drawer2: result.model },
          commands: Command.mapMessages(result.commands ?? [], n =>
            DrawerPreviewMessageUnion.GotDrawer2PreviewMessage({ message: n }),
          ),
        }
      }
      case 'GotDrawer3PreviewMessage': {
        const result = Drawer.update(model.drawer3, message.message)
        return {
          model: { ...model, drawer3: result.model },
          commands: Command.mapMessages(result.commands ?? [], n =>
            DrawerPreviewMessageUnion.GotDrawer3PreviewMessage({ message: n }),
          ),
        }
      }
      case 'GotDrawerPreviewMessage': {
        const result = Drawer.update(model.drawer, message.message)
        return {
          model: { ...model, drawer: result.model },
          commands: Command.mapMessages(result.commands ?? [], n =>
            DrawerPreviewMessageUnion.GotDrawerPreviewMessage({ message: n }),
          ),
        }
      }
      case 'GotDialogPreviewMessage': {
        const result = Dialog.update(model.dialog, message.message)
        return {
          model: { ...model, dialog: result.model },
          commands: Command.mapMessages(result.commands ?? [], n =>
            DrawerPreviewMessageUnion.GotDialogPreviewMessage({ message: n }),
          ),
        }
      }
      case 'ChangedViewport':
        return { model: { ...model, isDesktop: message.isDesktop } }
      case 'ChangedName':
        return { model: { ...model, name: message.value } }
      case 'ChangedUsername':
        return { model: { ...model, username: message.value } }
      case 'AdjustedGoal':
        return {
          model: {
            ...model,
            goal: Math.max(200, Math.min(400, model.goal + message.delta)),
          },
        }
      case 'CompletedSyncChart':
      case 'ChartMounted':
      case 'ChartMountFailed':
        return { model }
    }
  },
  view: (index, model, h) => {
    const fixture = drawerFixtures[index] ?? drawerFixtures[0]!
    return h.div(
      [],
      [triggerView(fixture, index, h), drawerView(index, fixture, model, h)],
    )
  },
  ...(subscriptions === undefined ? {} : { subscriptions }),
})
