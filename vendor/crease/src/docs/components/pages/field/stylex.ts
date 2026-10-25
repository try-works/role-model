import { reset } from '@/stylex/reset'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type FieldFixture,
  fieldDepartments,
  fieldFixtures,
  fieldMonths,
  fieldRtlCopy,
  fieldYears,
} from '@/docs/components/pages/field/shared'
import * as Button from '@/stylex/button'
import * as Checkbox from '@/stylex/checkbox'
import * as Field from '@/stylex/field'
import * as Input from '@/stylex/input'
import * as RadioGroup from '@/stylex/radio-group'
import * as Select from '@/stylex/select'
import * as Slider from '@/stylex/slider'
import * as Switch from '@/stylex/switch'
import * as Textarea from '@/stylex/textarea'
import { className } from '@/stylex/style'
import type { ComponentLayoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  page: { maxWidth: '28rem', width: '100%' },
  pageXs: { maxWidth: '20rem', width: '100%' },
  pageSm: { maxWidth: '24rem', width: '100%' },
  pageLg: { maxWidth: '32rem', width: '100%' },
  grid3: {
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
  grid2: {
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  gapSm: { gap: '0.75rem' },
  fitWidth: { width: 'fit-content' },
  valueSpan: { fontVariantNumeric: 'tabular-nums', fontWeight: 500 },
  sliderTop: { marginBlockStart: '0.5rem', width: '100%' },
})

type TextKey =
  | 'name'
  | 'cardNumber'
  | 'cvv'
  | 'username'
  | 'password'
  | 'feedback'
  | 'street'
  | 'city'
  | 'zip'
  | 'profileName'
  | 'comments'
type CheckKey =
  | 'sameAsShipping'
  | 'hardDisks'
  | 'externalDisks'
  | 'cdsDvds'
  | 'connectedServers'
  | 'syncFolders'
  | 'push'
  | 'pushTasks'
  | 'emailTasks'
  | 'mfa'

type FieldPreviewModel = Readonly<
  Record<TextKey, string> &
    Record<CheckKey, boolean> & {
      monthSelect: Select.Model
      yearSelect: Select.Model
      departmentSelect: Select.Model
      month: Option.Option<string>
      year: Option.Option<string>
      department: Option.Option<string>
      planRadio: RadioGroup.Model
      environmentRadio: RadioGroup.Model
      plan: string
      environment: string
      price: readonly [number, number]
      priceSlider: Slider.MultiModel
    }
>

const toMsg = <Msg>(onMessageJson: (json: string) => Msg) => ({
  text: (field: TextKey, value: string): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'ChangedFieldText', field, value })),
  check: (field: CheckKey, isChecked: boolean): Msg =>
    onMessageJson(
      JSON.stringify({ _tag: 'ToggledFieldCheck', field, isChecked }),
    ),
  slider: (message: Slider.MultiMessage): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'GotFieldSliderMessage', message })),
  select: (which: string, message: Select.Message): Msg =>
    onMessageJson(
      JSON.stringify({ _tag: 'GotFieldSelectMessage', which, message }),
    ),
  radio: (which: string, message: RadioGroup.Message): Msg =>
    onMessageJson(
      JSON.stringify({ _tag: 'GotFieldRadioMessage', which, message }),
    ),
})

type Helpers<Msg> = ReturnType<typeof toMsg<Msg>>

const fieldLabel = <Msg>(
  forId: string,
  label: string,
  h: HtmlBuilder<Msg>,
): Html => Field.fieldLabel({ for: forId, children: [label] }, h)

const textField = <Msg>(
  model: FieldPreviewModel,
  msg: Helpers<Msg>,
  h: HtmlBuilder<Msg>,
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
            onInput: value => msg.text(opts.field, value),
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

const checkRow = <Msg>(
  model: FieldPreviewModel,
  msg: Helpers<Msg>,
  h: HtmlBuilder<Msg>,
  opts: Readonly<{
    id: string
    field: CheckKey
    label: string
    isDisabled?: boolean
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
            onToggle: isChecked => msg.check(opts.field, isChecked),
            label: opts.label,
            ...(opts.isDisabled === true ? { isDisabled: true } : {}),
          },
          h,
        ),
      ],
    },
    h,
  )

const selectControl = <Msg>(
  model: FieldPreviewModel,
  msg: Helpers<Msg>,
  which: 'month' | 'year' | 'department',
  items: ReadonlyArray<Readonly<{ value: string; label: string }>>,
  placeholder: string,
  ariaLabel: string,
  direction: 'ltr' | 'rtl' | undefined,
  h: HtmlBuilder<Msg>,
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
      toParentMessage: message => msg.select(which, message),
      items,
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
      placeholder,
      ariaLabel,
      ...(direction === undefined ? {} : { direction }),
    },
    h,
  )

const paymentFields = <Msg>(
  model: FieldPreviewModel,
  msg: Helpers<Msg>,
  h: HtmlBuilder<Msg>,
  rtl: boolean,
): Html => {
  const copy = rtl ? fieldRtlCopy : undefined
  return Field.fieldGroup(
    {
      children: [
        Field.fieldSet(
          {
            children: [
              Field.fieldLegend(
                { children: [copy?.paymentMethod ?? 'Payment Method'] },
                h,
              ),
              Field.fieldDescription(
                {
                  children: [
                    copy?.secureTransactions ??
                      'All transactions are secure and encrypted',
                  ],
                },
                h,
              ),
              Field.fieldGroup(
                {
                  children: [
                    textField(model, msg, h, {
                      id: `docs-field-${rtl ? 'rtl' : 'demo'}-name`,
                      label: copy?.nameOnCard ?? 'Name on Card',
                      field: 'name',
                      placeholder: 'Evil Rabbit',
                    }),
                    textField(model, msg, h, {
                      id: `docs-field-${rtl ? 'rtl' : 'demo'}-number`,
                      label: copy?.cardNumber ?? 'Card Number',
                      field: 'cardNumber',
                      placeholder: '1234 5678 9012 3456',
                      description:
                        copy?.cardNumberDescription ??
                        'Enter your 16-digit card number',
                    }),
                    h.div(
                      [h.Class(className(styles.grid3))],
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
                                msg,
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
                                msg,
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
                        textField(model, msg, h, {
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
                    checkRow(model, msg, h, {
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
                              onInput: value => msg.text('comments', value),
                              placeholder:
                                copy?.commentsPlaceholder ??
                                'Add any additional comments',
                              resize: 'none',
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

const fieldView = <Msg>(
  fixture: FieldFixture,
  model: FieldPreviewModel,
  msg: Helpers<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'demo':
      return h.div(
        [h.Class(className(styles.page))],
        [paymentFields(model, msg, h, false)],
      )
    case 'input':
      return Field.fieldSet(
        {
          layoutStyle: styles.pageXs,
          children: [
            Field.fieldGroup(
              {
                children: [
                  textField(model, msg, h, {
                    id: 'docs-field-username',
                    label: 'Username',
                    field: 'username',
                    placeholder: 'Max Leiter',
                    description: 'Choose a unique username for your account.',
                  }),
                  textField(model, msg, h, {
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
          layoutStyle: styles.pageXs,
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
                            onInput: value => msg.text('feedback', value),
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
          layoutStyle: styles.pageXs,
          children: [
            Field.fieldLabel({ children: ['Department'] }, h),
            selectControl(
              model,
              msg,
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
          layoutStyle: styles.pageXs,
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
                        [h.Class(className(styles.valueSpan))],
                        [String(lo)],
                      ),
                      ' - ',
                      h.span(
                        [h.Class(className(styles.valueSpan))],
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
                toParentMessage: message => msg.slider(message),
                ariaLabels: ['Minimum price', 'Maximum price'],
                layoutStyle: styles.sliderTop,
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
          layoutStyle: styles.pageSm,
          children: [
            Field.fieldLegend({ children: ['Address Information'] }, h),
            Field.fieldDescription(
              { children: ['We need your address to deliver your order.'] },
              h,
            ),
            Field.fieldGroup(
              {
                children: [
                  textField(model, msg, h, {
                    id: 'docs-field-street',
                    label: 'Street Address',
                    field: 'street',
                    placeholder: '123 Main St',
                  }),
                  h.div(
                    [h.Class(className(styles.grid2))],
                    [
                      textField(model, msg, h, {
                        id: 'docs-field-city',
                        label: 'City',
                        field: 'city',
                        placeholder: 'New York',
                      }),
                      textField(model, msg, h, {
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
          layoutStyle: styles.pageXs,
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
                      layoutStyle: styles.gapSm as ComponentLayoutStyle,
                      children: [
                        checkRow(model, msg, h, {
                          id: 'docs-field-hard-disks',
                          field: 'hardDisks',
                          label: 'Hard disks',
                        }),
                        checkRow(model, msg, h, {
                          id: 'docs-field-external-disks',
                          field: 'externalDisks',
                          label: 'External disks',
                        }),
                        checkRow(model, msg, h, {
                          id: 'docs-field-cds',
                          field: 'cdsDvds',
                          label: 'CDs, DVDs, and iPods',
                        }),
                        checkRow(model, msg, h, {
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
                        msg.check('syncFolders', isChecked),
                      label: 'Sync Desktop & Documents folders',
                      description:
                        'Your Desktop & Documents folders are being synced with iCloud Drive. You can access them from other devices.',
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
          layoutStyle: styles.pageXs,
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
                toParentMessage: message => msg.radio('plan', message),
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
          layoutStyle: styles.fitWidth,
          children: [
            Switch.switchControl(
              {
                id: 'docs-field-mfa',
                isChecked: model.mfa,
                onToggle: isChecked => msg.check('mfa', isChecked),
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
          layoutStyle: styles.pageXs,
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
                        msg.radio('environment', message),
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
          layoutStyle: styles.pageXs,
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
                      layoutStyle: styles.gapSm as ComponentLayoutStyle,
                      children: [
                        checkRow(model, msg, h, {
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
                            h.a(
                              [h.Class(className(reset.link)), h.Href('#')],
                              ['Manage tasks'],
                            ),
                          ],
                        ),
                      ],
                    },
                    h,
                  ),
                  Field.fieldGroup(
                    {
                      layoutStyle: styles.gapSm as ComponentLayoutStyle,
                      children: [
                        checkRow(model, msg, h, {
                          id: 'docs-field-push-tasks',
                          field: 'pushTasks',
                          label: 'Push notifications',
                        }),
                        checkRow(model, msg, h, {
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
        [h.Dir('rtl'), h.Class(className(styles.page))],
        [paymentFields(model, msg, h, true)],
      )
    case 'responsive':
      return h.div(
        [h.Class(className(styles.pageLg))],
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
                                  msg.text('profileName', value),
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

export const fieldStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = fieldFixtures[index]
  if (fixture === undefined) return undefined
  return fieldView(fixture, model as FieldPreviewModel, toMsg(onMessageJson), h)
}
