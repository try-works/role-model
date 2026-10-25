import { Style } from '@pleat/core'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import * as Button from '@/pleat/button'
import * as Field from '@/pleat/field'
import * as Form from '@/pleat/form'
import * as Input from '@/pleat/input'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  form: layoutStyle({ maxWidth: '24rem', width: '100%' }),
}

type PreviewModel = {
  email: string
  password: string
  hasSubmitted: boolean
  asyncError: string | null
}

export const formPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  send: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const m = model as PreviewModel
  const invalidEmail = m.hasSubmitted && !m.email.includes('@')
  const id =
    index === 2
      ? 'docs-form-username'
      : index === 1
        ? 'docs-form-sign-in-email'
        : 'docs-form-email'
  const error =
    index === 2
      ? (m.asyncError ?? undefined)
      : invalidEmail
        ? 'Enter a valid email address.'
        : undefined
  const message = (value: object) => send(JSON.stringify(value))
  return Form.form(
    {
      layoutStyle: styles.form,
      ariaLabel:
        index === 1
          ? 'Account sign in'
          : index === 2
            ? 'Create account'
            : 'Newsletter signup',
      ...(index === 2
        ? {}
        : { onSubmit: message({ _tag: 'SubmittedFormPreview' }) }),
      children: [
        ...(index === 1 && error !== undefined
          ? [
              Form.errorSummary(
                {
                  id: 'docs-form-errors',
                  title: 'Fix the following error',
                  errors: [{ controlId: id, message: error }],
                  isAutofocus: true,
                  onErrorLink: () =>
                    message({ _tag: 'NavigatedFormErrorPreview' }),
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
                  value: m.email,
                  onInput: value =>
                    message({ _tag: 'ChangedFormEmailPreview', value }),
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
                        value: m.password,
                        onInput: value =>
                          message({
                            _tag: 'ChangedFormPasswordPreview',
                            value,
                          }),
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
}
