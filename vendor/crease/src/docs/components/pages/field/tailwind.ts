import { Option, Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type FieldFixture,
  fieldDepartments,
  fieldFixtures,
  fieldMonths,
  fieldRtlCopy,
  fieldYears,
} from '@/docs/components/pages/field/shared'
import * as Button from '@/ui/button'
import * as Checkbox from '@/ui/checkbox'
import * as Field from '@/ui/field'
import * as Input from '@/ui/input'
import * as RadioGroup from '@/ui/radio-group'
import * as Select from '@/ui/select'
import * as Slider from '@/ui/slider'
import * as Switch from '@/ui/switch'
import * as Textarea from '@/ui/textarea'

const FieldPreviewMessage = defineMessageUnion({
  ChangedFieldText: { field: S.String, value: S.String },
  ToggledFieldCheck: { field: S.String, isChecked: S.Boolean },
  GotFieldSliderMessage: { message: Slider.MultiMessage },
  GotFieldSelectMessage: {
    which: S.Literals(['month', 'year', 'department']),
    message: Select.Message,
  },
  GotFieldRadioMessage: {
    which: S.Literals(['plan', 'environment']),
    message: RadioGroup.Message,
  },
})
type FieldPreviewMessage = typeof FieldPreviewMessage.Type

const textKeys = [
  'name',
  'cardNumber',
  'cvv',
  'username',
  'password',
  'feedback',
  'street',
  'city',
  'zip',
  'profileName',
  'comments',
] as const
const checkKeys = [
  'sameAsShipping',
  'hardDisks',
  'externalDisks',
  'cdsDvds',
  'connectedServers',
  'syncFolders',
  'push',
  'pushTasks',
  'emailTasks',
  'mfa',
] as const

const FieldPreviewModel = S.Struct({
  _docsPage: S.Literal('field'),
  name: S.String,
  cardNumber: S.String,
  cvv: S.String,
  username: S.String,
  password: S.String,
  feedback: S.String,
  street: S.String,
  city: S.String,
  zip: S.String,
  profileName: S.String,
  comments: S.String,
  monthSelect: Select.Model,
  yearSelect: Select.Model,
  departmentSelect: Select.Model,
  month: S.Option(S.String),
  year: S.Option(S.String),
  department: S.Option(S.String),
  planRadio: RadioGroup.Model,
  environmentRadio: RadioGroup.Model,
  plan: S.String,
  environment: S.String,
  price: S.Tuple([S.Number, S.Number]),
  priceSlider: Slider.MultiModel,
  sameAsShipping: S.Boolean,
  hardDisks: S.Boolean,
  externalDisks: S.Boolean,
  cdsDvds: S.Boolean,
  connectedServers: S.Boolean,
  syncFolders: S.Boolean,
  push: S.Boolean,
  pushTasks: S.Boolean,
  emailTasks: S.Boolean,
  mfa: S.Boolean,
})
type FieldPreviewModel = typeof FieldPreviewModel.Type

const applySelect = (
  model: FieldPreviewModel,
  which: 'month' | 'year' | 'department',
  message: Select.Message,
): {
  model: FieldPreviewModel
  commands: ReadonlyArray<Command.Command<FieldPreviewMessage>>
} => {
  const modelKey =
    which === 'month'
      ? 'monthSelect'
      : which === 'year'
        ? 'yearSelect'
        : 'departmentSelect'
  const {
    model: select,
    commands: selectCommands,
    outMessage,
  } = Select.update(model[modelKey], message)
  const commands = selectCommands ?? []
  const maybeSelected = Option.match(Option.fromNullishOr(outMessage), {
    onNone: () => model[which],
    onSome: selection =>
      selection._tag === 'Selected'
        ? Option.some(selection.value)
        : Option.none<string>(),
  })
  const next: FieldPreviewModel =
    which === 'month'
      ? { ...model, monthSelect: select, month: maybeSelected }
      : which === 'year'
        ? { ...model, yearSelect: select, year: maybeSelected }
        : { ...model, departmentSelect: select, department: maybeSelected }
  return {
    model: next,
    commands: Command.mapMessages(commands, message =>
      FieldPreviewMessage.GotFieldSelectMessage({ which, message }),
    ),
  }
}

const applyRadio = (
  model: FieldPreviewModel,
  which: 'plan' | 'environment',
  message: RadioGroup.Message,
): {
  model: FieldPreviewModel
  commands: ReadonlyArray<Command.Command<FieldPreviewMessage>>
} => {
  const radioKey = which === 'plan' ? 'planRadio' : 'environmentRadio'
  const {
    model: radioGroup,
    commands: radioCommands,
    outMessage,
  } = RadioGroup.update(model[radioKey], message)
  const commands = radioCommands ?? []
  const value = Option.match(Option.fromNullishOr(outMessage), {
    onNone: () => model[which],
    onSome: selection => selection.value,
  })
  const next: FieldPreviewModel =
    which === 'plan'
      ? { ...model, planRadio: radioGroup, plan: value }
      : { ...model, environmentRadio: radioGroup, environment: value }
  return {
    model: next,
    commands: Command.mapMessages(commands, message =>
      FieldPreviewMessage.GotFieldRadioMessage({ which, message }),
    ),
  }
}

type TextKey = (typeof textKeys)[number]
type CheckKey = (typeof checkKeys)[number]

const fieldLabel = (
  forId: string,
  label: string,
  h: HtmlBuilder<FieldPreviewMessage>,
): Html => Field.fieldLabel({ for: forId, children: [label] }, h)

const textField = (
  model: FieldPreviewModel,
  h: HtmlBuilder<FieldPreviewMessage>,
  opts: Readonly<{
    id: string
    label: string
    field: TextKey
    placeholder?: string
    description?: string
    type?: 'text' | 'password'
    descriptionFirst?: boolean
  }>,
): Html =>
  Field.field(
    {
      children: [
        fieldLabel(opts.id, opts.label, h),
        ...(opts.descriptionFirst === true && opts.description !== undefined
          ? [Field.fieldDescription({ children: [opts.description] }, h)]
          : []),
        Input.input(
          {
            id: opts.id,
            value: model[opts.field],
            onInput: value =>
              FieldPreviewMessage.ChangedFieldText({
                field: opts.field,
                value,
              }),
            ...(opts.placeholder === undefined
              ? {}
              : { placeholder: opts.placeholder }),
            ...(opts.type === undefined ? {} : { type: opts.type }),
          },
          h,
        ),
        ...(opts.descriptionFirst === true || opts.description === undefined
          ? []
          : [Field.fieldDescription({ children: [opts.description] }, h)]),
      ],
    },
    h,
  )

const checkRow = (
  model: FieldPreviewModel,
  h: HtmlBuilder<FieldPreviewMessage>,
  opts: Readonly<{
    id: string
    field: CheckKey
    label: string
    isDisabled?: boolean
    description?: string
  }>,
): Html =>
  Field.field(
    {
      orientation: 'horizontal',
      children: [
        Checkbox.checkbox(
          {
            id: opts.id,
            isChecked: model[opts.field],
            onToggle: isChecked =>
              FieldPreviewMessage.ToggledFieldCheck({
                field: opts.field,
                isChecked,
              }),
            label: opts.label,
            ...(opts.isDisabled === true ? { isDisabled: true } : {}),
            class: 'font-normal',
          },
          h,
        ),
      ],
    },
    h,
  )

const selectControl = (
  model: FieldPreviewModel,
  which: 'month' | 'year' | 'department',
  items: ReadonlyArray<Readonly<{ value: string; label: string }>>,
  placeholder: string,
  ariaLabel: string,
  direction: 'ltr' | 'rtl' | undefined,
  h: HtmlBuilder<FieldPreviewMessage>,
): Html =>
  Select.select(
    {
      model:
        which === 'month'
          ? model.monthSelect
          : which === 'year'
            ? model.yearSelect
            : model.departmentSelect,
      maybeSelectedValue: model[which],
      toParentMessage: message =>
        FieldPreviewMessage.GotFieldSelectMessage({ which, message }),
      items,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder,
      ariaLabel,
      ...(direction === undefined ? {} : { direction }),
    },
    h,
  )

const paymentFields = (
  model: FieldPreviewModel,
  h: HtmlBuilder<FieldPreviewMessage>,
  rtl: boolean,
): Html => {
  const copy = rtl ? fieldRtlCopy : undefined
  const legend = copy?.paymentMethod ?? 'Payment Method'
  const legendDescription =
    copy?.secureTransactions ?? 'All transactions are secure and encrypted'
  return Field.fieldGroup(
    {
      children: [
        Field.fieldSet(
          {
            children: [
              Field.fieldLegend({ children: [legend] }, h),
              Field.fieldDescription({ children: [legendDescription] }, h),
              Field.fieldGroup(
                {
                  children: [
                    textField(model, h, {
                      id: `docs-field-${rtl ? 'rtl' : 'demo'}-name`,
                      label: copy?.nameOnCard ?? 'Name on Card',
                      field: 'name',
                      placeholder: 'Evil Rabbit',
                    }),
                    textField(model, h, {
                      id: `docs-field-${rtl ? 'rtl' : 'demo'}-number`,
                      label: copy?.cardNumber ?? 'Card Number',
                      field: 'cardNumber',
                      placeholder: '1234 5678 9012 3456',
                      description:
                        copy?.cardNumberDescription ??
                        'Enter your 16-digit card number',
                    }),
                    h.div(
                      [h.Class('grid grid-cols-3 gap-4')],
                      [
                        Field.field(
                          {
                            children: [
                              Field.fieldLabel(
                                { children: [copy?.month ?? 'Month'] },
                                h,
                              ),
                              selectControl(
                                model,
                                'month',
                                fieldMonths,
                                'MM',
                                'Month',
                                rtl ? 'rtl' : undefined,
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        Field.field(
                          {
                            children: [
                              Field.fieldLabel(
                                { children: [copy?.year ?? 'Year'] },
                                h,
                              ),
                              selectControl(
                                model,
                                'year',
                                fieldYears,
                                'YYYY',
                                'Year',
                                rtl ? 'rtl' : undefined,
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                        textField(model, h, {
                          id: `docs-field-${rtl ? 'rtl' : 'demo'}-cvv`,
                          label: 'CVV',
                          field: 'cvv',
                          placeholder: '123',
                        }),
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
        Field.fieldSeparator({}, h),
        Field.fieldSet(
          {
            children: [
              Field.fieldLegend(
                { children: [copy?.billingAddress ?? 'Billing Address'] },
                h,
              ),
              Field.fieldDescription(
                {
                  children: [
                    copy?.billingAddressDescription ??
                      'The billing address associated with your payment method',
                  ],
                },
                h,
              ),
              Field.fieldGroup(
                {
                  children: [
                    checkRow(model, h, {
                      id: `docs-field-${rtl ? 'rtl' : 'demo'}-same`,
                      field: 'sameAsShipping',
                      label: copy?.sameAsShipping ?? 'Same as shipping address',
                    }),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        Field.fieldSet(
          {
            children: [
              Field.fieldGroup(
                {
                  children: [
                    Field.field(
                      {
                        children: [
                          fieldLabel(
                            `docs-field-${rtl ? 'rtl' : 'demo'}-comments`,
                            copy?.comments ?? 'Comments',
                            h,
                          ),
                          Textarea.textarea(
                            {
                              id: `docs-field-${rtl ? 'rtl' : 'demo'}-comments`,
                              value: model.comments,
                              onInput: value =>
                                FieldPreviewMessage.ChangedFieldText({
                                  field: 'comments',
                                  value,
                                }),
                              placeholder:
                                copy?.commentsPlaceholder ??
                                'Add any additional comments',
                              class: 'resize-none',
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
            ],
          },
          h,
        ),
        Field.field(
          {
            orientation: 'horizontal',
            children: [
              Button.button(
                { children: [copy?.submit ?? 'Submit'], type: 'submit' },
                h,
              ),
              Button.button(
                {
                  variant: 'outline',
                  type: 'button',
                  children: [copy?.cancel ?? 'Cancel'],
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
  )
}

const fieldView = (
  fixture: FieldFixture,
  model: FieldPreviewModel,
  h: HtmlBuilder<FieldPreviewMessage>,
): Html => {
  switch (fixture.kind) {
    case 'demo':
      return h.div(
        [h.Class('w-full max-w-md')],
        [paymentFields(model, h, false)],
      )
    case 'input':
      return Field.fieldSet(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldGroup(
              {
                children: [
                  textField(model, h, {
                    id: 'docs-field-username',
                    label: 'Username',
                    field: 'username',
                    placeholder: 'Max Leiter',
                    description: 'Choose a unique username for your account.',
                  }),
                  textField(model, h, {
                    id: 'docs-field-password',
                    label: 'Password',
                    field: 'password',
                    type: 'password',
                    placeholder: '••••••••',
                    description: 'Must be at least 8 characters long.',
                    descriptionFirst: true,
                  }),
                ],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'textarea':
      return Field.fieldSet(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldGroup(
              {
                children: [
                  Field.field(
                    {
                      children: [
                        fieldLabel('docs-field-feedback', 'Feedback', h),
                        Textarea.textarea(
                          {
                            id: 'docs-field-feedback',
                            value: model.feedback,
                            onInput: value =>
                              FieldPreviewMessage.ChangedFieldText({
                                field: 'feedback',
                                value,
                              }),
                            placeholder: 'Your feedback helps us improve...',
                            rows: 4,
                          },
                          h,
                        ),
                        Field.fieldDescription(
                          {
                            children: [
                              'Share your thoughts about our service.',
                            ],
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
          ],
        },
        h,
      )
    case 'select':
      return Field.field(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldLabel({ children: ['Department'] }, h),
            selectControl(
              model,
              'department',
              fieldDepartments,
              'Choose department',
              'Department',
              undefined,
              h,
            ),
            Field.fieldDescription(
              { children: ['Select your department or area of work.'] },
              h,
            ),
          ],
        },
        h,
      )
    case 'slider': {
      const [lo, hi] = model.price
      return Field.field(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldTitle({ children: ['Price Range'] }, h),
            Field.fieldDescription(
              {
                children: [
                  h.span(
                    [],
                    [
                      'Set your budget range ($',
                      h.span(
                        [h.Class('font-medium tabular-nums')],
                        [String(lo)],
                      ),
                      ' - ',
                      h.span(
                        [h.Class('font-medium tabular-nums')],
                        [String(hi)],
                      ),
                      ').',
                    ],
                  ),
                ],
              },
              h,
            ),
            Slider.rangeSlider(
              {
                model: model.priceSlider,
                values: [lo, hi],
                toParentMessage: message =>
                  FieldPreviewMessage.GotFieldSliderMessage({ message }),
                ariaLabels: ['Minimum price', 'Maximum price'],
                class: 'mt-2 w-full',
              },
              h,
            ),
          ],
        },
        h,
      )
    }
    case 'fieldset':
      return Field.fieldSet(
        {
          class: 'w-full max-w-sm',
          children: [
            Field.fieldLegend({ children: ['Address Information'] }, h),
            Field.fieldDescription(
              { children: ['We need your address to deliver your order.'] },
              h,
            ),
            Field.fieldGroup(
              {
                children: [
                  textField(model, h, {
                    id: 'docs-field-street',
                    label: 'Street Address',
                    field: 'street',
                    placeholder: '123 Main St',
                  }),
                  h.div(
                    [h.Class('grid grid-cols-2 gap-4')],
                    [
                      textField(model, h, {
                        id: 'docs-field-city',
                        label: 'City',
                        field: 'city',
                        placeholder: 'New York',
                      }),
                      textField(model, h, {
                        id: 'docs-field-zip',
                        label: 'Postal Code',
                        field: 'zip',
                        placeholder: '90502',
                      }),
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
    case 'checkbox':
      return Field.fieldGroup(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldSet(
              {
                children: [
                  Field.fieldLegend(
                    {
                      variant: 'label',
                      children: ['Show these items on the desktop'],
                    },
                    h,
                  ),
                  Field.fieldDescription(
                    {
                      children: [
                        'Select the items you want to show on the desktop.',
                      ],
                    },
                    h,
                  ),
                  Field.fieldGroup(
                    {
                      class: 'gap-3',
                      children: [
                        checkRow(model, h, {
                          id: 'docs-field-hard-disks',
                          field: 'hardDisks',
                          label: 'Hard disks',
                        }),
                        checkRow(model, h, {
                          id: 'docs-field-external-disks',
                          field: 'externalDisks',
                          label: 'External disks',
                        }),
                        checkRow(model, h, {
                          id: 'docs-field-cds',
                          field: 'cdsDvds',
                          label: 'CDs, DVDs, and iPods',
                        }),
                        checkRow(model, h, {
                          id: 'docs-field-servers',
                          field: 'connectedServers',
                          label: 'Connected servers',
                        }),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Field.fieldSeparator({}, h),
            Field.field(
              {
                orientation: 'horizontal',
                children: [
                  Checkbox.checkbox(
                    {
                      id: 'docs-field-sync',
                      isChecked: model.syncFolders,
                      onToggle: isChecked =>
                        FieldPreviewMessage.ToggledFieldCheck({
                          field: 'syncFolders',
                          isChecked,
                        }),
                      label: 'Sync Desktop & Documents folders',
                      description:
                        'Your Desktop & Documents folders are being synced with iCloud Drive. You can access them from other devices.',
                      class: 'font-normal',
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
      )
    case 'radio':
      return Field.fieldSet(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldLegend(
              { variant: 'label', children: ['Subscription Plan'] },
              h,
            ),
            Field.fieldDescription(
              {
                children: [
                  'Yearly and lifetime plans offer significant savings.',
                ],
              },
              h,
            ),
            RadioGroup.radioGroup(
              {
                model: model.planRadio,
                selectedValue: Option.some(model.plan),
                toParentMessage: message =>
                  FieldPreviewMessage.GotFieldRadioMessage({
                    which: 'plan',
                    message,
                  }),
                ariaLabel: 'Subscription Plan',
                name: 'plan',
                options: [
                  { value: 'monthly', label: 'Monthly ($9.99/month)' },
                  { value: 'yearly', label: 'Yearly ($99.99/year)' },
                  { value: 'lifetime', label: 'Lifetime ($299.99)' },
                ],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'switch':
      return Field.field(
        {
          orientation: 'horizontal',
          class: 'w-fit',
          children: [
            Switch.switchControl(
              {
                id: 'docs-field-mfa',
                isChecked: model.mfa,
                onToggle: isChecked =>
                  FieldPreviewMessage.ToggledFieldCheck({
                    field: 'mfa',
                    isChecked,
                  }),
                label: 'Multi-factor authentication',
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'choiceCard':
      return Field.fieldGroup(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldSet(
              {
                children: [
                  Field.fieldLegend(
                    { variant: 'label', children: ['Compute Environment'] },
                    h,
                  ),
                  Field.fieldDescription(
                    {
                      children: [
                        'Select the compute environment for your cluster.',
                      ],
                    },
                    h,
                  ),
                  RadioGroup.radioGroup(
                    {
                      model: model.environmentRadio,
                      selectedValue: Option.some(model.environment),
                      toParentMessage: message =>
                        FieldPreviewMessage.GotFieldRadioMessage({
                          which: 'environment',
                          message,
                        }),
                      ariaLabel: 'Compute Environment',
                      name: 'environment',
                      options: [
                        {
                          value: 'kubernetes',
                          label: 'Kubernetes',
                          description: 'Run GPU workloads on a K8s cluster.',
                        },
                        {
                          value: 'vm',
                          label: 'Virtual Machine',
                          description: 'Access a cluster to run GPU workloads.',
                        },
                      ],
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
      )
    case 'group':
      return Field.fieldGroup(
        {
          class: 'w-full max-w-xs',
          children: [
            Field.fieldSet(
              {
                children: [
                  Field.fieldLabel({ children: ['Responses'] }, h),
                  Field.fieldDescription(
                    {
                      children: [
                        'Get notified when ChatGPT responds to requests that take time, like research or image generation.',
                      ],
                    },
                    h,
                  ),
                  Field.fieldGroup(
                    {
                      class: 'gap-3',
                      children: [
                        checkRow(model, h, {
                          id: 'docs-field-push',
                          field: 'push',
                          label: 'Push notifications',
                          isDisabled: true,
                        }),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Field.fieldSeparator({}, h),
            Field.fieldSet(
              {
                children: [
                  Field.fieldLabel({ children: ['Tasks'] }, h),
                  Field.fieldDescription(
                    {
                      children: [
                        h.span(
                          [],
                          [
                            "Get notified when tasks you've created have updates. ",
                            h.a([h.Href('#')], ['Manage tasks']),
                          ],
                        ),
                      ],
                    },
                    h,
                  ),
                  Field.fieldGroup(
                    {
                      class: 'gap-3',
                      children: [
                        checkRow(model, h, {
                          id: 'docs-field-push-tasks',
                          field: 'pushTasks',
                          label: 'Push notifications',
                        }),
                        checkRow(model, h, {
                          id: 'docs-field-email-tasks',
                          field: 'emailTasks',
                          label: 'Email notifications',
                        }),
                      ],
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
      )
    case 'rtl':
      return h.div(
        [h.Dir('rtl'), h.Class('w-full max-w-md')],
        [paymentFields(model, h, true)],
      )
    case 'responsive':
      return h.div(
        [h.Class('w-full max-w-lg')],
        [
          Field.fieldSet(
            {
              children: [
                Field.fieldLegend({ children: ['Profile'] }, h),
                Field.fieldDescription(
                  { children: ['Fill in your profile information.'] },
                  h,
                ),
                Field.fieldGroup(
                  {
                    children: [
                      Field.field(
                        {
                          orientation: 'responsive',
                          children: [
                            Field.fieldContent(
                              {
                                children: [
                                  fieldLabel(
                                    'docs-field-profile-name',
                                    'Name',
                                    h,
                                  ),
                                  Field.fieldDescription(
                                    {
                                      children: [
                                        'Provide your full name for identification',
                                      ],
                                    },
                                    h,
                                  ),
                                ],
                              },
                              h,
                            ),
                            Input.input(
                              {
                                id: 'docs-field-profile-name',
                                value: model.profileName,
                                onInput: value =>
                                  FieldPreviewMessage.ChangedFieldText({
                                    field: 'profileName',
                                    value,
                                  }),
                                placeholder: 'Evil Rabbit',
                              },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      Field.field(
                        {
                          orientation: 'responsive',
                          children: [
                            Button.button(
                              { type: 'submit', children: ['Submit'] },
                              h,
                            ),
                            Button.button(
                              {
                                variant: 'outline',
                                type: 'button',
                                children: ['Cancel'],
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
              ],
            },
            h,
          ),
        ],
      )
  }
}

export const fieldTailwindPreviewProgram = definePreviewProgram<
  FieldPreviewModel,
  FieldPreviewMessage
>({
  Model: FieldPreviewModel,
  Message: FieldPreviewMessage,
  init: index => ({
    _docsPage: 'field',
    name: '',
    cardNumber: '',
    cvv: '',
    username: '',
    password: '',
    feedback: '',
    street: '',
    city: '',
    zip: '',
    profileName: '',
    comments: '',
    monthSelect: Select.init({
      id: `docs-field-${String(index)}-month`,
      isAnimated: true,
    }),
    yearSelect: Select.init({
      id: `docs-field-${String(index)}-year`,
      isAnimated: true,
    }),
    departmentSelect: Select.init({
      id: `docs-field-${String(index)}-department`,
      isAnimated: true,
    }),
    month: Option.none(),
    year: Option.none(),
    department: Option.none(),
    planRadio: RadioGroup.init({ id: `docs-field-${String(index)}-plan` }),
    environmentRadio: RadioGroup.init({
      id: `docs-field-${String(index)}-environment`,
    }),
    plan: 'monthly',
    environment: 'kubernetes',
    price: [200, 800],
    priceSlider: Slider.initMulti({
      id: `docs-field-${String(index)}-price`,
      thumbs: 2,
      min: 0,
      max: 1000,
      step: 10,
    }),
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
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedFieldText':
        return { model: { ...model, [message.field]: message.value } }
      case 'ToggledFieldCheck':
        return { model: { ...model, [message.field]: message.isChecked } }
      case 'GotFieldSliderMessage': {
        const next = Slider.updateMulti(model.priceSlider, message.message)
        const change = Option.fromNullishOr(next.outMessage)
        return {
          model: {
            ...model,
            priceSlider: next.model,
            price: Option.match(change, {
              onNone: () => model.price,
              onSome: out => {
                const next = Slider.updateMultiValue(
                  model.price,
                  out.index,
                  out.value,
                  {
                    min: model.priceSlider.min,
                    max: model.priceSlider.max,
                    step: model.priceSlider.step,
                  },
                )
                return [next[0] ?? model.price[0], next[1] ?? model.price[1]]
              },
            }),
          },
          commands: Command.mapMessages(next.commands ?? [], next =>
            FieldPreviewMessage.GotFieldSliderMessage({ message: next }),
          ),
        }
      }
      case 'GotFieldSelectMessage':
        return applySelect(model, message.which, message.message)
      case 'GotFieldRadioMessage':
        return applyRadio(model, message.which, message.message)
    }
  },
  subscriptions: Subscription.aggregate<
    FieldPreviewModel,
    FieldPreviewMessage
  >()(
    Slider.multiThumbSubscriptions<FieldPreviewModel, FieldPreviewMessage>({
      id: 'docs-field-price',
      thumbCount: 2,
      toChildModel: model => model.priceSlider,
      toParentMessage: message =>
        FieldPreviewMessage.GotFieldSliderMessage({ message }),
    }),
  ),
  view: (index, model, h) => {
    const fixture = fieldFixtures[index] ?? fieldFixtures[0]!
    return fieldView(fixture, model, h)
  },
})
