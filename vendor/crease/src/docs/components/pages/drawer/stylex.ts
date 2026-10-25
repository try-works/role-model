import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
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
import * as Button from '@/stylex/button'
import * as Dialog from '@/stylex/dialog'
import * as Drawer from '@/stylex/drawer'
import * as Field from '@/stylex/field'
import * as Input from '@/stylex/input'
import { className } from '@/stylex/style'

const styles = stylex.create({
  body: {
    paddingInline: '1rem',
    paddingBlockEnd: '1.5rem',
    textAlign: 'center',
  },
  value: {
    fontSize: '3rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 700,
    lineHeight: 1,
  },
  label: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  scrollBody: { padding: '1rem', flex: '1', overflowY: 'auto' },
  lorem: { lineHeight: 'normal', marginBlockEnd: '1rem' },
  triggerRow: { gap: '0.5rem', display: 'flex', flexWrap: 'wrap' },
  compact: { maxWidth: '24rem' },
  counterRow: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  roundButton: {
    borderColor: 'var(--border)',
    borderRadius: '9999px',
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '2rem',
    width: '2rem',
  },
  counterValue: {
    fontSize: '4.5rem',
    fontWeight: 700,
    letterSpacing: '-0.05em',
    lineHeight: 1,
  },
  counterLabel: {
    color: 'var(--muted-foreground)',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
  },
  rtlWrap: { marginInline: 'auto', maxWidth: '24rem', width: '100%' },
  chartBox: { marginBlockStart: '0.75rem', height: '7.5rem' },
  counterFlex: {
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    textAlign: 'center',
  },
  rtlBody: { paddingInline: '1rem', paddingBlockEnd: 0 },
  fillWrap: { padding: '1rem', flex: '1' },
  fillY: { backgroundColor: 'var(--muted)', height: '20rem', width: '100%' },
  fillX: { backgroundColor: 'var(--muted)', height: '100%', width: '100%' },
  snapGrid: {
    padding: '1rem',
    flex: '1',
    gap: '0.75rem',
    display: 'grid',
    overflowY: 'auto',
  },
  snapBlock: { backgroundColor: 'var(--muted)', height: '3rem' },
  snapPanel: { maxHeight: 'calc(100dvh - 1rem)' },
  sizeDown: { height: '16rem' },
  sizeUp: { height: '50vh' },
  sizeLeft: { width: '36rem' },
  sizeRight: { width: '20rem' },
})

type PreviewModel = Readonly<{
  drawer: Drawer.Model
  drawer2: Drawer.Model
  drawer3: Drawer.Model
  dialog: Dialog.Model
  side: DrawerSide
  goal: number
  name: string
  username: string
}>

const msg = <Msg>(
  onMessageJson: (json: string) => Msg,
  tag: string,
  fields?: Record<string, unknown>,
): Msg => onMessageJson(JSON.stringify({ _tag: tag, ...fields }))

const scrollableContent = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.scrollBody))],
    Array.from({ length: 20 }).map((_, index) =>
      h.p(
        [h.Key(String(index)), h.Class(className(reset.text, styles.lorem))],
        [drawerLorem],
      ),
    ),
  )

/** Plain muted fill block — sized off the preview's current direction (the
    stylex equivalent of the tailwind `group-data-[swipe-axis=…]` classes). */
const mutedBlock = <Msg>(side: DrawerSide, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.fillWrap))],
    [
      h.div(
        [
          h.Class(
            className(
              side === 'up' || side === 'down' ? styles.fillY : styles.fillX,
            ),
          ),
        ],
        [],
      ),
    ],
  )

/** Grid of muted blocks used by the snap-points example. */
const snapBlocks = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.snapGrid))],
    Array.from({ length: 16 }).map((_, index) =>
      h.div([h.Key(String(index)), h.Class(className(styles.snapBlock))], []),
    ),
  )

const goalContent = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.body))],
    [
      h.p([h.Class(className(reset.text, styles.value))], ['350']),
      h.p([h.Class(className(reset.text, styles.label))], ['Calories per day']),
    ],
  )

const profileFields = <Msg>(
  exampleIndex: number,
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Field.fieldGroup(
    {
      children: (
        [
          { id: 'name', label: 'Name', value: model.name, tag: 'ChangedName' },
          {
            id: 'username',
            label: 'Username',
            value: model.username,
            tag: 'ChangedUsername',
          },
        ] as const
      ).map(field =>
        Field.field(
          {
            children: [
              Field.fieldLabel(
                {
                  for: `docs-drawer-${String(exampleIndex)}-${field.id}`,
                  children: [field.label],
                },
                h,
              ),
              Field.fieldContent(
                {
                  children: [
                    Input.input(
                      {
                        id: `docs-drawer-${String(exampleIndex)}-${field.id}`,
                        value: field.value,
                        onInput: value =>
                          msg(onMessageJson, field.tag, { value }),
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

const rtlContent = <Msg>(
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Dir('rtl'), h.Class(className(styles.rtlWrap))],
    [
      h.div(
        [h.Class(className(styles.rtlBody))],
        [
          h.div(
            [h.Class(className(styles.counterRow))],
            [
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(msg(onMessageJson, 'AdjustedGoal', { delta: -10 })),
                  h.Disabled(model.goal <= 200),
                  h.AriaLabel(drawerRtlCopy.decrease),
                  h.Class(className(reset.button, styles.roundButton)),
                ],
                ['−'],
              ),
              h.div(
                [h.Class(className(styles.counterFlex))],
                [
                  h.p(
                    [h.Class(className(reset.text, styles.counterValue))],
                    [String(model.goal)],
                  ),
                  h.p(
                    [h.Class(className(reset.text, styles.counterLabel))],
                    [drawerRtlCopy.calories],
                  ),
                ],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(msg(onMessageJson, 'AdjustedGoal', { delta: 10 })),
                  h.Disabled(model.goal >= 400),
                  h.AriaLabel(drawerRtlCopy.increase),
                  h.Class(className(reset.button, styles.roundButton)),
                ],
                ['+'],
              ),
            ],
          ),
          h.div(
            [h.Class(className(styles.chartBox))],
            [
              Chart.chart(
                {
                  accessibleAlternative: h.p(
                    [h.Class(className(reset.text))],
                    ['Bar chart of daily activity goals.'],
                  ),
                  ariaLabel: 'Activity goal chart',
                  hostId: 'docs-drawer-rtl-chart',
                  toMessage: (message: Chart.ChartMessage): Msg =>
                    onMessageJson(JSON.stringify(message)),
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

const closeOnlyFooter = <Msg>(
  slots: Slots<Msg>,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html> => [
  Button.button(
    {
      variant: 'outline',
      size: 'lg',
      buttonAttributes: [...slots.closeButton, h.Type('button')],
      children: ['Close'],
    },
    h,
  ),
]

const primaryButton = <Msg>(
  label: string,
  onClick: Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Button.button(
    {
      size: 'lg',
      buttonAttributes: [h.Type('button'), h.OnClick(onClick)],
      children: [label],
    },
    h,
  )

/** One nested drawer level — renders its own footer with either the next
    nested drawer or a plain close button at the deepest level. */
const nestedDrawerView = <Msg>(
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
  depth: 2 | 3,
): Html => {
  const drawerModel = depth === 2 ? model.drawer2 : model.drawer3
  const tag =
    depth === 2 ? 'GotDrawer2PreviewMessage' : 'GotDrawer3PreviewMessage'
  const title = depth === 2 ? 'Nested drawer' : 'Third drawer'
  const description =
    depth === 2
      ? 'The parent drawer stays mounted behind this one.'
      : 'This is the frontmost drawer in the stack.'
  return Drawer.drawer(
    {
      model: drawerModel,
      toParentMessage: (message: Drawer.Message): Msg =>
        msg(onMessageJson, tag, { message }),
      title,
      description,
      content: () => [mutedBlock(model.side, h)],
      footer: slots => [
        ...(depth === 2
          ? [
              primaryButton(
                'Open third drawer',
                msg(onMessageJson, 'OpenedNested3'),
                h,
              ),
              nestedDrawerView(model, onMessageJson, h, 3),
            ]
          : []),
        ...closeOnlyFooter(slots, h),
      ],
    },
    h,
  )
}

const footerActions = <Msg>(
  slots: Slots<Msg>,
  h: HtmlBuilder<Msg>,
  primary: string,
  outline: string,
): ReadonlyArray<Html> => [
  Button.button(
    {
      size: 'lg',
      buttonAttributes: [...slots.closeButton, h.Type('button')],
      children: [primary],
    },
    h,
  ),
  Button.button(
    {
      variant: 'outline',
      size: 'lg',
      buttonAttributes: [...slots.closeButton, h.Type('button')],
      children: [outline],
    },
    h,
  ),
]

const drawerView = <Msg>(
  exampleIndex: number,
  fixture: DrawerFixture,
  model: PreviewModel,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const shared = {
    model: model.drawer,
    toParentMessage: (message: Drawer.Message): Msg =>
      msg(onMessageJson, 'GotDrawerPreviewMessage', { message }),
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
          content: () => [mutedBlock(model.side, h)],
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
          content: () => [mutedBlock(model.side, h)],
        },
        h,
      )
    case 'custom-size':
      return Drawer.drawer(
        {
          ...shared,
          layoutStyle:
            model.side === 'down'
              ? styles.sizeDown
              : model.side === 'up'
                ? styles.sizeUp
                : model.side === 'left'
                  ? styles.sizeLeft
                  : styles.sizeRight,
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
          layoutStyle: styles.snapPanel,
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
          content: () => [mutedBlock(model.side, h)],
          footer: slots => [
            primaryButton(
              'Open nested drawer',
              msg(onMessageJson, 'OpenedNested2'),
              h,
            ),
            nestedDrawerView(model, onMessageJson, h, 2),
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
          content: () => [mutedBlock(model.side, h)],
          footer: slots => closeOnlyFooter(slots, h),
        },
        h,
      )
    case 'rtl':
      return Drawer.drawer(
        {
          ...shared,
          title: drawerRtlCopy.title,
          description: drawerRtlCopy.description,
          content: () => [rtlContent(model, onMessageJson, h)],
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
              toParentMessage: (message: Dialog.Message): Msg =>
                msg(onMessageJson, 'GotDialogPreviewMessage', { message }),
              title: 'Edit profile',
              description:
                "Make changes to your profile here. Click save when you're done.",
              layoutStyle: styles.compact,
              content: () => [
                profileFields(exampleIndex, model, onMessageJson, h),
              ],
            },
            h,
          ),
          Drawer.drawer(
            {
              ...shared,
              title: 'Edit profile',
              description:
                "Make changes to your profile here. Click save when you're done.",
              content: () => [
                profileFields(exampleIndex, model, onMessageJson, h),
              ],
              footer: slots => [
                Button.button(
                  {
                    variant: 'outline',
                    size: 'lg',
                    buttonAttributes: [...slots.closeButton, h.Type('button')],
                    children: ['Cancel'],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      )
  }
}

export const drawerStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = drawerFixtures[exampleIndex]
  if (fixture === undefined) return undefined
  const preview = model as PreviewModel
  const trigger = usesDirectionTriggers(fixture.kind)
    ? h.div(
        [h.Class(className(styles.triggerRow))],
        drawerSides.map(side =>
          Button.button(
            {
              variant: 'outline',
              onClick: msg(onMessageJson, 'OpenedDrawerSide', { side }),
              children: [side],
            },
            h,
          ),
        ),
      )
    : Button.button(
        {
          variant: 'outline',
          onClick: msg(onMessageJson, 'OpenedDrawerPreview'),
          children: [fixture.triggerLabel],
        },
        h,
      )
  return h.div(
    [],
    [trigger, drawerView(exampleIndex, fixture, preview, onMessageJson, h)],
  )
}
