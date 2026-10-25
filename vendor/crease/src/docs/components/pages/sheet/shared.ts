import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type SheetSide = 'top' | 'right' | 'bottom' | 'left'

export type SheetFieldSpec = Readonly<{
  id: string
  label: string
  value: string
}>

export type SheetInstance = Readonly<{
  id: string
  side: SheetSide
  trigger: string
  panelTitle: string
  panelDescription?: string
  fields?: ReadonlyArray<SheetFieldSpec>
  loremBody?: boolean
  footer?: Readonly<{ save: string; cancel: string }>
  showCloseButton?: boolean
  rtl?: boolean
}>

export type SheetFixture = Readonly<{
  title: string
  heroOnly?: boolean
  instances: ReadonlyArray<SheetInstance>
}>

const profileFields: ReadonlyArray<SheetFieldSpec> = [
  { id: 'name', label: 'Name', value: 'Pedro Duarte' },
  { id: 'username', label: 'Username', value: '@peduarte' },
]

const profileDescription =
  "Make changes to your profile here. Click save when you're done."

export const sheetFixtures: Readonly<[SheetFixture, ...Array<SheetFixture>]> = [
  {
    title: 'Basic',
    heroOnly: true,
    instances: [
      {
        id: 'profile',
        side: 'right',
        trigger: 'Open',
        panelTitle: 'Edit profile',
        panelDescription: profileDescription,
        fields: profileFields,
        footer: { save: 'Save changes', cancel: 'Close' },
      },
    ],
  },
  {
    title: 'Side',
    instances: (
      [
        { id: 'top', side: 'top', trigger: 'Top' },
        { id: 'right', side: 'right', trigger: 'Right' },
        { id: 'bottom', side: 'bottom', trigger: 'Bottom' },
        { id: 'left', side: 'left', trigger: 'Left' },
      ] as const
    ).map((base): SheetInstance => ({
      ...base,
      panelTitle: 'Edit profile',
      panelDescription: profileDescription,
      loremBody: true,
      footer: { save: 'Save changes', cancel: 'Cancel' },
    })),
  },
  {
    title: 'No Close Button',
    instances: [
      {
        id: 'no-close',
        side: 'right',
        trigger: 'Open Sheet',
        panelTitle: 'No Close Button',
        panelDescription:
          "This sheet doesn't have a close button in the top-right corner. Click outside to close.",
        showCloseButton: false,
      },
    ],
  },
  {
    title: 'RTL',
    instances: [
      {
        id: 'rtl',
        side: 'left',
        rtl: true,
        trigger: 'فتح',
        panelTitle: 'تعديل الملف الشخصي',
        panelDescription:
          'قم بإجراء تغييرات على ملفك الشخصي هنا. انقر حفظ عند الانتهاء.',
        fields: [
          { id: 'name', label: 'الاسم', value: 'Pedro Duarte' },
          { id: 'username', label: 'اسم المستخدم', value: '@peduarte' },
        ],
        footer: { save: 'حفظ التغييرات', cancel: 'إغلاق' },
      },
    ],
  },
]

const LOREM_PARAGRAPHS = 10

const escape = (value: string): string => value.replaceAll(`'`, `\\'`)

const fieldEmit = (field: SheetFieldSpec, isStyleX: boolean): string =>
  `      h.div([h.Class(${isStyleX ? 'className(styles.field)' : "'grid gap-3'"})], [
        Label.label({ for: 'sheet-field-${field.id}', children: ['${escape(field.label)}'] }, h),
        Input.input({
          id: 'sheet-field-${field.id}',
          value: model.values['${field.id}'] ?? '${escape(field.value)}',
          onInput: value => ChangedInput({ id: '${field.id}', value }),
        }, h),
      ])`

const instanceViewEmit = (
  instance: SheetInstance,
  isStyleX: boolean,
): string => {
  const contentLines: Array<string> = []
  const fieldsClass = isStyleX
    ? 'className(styles.fieldsWrap)'
    : "'grid flex-1 auto-rows-min gap-6 px-4'"
  const loremClass = isStyleX
    ? 'className(styles.loremWrap)'
    : "'mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-4'"
  const paraClass = isStyleX
    ? 'className(styles.paragraph)'
    : "'text-sm leading-relaxed'"
  if (instance.fields !== undefined) {
    contentLines.push(
      `    h.div([h.Class(${fieldsClass})], [
${instance.fields.map(field => fieldEmit(field, isStyleX)).join(',\n')}
    ])`,
    )
  }
  if (instance.loremBody === true) {
    contentLines.push(
      `    h.div([h.Class(${loremClass})], LOREM.map(paragraph =>
      h.p([h.Class(${paraClass})], [paragraph])))`,
    )
  }
  const footerEmit =
    instance.footer === undefined
      ? ''
      : `,
      footer: slots => [
        h.button([
          ...slots.closeButton,
          h.Type('button'),
          h.Class(${isStyleX ? "className(...Button.buttonVisualStyles({ size: 'lg' }))" : "'rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground'"}),
        ], ['${escape(instance.footer.save)}']),
        h.button([
          ...slots.closeButton,
          ...slots.initialFocusAttributes(),
          h.Type('button'),
          h.Class(${isStyleX ? "className(...Button.buttonVisualStyles({ variant: 'outline', size: 'lg' }))" : "'rounded-md border px-4 py-2 text-sm'"}),
        ], ['${escape(instance.footer.cancel)}']),
      ]`
  return `    Sheet.sheet({
      model: model.sheets['${instance.id}'] ?? Sheet.init({ id: 'sheet-${instance.id}', isAnimated: true }),
      toParentMessage: message => GotSheetMessage({ id: '${instance.id}', message }),
      side: '${instance.side}',
      title: '${escape(instance.panelTitle)}',${
        instance.panelDescription === undefined
          ? ''
          : `
      description: '${escape(instance.panelDescription)}',`
      }${
        instance.showCloseButton === false
          ? `
      showCloseButton: false,`
          : ''
      }${
        instance.rtl === true
          ? `
      direction: 'rtl',`
          : ''
      }${
        contentLines.length === 0
          ? ''
          : `
      content: () => [
${contentLines.join(',\n')}
      ]`
      }${footerEmit}
    }, h)`
}

const emitSource = (fixture: SheetFixture, isStyleX: boolean): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const lib = isStyleX ? 'stylex' : 'ui'
  const usesInput = fixture.instances.some(
    instance => instance.fields !== undefined,
  )
  const usesLorem = fixture.instances.some(
    instance => instance.loremBody === true,
  )
  const allFields = fixture.instances.flatMap(instance => instance.fields ?? [])
  const fieldInit = allFields
    .map(field => `      '${field.id}': '${escape(field.value)}',`)
    .join('\n')
  return foldkitApplication({
    title: `Sheet — ${fixture.title}`,
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
}import * as Button from '@/${lib}/button'${
      usesInput
        ? `
import * as Input from '@/${lib}/input'
import * as Label from '@/${lib}/label'`
        : ''
    }
import * as Sheet from '@/${lib}/sheet'${
      isStyleX
        ? `

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  fieldsWrap: { display: 'grid', flexGrow: 1, gridAutoRows: 'min-content', gap: '1.5rem', paddingInline: '1rem' },
  field: { display: 'grid', gap: '0.75rem' },
  loremWrap: { display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem', marginInline: 'auto', minHeight: 0, maxWidth: '42rem', overflowY: 'auto', paddingInline: '1rem', width: '100%' },
  paragraph: { margin: 0, fontSize: '0.875rem', lineHeight: 1.625 },
})`
        : ''
    }${
      usesLorem
        ? `

const LOREM: ReadonlyArray<string> = Array.from({ length: ${LOREM_PARAGRAPHS} }, () =>
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.')`
        : ''
    }`,
    model: `export const Model = S.Struct({
  sheets: S.Record(S.String, Sheet.Model),${
    usesInput
      ? `
  values: S.Record(S.String, S.String),`
      : ''
  }
})
export type Model = typeof Model.Type`,
    messages: `export const ClickedOpen = taggedStruct('ClickedOpenSheet${tag}', {
  id: S.String,
})
${
  usesInput
    ? `export const ChangedInput = taggedStruct('ChangedInputSheet${tag}', {
  id: S.String,
  value: S.String,
})`
    : ''
}
export const GotSheetMessage = taggedStruct('GotSheetMessage${tag}', {
  id: S.String,
  message: Sheet.Message,
})
export const Message = S.Union(${usesInput ? '[ClickedOpen, ChangedInput, GotSheetMessage]' : '[ClickedOpen, GotSheetMessage]'})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    sheets: {
${fixture.instances.map(instance => `      '${instance.id}': Sheet.init({ id: 'sheet-${instance.id}', isAnimated: true }),`).join('\n')}
    },${
      usesInput
        ? `
    values: {
${fieldInit}
    },`
        : ''
    }
  },
})`,
    update: `const mapSheet = (
  model: Model,
  id: string,
  result: ReturnType<typeof Sheet.update>,
): Update.Return<Model, Message> => {
  const commands = result.commands ?? []
  return {
    model: {
      ...model,
      sheets: { ...model.sheets, [id]: result.model },
    },
    commands: Command.mapMessages(commands, next =>
      GotSheetMessage({ id, message: next })),
  }
}

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ClickedOpenSheet${tag}': {
      const sheet = model.sheets[message.id]
      if (sheet === undefined) {
        return { model }
      }
      return mapSheet(model, message.id, Sheet.open(sheet))
    }
${
  usesInput
    ? `    case 'ChangedInputSheet${tag}':
      return {
        model: {
          ...model,
          values: { ...model.values, [message.id]: message.value },
        },
      }
`
    : ''
}    case 'GotSheetMessage${tag}': {
      const sheet = model.sheets[message.id]
      if (sheet === undefined) {
        return { model }
      }
      return mapSheet(model, message.id, Sheet.update(sheet, message.message))
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    h.div([h.Class('flex flex-wrap gap-2')], [
${fixture.instances
  .map(
    instance => `      Button.button({
        variant: 'outline',
        onClick: ClickedOpen({ id: '${instance.id}' }),
        children: ['${escape(instance.trigger)}'],
      }, h),`,
  )
  .join('\n')}
    ]),
${fixture.instances.map(instance => instanceViewEmit(instance, isStyleX)).join(',\n')}
  ]),
})`,
  })
}

// ————— bottom-sheet fixtures (Meta Astryx BottomSheet demos, merged into
// the Sheet page; `side: 'bottom'` engages the drag/snap/switcher engine)

export type SheetHeightOption = 'hug' | 'capped' | 'tall'
export type BottomSheetKind =
  | 'showcase'
  | 'heights'
  | 'noscrim'
  | 'snappoints'
  | 'keyboard'
  | 'switcher'
  | 'reviewflow'

export type BottomSheetFixture = Readonly<{
  title: string
  description?: string
  kind: BottomSheetKind
  triggerLabel: string
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/BottomSheet/*.tsx — same
   demos, same labels, same snap points/heights/switcher flows. */
export const bottomSheetFixtures: ReadonlyArray<BottomSheetFixture> = [
  {
    title: 'Bottom',
    description: 'A mobile filter surface that rises from the bottom edge.',
    kind: 'showcase',
    triggerLabel: 'Open sheet',
  },
  {
    title: 'Bottom — Height Variants',
    description:
      'Compares hug, capped, and tall starting heights for different amounts of content.',
    kind: 'heights',
    triggerLabel: 'Open heights',
  },
  {
    title: 'Bottom — No Scrim',
    description:
      'Keeps the page visible and interactive behind a non-modal bottom sheet.',
    kind: 'noscrim',
    triggerLabel: 'Show place details',
  },
  {
    title: 'Bottom — Snap Points',
    description:
      'Drag-to-resize stops: a half-height working surface, and a peek that slides away and thins the scrim.',
    kind: 'snappoints',
    triggerLabel: 'Show directions',
  },
  {
    title: 'Bottom — Mobile Keyboard',
    description:
      'Uses a tall, scrollable form that keeps focused controls visible above the mobile keyboard.',
    kind: 'keyboard',
    triggerLabel: 'Edit profile',
  },
  {
    title: 'Switcher',
    description:
      'A three-step flow that transitions between content-hugging sheets of different heights inside one shared dialog.',
    kind: 'switcher',
    triggerLabel: 'Set up notifications',
  },
  {
    title: 'Switcher — Review Flow',
    description:
      'A two-step form flow that lets a person review settings, confirm them, or move back without replacing the shared dialog.',
    kind: 'reviewflow',
    triggerLabel: 'Review settings',
  },
]

export const heightsCopy: Readonly<Record<SheetHeightOption, string>> = {
  hug: 'Hug fits short, bounded content.',
  capped: 'Capped starts at a comfortable mid-height for lists and filters.',
  tall: 'Tall reserves most of the viewport for long or changing content.',
}

export const directionSteps: ReadonlyArray<
  Readonly<{
    label: string
    detail: string
    distance: string
  }>
> = [
  {
    label: 'Head northeast on Mission St',
    detail: 'Toward 3rd St',
    distance: '350 ft',
  },
  {
    label: 'Turn right onto 3rd St',
    detail: 'Pass Yerba Buena Gardens on your left',
    distance: '0.2 mi',
  },
  {
    label: 'Continue onto Kearny St',
    detail: 'Stay in the right lane',
    distance: '0.4 mi',
  },
  {
    label: 'Turn left onto Market St',
    detail: 'Cable car crossing ahead',
    distance: '0.6 mi',
  },
  {
    label: 'Bear right onto Sutter St',
    detail: 'Toward the Financial District',
    distance: '0.3 mi',
  },
  {
    label: 'Continue on Sansome St',
    detail: 'Four blocks, past Pine St',
    distance: '0.5 mi',
  },
  {
    label: 'Make a U-turn at Washington St',
    detail: 'Construction detour until March',
    distance: '150 ft',
  },
  {
    label: 'Turn right onto Battery St',
    detail: 'Follow signs for the Embarcadero',
    distance: '0.4 mi',
  },
  {
    label: 'Turn left onto Sacramento St',
    detail: 'Toward the waterfront',
    distance: '0.2 mi',
  },
  {
    label: 'Turn right onto The Embarcadero',
    detail: 'Bay Bridge on your right',
    distance: '0.5 mi',
  },
  {
    label: 'Continue past Pier 14',
    detail: 'Ferry terminal signage begins here',
    distance: '0.3 mi',
  },
  {
    label: 'Arrive at the Ferry Building',
    detail: 'Parking garage entrance on Washington St',
    distance: '—',
  },
]

export const profileFieldIds = [
  'name',
  'email',
  'company',
  'role',
  'bio',
  'notes',
] as const
export type ProfileField = (typeof profileFieldIds)[number]

export const switcherSheetIds = {
  switcher: ['overview', 'frequency', 'channels'] as const,
  reviewflow: ['review', 'confirm'] as const,
}

// ————— shared emitted content (used by code emission AND kept in sync with
// the live previews below)

const emitFilterContent = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  return `h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
      h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Filters']),
      Separator.separator({}, h),
      h.div([h.Class(${cls('flex flex-col gap-2', 'styles.filterRows')})], [
        Checkbox.checkbox({ id: 'in-stock', isChecked: model.inStock, onToggle: isChecked => ToggledFilter({ field: 'inStock', isChecked }), label: 'In stock' }, h),
        Checkbox.checkbox({ id: 'on-sale', isChecked: model.onSale, onToggle: isChecked => ToggledFilter({ field: 'onSale', isChecked }), label: 'On sale' }, h),
        Checkbox.checkbox({ id: 'free-shipping', isChecked: model.freeShipping, onToggle: isChecked => ToggledFilter({ field: 'freeShipping', isChecked }), label: 'Free shipping' }, h),
      ]),
      Button.button({ variant: 'default', onClick: ClickedDismissSheet(), children: ['Apply'] }, h),
    ])`
}

const emitHeightsContent = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  return `h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
      h.h3([h.Class(${cls('text-base font-semibold capitalize', 'styles.sheetHeading')})], [\`\${model.selectedHeight} height\`]),
      Separator.separator({}, h),
      h.p([h.Class(${cls('text-sm', 'styles.sheetText')})], [heightsCopy[model.selectedHeight]]),
      Button.button({ variant: 'default', onClick: ClickedDismissSheet(), children: ['Close'] }, h),
    ])`
}

const emitNoScrimContent = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  return `h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
      h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Central Park']),
      Separator.separator({}, h),
      h.p([h.Class(${cls('text-sm', 'styles.sheetText')})], ['The page remains visible and interactive behind this sheet.']),
      Button.button({ variant: 'default', onClick: ClickedDismissSheet(), children: ['Close details'] }, h),
    ])`
}

const emitStepsContent = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  return `h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
      h.div([h.Class(${cls('flex flex-col gap-1', 'styles.stackTight')})], [
        h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Ferry Building']),
        h.div([h.Class(${cls('flex items-center gap-2', 'styles.timeRow')})], [
          h.span([h.Class(${cls('text-sm font-medium', 'styles.timeLabel')})], ['18 min']),
          h.span([h.Class(${cls('text-xs text-muted-foreground', 'styles.timeMeta')})], ['3.7 mi · arrive 9:41 AM']),
        ]),
      ]),
      Separator.separator({}, h),
      h.div([h.Class(${cls('flex flex-col', 'styles.stepsList')})],
        directionSteps.map(step =>
          h.div([h.Class(${cls('flex items-center gap-3 py-2', 'styles.stepRow')})], [
            h.div([h.Class(${cls('flex-1', 'styles.stepTextWrap')})], [
              h.p([h.Class(${cls('text-sm', 'styles.stepLabel')})], [step.label]),
              h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.stepDetail')})], [step.detail]),
            ]),
            h.span([h.Class(${cls('text-xs text-muted-foreground', 'styles.stepDistance')})], [step.distance]),
          ]),
        ),
      ),
      Separator.separator({}, h),
      Button.button({ variant: 'default', onClick: ClickedDismissSheet(), children: ['Start'] }, h),
    ])`
}

const emitKeyboardContent = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  const input = (id: string, label: string, extra = '') =>
    `Input.input({ id: '${id}', label: '${label}', value: model.${id}, onInput: value => ChangedProfileField({ field: '${id}', value }),${extra} }, h)`
  const area = (id: string, label: string) =>
    `Textarea.textarea({ id: '${id}', label: '${label}', rows: 5, value: model.${id}, onInput: value => ChangedProfileField({ field: '${id}', value }) }, h)`
  return `h.form([
      h.OnSubmit(ClickedDismissSheet()),
      h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')}),
    ], [
      h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Edit profile']),
      Separator.separator({}, h),
      h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Focus fields throughout the form to see them remain visible above the mobile keyboard.']),
      ${input('name', 'Name')},
      ${input('email', 'Email', ` type: 'email',`)},
      ${input('company', 'Company')},
      ${input('role', 'Role')},
      ${area('bio', 'Bio')},
      ${area('notes', 'Notes')},
      Button.button({ variant: 'default', type: 'submit', children: ['Save profile'] }, h),
    ])`
}

const emitSwitcherSheets = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  const hRow = `h.div([h.Class(${cls('flex justify-end gap-2', 'styles.footerRow')})], [`
  const overview = `{
      id: 'overview',
      content: h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
        h.div([h.Class(${cls('flex flex-col gap-1', 'styles.stackTight')})], [
          h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Set up notifications']),
          h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Step 1 of 3']),
        ]),
        Separator.separator({}, h),
        h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Stay informed about activity that matters without checking back throughout the day.']),
        h.div([h.Class(${cls('flex flex-col gap-3', 'styles.stackLoose')})],
          (['Important activity', 'Timely reminders', 'Useful summaries'] as const).map((label, i) =>
            h.div([h.Class(${cls('flex flex-col gap-1', 'styles.stackTight')})], [
              h.p([h.Class(${cls('text-sm font-medium', 'styles.itemLabel')})], [label]),
              h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], [['Know when someone mentions you or needs your attention.', 'Get a reminder before work reaches its due date.', 'Catch up on anything you may have missed.'][i]!]),
            ]),
          ),
        ),
        ${hRow}
          Button.button({ variant: 'secondary', onClick: ClickedDismissSwitcher(), children: ['Cancel'] }, h),
          Button.button({ variant: 'default', onClick: RequestedSheetStep({ sheetId: 'frequency' }), children: ['Continue'] }, h),
        ]),
      ]),
    }`
  const frequency = `{
      id: 'frequency',
      content: h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
        h.div([h.Class(${cls('flex flex-col gap-1', 'styles.stackTight')})], [
          h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['How often?']),
          h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Step 2 of 3']),
        ]),
        Separator.separator({}, h),
        RadioGroup.radioGroup({ model: model.frequency, selectedValue: Option.some(model.frequencyValue), toParentMessage: message => GotRadioMessage({ message }), ariaLabel: 'Notification frequency', options: [{ value: 'immediately', label: 'Immediately' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }] }, h),
        ${hRow}
          Button.button({ variant: 'secondary', onClick: RequestedSheetStep({ sheetId: 'overview' }), children: ['Back'] }, h),
          Button.button({ variant: 'default', onClick: RequestedSheetStep({ sheetId: 'channels' }), children: ['Continue'] }, h),
        ]),
      ]),
    }`
  const channels = `{
      id: 'channels',
      content: h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
        h.div([h.Class(${cls('flex flex-col gap-1', 'styles.stackTight')})], [
          h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Where should we notify you?']),
          h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Step 3 of 3']),
        ]),
        Separator.separator({}, h),
        h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Choose any combination. You can change these preferences later.']),
        h.div([h.Class(${cls('flex flex-col gap-2', 'styles.filterRows')})], [
          Checkbox.checkbox({ id: 'channel-email', isChecked: model.emailChannel, onToggle: isChecked => ToggledChannel({ field: 'emailChannel', isChecked }), label: 'Email' }, h),
          Checkbox.checkbox({ id: 'channel-push', isChecked: model.pushChannel, onToggle: isChecked => ToggledChannel({ field: 'pushChannel', isChecked }), label: 'Push notifications' }, h),
          Checkbox.checkbox({ id: 'channel-text', isChecked: model.textChannel, onToggle: isChecked => ToggledChannel({ field: 'textChannel', isChecked }), label: 'Text messages' }, h),
        ]),
        ${hRow}
          Button.button({ variant: 'secondary', onClick: RequestedSheetStep({ sheetId: 'frequency' }), children: ['Back'] }, h),
          Button.button({ variant: 'default', onClick: ClickedDismissSwitcher(), children: ['Finish'] }, h),
        ]),
      ]),
    }`
  return `[${overview},\n    ${frequency},\n    ${channels}]`
}

const emitReviewSheets = (isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  const review = `{
      id: 'review',
      content: h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
        h.div([h.Class(${cls('flex flex-col gap-1', 'styles.stackTight')})], [
          h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Review settings']),
          h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Daily summaries will be sent by email.']),
        ]),
        h.div([h.Class(${cls('flex justify-end gap-2', 'styles.footerRow')})], [
          Button.button({ variant: 'secondary', onClick: ClickedDismissSwitcher(), children: ['Cancel'] }, h),
          Button.button({ variant: 'default', onClick: RequestedSheetStep({ sheetId: 'confirm' }), children: ['Continue'] }, h),
        ]),
      ]),
    }`
  const confirm = `{
      id: 'confirm',
      content: h.div([h.Class(${cls('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', 'styles.sheetBody')})], [
        h.div([h.Class(${cls('flex flex-col gap-1', 'styles.stackTight')})], [
          h.h3([h.Class(${cls('text-base font-semibold', 'styles.sheetHeading')})], ['Confirm settings']),
          h.p([h.Class(${cls('text-xs text-muted-foreground', 'styles.sheetMeta')})], ['Your notification settings are ready to save.']),
        ]),
        h.div([h.Class(${cls('flex justify-end gap-2', 'styles.footerRow')})], [
          Button.button({ variant: 'secondary', onClick: RequestedSheetStep({ sheetId: 'review' }), children: ['Back'] }, h),
          Button.button({ variant: 'default', onClick: ClickedDismissSwitcher(), children: ['Save'] }, h),
        ]),
      ]),
    }`
  return `[${review},\n    ${confirm}]`
}

const emitStyles = `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  main: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  sheetBody: { marginInline: 'auto', maxWidth: '32rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' },
  sheetHeading: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 600, marginBlock: 0, marginInline: 0 },
  sheetText: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  sheetMeta: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' },
  filterRows: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  stackTight: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  stackLoose: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  footerRow: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' },
  triggerRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  pageStack: { display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' },
  pageHeading: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 600, marginBlock: 0, marginInline: 0 },
  timeRow: { alignItems: 'center', display: 'flex', gap: '0.5rem' },
  timeLabel: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },
  timeMeta: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' },
  stepsList: { display: 'flex', flexDirection: 'column' },
  stepRow: { alignItems: 'center', display: 'flex', gap: '0.75rem', paddingBlock: '0.5rem' },
  stepTextWrap: { flexBasis: '0%', flexGrow: 1, flexShrink: 1 },
  stepLabel: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  stepDetail: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' },
  stepDistance: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' },
  itemLabel: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },
})`

// ————— program emission

const emitImports = (
  fixture: BottomSheetFixture,
  isStyleX: boolean,
): string => {
  const u = isStyleX ? 'stylex' : 'ui'
  const componentImports = [
    `import * as Button from '@/${u}/button'`,
    `import * as Sheet from '@/${u}/sheet'`,
    `import * as Separator from '@/${u}/separator'`,
    fixture.kind === 'showcase' || fixture.kind === 'switcher'
      ? `import * as Checkbox from '@/${u}/checkbox'`
      : '',
    fixture.kind === 'keyboard'
      ? `import * as Input from '@/${u}/input'\nimport * as Textarea from '@/${u}/textarea'`
      : '',
    fixture.kind === 'switcher'
      ? `import * as RadioGroup from '@/${u}/radio-group'`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  return `import { ${fixture.kind === 'switcher' ? 'Option, ' : ''}Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
${isStyleX ? "\nimport * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n" : ''}${componentImports}${isStyleX ? `\n\n${emitStyles}` : ''}`
}

const emitModelFields = (fixture: BottomSheetFixture): string => {
  const isSwitcher =
    fixture.kind === 'switcher' || fixture.kind === 'reviewflow'
  const fields = [
    isSwitcher ? 'switcher: Sheet.SwitcherModel' : 'sheet: Sheet.Model',
    fixture.kind === 'showcase'
      ? 'inStock: S.Boolean, onSale: S.Boolean, freeShipping: S.Boolean'
      : '',
    fixture.kind === 'switcher'
      ? 'frequency: RadioGroup.Model, frequencyValue: S.String, emailChannel: S.Boolean, pushChannel: S.Boolean, textChannel: S.Boolean'
      : '',
    fixture.kind === 'keyboard'
      ? 'name: S.String, email: S.String, company: S.String, role: S.String, bio: S.String, notes: S.String'
      : '',
    fixture.kind === 'heights'
      ? "selectedHeight: S.Literals(['hug', 'capped', 'tall'])"
      : '',
    fixture.kind === 'noscrim' ? 'backgroundClicks: S.Number' : '',
  ]
    .filter(Boolean)
    .join(', ')
  return `export const Model = S.Struct({ ${fields} })
export type Model = typeof Model.Type`
}

const emitMessages = (fixture: BottomSheetFixture, tag: string): string => {
  const isSwitcher =
    fixture.kind === 'switcher' || fixture.kind === 'reviewflow'
  const openers =
    fixture.kind === 'heights'
      ? `export const ClickedOpenHeight = taggedStruct('ClickedOpenHeight${tag}', { height: S.Literals(['hug', 'capped', 'tall']) });
export const ClickedDismissSheet = taggedStruct('ClickedDismissSheet${tag}');`
      : isSwitcher
        ? `export const ClickedOpenSwitcher = taggedStruct('ClickedOpenSwitcher${tag}');
export const RequestedSheetStep = taggedStruct('RequestedSheetStep${tag}', { sheetId: S.String });
export const ClickedDismissSwitcher = taggedStruct('ClickedDismissSwitcher${tag}');`
        : `export const ClickedOpenSheet = taggedStruct('ClickedOpenSheet${tag}');
export const ClickedDismissSheet = taggedStruct('ClickedDismissSheet${tag}');`
  const extra = [
    fixture.kind === 'showcase'
      ? `export const ToggledFilter = taggedStruct('ToggledFilter${tag}', { field: S.Literals(['inStock', 'onSale', 'freeShipping']), isChecked: S.Boolean });`
      : '',
    fixture.kind === 'switcher'
      ? `export const GotRadioMessage = taggedStruct('GotRadioMessage${tag}', { message: RadioGroup.Message });
export const ToggledChannel = taggedStruct('ToggledChannel${tag}', { field: S.Literals(['emailChannel', 'pushChannel', 'textChannel']), isChecked: S.Boolean });`
      : '',
    fixture.kind === 'keyboard'
      ? `export const ChangedProfileField = taggedStruct('ChangedProfileField${tag}', { field: S.Literals(['name', 'email', 'company', 'role', 'bio', 'notes']), value: S.String });`
      : '',
    fixture.kind === 'noscrim'
      ? `export const ClickedBackground = taggedStruct('ClickedBackground${tag}');`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  const got = isSwitcher
    ? `export const GotSwitcherMessage = taggedStruct('GotSwitcherMessage${tag}', { message: Sheet.SwitcherMessage });`
    : `export const GotSheetMessage = taggedStruct('GotSheetMessage${tag}', { message: Sheet.Message });`
  const unionMembers = [
    fixture.kind === 'heights'
      ? 'ClickedOpenHeight'
      : isSwitcher
        ? 'ClickedOpenSwitcher'
        : 'ClickedOpenSheet',
    isSwitcher ? 'RequestedSheetStep' : '',
    isSwitcher ? 'ClickedDismissSwitcher' : '',
    !isSwitcher && fixture.kind !== 'heights' ? 'ClickedDismissSheet' : '',
    isSwitcher ? 'GotSwitcherMessage' : 'GotSheetMessage',
    fixture.kind === 'showcase' ? 'ToggledFilter' : '',
    fixture.kind === 'switcher' ? 'GotRadioMessage, ToggledChannel' : '',
    fixture.kind === 'keyboard' ? 'ChangedProfileField' : '',
    fixture.kind === 'noscrim' ? 'ClickedBackground' : '',
    fixture.kind === 'heights' ? 'ClickedDismissSheet' : '',
  ]
    .filter(Boolean)
    .join(', ')
  return `import { taggedStruct } from 'foldkit/schema'
${openers}
${got}
${extra === '' ? '' : `${extra}\n`}export const Message = S.Union([${unionMembers}])
export type Message = typeof Message.Type`
}

const emitInit = (fixture: BottomSheetFixture, tag: string): string => {
  const id = tag.toLowerCase()
  const sheetInit = (() => {
    switch (fixture.kind) {
      case 'noscrim':
        return `Sheet.init({ id: 'sheet-${id}', height: 'hug', hasScrim: false })`
      case 'snappoints':
        return `Sheet.init({ id: 'sheet-${id}', height: 'tall', snapPoints: ['96px', '50%'] })`
      case 'keyboard':
        return `Sheet.init({ id: 'sheet-${id}', height: 'tall' })`
      case 'heights':
        return `Sheet.init({ id: 'sheet-${id}', height: 'hug' })`
      default:
        return `Sheet.init({ id: 'sheet-${id}' })`
    }
  })()
  const switcherInit =
    fixture.kind === 'switcher'
      ? `switcher: Sheet.initSwitcher({ id: 'switcher-${id}', sheets: [
      { id: 'overview', label: 'Set up notifications', height: 'hug' },
      { id: 'frequency', label: 'Notification frequency', height: 'hug' },
      { id: 'channels', label: 'Notification channels', height: 'hug' },
    ] })`
      : fixture.kind === 'reviewflow'
        ? `switcher: Sheet.initSwitcher({ id: 'switcher-${id}', sheets: [
      { id: 'review', label: 'Review notification settings', height: 'hug', purpose: 'form' },
      { id: 'confirm', label: 'Confirm settings', height: 'hug' },
    ] })`
        : ''
  const extras = [
    fixture.kind === 'showcase'
      ? 'inStock: false, onSale: false, freeShipping: false'
      : '',
    fixture.kind === 'switcher'
      ? "frequency: RadioGroup.init({ id: 'frequency-group' }), frequencyValue: 'weekly', emailChannel: true, pushChannel: true, textChannel: false"
      : '',
    fixture.kind === 'keyboard'
      ? "name: '', email: '', company: '', role: '', bio: '', notes: ''"
      : '',
    fixture.kind === 'heights' ? "selectedHeight: 'hug'" : '',
    fixture.kind === 'noscrim' ? 'backgroundClicks: 0' : '',
  ]
    .filter(Boolean)
    .join(', ')
  const isSwitcher =
    fixture.kind === 'switcher' || fixture.kind === 'reviewflow'
  const inner = [isSwitcher ? switcherInit : `sheet: ${sheetInit}`, extras]
    .filter(Boolean)
    .join(', ')
  return `export const init = (): Update.Return<Model, Message> => ({ model: { ${inner} } })`
}

const emitUpdate = (fixture: BottomSheetFixture, tag: string): string => {
  const isSwitcher =
    fixture.kind === 'switcher' || fixture.kind === 'reviewflow'
  const map = isSwitcher
    ? `const mapSwitcher = (
  model: Model,
  result: ReturnType<typeof Sheet.updateSwitcher>,
): Update.Return<Model, Message> => {
  return { model: { ...model, switcher: result.model }, commands: Command.mapMessages(result.commands ?? [], next => GotSwitcherMessage({ message: next })) }
}`
    : `const mapSheet = (
  model: Model,
  result: ReturnType<typeof Sheet.update>,
): Update.Return<Model, Message> => {
  return { model: { ...model, sheet: result.model }, commands: Command.mapMessages(result.commands ?? [], next => GotSheetMessage({ message: next })) }
}`
  const cases: Array<string> = []
  if (fixture.kind === 'heights') {
    cases.push(`    case 'ClickedOpenHeight${tag}':
      return mapSheet({ ...model, selectedHeight: message.height }, Sheet.open({ ...model.sheet, height: message.height }))`)
    cases.push(`    case 'ClickedDismissSheet${tag}':
      return mapSheet(model, Sheet.close(model.sheet))`)
  } else if (isSwitcher) {
    cases.push(`    case 'ClickedOpenSwitcher${tag}':
      return mapSwitcher(model, Sheet.openSheet(model.switcher, '${fixture.kind === 'switcher' ? 'overview' : 'review'}'))`)
    cases.push(`    case 'RequestedSheetStep${tag}':
      return mapSwitcher(model, Sheet.openSheet(model.switcher, message.sheetId))`)
    cases.push(`    case 'ClickedDismissSwitcher${tag}':
      return mapSwitcher(model, Sheet.closeSwitcher(model.switcher))`)
    cases.push(`    case 'GotSwitcherMessage${tag}':
      return mapSwitcher(model, Sheet.updateSwitcher(model.switcher, message.message))`)
  } else {
    cases.push(`    case 'ClickedOpenSheet${tag}':
      return mapSheet(model, Sheet.open(model.sheet))`)
    cases.push(`    case 'ClickedDismissSheet${tag}':
      return mapSheet(model, Sheet.close(model.sheet))`)
  }
  if (!isSwitcher) {
    cases.push(`    case 'GotSheetMessage${tag}':
      return mapSheet(model, Sheet.update(model.sheet, message.message))`)
  }
  if (fixture.kind === 'showcase') {
    cases.push(`    case 'ToggledFilter${tag}': {
      if (message.field === 'inStock') return { model: { ...model, inStock: message.isChecked } }
      if (message.field === 'onSale') return { model: { ...model, onSale: message.isChecked } }
      return { model: { ...model, freeShipping: message.isChecked } }
    }`)
  }
  if (fixture.kind === 'switcher') {
    cases.push(`    case 'GotRadioMessage${tag}': {
      const result = RadioGroup.update(model.frequency, message.message);
      const selection = Option.fromNullishOr(result.outMessage);
      return { model: { ...model, frequency: result.model, frequencyValue: Option.match(selection, { onNone: () => model.frequencyValue, onSome: selected => selected.value }) } }
    }`)
    cases.push(`    case 'ToggledChannel${tag}': {
      if (message.field === 'emailChannel') return { model: { ...model, emailChannel: message.isChecked } }
      if (message.field === 'pushChannel') return { model: { ...model, pushChannel: message.isChecked } }
      return { model: { ...model, textChannel: message.isChecked } }
    }`)
  }
  if (fixture.kind === 'keyboard') {
    cases.push(`    case 'ChangedProfileField${tag}': {
      if (message.field === 'name') return { model: { ...model, name: message.value } }
      if (message.field === 'email') return { model: { ...model, email: message.value } }
      if (message.field === 'company') return { model: { ...model, company: message.value } }
      if (message.field === 'role') return { model: { ...model, role: message.value } }
      if (message.field === 'bio') return { model: { ...model, bio: message.value } }
      return { model: { ...model, notes: message.value } }
    }`)
  }
  if (fixture.kind === 'noscrim') {
    cases.push(`    case 'ClickedBackground${tag}':
      return { model: { ...model, backgroundClicks: model.backgroundClicks + 1 } }`)
  }
  return `${map}

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
${cases.join('\n')}
  }
}`
}

const emitView = (fixture: BottomSheetFixture, isStyleX: boolean): string => {
  const cls = (tailwind: string, stylexRef: string) =>
    isStyleX ? `className(${stylexRef})` : `'${tailwind}'`
  const mainCls = cls(
    'flex min-h-screen items-center justify-center p-8',
    'styles.main',
  )
  const sheetCall = (label: string, content: string, extra = '') =>
    `Sheet.sheet({
      model: model.sheet,
      toParentMessage: message => GotSheetMessage({ message }),
      side: 'bottom',
      title: '${escape(label)}',${extra}
      layout: () => [
        ${content},
      ],
    }, h)`
  switch (fixture.kind) {
    case 'showcase':
      return `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${escape(fixture.title)}',
  body: h.main([h.Class(${mainCls})], [
    Button.button({ variant: 'outline', onClick: ClickedOpenSheet(), children: ['${escape(fixture.triggerLabel)}'] }, h),
    ${sheetCall('Filters', emitFilterContent(isStyleX))},
  ]),
})`
    case 'heights':
      return `const heightsCopy = { hug: '${heightsCopy.hug}', capped: '${heightsCopy.capped}', tall: '${heightsCopy.tall}' } as const

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${escape(fixture.title)}',
  body: h.main([h.Class(${mainCls})], [
    h.div([h.Class(${cls('flex flex-wrap gap-2', 'styles.triggerRow')})],
      (['hug', 'capped', 'tall'] as const).map(height =>
        Button.button({ variant: 'outline', onClick: ClickedOpenHeight({ height }), children: [\`Open \${height}\`] }, h),
      ),
    ),
    Sheet.sheet({
      model: model.sheet,
      toParentMessage: message => GotSheetMessage({ message }),
      side: 'bottom',
      title: \`\${model.selectedHeight} height\`,
      layout: () => [
        ${emitHeightsContent(isStyleX)},
      ],
    }, h),
  ]),
})`
    case 'noscrim':
      return `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${escape(fixture.title)}',
  body: h.main([h.Class(${cls('flex min-h-screen items-center justify-center p-8', 'styles.main')})], [
    h.div([h.Class(${cls('flex flex-col gap-3 p-4', 'styles.pageStack')})], [
      h.h3([h.Class(${cls('text-base font-semibold', 'styles.pageHeading')})], ['Nearby places']),
      h.p([h.Class(${cls('text-sm', 'styles.sheetText')})], [\`Background interactions: \${model.backgroundClicks}\`]),
      Button.button({ variant: 'secondary', onClick: ClickedBackground(), children: ['Interact with page'] }, h),
      Button.button({ variant: 'default', onClick: ClickedOpenSheet(), children: ['${escape(fixture.triggerLabel)}'] }, h),
    ]),
    Sheet.sheet({
      model: model.sheet,
      toParentMessage: message => GotSheetMessage({ message }),
      side: 'bottom',
      title: 'Place details',
      layout: () => [
        ${emitNoScrimContent(isStyleX)},
      ],
    }, h),
  ]),
})`
    case 'snappoints':
      return `const directionSteps = ${JSON.stringify(directionSteps, null, 2)}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${escape(fixture.title)}',
  body: h.main([h.Class(${mainCls})], [
    h.div([h.Class(${cls('flex max-w-md flex-col gap-3', 'styles.pageStack')})], [
      h.p([h.Class(${cls('text-sm', 'styles.sheetText')})], ['This sheet has two extra stops: half the viewport, and a 96px peek. Drag the handle down to collapse it, then back up — it rests at each stop instead of following your finger.']),
      Button.button({ variant: 'default', onClick: ClickedOpenSheet(), children: ['${escape(fixture.triggerLabel)}'] }, h),
    ]),
    Sheet.sheet({
      model: model.sheet,
      toParentMessage: message => GotSheetMessage({ message }),
      side: 'bottom',
      title: 'Directions to the Ferry Building',
      layout: () => [
        ${emitStepsContent(isStyleX)},
      ],
    }, h),
  ]),
})`
    case 'keyboard':
      return `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${escape(fixture.title)}',
  body: h.main([h.Class(${mainCls})], [
    Button.button({ variant: 'default', onClick: ClickedOpenSheet(), children: ['${escape(fixture.triggerLabel)}'] }, h),
    Sheet.sheet({
      model: model.sheet,
      toParentMessage: message => GotSheetMessage({ message }),
      side: 'bottom',
      title: 'Edit profile',
      layout: () => [
        ${emitKeyboardContent(isStyleX)},
      ],
    }, h),
  ]),
})`
    case 'switcher':
      return `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${escape(fixture.title)}',
  body: h.main([h.Class(${mainCls})], [
    Button.button({ variant: 'default', onClick: ClickedOpenSwitcher(), children: ['${escape(fixture.triggerLabel)}'] }, h),
    Sheet.sheetSwitcher({
      model: model.switcher,
      toParentMessage: message => GotSwitcherMessage({ message }),
      sheets: ${emitSwitcherSheets(isStyleX)},
    }, h),
  ]),
})`
    case 'reviewflow':
      return `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Sheet — ${escape(fixture.title)}',
  body: h.main([h.Class(${mainCls})], [
    Button.button({ variant: 'default', onClick: ClickedOpenSwitcher(), children: ['${escape(fixture.triggerLabel)}'] }, h),
    Sheet.sheetSwitcher({
      model: model.switcher,
      toParentMessage: message => GotSwitcherMessage({ message }),
      sheets: ${emitReviewSheets(isStyleX)},
    }, h),
  ]),
})`
  }
}

const emitBottomSource = (
  fixture: BottomSheetFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  return foldkitApplication({
    title: `Sheet — ${fixture.title}`,
    imports: emitImports(fixture, renderer !== 'tailwind'),
    model: emitModelFields(fixture),
    messages: emitMessages(fixture, tag),
    init: emitInit(fixture, tag),
    update: emitUpdate(fixture, tag),
    view: emitView(fixture, renderer !== 'tailwind'),
  })
}

export type SheetDocFixture = SheetFixture | BottomSheetFixture

export const sheetDocFixtures: ReadonlyArray<SheetDocFixture> = [
  ...sheetFixtures,
  ...bottomSheetFixtures,
]

const sheetExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  sheetDocFixtures.map(fixture =>
    'instances' in fixture
      ? {
          title: fixture.title,
          ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
          code: emitSource(fixture, renderer !== 'tailwind'),
        }
      : {
          title: fixture.title,
          ...(fixture.description === undefined
            ? {}
            : { description: fixture.description }),
          code: emitBottomSource(fixture, renderer),
        },
  )

export const sheetExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, sheetExamplesFor(renderer))
