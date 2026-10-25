import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import type { PreviewProgram } from '@/docs/components/pages/authored-page'
import {
  inputCountries,
  inputFixtures,
  inputRtlCopy,
} from '@/docs/components/pages/input/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/ui/badge'
import * as Button from '@/ui/button'
import * as ButtonGroup from '@/ui/button-group'
import * as Field from '@/ui/field'
import * as FileInput from '@/ui/file-input'
import * as Input from '@/ui/input'
import * as InputGroup from '@/ui/input-group'
import * as Select from '@/ui/select'

export const InputPreviewMessage = defineMessageUnion({
  ChangedInputValue: { field: S.String, value: S.String },
  GotSelectMessage: { message: Select.Message },
  GotFileInputMessage: { message: FileInput.Message },
})
export type InputPreviewMessage = typeof InputPreviewMessage.Type

const InputPreviewModel = S.Struct({
  _docsPage: S.Literal('input'),
  values: S.Record(S.String, S.String),
  country: Select.Model,
  maybeCountry: S.Option(S.String),
  picture: FileInput.Model,
  files: S.Array(S.Unknown),
})
type InputPreviewModel = typeof InputPreviewModel.Type

const lbl = (
  forId: string,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<InputPreviewMessage>,
): Html => Field.fieldLabel({ for: forId, children }, h)

const dsc = (text: string, h: HtmlBuilder<InputPreviewMessage>): Html =>
  Field.fieldDescription({ children: [text] }, h)

const textIn = (
  model: InputPreviewModel,
  key: string,
  id: string,
  extras: Partial<Parameters<typeof Input.input<InputPreviewMessage>>[0]> = {},
  h: HtmlBuilder<InputPreviewMessage>,
): Html =>
  Input.input(
    {
      id,
      value: model.values[key] ?? '',
      onInput: value =>
        InputPreviewMessage.ChangedInputValue({ field: key, value }),
      ...extras,
    },
    h,
  )

const inputView = (
  fixture: (typeof inputFixtures)[number],
  model: InputPreviewModel,
  h: HtmlBuilder<InputPreviewMessage>,
): Html => {
  switch (fixture.kind) {
    case 'basic':
      return textIn(
        model,
        'basic',
        'input-basic',
        { placeholder: 'Enter text' },
        h,
      )
    case 'field':
      return Field.field(
        {
          children: [
            lbl('input-field-username', ['Username'], h),
            textIn(
              model,
              'username',
              'input-field-username',
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
                    model,
                    'name',
                    'fieldgroup-name',
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
                    model,
                    'email',
                    'fieldgroup-email',
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
              model,
              'disabled',
              'input-demo-disabled',
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
              model,
              'invalid',
              'input-invalid',
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
          model: model.picture,
          toParentMessage: message =>
            InputPreviewMessage.GotFileInputMessage({ message }),
          id: model.picture.id,
          label: 'Picture',
          description: 'Select a picture to upload.',
          value: model.files as ReadonlyArray<File>,
        },
        h,
      )
    case 'inline':
      return Field.field(
        {
          orientation: 'horizontal',
          children: [
            textIn(
              model,
              'search',
              'input-inline-search',
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
          class: 'grid max-w-sm grid-cols-2',
          children: [
            Field.field(
              {
                children: [
                  lbl('first-name', ['First Name'], h),
                  textIn(
                    model,
                    'firstName',
                    'first-name',
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
                    model,
                    'lastName',
                    'last-name',
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
              ['Required Field ', h.span([h.Class('text-destructive')], ['*'])],
              h,
            ),
            textIn(
              model,
              'required',
              'input-required',
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
                    class: 'ml-auto',
                    children: ['Beta'],
                  },
                  h,
                ),
              ],
              h,
            ),
            textIn(
              model,
              'webhookUrl',
              'input-badge',
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
                      value: model.values['websiteUrl'] ?? '',
                      onInput: value =>
                        InputPreviewMessage.ChangedInputValue({
                          field: 'websiteUrl',
                          value,
                        }),
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
                      children: [Icon.icon('info', {}, h)],
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
                    model,
                    'searchButton',
                    'input-button-group',
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
        [h.Class('w-full max-w-sm')],
        [
          Field.fieldGroup(
            {
              children: [
                Field.field(
                  {
                    children: [
                      lbl('form-name', ['Name'], h),
                      textIn(
                        model,
                        'formName',
                        'form-name',
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
                        model,
                        'formEmail',
                        'form-email',
                        { type: 'email', placeholder: 'john@example.com' },
                        h,
                      ),
                      dsc(`We'll never share your email with anyone.`, h),
                    ],
                  },
                  h,
                ),
                h.div(
                  [h.Class('grid grid-cols-2 gap-4')],
                  [
                    Field.field(
                      {
                        children: [
                          lbl('form-phone', ['Phone'], h),
                          textIn(
                            model,
                            'formPhone',
                            'form-phone',
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
                              model: model.country,
                              maybeSelectedValue: model.maybeCountry,
                              toParentMessage: message =>
                                InputPreviewMessage.GotSelectMessage({
                                  message,
                                }),
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
                        model,
                        'formAddress',
                        'form-address',
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
                  model,
                  'apiKey',
                  'input-rtl-api-key',
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

export const inputPreviewProgram: PreviewProgram<
  InputPreviewModel,
  InputPreviewMessage
> = {
  Model: InputPreviewModel,
  Message: InputPreviewMessage,
  init: index => ({
    _docsPage: 'input',
    values: {},
    country: Select.init({ id: `docs-input-${String(index)}-country` }),
    maybeCountry: Option.some('us'),
    picture: FileInput.init({ id: `docs-input-${String(index)}-picture` }),
    files: [],
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotFileInputMessage': {
        const next = FileInput.update(model.picture, message.message)
        const files =
          next.outMessage === undefined
            ? model.files
            : next.outMessage._tag === 'ChangedValue'
              ? [...next.outMessage.files]
              : []
        return {
          model: { ...model, picture: next.model, files },
          commands: Command.mapMessages(next.commands ?? [], message =>
            InputPreviewMessage.GotFileInputMessage({ message }),
          ),
        }
      }
      case 'ChangedInputValue':
        return {
          model: {
            ...model,
            values: { ...model.values, [message.field]: message.value },
          },
        }
      case 'GotSelectMessage': {
        const {
          model: country,
          commands: countryCommands__,
          outMessage,
        } = Select.update(model.country, message.message)
        const commands = countryCommands__ ?? []
        const maybeCountry = Option.match(Option.fromNullishOr(outMessage), {
          onNone: () => model.maybeCountry,
          onSome: selection =>
            selection._tag === 'Selected'
              ? Option.some(selection.value)
              : Option.none<string>(),
        })
        return {
          model: { ...model, country, maybeCountry },
          commands: Command.mapMessages(commands, next =>
            InputPreviewMessage.GotSelectMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    h.div(
      [h.Class('w-full max-w-sm')],
      [inputView(inputFixtures[index] ?? inputFixtures[0], model, h)],
    ),
}

export const inputTailwindPreviewProgram =
  definePreviewProgram(inputPreviewProgram)
