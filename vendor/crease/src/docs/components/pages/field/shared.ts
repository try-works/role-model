import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type FieldKind =
  | 'demo'
  | 'input'
  | 'textarea'
  | 'select'
  | 'slider'
  | 'fieldset'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'choiceCard'
  | 'group'
  | 'rtl'
  | 'responsive'

export type FieldFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: FieldKind
}>

export const fieldFixtures: ReadonlyArray<FieldFixture> = [
  { title: 'Payment Method', kind: 'demo', heroOnly: true },
  { title: 'Input', kind: 'input' },
  { title: 'Textarea', kind: 'textarea' },
  { title: 'Select', kind: 'select' },
  { title: 'Slider', kind: 'slider' },
  { title: 'Fieldset', kind: 'fieldset' },
  { title: 'Checkbox', kind: 'checkbox' },
  { title: 'Radio', kind: 'radio' },
  { title: 'Switch', kind: 'switch' },
  { title: 'Choice Card', kind: 'choiceCard' },
  { title: 'Field Group', kind: 'group' },
  { title: 'RTL', kind: 'rtl' },
  { title: 'Responsive Layout', kind: 'responsive' },
]

export const fieldMonths: ReadonlyArray<
  Readonly<{ value: string; label: string }>
> = [
  { value: '01', label: '01' },
  { value: '02', label: '02' },
  { value: '03', label: '03' },
  { value: '04', label: '04' },
  { value: '05', label: '05' },
  { value: '06', label: '06' },
  { value: '07', label: '07' },
  { value: '08', label: '08' },
  { value: '09', label: '09' },
  { value: '10', label: '10' },
  { value: '11', label: '11' },
  { value: '12', label: '12' },
]

export const fieldYears: ReadonlyArray<
  Readonly<{ value: string; label: string }>
> = [
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
]

export const fieldDepartments: ReadonlyArray<
  Readonly<{ value: string; label: string }>
> = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Customer Support' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
]

export const fieldRtlCopy = {
  paymentMethod: 'طريقة الدفع',
  secureTransactions: 'جميع المعاملات آمنة ومشفرة',
  nameOnCard: 'الاسم على البطاقة',
  cardNumber: 'رقم البطاقة',
  cardNumberDescription: 'أدخل رقم البطاقة المكون من 16 رقمًا',
  month: 'الشهر',
  year: 'السنة',
  billingAddress: 'عنوان الفوترة',
  billingAddressDescription: 'عنوان الفوترة المرتبط بطريقة الدفع الخاصة بك',
  sameAsShipping: 'نفس عنوان الشحن',
  comments: 'تعليقات',
  commentsPlaceholder: 'أضف أي تعليقات إضافية',
  submit: 'إرسال',
  cancel: 'إلغاء',
} as const

const sq = (text: string): string => text.replaceAll("'", "\\'")

const kindUses = (kind: FieldKind) => ({
  input: ['demo', 'input', 'fieldset', 'responsive', 'rtl'].includes(kind),
  textarea: ['demo', 'textarea', 'rtl'].includes(kind),
  select: ['demo', 'select', 'rtl'].includes(kind),
  slider: kind === 'slider',
  checkbox: ['demo', 'checkbox', 'group', 'rtl'].includes(kind),
  radio: ['radio', 'choiceCard'].includes(kind),
  switch: kind === 'switch',
  button: ['demo', 'responsive', 'rtl'].includes(kind),
})

const textFieldsFor = (kind: FieldKind): ReadonlyArray<string> => {
  switch (kind) {
    case 'demo':
    case 'rtl':
      return ['name', 'cardNumber', 'cvv', 'comments']
    case 'input':
      return ['username', 'password']
    case 'textarea':
      return ['feedback']
    case 'fieldset':
      return ['street', 'city', 'zip']
    case 'responsive':
      return ['profileName']
    default:
      return []
  }
}

const checkFieldsFor = (kind: FieldKind): ReadonlyArray<string> => {
  switch (kind) {
    case 'demo':
    case 'rtl':
      return ['sameAsShipping']
    case 'checkbox':
      return [
        'hardDisks',
        'externalDisks',
        'cdsDvds',
        'connectedServers',
        'syncFolders',
      ]
    case 'group':
      return ['push', 'pushTasks', 'emailTasks']
    case 'switch':
      return ['mfa']
    default:
      return []
  }
}

const checkSeeds: Record<string, boolean> = {
  sameAsShipping: true,
  hardDisks: true,
  externalDisks: false,
  cdsDvds: false,
  connectedServers: false,
  syncFolders: true,
  push: true,
  pushTasks: false,
  emailTasks: false,
  mfa: false,
}

const emitImports = (fixture: FieldFixture, isStyleX: boolean): string => {
  const uses = kindUses(fixture.kind)
  const dir = isStyleX ? 'stylex' : 'ui'
  const parts: string[] = [`import * as Field from '@/${dir}/field'`]
  if (uses.input) parts.push(`import * as Input from '@/${dir}/input'`)
  if (uses.textarea) parts.push(`import * as Textarea from '@/${dir}/textarea'`)
  if (uses.select) parts.push(`import * as Select from '@/${dir}/select'`)
  if (uses.slider) parts.push(`import * as Slider from '@/${dir}/slider'`)
  if (uses.checkbox) parts.push(`import * as Checkbox from '@/${dir}/checkbox'`)
  if (uses.radio)
    parts.push(`import * as RadioGroup from '@/${dir}/radio-group'`)
  if (uses.switch) parts.push(`import * as Switch from '@/${dir}/switch'`)
  if (uses.button) parts.push(`import * as Button from '@/${dir}/button'`)
  const styles = isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  page: { maxWidth: '28rem', width: '100%' },
  pageXs: { maxWidth: '20rem', width: '100%' },
  pageSm: { maxWidth: '24rem', width: '100%' },
  pageLg: { maxWidth: '32rem', width: '100%' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' },
  gapSm: { gap: '0.75rem' },
  fitWidth: { width: 'fit-content' },
  valueSpan: { fontVariantNumeric: 'tabular-nums', fontWeight: 500 },
  sliderTop: { marginBlockStart: '0.5rem', width: '100%' },
})`
    : ''
  return `${styles === '' ? '' : `${styles}\n\n`}${parts.join('\n')}`
}

const emitModel = (fixture: FieldFixture): string => {
  const kind = fixture.kind
  const uses = kindUses(kind)
  const fields: string[] = []
  for (const key of textFieldsFor(kind)) fields.push(`${key}: S.String`)
  for (const key of checkFieldsFor(kind)) fields.push(`${key}: S.Boolean`)
  if (uses.slider)
    fields.push(
      'price: S.Tuple([S.Number, S.Number])',
      'priceSlider: Slider.MultiModel',
    )
  if (kind === 'demo' || kind === 'rtl') {
    fields.push(
      'monthSelect: Select.Model',
      'yearSelect: Select.Model',
      'month: S.Option(S.String)',
      'year: S.Option(S.String)',
    )
  }
  if (kind === 'select') {
    fields.push(
      'departmentSelect: Select.Model',
      'department: S.Option(S.String)',
    )
  }
  if (kind === 'radio')
    fields.push('planRadio: RadioGroup.Model', 'plan: S.String')
  if (kind === 'choiceCard')
    fields.push('environmentRadio: RadioGroup.Model', 'environment: S.String')
  return `export const Model = S.Struct({ ${fields.join(', ')} })
export type Model = typeof Model.Type`
}

const emitMessages = (fixture: FieldFixture): string => {
  const kind = fixture.kind
  const uses = kindUses(kind)
  const members: string[] = []
  if (textFieldsFor(kind).length > 0)
    members.push('ChangedFieldText: { field: S.String, value: S.String }')
  if (checkFieldsFor(kind).length > 0)
    members.push('ToggledFieldCheck: { field: S.String, isChecked: S.Boolean }')
  if (uses.slider)
    members.push('GotFieldSliderMessage: { message: Slider.MultiMessage }')
  if (kind === 'demo' || kind === 'rtl')
    members.push(
      "GotFieldSelectMessage: { which: S.Literals(['month', 'year']), message: Select.Message }",
    )
  if (kind === 'select')
    members.push(
      "GotFieldSelectMessage: { which: S.Literal('department'), message: Select.Message }",
    )
  if (kind === 'radio')
    members.push(
      "GotFieldRadioMessage: { which: S.Literal('plan'), message: RadioGroup.Message }",
    )
  if (kind === 'choiceCard')
    members.push(
      "GotFieldRadioMessage: { which: S.Literal('environment'), message: RadioGroup.Message }",
    )
  return `export const Message = defineMessageUnion({
  ${members.join(',\n  ')},
});
export type Message = typeof Message.Type`
}

const emitInit = (fixture: FieldFixture): string => {
  const kind = fixture.kind
  const uses = kindUses(kind)
  const fields: string[] = []
  for (const key of textFieldsFor(kind)) fields.push(`${key}: ''`)
  for (const key of checkFieldsFor(kind))
    fields.push(`${key}: ${String(checkSeeds[key])}`)
  if (uses.slider)
    fields.push(
      'price: [200, 800]',
      "priceSlider: Slider.initMulti({ id: 'field-price', thumbs: 2, min: 0, max: 1000, step: 10 })",
    )
  if (kind === 'demo' || kind === 'rtl') {
    fields.push(
      "monthSelect: Select.init({ id: 'field-month', isAnimated: true })",
      "yearSelect: Select.init({ id: 'field-year', isAnimated: true })",
      'month: Option.none()',
      'year: Option.none()',
    )
  }
  if (kind === 'select') {
    fields.push(
      "departmentSelect: Select.init({ id: 'field-department', isAnimated: true })",
      'department: Option.none()',
    )
  }
  if (kind === 'radio')
    fields.push(
      "planRadio: RadioGroup.init({ id: 'field-plan' })",
      "plan: 'monthly'",
    )
  if (kind === 'choiceCard')
    fields.push(
      "environmentRadio: RadioGroup.init({ id: 'field-environment' })",
      "environment: 'kubernetes'",
    )
  return `export const init = (): Update.Return<Model, Message> => ({ model: { ${fields.join(', ')} } })`
}

const emitUpdate = (fixture: FieldFixture): string => {
  const kind = fixture.kind
  const uses = kindUses(kind)
  const cases: string[] = []
  if (textFieldsFor(kind).length > 0)
    cases.push(`case 'ChangedFieldText':
      return { model: { ...model, [message.field]: message.value } }`)
  if (checkFieldsFor(kind).length > 0)
    cases.push(`case 'ToggledFieldCheck':
      return { model: { ...model, [message.field]: message.isChecked } }`)
  if (uses.slider)
    cases.push(`case 'GotFieldSliderMessage': {
      const next = Slider.updateMulti(model.priceSlider, message.message)
      const change = Option.fromNullishOr(next.outMessage)
      return {
        model: {
          ...model,
          priceSlider: next.model,
          price: Option.match(change, {
            onNone: () => model.price,
            onSome: out => {
              const values = Slider.updateMultiValue(model.price, out.index, out.value, {
                min: model.priceSlider.min,
                max: model.priceSlider.max,
                step: model.priceSlider.step,
              })
              return [values[0] ?? model.price[0], values[1] ?? model.price[1]]
            },
          }),
        },
        commands: Command.mapMessages(next.commands ?? [], next =>
          Message.GotFieldSliderMessage({ message: next })),
      }
    }`)
  if (kind === 'demo' || kind === 'rtl') {
    cases.push(`case 'GotFieldSelectMessage': {
      const which = message.which
      const modelKey = which === 'month' ? 'monthSelect' : 'yearSelect'
      const { model: select, commands: childCommands, outMessage } = Select.update(model[modelKey], message.message)
      const commands = childCommands ?? []
      const maybeSelected = Option.match(Option.fromNullishOr(outMessage), {
        onNone: () => model[which],
        onSome: selection => selection._tag === 'Selected' ? Option.some(selection.value) : Option.none<string>(),
      })
      const next: Model = which === 'month'
        ? { ...model, monthSelect: select, month: maybeSelected }
        : { ...model, yearSelect: select, year: maybeSelected }
      return { model: next, commands: Command.mapMessages(commands, message => Message.GotFieldSelectMessage({ which, message })) }
    }`)
  }
  if (kind === 'select') {
    cases.push(`case 'GotFieldSelectMessage': {
      const { model: select, commands: childCommands, outMessage } = Select.update(model.departmentSelect, message.message)
      const commands = childCommands ?? []
      const maybeSelected = Option.match(Option.fromNullishOr(outMessage), {
        onNone: () => model.department,
        onSome: selection => selection._tag === 'Selected' ? Option.some(selection.value) : Option.none<string>(),
      })
      return { model: { ...model, departmentSelect: select, department: maybeSelected }, commands: Command.mapMessages(commands, message => Message.GotFieldSelectMessage({ which: 'department', message })) }
    }`)
  }
  const radioCase = (
    which: 'plan' | 'environment',
  ) => `case 'GotFieldRadioMessage': {
      const modelKey = '${which}Radio' as const
      const { model: radioGroup, commands: childCommands, outMessage } = RadioGroup.update(model[modelKey], message.message)
      const commands = childCommands ?? []
      const value = Option.match(Option.fromNullishOr(outMessage), {
        onNone: () => model.${which},
        onSome: selection => selection.value,
      })
      return { model: { ...model, [modelKey]: radioGroup, ${which}: value }, commands: Command.mapMessages(commands, message => Message.GotFieldRadioMessage({ which: '${which}', message })) }
    }`
  if (kind === 'radio') cases.push(radioCase('plan'))
  if (kind === 'choiceCard') cases.push(radioCase('environment'))
  return `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    ${cases.join('\n    ')}
  }
}`
}

const emitTextField = (
  opts: Readonly<{
    id: string
    label: string
    field: string
    placeholder?: string
    description?: string
    type?: string
    descriptionFirst?: boolean
  }>,
): string => {
  const input = `Input.input({ id: '${opts.id}', value: model.${opts.field}, onInput: value => Message.ChangedFieldText({ field: '${opts.field}', value }),${opts.placeholder === undefined ? '' : ` placeholder: '${sq(opts.placeholder)}',`}${opts.type === undefined ? '' : ` type: '${opts.type}',`} }, h)`
  const desc =
    opts.description === undefined
      ? ''
      : `Field.fieldDescription({ children: ['${sq(opts.description)}'] }, h)`
  const children = [
    `Field.fieldLabel({ for: '${opts.id}', children: ['${sq(opts.label)}'] }, h)`,
    opts.descriptionFirst === true ? desc : '',
    input,
    opts.descriptionFirst === true ? '' : desc,
  ].filter(line => line !== '')
  return `Field.field({ children: [
        ${children.join(',\n        ')},
      ] }, h)`
}

const emitCheckRow = (
  id: string,
  field: string,
  label: string,
  extra = '',
): string =>
  `Field.field({ orientation: 'horizontal', children: [
        Checkbox.checkbox({ id: '${id}', isChecked: model.${field}, onToggle: isChecked => Message.ToggledFieldCheck({ field: '${field}', isChecked }), label: '${sq(label)}'${extra} }, h),
      ] }, h)`

const emitSelect = (
  which: string,
  itemsConst: string,
  placeholder: string,
  ariaLabel: string,
  rtl: boolean,
): string =>
  `Select.select({ model: model.${which}Select, maybeSelectedValue: model.${which}, toParentMessage: message => Message.GotFieldSelectMessage({ which: '${which}', message }), items: ${itemsConst}, itemToValue: item => item.value, itemToLabel: item => item.label, placeholder: '${placeholder}', ariaLabel: '${ariaLabel}'${rtl ? ", direction: 'rtl'" : ''} }, h)`

const emitPaymentFields = (isStyleX: boolean, rtl: boolean): string => {
  const c = (key: keyof typeof fieldRtlCopy, en: string): string =>
    sq(rtl ? fieldRtlCopy[key] : en)
  const layout = isStyleX ? 'layoutStyle' : 'class'
  const grid3 = isStyleX
    ? `h.Class(className(styles.grid3))`
    : `h.Class('grid grid-cols-3 gap-4')`
  return `Field.fieldGroup({ children: [
    Field.fieldSet({ children: [
      Field.fieldLegend({ children: ['${c('paymentMethod', 'Payment Method')}'] }, h),
      Field.fieldDescription({ children: ['${c('secureTransactions', 'All transactions are secure and encrypted')}'] }, h),
      Field.fieldGroup({ children: [
        ${emitTextField({ id: 'field-name', label: rtl ? fieldRtlCopy.nameOnCard : 'Name on Card', field: 'name', placeholder: 'Evil Rabbit' })},
        ${emitTextField({ id: 'field-number', label: rtl ? fieldRtlCopy.cardNumber : 'Card Number', field: 'cardNumber', placeholder: '1234 5678 9012 3456', description: rtl ? fieldRtlCopy.cardNumberDescription : 'Enter your 16-digit card number' })},
        h.div([${grid3}], [
          Field.field({ children: [
            Field.fieldLabel({ children: ['${c('month', 'Month')}'] }, h),
            ${emitSelect('month', 'months', 'MM', 'Month', rtl)},
          ] }, h),
          Field.field({ children: [
            Field.fieldLabel({ children: ['${c('year', 'Year')}'] }, h),
            ${emitSelect('year', 'years', 'YYYY', 'Year', rtl)},
          ] }, h),
          ${emitTextField({ id: 'field-cvv', label: 'CVV', field: 'cvv', placeholder: '123' })},
        ]),
      ] }, h),
    ] }, h),
    Field.fieldSeparator({}, h),
    Field.fieldSet({ children: [
      Field.fieldLegend({ children: ['${c('billingAddress', 'Billing Address')}'] }, h),
      Field.fieldDescription({ children: ['${c('billingAddressDescription', 'The billing address associated with your payment method')}'] }, h),
      Field.fieldGroup({ children: [
        ${emitCheckRow('field-same', 'sameAsShipping', rtl ? fieldRtlCopy.sameAsShipping : 'Same as shipping address')},
      ] }, h),
    ] }, h),
    Field.fieldSet({ children: [
      Field.fieldGroup({ children: [
        Field.field({ children: [
          Field.fieldLabel({ for: 'field-comments', children: ['${c('comments', 'Comments')}'] }, h),
          Textarea.textarea({ id: 'field-comments', value: model.comments, onInput: value => Message.ChangedFieldText({ field: 'comments', value }), placeholder: '${c('commentsPlaceholder', 'Add any additional comments')}', ${isStyleX ? "resize: 'none'" : "class: 'resize-none'"} }, h),
        ] }, h),
      ] }, h),
    ] }, h),
    Field.field({ orientation: 'horizontal', children: [
      Button.button({ type: 'submit', children: ['${c('submit', 'Submit')}'] }, h),
      Button.button({ variant: 'outline', type: 'button', children: ['${c('cancel', 'Cancel')}'] }, h),
    ] }, h),
  ] }, h)`
}

const emitItemConsts = (fixture: FieldFixture): string => {
  const parts: string[] = []
  if (fixture.kind === 'demo' || fixture.kind === 'rtl') {
    parts.push(
      `const months = [${fieldMonths.map(m => `{ value: '${m.value}', label: '${m.label}' }`).join(', ')}]`,
    )
    parts.push(
      `const years = [${fieldYears.map(y => `{ value: '${y.value}', label: '${y.label}' }`).join(', ')}]`,
    )
  }
  if (fixture.kind === 'select')
    parts.push(
      `const departments = [${fieldDepartments.map(d => `{ value: '${d.value}', label: '${sq(d.label)}' }`).join(', ')}]`,
    )
  return parts.join('\n\n')
}

const emitBody = (fixture: FieldFixture, isStyleX: boolean): string => {
  const kind = fixture.kind
  const wrap = isStyleX
    ? (ref: string) => `h.Class(className(${ref}))`
    : (ref: string) => `h.Class('${ref}')`
  const layoutProp = isStyleX
    ? (ref: string) => `layoutStyle: ${ref},`
    : (cls: string) => `class: '${cls}',`
  switch (kind) {
    case 'demo':
      return `h.div([${wrap(isStyleX ? 'styles.page' : 'w-full max-w-md')}], [
    ${emitPaymentFields(isStyleX, false)},
  ])`
    case 'rtl':
      return `h.div([h.Dir('rtl'), ${wrap(isStyleX ? 'styles.page' : 'w-full max-w-md')}], [
    ${emitPaymentFields(isStyleX, true)},
  ])`
    case 'input':
      return `Field.fieldSet({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldGroup({ children: [
      ${emitTextField({ id: 'username', label: 'Username', field: 'username', placeholder: 'Max Leiter', description: 'Choose a unique username for your account.' })},
      ${emitTextField({ id: 'password', label: 'Password', field: 'password', type: 'password', placeholder: '••••••••', description: 'Must be at least 8 characters long.', descriptionFirst: true })},
    ] }, h),
  ] }, h)`
    case 'textarea':
      return `Field.fieldSet({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldGroup({ children: [
      Field.field({ children: [
        Field.fieldLabel({ for: 'feedback', children: ['Feedback'] }, h),
        Textarea.textarea({ id: 'feedback', value: model.feedback, onInput: value => Message.ChangedFieldText({ field: 'feedback', value }), placeholder: 'Your feedback helps us improve...', rows: 4 }, h),
        Field.fieldDescription({ children: ['Share your thoughts about our service.'] }, h),
      ] }, h),
    ] }, h),
  ] }, h)`
    case 'select':
      return `Field.field({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldLabel({ children: ['Department'] }, h),
    ${emitSelect('department', 'departments', 'Choose department', 'Department', false)},
    Field.fieldDescription({ children: ['Select your department or area of work.'] }, h),
  ] }, h)`
    case 'slider':
      return `Field.field({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldTitle({ children: ['Price Range'] }, h),
    Field.fieldDescription({ children: [h.span([], ['Set your budget range ($', h.span([${wrap(isStyleX ? 'styles.valueSpan' : 'font-medium tabular-nums')}], [String(model.price[0])]), ' - ', h.span([${wrap(isStyleX ? 'styles.valueSpan' : 'font-medium tabular-nums')}], [String(model.price[1])]), ').'])] }, h),
    Slider.rangeSlider({ model: model.priceSlider, values: model.price, toParentMessage: message => Message.GotFieldSliderMessage({ message }), ariaLabels: ['Minimum price', 'Maximum price'], ${layoutProp(isStyleX ? 'styles.sliderTop' : 'mt-2 w-full')} }, h),
  ] }, h)`
    case 'fieldset':
      return `Field.fieldSet({ ${layoutProp(isStyleX ? 'styles.pageSm' : 'w-full max-w-sm')} children: [
    Field.fieldLegend({ children: ['Address Information'] }, h),
    Field.fieldDescription({ children: ['We need your address to deliver your order.'] }, h),
    Field.fieldGroup({ children: [
      ${emitTextField({ id: 'street', label: 'Street Address', field: 'street', placeholder: '123 Main St' })},
      h.div([${wrap(isStyleX ? 'styles.grid2' : 'grid grid-cols-2 gap-4')}], [
        ${emitTextField({ id: 'city', label: 'City', field: 'city', placeholder: 'New York' })},
        ${emitTextField({ id: 'zip', label: 'Postal Code', field: 'zip', placeholder: '90502' })},
      ]),
    ] }, h),
  ] }, h)`
    case 'checkbox':
      return `Field.fieldGroup({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldSet({ children: [
      Field.fieldLegend({ variant: 'label', children: ['Show these items on the desktop'] }, h),
      Field.fieldDescription({ children: ['Select the items you want to show on the desktop.'] }, h),
      ${
        isStyleX
          ? `h.div([h.Class(className(styles.gapSm))], [
        ${emitCheckRow('hard-disks', 'hardDisks', 'Hard disks')},
        ${emitCheckRow('external-disks', 'externalDisks', 'External disks')},
        ${emitCheckRow('cds-dvds', 'cdsDvds', 'CDs, DVDs, and iPods')},
        ${emitCheckRow('connected-servers', 'connectedServers', 'Connected servers')},
      ])`
          : `Field.fieldGroup({ class: 'gap-3', children: [
        ${emitCheckRow('hard-disks', 'hardDisks', 'Hard disks')},
        ${emitCheckRow('external-disks', 'externalDisks', 'External disks')},
        ${emitCheckRow('cds-dvds', 'cdsDvds', 'CDs, DVDs, and iPods')},
        ${emitCheckRow('connected-servers', 'connectedServers', 'Connected servers')},
      ] }, h)`
      },
    ] }, h),
    Field.fieldSeparator({}, h),
    Field.field({ orientation: 'horizontal', children: [
      Checkbox.checkbox({ id: 'sync-folders', isChecked: model.syncFolders, onToggle: isChecked => Message.ToggledFieldCheck({ field: 'syncFolders', isChecked }), label: 'Sync Desktop & Documents folders', description: 'Your Desktop & Documents folders are being synced with iCloud Drive. You can access them from other devices.' }, h),
    ] }, h),
  ] }, h)`
    case 'radio':
      return `Field.fieldSet({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldLegend({ variant: 'label', children: ['Subscription Plan'] }, h),
    Field.fieldDescription({ children: ['Yearly and lifetime plans offer significant savings.'] }, h),
    RadioGroup.radioGroup({ model: model.planRadio, selectedValue: Option.some(model.plan), toParentMessage: message => Message.GotFieldRadioMessage({ which: 'plan', message }), ariaLabel: 'Subscription Plan', name: 'plan', options: [
      { value: 'monthly', label: 'Monthly ($9.99/month)' },
      { value: 'yearly', label: 'Yearly ($99.99/year)' },
      { value: 'lifetime', label: 'Lifetime ($299.99)' },
    ] }, h),
  ] }, h)`
    case 'switch':
      return `Field.field({ orientation: 'horizontal', ${layoutProp(isStyleX ? 'styles.fitWidth' : 'w-fit')} children: [
    Switch.switchControl({ id: 'mfa', isChecked: model.mfa, onToggle: isChecked => Message.ToggledFieldCheck({ field: 'mfa', isChecked }), label: 'Multi-factor authentication' }, h),
  ] }, h)`
    case 'choiceCard':
      return `Field.fieldGroup({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldSet({ children: [
      Field.fieldLegend({ variant: 'label', children: ['Compute Environment'] }, h),
      Field.fieldDescription({ children: ['Select the compute environment for your cluster.'] }, h),
      RadioGroup.radioGroup({ model: model.environmentRadio, selectedValue: Option.some(model.environment), toParentMessage: message => Message.GotFieldRadioMessage({ which: 'environment', message }), ariaLabel: 'Compute Environment', name: 'environment', options: [
        { value: 'kubernetes', label: 'Kubernetes', description: 'Run GPU workloads on a K8s cluster.' },
        { value: 'vm', label: 'Virtual Machine', description: 'Access a cluster to run GPU workloads.' },
      ] }, h),
    ] }, h),
  ] }, h)`
    case 'group':
      return `Field.fieldGroup({ ${layoutProp(isStyleX ? 'styles.pageXs' : 'w-full max-w-xs')} children: [
    Field.fieldSet({ children: [
      Field.fieldLabel({ children: ['Responses'] }, h),
      Field.fieldDescription({ children: ['Get notified when ChatGPT responds to requests that take time, like research or image generation.'] }, h),
      ${
        isStyleX
          ? `h.div([h.Class(className(styles.gapSm))], [
        ${emitCheckRow('push', 'push', 'Push notifications', ', isDisabled: true')},
      ])`
          : `Field.fieldGroup({ class: 'gap-3', children: [
        ${emitCheckRow('push', 'push', 'Push notifications', ', isDisabled: true')},
      ] }, h)`
      },
    ] }, h),
    Field.fieldSeparator({}, h),
    Field.fieldSet({ children: [
      Field.fieldLabel({ children: ['Tasks'] }, h),
      Field.fieldDescription({ children: [h.span([], ['Get notified when tasks you\\'ve created have updates. ', h.a([h.Href('#')], ['Manage tasks'])])] }, h),
      ${
        isStyleX
          ? `h.div([h.Class(className(styles.gapSm))], [
        ${emitCheckRow('push-tasks', 'pushTasks', 'Push notifications')},
        ${emitCheckRow('email-tasks', 'emailTasks', 'Email notifications')},
      ])`
          : `Field.fieldGroup({ class: 'gap-3', children: [
        ${emitCheckRow('push-tasks', 'pushTasks', 'Push notifications')},
        ${emitCheckRow('email-tasks', 'emailTasks', 'Email notifications')},
      ] }, h)`
      },
    ] }, h),
  ] }, h)`
    case 'responsive':
      return `h.div([${wrap(isStyleX ? 'styles.pageLg' : 'w-full max-w-lg')}], [
    Field.fieldSet({ children: [
      Field.fieldLegend({ children: ['Profile'] }, h),
      Field.fieldDescription({ children: ['Fill in your profile information.'] }, h),
      Field.fieldGroup({ children: [
        Field.field({ orientation: 'responsive', children: [
          Field.fieldContent({ children: [
            Field.fieldLabel({ for: 'name', children: ['Name'] }, h),
            Field.fieldDescription({ children: ['Provide your full name for identification'] }, h),
          ] }, h),
          Input.input({ id: 'name', value: model.profileName, onInput: value => Message.ChangedFieldText({ field: 'profileName', value }), placeholder: 'Evil Rabbit' }, h),
        ] }, h),
        Field.field({ orientation: 'responsive', children: [
          Button.button({ type: 'submit', children: ['Submit'] }, h),
          Button.button({ variant: 'outline', type: 'button', children: ['Cancel'] }, h),
        ] }, h),
      ] }, h),
    ] }, h),
  ])`
  }
}

const emitApplication = (fixture: FieldFixture, isStyleX: boolean): string => {
  const uses = kindUses(fixture.kind)
  const effectImports =
    uses.select || uses.radio || uses.slider
      ? "import { Option, Schema as S } from 'effect'"
      : "import { Schema as S } from 'effect'"
  const items = emitItemConsts(fixture)
  return foldkitApplication({
    title: `Field — ${fixture.title}`,
    imports: `${effectImports}
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

${emitImports(fixture, isStyleX)}${items === '' ? '' : `\n\n${items}`}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    ...(kindUses(fixture.kind).slider
      ? {
          subscriptions: `export const subscriptions = Subscription.aggregate<Model, Message>()(
  Slider.multiThumbSubscriptions<Model, Message>({
    id: 'field-price',
    thumbCount: 2,
    toChildModel: model => model.priceSlider,
    toParentMessage: message => Message.GotFieldSliderMessage({ message }),
  }),
)`,
        }
      : {}),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Field — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)
  .split('\n')
  .map(line => `    ${line}`)
  .join('\n')}
  ]),
})`,
  })
}

const fieldExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  fieldFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer !== 'tailwind'),
  }))

export const fieldExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, fieldExamplesFor(renderer))
