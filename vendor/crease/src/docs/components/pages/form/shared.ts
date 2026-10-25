import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
export const formFixtures = [
  {
    title: 'Newsletter signup',
    description:
      'A named native email input remains controlled while retaining browser autofill and submission semantics.',
  },
  {
    title: 'Error summary',
    description:
      'After failed submission, focus a summary whose links move directly to each invalid control.',
  },
  {
    title: 'Async validation',
    description:
      'Version validation Commands and ignore stale completions while keeping the current value in the parent Model.',
  },
] as const
const imports = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat') =>
  `import { Effect, Schema as S } from 'effect'\nimport { Command, Runtime, Subscription, Update } from 'foldkit'\nimport { type Document, type HtmlBuilder } from 'foldkit/html'\nimport { defineMessageUnion } from 'foldkit/message'\n${renderer !== 'tailwind' ? "import * as stylex from '@stylexjs/stylex'\nimport { layoutStyle } from '@/stylex/contracts'\n\nconst styles = stylex.create({ form: { maxWidth: '24rem', width: '100%' } })\n" : ''}\nimport * as Button from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/button'\nimport * as Field from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/field'\nimport * as Form from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/form'\nimport * as Input from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/input'`
const layout = (r: 'tailwind' | 'stylex' | 'pleat') =>
  r !== 'tailwind'
    ? 'layoutStyle: layoutStyle({ maxWidth: "24rem", width: "100%" }),'
    : "class: 'w-full max-w-sm',"
const newsletter = (r: 'tailwind' | 'stylex' | 'pleat') =>
  foldkitApplication({
    title: 'Form — Newsletter signup',
    imports: imports(r),
    model: `export const Model = S.Struct({ email: S.String })\nexport type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'
export const Message = defineMessageUnion({
  'ChangedNewsletterEmail': { value: S.String },
  'SubmittedNewsletter': {},
});\nexport type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { email: '' } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => { switch (message._tag) { case 'ChangedNewsletterEmail': return { model: { ...model, email: message.value } }; case 'SubmittedNewsletter': return { model: model } } }`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({ title: 'Newsletter signup', body: Form.form({ ${layout(r)} ariaLabel: 'Newsletter signup', onSubmit: Message['SubmittedNewsletter'](), children: [Field.controlField({ id: 'newsletter-email', label: 'Email', description: 'We only send product updates.', toControl: (parts, controlH) => Input.input({ id: parts.controlId, name: 'email', type: 'email', autocomplete: 'email', value: model.email, onInput: value => Message['ChangedNewsletterEmail']({ value }), ...(parts.describedBy === undefined ? {} : { describedBy: parts.describedBy }) }, controlH) }, h), Button.button({ type: 'submit', children: ['Subscribe'] }, h)] }, h) })`,
  })
const errorSummary = (r: 'tailwind' | 'stylex' | 'pleat') =>
  foldkitApplication({
    title: 'Form — Error summary',
    imports: imports(r),
    model: `export const Model = S.Struct({ email: S.String, hasSubmitted: S.Boolean })\nexport type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'
\n\nexport const Message = defineMessageUnion({
  'ChangedSignInEmail': { value: S.String },
  'SubmittedSignIn': {},
});\nexport type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { email: '', hasSubmitted: false } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => { switch (message._tag) { case 'ChangedSignInEmail': return { model: { ...model, email: message.value } }; case 'SubmittedSignIn': return { model: { ...model, hasSubmitted: true } } } }`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => { const error = model.hasSubmitted && !model.email.includes('@') ? 'Enter a valid email address.' : undefined; return { title: 'Account sign in', body: Form.form({ ${layout(r)} ariaLabel: 'Account sign in', onSubmit: Message['SubmittedSignIn'](), children: [...(error === undefined ? [] : [Form.errorSummary({ id: 'sign-in-errors', title: 'Fix the following error', errors: [{ controlId: 'sign-in-email', message: error }], isAutofocus: true }, h)]), Field.controlField({ id: 'sign-in-email', label: 'Email', ...(error === undefined ? {} : { error }), toControl: (parts, controlH) => Input.input({ id: parts.controlId, name: 'email', type: 'email', autocomplete: 'email', value: model.email, onInput: value => Message['ChangedSignInEmail']({ value }), ...(parts.describedBy === undefined ? {} : { describedBy: parts.describedBy }), isInvalid: parts.isInvalid }, controlH) }, h), Button.button({ type: 'submit', children: ['Sign in'] }, h)] }, h) } }`,
  })
const asyncValidation = (r: 'tailwind' | 'stylex' | 'pleat') =>
  foldkitApplication({
    title: 'Form — Async validation',
    imports: imports(r),
    model: `export const Model = S.Struct({ username: S.String, validationVersion: S.Number, error: S.NullOr(S.String) })\nexport type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'
\n\nexport const Message = defineMessageUnion({
  'ChangedFormUsername': { value: S.String },
  'CompletedFormValidation': { version: S.Number, error: S.NullOr(S.String) },
});\nexport type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { username: '', validationVersion: 0, error: null } })`,
    update: `const ValidateUsername = Command.define('ValidateFormUsername', { args: { username: S.String, version: S.Number }, messages: [Message['CompletedFormValidation']], execute: ({ username, version }) => Effect.sleep('250 millis').pipe(Effect.as(Message['CompletedFormValidation']({ version, error: username.length < 3 ? 'Use at least three characters.' : null }))) })\nexport const update = (model: Model, message: Message): Update.Return<Model, Message> => { switch (message._tag) { case 'ChangedFormUsername': { const validationVersion = model.validationVersion + 1; return { model: { ...model, username: message.value, validationVersion, error: null }, commands: [ValidateUsername({ username: message.value, version: validationVersion })] } } case 'CompletedFormValidation': return message.version === model.validationVersion ? { model: { ...model, error: message.error } } : { model } } }`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({ title: 'Create account', body: Form.form({ ${layout(r)} ariaLabel: 'Create account', children: [Field.controlField({ id: 'account-username', label: 'Username', ...(model.error === null ? {} : { error: model.error }), toControl: (parts, controlH) => Input.input({ id: parts.controlId, name: 'username', autocomplete: 'username', value: model.username, onInput: value => Message['ChangedFormUsername']({ value }), ...(parts.describedBy === undefined ? {} : { describedBy: parts.describedBy }), isInvalid: parts.isInvalid }, controlH) }, h)] }, h) })`,
  })
const formExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  formFixtures.map((fixture, index) => ({
    ...fixture,
    code:
      index === 0
        ? newsletter(renderer)
        : index === 1
          ? errorSummary(renderer)
          : asyncValidation(renderer),
  }))

export const formExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, formExamplesFor(renderer))
