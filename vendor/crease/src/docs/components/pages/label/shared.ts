import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type LabelKind = 'demo' | 'field' | 'rtl'

export interface LabelFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: LabelKind
}

export const labelFixtures: Readonly<[LabelFixture, ...Array<LabelFixture>]> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Label in Field',
    description:
      'For form fields, use the Field component which includes built-in FieldLabel, FieldDescription, and FieldError components.',
    kind: 'field',
  },
  { title: 'RTL', kind: 'rtl' },
]

/* Arabic copy, verbatim from upstream label-rtl.tsx. */
export const labelRtlCopy = {
  label: 'قبول الشروط والأحكام',
} as const

export const labelMonths = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
] as const
export const labelYears = [
  '2024',
  '2025',
  '2026',
  '2027',
  '2028',
  '2029',
] as const

const sq = (value: string): string => value.replaceAll("'", "\\'")

const kindUsesField = (kind: LabelKind): boolean => kind === 'field'
const kindUsesCheckbox = (kind: LabelKind): boolean =>
  kind === 'demo' || kind === 'field' || kind === 'rtl'
const kindUsesLabel = (kind: LabelKind): boolean =>
  kind === 'demo' || kind === 'rtl'
const kindUsesFieldComponents = (kind: LabelKind): boolean => kind === 'field'

const emitImports = (fixture: LabelFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts: Array<string> = [
    "import { Command, Runtime, Subscription, Update } from 'foldkit'",
    "import { type Document, type HtmlBuilder } from 'foldkit/html'",
    "import { defineMessageUnion } from 'foldkit/message'",
  ]
  if (isStyleX) {
    parts.push('', "import * as stylex from '@stylexjs/stylex'")
  }
  if (kindUsesField(fixture.kind)) {
    parts.push(`import * as Button from '@/${base}/button'`)
  }
  if (kindUsesCheckbox(fixture.kind)) {
    parts.push(`import * as Checkbox from '@/${base}/checkbox'`)
  }
  if (kindUsesField(fixture.kind)) {
    parts.push(
      `import * as Field from '@/${base}/field'`,
      `import * as Input from '@/${base}/input'`,
      `import * as Select from '@/${base}/select'`,
      `import * as Textarea from '@/${base}/textarea'`,
    )
  }
  if (kindUsesLabel(fixture.kind)) {
    parts.push(`import * as Label from '@/${base}/label'`)
  }
  if (fixture.kind === 'field') {
    parts.push(
      '',
      `// @/${base}/label wraps inside @/${base}/field — FieldLabel is Label`,
      `// applied to form fields; a bare Label import would be unused here.`,
    )
  }
  return parts.join('\n')
}

const emitStyles = (fixture: LabelFixture): string => {
  if (fixture.kind === 'field') {
    return `  row: { display: 'flex', gap: '0.5rem' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' },
  wrapper: { width: '100%', maxWidth: '28rem' },`
  }
  if (fixture.kind === 'demo' || fixture.kind === 'rtl') {
    return `  row: { display: 'flex', gap: '0.5rem' },`
  }
  return ''
}

const emitModel = (fixture: LabelFixture): string => {
  if (fixture.kind === 'field') {
    return `export const Model = S.Struct({
  name: S.String,
  cardNumber: S.String,
  cvv: S.String,
  comments: S.String,
  sameAsShipping: S.Boolean,
  month: Select.Model,
  maybeMonth: S.Option(S.String),
  year: Select.Model,
  maybeYear: S.Option(S.String),
})
export type Model = typeof Model.Type`
  }
  if (fixture.kind === 'demo' || fixture.kind === 'rtl') {
    return `export const Model = S.Struct({
  acceptedTerms: S.Boolean,
})
export type Model = typeof Model.Type`
  }
  return 'export const Model = S.Struct({})\nexport type Model = typeof Model.Type'
}

const emitMessages = (fixture: LabelFixture): string => {
  if (fixture.kind === 'field') {
    return `export const Message = defineMessageUnion({
  ChangedName: { value: S.String },
  ChangedCardNumber: { value: S.String },
  ChangedCvv: { value: S.String },
  ChangedComments: { value: S.String },
  ToggledSameAsShipping: { isChecked: S.Boolean },
  GotMonthMessage: { message: Select.Message },
  GotYearMessage: { message: Select.Message },
})
export type Message = typeof Message.Type`
  }
  if (fixture.kind === 'demo' || fixture.kind === 'rtl') {
    return `export const Message = defineMessageUnion({
  ToggledTerms: { isChecked: S.Boolean },
})
export type Message = typeof Message.Type`
  }
  return `import { taggedStruct } from 'foldkit/schema'
export const NoOp = taggedStruct('NoOpLabel${fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')}');
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`
}

const emitInit = (fixture: LabelFixture): string => {
  if (fixture.kind === 'field') {
    return `export const init = (): Update.Return<Model, Message> => ({
  model: {
    name: '',
    cardNumber: '',
    cvv: '',
    comments: '',
    sameAsShipping: true,
    month: Select.init({ id: 'checkout-exp-month', isAnimated: true }),
    maybeMonth: Option.none(),
    year: Select.init({ id: 'checkout-exp-year', isAnimated: true }),
    maybeYear: Option.none(),
  },
})`
  }
  if (fixture.kind === 'demo' || fixture.kind === 'rtl') {
    return `export const init = (): Update.Return<Model, Message> => ({ model: { acceptedTerms: false } })`
  }
  return 'export const init = (): Update.Return<Model, Message> => ({ model: {} })'
}

const emitUpdate = (fixture: LabelFixture): string => {
  if (fixture.kind === 'field') {
    return `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedName':
      return { model: { ...model, name: message.value }, commands: [] }
    case 'ChangedCardNumber':
      return { model: { ...model, cardNumber: message.value }, commands: [] }
    case 'ChangedCvv':
      return { model: { ...model, cvv: message.value }, commands: [] }
    case 'ChangedComments':
      return { model: { ...model, comments: message.value }, commands: [] }
    case 'ToggledSameAsShipping':
      return { model: { ...model, sameAsShipping: message.isChecked }, commands: [] }
    case 'GotMonthMessage': {
      const { model: month, commands: monthCommands__, outMessage: monthOut__ } = Select.update(model.month, message.message)
      const maybeSelection = Option.fromNullishOr(monthOut__)
      const maybeMonth = Option.match(maybeSelection, {
        onNone: () => model.maybeMonth,
        onSome: selection => selection._tag === 'Selected' ? Option.some(selection.value) : Option.none(),
      })
      const commands = monthCommands__ ?? []
      return {
        model: { ...model, month, maybeMonth },
        commands: Command.mapMessages(commands, next => Message.GotMonthMessage({ message: next })),
      }
    }
    case 'GotYearMessage': {
      const { model: year, commands: yearCommands__, outMessage: yearOut__ } = Select.update(model.year, message.message)
      const maybeYearSelection = Option.fromNullishOr(yearOut__)
      const maybeYear = Option.match(maybeYearSelection, {
        onNone: () => model.maybeYear,
        onSome: selection => selection._tag === 'Selected' ? Option.some(selection.value) : Option.none(),
      })
      const commands = yearCommands__ ?? []
      return {
        model: { ...model, year, maybeYear },
        commands: Command.mapMessages(commands, next => Message.GotYearMessage({ message: next })),
      }
    }
  }
}`
  }
  if (fixture.kind === 'demo' || fixture.kind === 'rtl') {
    return `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledTerms':
      return { model: { ...model, acceptedTerms: message.isChecked }, commands: [] }
  }
}`
  }
  return `export const update = (
  model: Model,
  _message: Message,
): Update.Return<Model, Message> => ({ model: model })`
}

const emitData = (fixture: LabelFixture): string => {
  if (fixture.kind === 'field') {
    return `const months = ${JSON.stringify([...labelMonths])}
const years = ${JSON.stringify([...labelYears])}

`
  }
  return ''
}

const emitBody = (fixture: LabelFixture, isStyleX: boolean): string => {
  const cls = (twClass: string, sxName: string): string =>
    isStyleX ? `stylex.props(styles.${sxName}).className ?? ''` : `'${twClass}'`
  switch (fixture.kind) {
    case 'demo':
      return `    h.div([h.Class(${cls('flex gap-2', 'row')})], [
      Checkbox.checkbox({
        id: 'terms',
        isChecked: model.acceptedTerms,
        onToggle: isChecked => Message.ToggledTerms({ isChecked }),
      }, h),
      Label.label({
        id: 'terms-label',
        for: 'terms',
        children: ['Accept terms and conditions'],
      }, h),
    ]),`
    case 'rtl':
      return `    h.div(
      [
        h.Class(${cls('flex gap-2', 'row')}),
        h.Attribute('dir', 'rtl'),
      ],
      [
        Checkbox.checkbox({
          id: 'terms-rtl',
          isChecked: model.acceptedTerms,
          onToggle: isChecked => Message.ToggledTerms({ isChecked }),
        }, h),
        Label.label({
          id: 'terms-rtl-label',
          for: 'terms-rtl',
          children: ['قبول الشروط والأحكام'],
        }, h),
      ],
    ),`
    case 'field':
      return `    h.div([h.Class(${cls('w-full max-w-md', 'wrapper')})], [
      h.form(
        [],
        [
          Field.fieldGroup({
            children: [
              Field.fieldSet({
                children: [
                  Field.fieldLegend({ children: ['Payment Method'] }, h),
                  Field.fieldDescription({
                    children: ['All transactions are secure and encrypted'],
                  }, h),
                  Field.fieldGroup({
                    children: [
                      Field.field({
                        children: [
                          Field.fieldLabel({
                            for: 'checkout-card-name',
                            children: ['Name on Card'],
                          }, h),
                          Input.input({
                            id: 'checkout-card-name',
                            value: model.name,
                            onInput: value => Message.ChangedName({ value }),
                            placeholder: 'Evil Rabbit',
                            isRequired: true,
                          }, h),
                        ],
                      }, h),
                      Field.field({
                        children: [
                          Field.fieldLabel({
                            for: 'checkout-card-number',
                            children: ['Card Number'],
                          }, h),
                          Input.input({
                            id: 'checkout-card-number',
                            value: model.cardNumber,
                            onInput: value => Message.ChangedCardNumber({ value }),
                            placeholder: '1234 5678 9012 3456',
                            isRequired: true,
                          }, h),
                          Field.fieldDescription({
                            children: ['Enter your 16-digit card number'],
                          }, h),
                        ],
                      }, h),
                      h.div([h.Class(${cls('grid grid-cols-3 gap-4', 'formGrid')})], [
                        Field.field({
                          children: [
                            Field.fieldLabel({
                              for: 'checkout-exp-month-button',
                              children: ['Month'],
                            }, h),
                            Select.select({
                              model: model.month,
                              maybeSelectedValue: model.maybeMonth,
                              toParentMessage: message => Message.GotMonthMessage({ message }),
                              items: months,
                              itemToValue: item => item,
                              itemToLabel: item => item,
                              placeholder: 'MM',
                              ariaLabel: 'Month',
                              name: 'exp-month',
                            }, h),
                          ],
                        }, h),
                        Field.field({
                          children: [
                            Field.fieldLabel({
                              for: 'checkout-exp-year-button',
                              children: ['Year'],
                            }, h),
                            Select.select({
                              model: model.year,
                              maybeSelectedValue: model.maybeYear,
                              toParentMessage: message => Message.GotYearMessage({ message }),
                              items: years,
                              itemToValue: item => item,
                              itemToLabel: item => item,
                              placeholder: 'YYYY',
                              ariaLabel: 'Year',
                              name: 'exp-year',
                            }, h),
                          ],
                        }, h),
                        Field.field({
                          children: [
                            Field.fieldLabel({
                              for: 'checkout-cvv',
                              children: ['CVV'],
                            }, h),
                            Input.input({
                              id: 'checkout-cvv',
                              value: model.cvv,
                              onInput: value => Message.ChangedCvv({ value }),
                              placeholder: '123',
                              isRequired: true,
                            }, h),
                          ],
                        }, h),
                      ]),
                    ],
                  }, h),
                ],
              }, h),
              Field.fieldSeparator({}, h),
              Field.fieldSet({
                children: [
                  Field.fieldLegend({ children: ['Billing Address'] }, h),
                  Field.fieldDescription({
                    children: ['The billing address associated with your payment method'],
                  }, h),
                  Field.fieldGroup({
                    children: [
                      Field.field({
                        orientation: 'horizontal',
                        children: [
                          Checkbox.checkbox({
                            id: 'checkout-same-as-shipping',
                            isChecked: model.sameAsShipping,
                            onToggle: isChecked => Message.ToggledSameAsShipping({ isChecked }),
                          }, h),
                          Field.fieldLabel({
                            id: 'checkout-same-as-shipping-label',
                            for: 'checkout-same-as-shipping',
                            children: ['Same as shipping address'],
                            ${isStyleX ? "weight: 'normal'," : "class: 'font-normal',"}
                          }, h),
                        ],
                      }, h),
                    ],
                  }, h),
                ],
              }, h),
              Field.fieldSet({
                children: [
                  Field.fieldGroup({
                    children: [
                      Field.field({
                        children: [
                          Field.fieldLabel({
                            for: 'checkout-comments',
                            children: ['Comments'],
                          }, h),
                          Textarea.textarea({
                            id: 'checkout-comments',
                            value: model.comments,
                            onInput: value => Message.ChangedComments({ value }),
                            placeholder: 'Add any additional comments',
                            resize: 'none',
                          }, h),
                        ],
                      }, h),
                    ],
                  }, h),
                ],
              }, h),
              Field.field({
                orientation: 'horizontal',
                children: [
                  Button.button({
                    type: 'submit',
                    children: ['Submit'],
                  }, h),
                  Button.button({
                    variant: 'outline',
                    children: ['Cancel'],
                  }, h),
                ],
              }, h),
            ],
          }, h),
        ],
      ),
    ]),`
  }
}

const emitApplication = (
  fixture: LabelFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylesBlock = isStyleX ? emitStyles(fixture) : ''
  const bodyStart = isStyleX
    ? `h.main([h.Class(stylex.props(styles.page).className ?? '')], [`
    : `h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-4'"})], [`
  const pageStyle = isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '1rem' },
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' },${stylesBlock === '' ? '' : `\n${stylesBlock}`}
})\n\n`
    : ''
  const optionImport =
    fixture.kind === 'field' ? "import { Option } from 'effect'\n" : ''
  return foldkitApplication({
    title: `Label — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'\n${optionImport}${emitImports(fixture, isStyleX)}\n\n${pageStyle}${emitData(fixture)}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Label — ${sq(fixture.title)}',
  body: ${bodyStart}
    ${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const labelExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  labelFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const labelExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, labelExamplesFor(renderer))
