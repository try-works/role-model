import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  InputPreviewMessage,
  inputPreviewProgram,
} from '@/docs/components/pages/input/tailwind'
import {
  inputCountries,
  inputFixtures,
  inputRtlCopy,
} from '@/docs/components/pages/input/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/stylex/badge'
import * as Button from '@/stylex/button'
import * as ButtonGroup from '@/stylex/button-group'
import * as Field from '@/stylex/field'
import * as FileInput from '@/stylex/file-input'
import * as Input from '@/stylex/input'
import * as InputGroup from '@/stylex/input-group'
import * as Select from '@/stylex/select'
import { className } from '@/stylex/style'
import type { ComponentLayoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  frame: { width: '100%', maxWidth: '24rem' },
  gridTwo: {
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  gridSm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    maxWidth: '24rem',
  },
  form: { maxWidth: '24rem', width: '100%' },
  push: { marginInlineStart: 'auto' },
  iconMd: { height: '1rem', width: '1rem' },
  destructive: { color: 'var(--destructive)' },
})

type InputPreviewShape = ReturnType<typeof inputPreviewProgram.init>

const toMsg =
  <Msg>(onMessageJson: (messageJson: string) => Msg) =>
  (message: Select.Message): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'GotSelectMessage', message }))

const textMsg = (field: string, value: string): string =>
  JSON.stringify({ _tag: 'ChangedInputValue', field, value })

const lbl = <Msg>(
  forId: string,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Msg>,
): Html => Field.fieldLabel({ for: forId, children }, h)

const dsc = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  Field.fieldDescription({ children: [text] }, h)

const textIn = <Msg>(
  model: InputPreviewShape,
  key: string,
  id: string,
  onMessageJson: (messageJson: string) => Msg,
  extras: Partial<Parameters<typeof Input.input<Msg>>[0]> = {},
  h: HtmlBuilder<Msg>,
): Html =>
  Input.input(
    {
      id,
      value: model.values[key] ?? '',
      onInput: value => onMessageJson(textMsg(key, value)),
      ...extras,
    },
    h,
  )

const inputView = <Msg>(
  exampleIndex: number,
  model: InputPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
  onFileInputMessage: (message: FileInput.Message) => Msg,
): Html => {
  const fixture = inputFixtures[exampleIndex] ?? inputFixtures[0]
  const m = model

  switch (fixture.kind) {
    case 'basic':
      return textIn(
        m,
        'basic',
        'input-basic',
        onMessageJson,
        { placeholder: 'Enter text' },
        h,
      )
    case 'field':
      return Field.field(
        {
          children: [
            lbl('input-field-username', ['Username'], h),
            textIn(
              m,
              'username',
              'input-field-username',
              onMessageJson,
              { type: 'text', placeholder: 'Enter your username' },
              h,
            ),
            dsc('Choose a unique username for your account.', h),
          ],
        },
        h,
      )
    case 'fieldGroup':
      return Field.fieldGroup(
        {
          children: [
            Field.field(
              {
                children: [
                  lbl('fieldgroup-name', ['Name'], h),
                  textIn(
                    m,
                    'name',
                    'fieldgroup-name',
                    onMessageJson,
                    { placeholder: 'Jordan Lee' },
                    h,
                  ),
                ],
              },
              h,
            ),
            Field.field(
              {
                children: [
                  lbl('fieldgroup-email', ['Email'], h),
                  textIn(
                    m,
                    'email',
                    'fieldgroup-email',
                    onMessageJson,
                    { type: 'email', placeholder: 'name@example.com' },
                    h,
                  ),
                  dsc(`We'll send updates to this address.`, h),
                ],
              },
              h,
            ),
            Field.field(
              {
                orientation: 'horizontal',
                children: [
                  Button.button(
                    { type: 'reset', variant: 'outline', children: ['Reset'] },
                    h,
                  ),
                  Button.button({ type: 'submit', children: ['Submit'] }, h),
                ],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'disabled':
      return Field.field(
        {
          isDisabled: true,
          children: [
            lbl('input-demo-disabled', ['Email'], h),
            textIn(
              m,
              'disabled',
              'input-demo-disabled',
              onMessageJson,
              { type: 'email', placeholder: 'Email', isDisabled: true },
              h,
            ),
            dsc('This field is currently disabled.', h),
          ],
        },
        h,
      )
    case 'invalid':
      return Field.field(
        {
          isInvalid: true,
          children: [
            lbl('input-invalid', ['Invalid Input'], h),
            textIn(
              m,
              'invalid',
              'input-invalid',
              onMessageJson,
              { placeholder: 'Error', isInvalid: true },
              h,
            ),
            dsc('This field contains validation errors.', h),
          ],
        },
        h,
      )
    case 'file':
      return FileInput.fileInput(
        {
          model: m.picture,
          toParentMessage: onFileInputMessage,
          id: m.picture.id,
          label: 'Picture',
          description: 'Select a picture to upload.',
          value: m.files as ReadonlyArray<File>,
        },
        h,
      )
    case 'inline':
      return Field.field(
        {
          orientation: 'horizontal',
          children: [
            textIn(
              m,
              'search',
              'input-inline-search',
              onMessageJson,
              { type: 'search', placeholder: 'Search...' },
              h,
            ),
            Button.button({ children: ['Search'] }, h),
          ],
        },
        h,
      )
    case 'grid':
      return Field.fieldGroup(
        {
          layoutStyle: styles.gridSm as ComponentLayoutStyle,
          children: [
            Field.field(
              {
                children: [
                  lbl('first-name', ['First Name'], h),
                  textIn(
                    m,
                    'firstName',
                    'first-name',
                    onMessageJson,
                    { placeholder: 'Jordan' },
                    h,
                  ),
                ],
              },
              h,
            ),
            Field.field(
              {
                children: [
                  lbl('last-name', ['Last Name'], h),
                  textIn(
                    m,
                    'lastName',
                    'last-name',
                    onMessageJson,
                    { placeholder: 'Lee' },
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
    case 'required':
      return Field.field(
        {
          children: [
            lbl(
              'input-required',
              [
                'Required Field ',
                h.span([h.Class(className(styles.destructive))], ['*']),
              ],
              h,
            ),
            textIn(
              m,
              'required',
              'input-required',
              onMessageJson,
              { placeholder: 'This field is required', isRequired: true },
              h,
            ),
            dsc('This field must be filled out.', h),
          ],
        },
        h,
      )
    case 'badge':
      return Field.field(
        {
          children: [
            lbl(
              'input-badge',
              [
                'Webhook URL ',
                Badge.badge(
                  {
                    variant: 'secondary',
                    layoutStyle: styles.push,
                    children: ['Beta'],
                  },
                  h,
                ),
              ],
              h,
            ),
            textIn(
              m,
              'webhookUrl',
              'input-badge',
              onMessageJson,
              { type: 'url', placeholder: 'https://api.example.com/webhook' },
              h,
            ),
          ],
        },
        h,
      )
    case 'inputGroup':
      return Field.field(
        {
          children: [
            lbl('input-group-url', ['Website URL'], h),
            InputGroup.inputGroup(
              {
                children: [
                  InputGroup.inputGroupInput(
                    {
                      id: 'input-group-url',
                      value: m.values['websiteUrl'] ?? '',
                      onInput: value =>
                        onMessageJson(textMsg('websiteUrl', value)),
                      placeholder: 'example.com',
                    },
                    h,
                  ),
                  InputGroup.inputGroupAddon(
                    {
                      children: [
                        InputGroup.inputGroupText(
                          { children: ['https://'] },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                  InputGroup.inputGroupAddon(
                    {
                      align: 'inline-end',
                      children: [
                        Icon.icon(
                          'info',
                          { class: className(styles.iconMd) },
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
    case 'buttonGroup':
      return Field.field(
        {
          children: [
            lbl('input-button-group', ['Search'], h),
            ButtonGroup.buttonGroup(
              {
                children: [
                  textIn(
                    m,
                    'searchButton',
                    'input-button-group',
                    onMessageJson,
                    { placeholder: 'Type to search...' },
                    h,
                  ),
                  Button.button(
                    { variant: 'outline', children: ['Search'] },
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
    case 'form':
      return h.form(
        [h.Class(className(styles.form))],
        [
          Field.fieldGroup(
            {
              children: [
                Field.field(
                  {
                    children: [
                      lbl('form-name', ['Name'], h),
                      textIn(
                        m,
                        'formName',
                        'form-name',
                        onMessageJson,
                        {
                          type: 'text',
                          placeholder: 'Evil Rabbit',
                          isRequired: true,
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Field.field(
                  {
                    children: [
                      lbl('form-email', ['Email'], h),
                      textIn(
                        m,
                        'formEmail',
                        'form-email',
                        onMessageJson,
                        { type: 'email', placeholder: 'john@example.com' },
                        h,
                      ),
                      dsc(`We'll never share your email with anyone.`, h),
                    ],
                  },
                  h,
                ),
                h.div(
                  [h.Class(className(styles.gridTwo))],
                  [
                    Field.field(
                      {
                        children: [
                          lbl('form-phone', ['Phone'], h),
                          textIn(
                            m,
                            'formPhone',
                            'form-phone',
                            onMessageJson,
                            { type: 'tel', placeholder: '+1 (555) 123-4567' },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    Field.field(
                      {
                        children: [
                          lbl('form-country', ['Country'], h),
                          Select.select(
                            {
                              model: m.country,
                              maybeSelectedValue: m.maybeCountry,
                              toParentMessage: toMsg(onMessageJson),
                              items: inputCountries,
                              itemToValue: item => item.value,
                              itemToLabel: item => item.label,
                              ariaLabel: 'Country',
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                  ],
                ),
                Field.field(
                  {
                    children: [
                      lbl('form-address', ['Address'], h),
                      textIn(
                        m,
                        'formAddress',
                        'form-address',
                        onMessageJson,
                        { type: 'text', placeholder: '123 Main St' },
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
                        {
                          type: 'button',
                          variant: 'outline',
                          children: ['Cancel'],
                        },
                        h,
                      ),
                      Button.button(
                        { type: 'submit', children: ['Submit'] },
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
    case 'rtl':
      return h.div(
        [h.Dir('rtl')],
        [
          Field.field(
            {
              children: [
                lbl('input-rtl-api-key', [inputRtlCopy.label], h),
                textIn(
                  m,
                  'apiKey',
                  'input-rtl-api-key',
                  onMessageJson,
                  { type: 'password', placeholder: inputRtlCopy.placeholder },
                  h,
                ),
                dsc(inputRtlCopy.description, h),
              ],
            },
            h,
          ),
        ],
      )
  }
}

export const inputStylexPreviewProgram = definePreviewProgram({
  ...inputPreviewProgram,
  view: (index, model, h) =>
    h.div(
      [h.Class(className(styles.frame))],
      [
        inputView(
          index,
          model,
          json => JSON.parse(json) as InputPreviewMessage,
          h,
          message => InputPreviewMessage.GotFileInputMessage({ message }),
        ),
      ],
    ),
})
