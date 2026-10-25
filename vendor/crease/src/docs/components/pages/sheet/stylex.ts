import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Option } from 'effect'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type BottomSheetFixture,
  directionSteps,
  heightsCopy,
  sheetDocFixtures,
  type SheetInstance,
} from '@/docs/components/pages/sheet/shared'
import * as Button from '@/stylex/button'
import * as Checkbox from '@/stylex/checkbox'
import * as Input from '@/stylex/input'
import * as Label from '@/stylex/label'
import * as RadioGroup from '@/stylex/radio-group'
import * as Separator from '@/stylex/separator'
import * as Sheet from '@/stylex/sheet'
import { className } from '@/stylex/style'
import * as Textarea from '@/stylex/textarea'

const styles = stylex.create({
  wrap: { gap: '0.5rem', display: 'flex', flexWrap: 'wrap' },
  fieldsWrap: {
    gap: '1.5rem',
    paddingInline: '1rem',
    display: 'grid',
    flexGrow: 1,
    gridAutoRows: 'min-content',
  },
  field: { gap: '0.75rem', display: 'grid' },
  loremWrap: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '1rem',
    marginInline: 'auto',
    minHeight: 0,
    maxWidth: '42rem',
    overflowY: 'auto',
    paddingInline: '1rem',
    width: '100%',
  },
  paragraph: { margin: 0, fontSize: '0.875rem', lineHeight: 1.625 },
  // bottom-sheet examples
  main: {
    padding: '2rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  sheetBody: {
    marginInline: 'auto',
    maxWidth: '32rem',
    width: '100%',
    padding: '1rem',
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  sheetHeading: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  },
  sheetHeadingCapitalize: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
    textTransform: 'capitalize',
  },
  sheetText: { margin: 0, fontSize: '0.875rem', lineHeight: '1.25rem' },
  sheetMeta: {
    margin: 0,
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  filterRows: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  stackTight: { gap: '0.25rem', display: 'flex', flexDirection: 'column' },
  stackLoose: { gap: '0.75rem', display: 'flex', flexDirection: 'column' },
  footerRow: { gap: '0.5rem', display: 'flex', justifyContent: 'flex-end' },
  triggerRow: { gap: '0.5rem', display: 'flex', flexWrap: 'wrap' },
  pageStack: {
    padding: '1rem',
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  },
  pageStackNarrow: {
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '28rem',
  },
  pageHeading: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  },
  timeRow: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
  timeLabel: { fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.25rem' },
  timeMeta: {
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  stepsList: { display: 'flex', flexDirection: 'column' },
  stepRow: {
    gap: '0.75rem',
    paddingBlock: '0.5rem',
    alignItems: 'center',
    display: 'flex',
  },
  stepTextWrap: { flexBasis: '0%', flexGrow: 1, flexShrink: 1 },
  stepLabel: { margin: 0, fontSize: '0.875rem', lineHeight: '1.25rem' },
  stepDetail: {
    margin: 0,
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  stepDistance: {
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  itemLabel: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
})

interface PreviewShape {
  readonly sheets: Readonly<Record<string, Sheet.Model>>
  readonly values: Readonly<Record<string, string>>
  readonly bottomSheet: Sheet.Model
  readonly switcher: Sheet.SwitcherModel
  readonly inStock: boolean
  readonly onSale: boolean
  readonly freeShipping: boolean
  readonly frequency: RadioGroup.Model
  readonly frequencyValue: string
  readonly emailChannel: boolean
  readonly pushChannel: boolean
  readonly textChannel: boolean
  readonly name: string
  readonly email: string
  readonly company: string
  readonly role: string
  readonly bio: string
  readonly notes: string
  readonly selectedHeight: 'hug' | 'capped' | 'tall'
  readonly backgroundClicks: number
}

const msg = <Msg>(
  onMessageJson: (json: string) => Msg,
  tag: string,
  fields?: Record<string, unknown>,
): Msg => onMessageJson(JSON.stringify({ _tag: tag, ...fields }))

const LOREM: ReadonlyArray<string> = Array.from(
  { length: 10 },
  () =>
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
)

const instanceView = <Msg>(
  instance: SheetInstance,
  preview: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const content: Array<Html> = []
  if (instance.fields !== undefined) {
    content.push(
      h.div(
        [h.Class(className(styles.fieldsWrap))],
        instance.fields.map(field =>
          h.div(
            [h.Class(className(styles.field))],
            [
              Label.label(
                {
                  for: `sheet-field-${field.id}`,
                  children: [field.label],
                },
                h,
              ),
              Input.input(
                {
                  id: `sheet-field-${field.id}`,
                  value: preview.values[field.id] ?? field.value,
                  onInput: value =>
                    onMessageJson(
                      JSON.stringify({
                        _tag: 'ChangedSheetInput',
                        id: field.id,
                        value,
                      }),
                    ),
                },
                h,
              ),
            ],
          ),
        ),
      ),
    )
  }
  if (instance.loremBody === true) {
    content.push(
      h.div(
        [h.Class(className(styles.loremWrap))],
        LOREM.map(paragraph =>
          h.p([h.Class(className(reset.text, styles.paragraph))], [paragraph]),
        ),
      ),
    )
  }
  return Sheet.sheet(
    {
      model:
        preview.sheets[instance.id] ??
        Sheet.init({ id: `sheet-${instance.id}`, isAnimated: true }),
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({
            _tag: 'GotSheetMessage',
            id: instance.id,
            message,
          }),
        ),
      side: instance.side,
      title: instance.panelTitle,
      ...(instance.panelDescription === undefined
        ? {}
        : { description: instance.panelDescription }),
      ...(instance.showCloseButton === false ? { showCloseButton: false } : {}),
      ...(instance.rtl === true ? { direction: 'rtl' as const } : {}),
      ...(content.length === 0 ? {} : { content: () => content }),
      ...(instance.footer === undefined
        ? {}
        : {
            footer: slots => [
              Button.button(
                {
                  size: 'lg',
                  buttonAttributes: [...slots.closeButton, h.Type('button')],
                  children: [instance.footer!.save],
                },
                h,
              ),
              Button.button(
                {
                  variant: 'outline',
                  size: 'lg',
                  buttonAttributes: [
                    ...slots.closeButton,
                    ...slots.initialFocusAttributes(),
                    h.Type('button'),
                  ],
                  children: [instance.footer!.cancel],
                },
                h,
              ),
            ],
          }),
    },
    h,
  )
}

export const sheetStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = sheetDocFixtures[exampleIndex] ?? sheetDocFixtures[0]!
  if (!('instances' in fixture)) {
    return bottomPreview(fixture, model, onMessageJson, h)
  }
  return h.div(
    [h.Class(className(styles.wrap))],
    fixture.instances
      .map(instance =>
        Button.button(
          {
            variant: 'outline',
            onClick: onMessageJson(
              JSON.stringify({
                _tag: 'ClickedOpenSheet',
                id: instance.id,
              }),
            ),
            children: [instance.trigger],
          },
          h,
        ),
      )
      .concat(
        fixture.instances.map(instance =>
          instanceView(instance, preview, onMessageJson, h),
        ),
      ),
  )
}

const sheetHead = <Msg>(
  h: HtmlBuilder<Msg>,
  title: string,
  meta: string,
): Html =>
  h.div(
    [h.Class(className(styles.stackTight))],
    [
      h.h3([h.Class(className(styles.sheetHeading))], [title]),
      h.p([h.Class(className(styles.sheetMeta))], [meta]),
    ],
  )

const filterContent = <Msg>(
  model: PreviewShape,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.sheetBody))],
    [
      h.h3([h.Class(className(styles.sheetHeading))], ['Filters']),
      Separator.separator({}, h),
      h.div(
        [h.Class(className(styles.filterRows))],
        [
          Checkbox.checkbox(
            {
              id: 'in-stock',
              isChecked: model.inStock,
              onToggle: isChecked =>
                msg(onMessageJson, 'ToggledFilterPreview', {
                  field: 'inStock',
                  isChecked,
                }),
              label: 'In stock',
            },
            h,
          ),
          Checkbox.checkbox(
            {
              id: 'on-sale',
              isChecked: model.onSale,
              onToggle: isChecked =>
                msg(onMessageJson, 'ToggledFilterPreview', {
                  field: 'onSale',
                  isChecked,
                }),
              label: 'On sale',
            },
            h,
          ),
          Checkbox.checkbox(
            {
              id: 'free-shipping',
              isChecked: model.freeShipping,
              onToggle: isChecked =>
                msg(onMessageJson, 'ToggledFilterPreview', {
                  field: 'freeShipping',
                  isChecked,
                }),
              label: 'Free shipping',
            },
            h,
          ),
        ],
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'ClickedDismissSheetPreview'),
          children: ['Apply'],
        },
        h,
      ),
    ],
  )

const heightsContent = <Msg>(
  model: PreviewShape,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.sheetBody))],
    [
      h.h3(
        [h.Class(className(styles.sheetHeadingCapitalize))],
        [`${model.selectedHeight} height`],
      ),
      Separator.separator({}, h),
      h.p(
        [h.Class(className(styles.sheetText))],
        [heightsCopy[model.selectedHeight]],
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'ClickedDismissSheetPreview'),
          children: ['Close'],
        },
        h,
      ),
    ],
  )

const noScrimContent = <Msg>(
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.sheetBody))],
    [
      h.h3([h.Class(className(styles.sheetHeading))], ['Central Park']),
      Separator.separator({}, h),
      h.p(
        [h.Class(className(styles.sheetText))],
        ['The page remains visible and interactive behind this sheet.'],
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'ClickedDismissSheetPreview'),
          children: ['Close details'],
        },
        h,
      ),
    ],
  )

const stepsContent = <Msg>(
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.sheetBody))],
    [
      h.div(
        [h.Class(className(styles.stackTight))],
        [
          h.h3([h.Class(className(styles.sheetHeading))], ['Ferry Building']),
          h.div(
            [h.Class(className(styles.timeRow))],
            [
              h.span([h.Class(className(styles.timeLabel))], ['18 min']),
              h.span(
                [h.Class(className(styles.timeMeta))],
                ['3.7 mi · arrive 9:41 AM'],
              ),
            ],
          ),
        ],
      ),
      Separator.separator({}, h),
      h.div(
        [h.Class(className(styles.stepsList))],
        directionSteps.map(step =>
          h.div(
            [h.Class(className(styles.stepRow))],
            [
              h.div(
                [h.Class(className(styles.stepTextWrap))],
                [
                  h.p([h.Class(className(styles.stepLabel))], [step.label]),
                  h.p([h.Class(className(styles.stepDetail))], [step.detail]),
                ],
              ),
              h.span(
                [h.Class(className(styles.stepDistance))],
                [step.distance],
              ),
            ],
          ),
        ),
      ),
      Separator.separator({}, h),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'ClickedDismissSheetPreview'),
          children: ['Start'],
        },
        h,
      ),
    ],
  )

const keyboardContent = <Msg>(
  model: PreviewShape,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.form(
    [
      h.OnSubmit(msg(onMessageJson, 'ClickedDismissSheetPreview')),
      h.Class(className(styles.sheetBody)),
    ],
    [
      h.h3([h.Class(className(styles.sheetHeading))], ['Edit profile']),
      Separator.separator({}, h),
      h.p(
        [h.Class(className(styles.sheetMeta))],
        [
          'Focus fields throughout the form to see them remain visible above the mobile keyboard.',
        ],
      ),
      Input.input(
        {
          id: 'profile-name',
          label: 'Name',
          value: model.name,
          onInput: value =>
            msg(onMessageJson, 'ChangedProfileFieldPreview', {
              field: 'name',
              value,
            }),
        },
        h,
      ),
      Input.input(
        {
          id: 'profile-email',
          label: 'Email',
          type: 'email',
          value: model.email,
          onInput: value =>
            msg(onMessageJson, 'ChangedProfileFieldPreview', {
              field: 'email',
              value,
            }),
        },
        h,
      ),
      Input.input(
        {
          id: 'profile-company',
          label: 'Company',
          value: model.company,
          onInput: value =>
            msg(onMessageJson, 'ChangedProfileFieldPreview', {
              field: 'company',
              value,
            }),
        },
        h,
      ),
      Input.input(
        {
          id: 'profile-role',
          label: 'Role',
          value: model.role,
          onInput: value =>
            msg(onMessageJson, 'ChangedProfileFieldPreview', {
              field: 'role',
              value,
            }),
        },
        h,
      ),
      Textarea.textarea(
        {
          id: 'profile-bio',
          label: 'Bio',
          rows: 5,
          value: model.bio,
          onInput: value =>
            msg(onMessageJson, 'ChangedProfileFieldPreview', {
              field: 'bio',
              value,
            }),
        },
        h,
      ),
      Textarea.textarea(
        {
          id: 'profile-notes',
          label: 'Notes',
          rows: 5,
          value: model.notes,
          onInput: value =>
            msg(onMessageJson, 'ChangedProfileFieldPreview', {
              field: 'notes',
              value,
            }),
        },
        h,
      ),
      Button.button(
        { variant: 'default', type: 'submit', children: ['Save profile'] },
        h,
      ),
    ],
  )

const switcherSheet = <Msg>(
  h: HtmlBuilder<Msg>,
  id: string,
  title: string,
  meta: string,
  body: ReadonlyArray<Html>,
  buttons: ReadonlyArray<Html>,
): {
  id: string
  content: Html
} => ({
  id,
  content: h.div(
    [h.Class(className(styles.sheetBody))],
    [
      sheetHead(h, title, meta),
      Separator.separator({}, h),
      ...body,
      h.div([h.Class(className(styles.footerRow))], buttons),
    ],
  ),
})

const switcherSheets = <Msg>(
  model: PreviewShape,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<{
  id: string
  content: Html
}> => [
  switcherSheet(
    h,
    'overview',
    'Set up notifications',
    'Step 1 of 3',
    [
      h.p(
        [h.Class(className(styles.sheetMeta))],
        [
          'Stay informed about activity that matters without checking back throughout the day.',
        ],
      ),
      h.div(
        [h.Class(className(styles.stackLoose))],
        (
          [
            'Important activity',
            'Timely reminders',
            'Useful summaries',
          ] as const
        ).map((label, i) =>
          h.div(
            [h.Class(className(styles.stackTight))],
            [
              h.p([h.Class(className(styles.itemLabel))], [label]),
              h.p(
                [h.Class(className(styles.sheetMeta))],
                [
                  [
                    'Know when someone mentions you or needs your attention.',
                    'Get a reminder before work reaches its due date.',
                    'Catch up on anything you may have missed.',
                  ][i]!,
                ],
              ),
            ],
          ),
        ),
      ),
    ],
    [
      Button.button(
        {
          variant: 'secondary',
          onClick: msg(onMessageJson, 'ClickedDismissSwitcherPreview'),
          children: ['Cancel'],
        },
        h,
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'RequestedSheetStepPreview', {
            sheetId: 'frequency',
          }),
          children: ['Continue'],
        },
        h,
      ),
    ],
  ),
  switcherSheet(
    h,
    'frequency',
    'How often?',
    'Step 2 of 3',
    [
      RadioGroup.radioGroup(
        {
          model: model.frequency,
          selectedValue: Option.some(model.frequencyValue),
          toParentMessage: message =>
            msg(onMessageJson, 'GotRadioMessagePreview', { message }),
          ariaLabel: 'Notification frequency',
          options: [
            { value: 'immediately', label: 'Immediately' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ],
        },
        h,
      ),
    ],
    [
      Button.button(
        {
          variant: 'secondary',
          onClick: msg(onMessageJson, 'RequestedSheetStepPreview', {
            sheetId: 'overview',
          }),
          children: ['Back'],
        },
        h,
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'RequestedSheetStepPreview', {
            sheetId: 'channels',
          }),
          children: ['Continue'],
        },
        h,
      ),
    ],
  ),
  switcherSheet(
    h,
    'channels',
    'Where should we notify you?',
    'Step 3 of 3',
    [
      h.p(
        [h.Class(className(styles.sheetMeta))],
        ['Choose any combination. You can change these preferences later.'],
      ),
      h.div(
        [h.Class(className(styles.filterRows))],
        [
          Checkbox.checkbox(
            {
              id: 'channel-email',
              isChecked: model.emailChannel,
              onToggle: isChecked =>
                msg(onMessageJson, 'ToggledChannelPreview', {
                  field: 'emailChannel',
                  isChecked,
                }),
              label: 'Email',
            },
            h,
          ),
          Checkbox.checkbox(
            {
              id: 'channel-push',
              isChecked: model.pushChannel,
              onToggle: isChecked =>
                msg(onMessageJson, 'ToggledChannelPreview', {
                  field: 'pushChannel',
                  isChecked,
                }),
              label: 'Push notifications',
            },
            h,
          ),
          Checkbox.checkbox(
            {
              id: 'channel-text',
              isChecked: model.textChannel,
              onToggle: isChecked =>
                msg(onMessageJson, 'ToggledChannelPreview', {
                  field: 'textChannel',
                  isChecked,
                }),
              label: 'Text messages',
            },
            h,
          ),
        ],
      ),
    ],
    [
      Button.button(
        {
          variant: 'secondary',
          onClick: msg(onMessageJson, 'RequestedSheetStepPreview', {
            sheetId: 'frequency',
          }),
          children: ['Back'],
        },
        h,
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'ClickedDismissSwitcherPreview'),
          children: ['Finish'],
        },
        h,
      ),
    ],
  ),
]

const reviewSheets = <Msg>(
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<{
  id: string
  content: Html
}> => [
  switcherSheet(
    h,
    'review',
    'Review settings',
    'Daily summaries will be sent by email.',
    [],
    [
      Button.button(
        {
          variant: 'secondary',
          onClick: msg(onMessageJson, 'ClickedDismissSwitcherPreview'),
          children: ['Cancel'],
        },
        h,
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'RequestedSheetStepPreview', {
            sheetId: 'confirm',
          }),
          children: ['Continue'],
        },
        h,
      ),
    ],
  ),
  switcherSheet(
    h,
    'confirm',
    'Confirm settings',
    'Your notification settings are ready to save.',
    [],
    [
      Button.button(
        {
          variant: 'secondary',
          onClick: msg(onMessageJson, 'RequestedSheetStepPreview', {
            sheetId: 'review',
          }),
          children: ['Back'],
        },
        h,
      ),
      Button.button(
        {
          variant: 'default',
          onClick: msg(onMessageJson, 'ClickedDismissSwitcherPreview'),
          children: ['Save'],
        },
        h,
      ),
    ],
  ),
]

const mainOf = <Msg>(
  h: HtmlBuilder<Msg>,
  children: ReadonlyArray<Html>,
): Html => h.main([h.Class(className(styles.main))], children)

const sheetOf = <Msg>(
  model: PreviewShape,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
  label: string,
  content: Html,
): Html =>
  Sheet.sheet(
    {
      model: model.bottomSheet,
      toParentMessage: message =>
        msg(onMessageJson, 'GotBottomSheetMessage', { message }),
      side: 'bottom',
      title: label,
      layout: () => [content],
    },
    h,
  )

const switcherOf = <Msg>(
  model: PreviewShape,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
  sheets: ReadonlyArray<{
    id: string
    content: Html
  }>,
): Html =>
  Sheet.sheetSwitcher(
    {
      model: model.switcher,
      toParentMessage: message =>
        msg(onMessageJson, 'GotSwitcherMessage', { message }),
      sheets,
    },
    h,
  )

const bottomPreview = <Msg>(
  fixture: BottomSheetFixture,
  model: unknown,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const m = model as PreviewShape
  switch (fixture.kind) {
    case 'showcase':
      return mainOf(h, [
        Button.button(
          {
            variant: 'outline',
            onClick: msg(onMessageJson, 'ClickedOpenSheetPreview'),
            children: [fixture.triggerLabel],
          },
          h,
        ),
        sheetOf(
          m,
          onMessageJson,
          h,
          'Filters',
          filterContent(m, onMessageJson, h),
        ),
      ])
    case 'heights':
      return mainOf(h, [
        h.div(
          [h.Class(className(styles.triggerRow))],
          (['hug', 'capped', 'tall'] as const).map(height =>
            Button.button(
              {
                variant: 'outline',
                onClick: msg(onMessageJson, 'ClickedOpenHeightPreview', {
                  height,
                }),
                children: [`Open ${height}`],
              },
              h,
            ),
          ),
        ),
        sheetOf(
          m,
          onMessageJson,
          h,
          `${m.selectedHeight} height`,
          heightsContent(m, onMessageJson, h),
        ),
      ])
    case 'noscrim':
      return mainOf(h, [
        h.div(
          [h.Class(className(styles.pageStack))],
          [
            h.h3([h.Class(className(styles.pageHeading))], ['Nearby places']),
            h.p(
              [h.Class(className(styles.sheetText))],
              [`Background interactions: ${m.backgroundClicks}`],
            ),
            Button.button(
              {
                variant: 'secondary',
                onClick: msg(onMessageJson, 'ClickedBackgroundPreview'),
                children: ['Interact with page'],
              },
              h,
            ),
            Button.button(
              {
                variant: 'default',
                onClick: msg(onMessageJson, 'ClickedOpenSheetPreview'),
                children: [fixture.triggerLabel],
              },
              h,
            ),
          ],
        ),
        sheetOf(
          m,
          onMessageJson,
          h,
          'Place details',
          noScrimContent(onMessageJson, h),
        ),
      ])
    case 'snappoints':
      return mainOf(h, [
        h.div(
          [h.Class(className(styles.pageStackNarrow))],
          [
            h.p(
              [h.Class(className(styles.sheetText))],
              [
                'This sheet has two extra stops: half the viewport, and a 96px peek. Drag the handle down to collapse it, then back up — it rests at each stop instead of following your finger.',
              ],
            ),
            Button.button(
              {
                variant: 'default',
                onClick: msg(onMessageJson, 'ClickedOpenSheetPreview'),
                children: [fixture.triggerLabel],
              },
              h,
            ),
          ],
        ),
        sheetOf(
          m,
          onMessageJson,
          h,
          'Directions to the Ferry Building',
          stepsContent(onMessageJson, h),
        ),
      ])
    case 'keyboard':
      return mainOf(h, [
        Button.button(
          {
            variant: 'default',
            onClick: msg(onMessageJson, 'ClickedOpenSheetPreview'),
            children: [fixture.triggerLabel],
          },
          h,
        ),
        sheetOf(
          m,
          onMessageJson,
          h,
          'Edit profile',
          keyboardContent(m, onMessageJson, h),
        ),
      ])
    case 'switcher':
      return mainOf(h, [
        Button.button(
          {
            variant: 'default',
            onClick: msg(onMessageJson, 'ClickedOpenSwitcherPreview'),
            children: [fixture.triggerLabel],
          },
          h,
        ),
        switcherOf(m, onMessageJson, h, switcherSheets(m, onMessageJson, h)),
      ])
    case 'reviewflow':
      return mainOf(h, [
        Button.button(
          {
            variant: 'default',
            onClick: msg(onMessageJson, 'ClickedOpenSwitcherPreview'),
            children: [fixture.triggerLabel],
          },
          h,
        ),
        switcherOf(m, onMessageJson, h, reviewSheets(onMessageJson, h)),
      ])
  }
}
