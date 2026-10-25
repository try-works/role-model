import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import * as Button from '@/ui/button'
import * as Field from '@/ui/field'
import * as Form from '@/ui/form'
import * as Input from '@/ui/input'

const Message = defineMessageUnion({
  ChangedFormEmailPreview: { value: S.String },
  ChangedFormPasswordPreview: { value: S.String },
  SubmittedFormPreview: {},
  NavigatedFormErrorPreview: {},
  CompletedFormValidation: {
    version: S.Number,
    error: S.NullOr(S.String),
  },
})
type Message = typeof Message.Type
const Model = S.Struct({
  _docsPage: S.Literal('form'),
  exampleIndex: S.Number,
  email: S.String,
  password: S.String,
  hasSubmitted: S.Boolean,
  validationVersion: S.Number,
  asyncError: S.NullOr(S.String),
})
type Model = typeof Model.Type

const ValidateUsername = Command.define('ValidateDocsFormUsername', {
  args: { username: S.String, version: S.Number },
  messages: [Message['CompletedFormValidation']],
  execute: ({ username, version }) =>
    Effect.sleep('250 millis').pipe(
      Effect.as(
        Message['CompletedFormValidation']({
          version,
          error: username.length < 3 ? 'Use at least three characters.' : null,
        }),
      ),
    ),
})

export const formTailwindPreviewProgram = definePreviewProgram<Model, Message>({
  Model,
  Message,
  init: index => ({
    _docsPage: 'form',
    exampleIndex: index,
    email: '',
    password: '',
    hasSubmitted: false,
    validationVersion: 0,
    asyncError: null,
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedFormEmailPreview': {
        if (model.exampleIndex !== 2)
          return { model: { ...model, email: message.value } }
        const validationVersion = model.validationVersion + 1
        return {
          model: {
            ...model,
            email: message.value,
            validationVersion,
            asyncError: null,
          },
          commands: [
            ValidateUsername({
              username: message.value,
              version: validationVersion,
            }),
          ],
        }
      }
      case 'ChangedFormPasswordPreview':
        return { model: { ...model, password: message.value } }
      case 'SubmittedFormPreview':
        return { model: { ...model, hasSubmitted: true } }
      case 'NavigatedFormErrorPreview':
        return { model: model }
      case 'CompletedFormValidation':
        return message.version === model.validationVersion
          ? { model: { ...model, asyncError: message.error } }
          : { model }
    }
  },
  view: (index, model, h) => {
    const invalidEmail = model.hasSubmitted && !model.email.includes('@')
    const id =
      index === 2
        ? 'docs-form-username'
        : index === 1
          ? 'docs-form-sign-in-email'
          : 'docs-form-email'
    const error =
      index === 2
        ? (model.asyncError ?? undefined)
        : invalidEmail
          ? 'Enter a valid email address.'
          : undefined
    return Form.form(
      {
        class: 'w-full max-w-sm',
        ariaLabel:
          index === 1
            ? 'Account sign in'
            : index === 2
              ? 'Create account'
              : 'Newsletter signup',
        ...(index === 2
          ? {}
          : { onSubmit: Message['SubmittedFormPreview']({}) }),
        children: [
          ...(index === 1 && error !== undefined
            ? [
                Form.errorSummary(
                  {
                    id: 'docs-form-errors',
                    title: 'Fix the following error',
                    errors: [{ controlId: id, message: error }],
                    isAutofocus: true,
                    onErrorLink: () => Message['NavigatedFormErrorPreview']({}),
                  },
                  h,
                ),
              ]
            : []),
          Field.controlField(
            {
              id,
              label: index === 2 ? 'Username' : 'Email',
              ...(index === 0
                ? { description: 'We only send product updates.' }
                : {}),
              ...(index === 2
                ? { description: 'Availability is checked after each edit.' }
                : {}),
              ...(error === undefined ? {} : { error }),
              toControl: (parts, controlH) =>
                Input.input(
                  {
                    id: parts.controlId,
                    name: index === 2 ? 'username' : 'email',
                    type: index === 2 ? 'text' : 'email',
                    autocomplete: index === 2 ? 'username' : 'email',
                    value: model.email,
                    onInput: value =>
                      Message['ChangedFormEmailPreview']({ value }),
                    ...(parts.describedBy === undefined
                      ? {}
                      : { describedBy: parts.describedBy }),
                    isInvalid: parts.isInvalid,
                  },
                  controlH,
                ),
            },
            h,
          ),
          ...(index === 1
            ? [
                Field.controlField(
                  {
                    id: 'docs-form-password',
                    label: 'Password',
                    toControl: (parts, controlH) =>
                      Input.input(
                        {
                          id: parts.controlId,
                          name: 'password',
                          type: 'password',
                          autocomplete: 'current-password',
                          value: model.password,
                          onInput: value =>
                            Message['ChangedFormPasswordPreview']({ value }),
                        },
                        controlH,
                      ),
                  },
                  h,
                ),
              ]
            : []),
          ...(index === 2
            ? []
            : [
                Button.button(
                  {
                    type: 'submit',
                    children: [index === 1 ? 'Sign in' : 'Subscribe'],
                  },
                  h,
                ),
              ]),
        ],
      },
      h,
    )
  },
})
