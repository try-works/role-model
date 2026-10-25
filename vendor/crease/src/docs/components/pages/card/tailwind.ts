import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { cardFixtures, cardRtlCopy } from '@/docs/components/pages/card/shared'
import * as Badge from '@/ui/badge'
import * as Button from '@/ui/button'
import * as Card from '@/ui/card'
import * as Icon from '@/lib/icon'
import * as Input from '@/ui/input'
import * as Label from '@/ui/label'
import * as ToggleGroup from '@/ui/toggle-group'

const IMAGE_URL = 'https://avatar.vercel.sh/creaseui'
type SpacingValue = '4' | '5' | '6' | '8'

const PreviewToggleGroup = ToggleGroup.create<SpacingValue>()

const GotCardPreviewMessage = defineMessageUnion({
  GotCardToggleMessage: { message: ToggleGroup.Message },
  ChangedCardEmail: { value: S.String },
  ChangedCardPassword: { value: S.String },
})
type CardPreviewMessage = typeof GotCardPreviewMessage.Type

const CardPreviewModel = S.Struct({
  _docsPage: S.Literal('card'),
  toggleGroup: ToggleGroup.Model,
  spacing: S.Literals(['4', '5', '6', '8']),
  email: S.String,
  password: S.String,
})
type CardPreviewModel = typeof CardPreviewModel.Type

const spacingOptions: ReadonlyArray<{ value: SpacingValue; label: string }> = [
  { value: '4', label: '16px' },
  { value: '5', label: '20px' },
  { value: '6', label: '24px' },
  { value: '8', label: '32px' },
]

// Tailwind only generates arbitrary-value utilities for literals it can scan,
// so every option needs its own literal — interpolating spacing(5)/spacing(8)
// at runtime produces classes Tailwind never emitted rules for.
const spacingClass: Record<SpacingValue, string> = {
  '4': '[--card-spacing:--spacing(4)]',
  '5': '[--card-spacing:--spacing(5)]',
  '6': '[--card-spacing:--spacing(6)]',
  '8': '[--card-spacing:--spacing(8)]',
}

const loginCard = <Msg>(
  opts: Readonly<{
    rtl?: boolean
    spacing?: SpacingValue
    email: string
    password: string
    onEmail: (value: string) => Msg
    onPassword: (value: string) => Msg
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const copy =
    opts.rtl === true
      ? cardRtlCopy
      : {
          title: 'Login to your account',
          description: 'Enter your email below to login to your account',
          signUp: 'Sign Up',
          email: 'Email',
          password: 'Password',
          forgot: 'Forgot your password?',
          login: 'Login',
          google: 'Login with Google',
        }
  return Card.card(
    {
      class: `w-full max-w-sm${opts.spacing === undefined ? '' : ` ${spacingClass[opts.spacing]}`}`,
      children: [
        Card.cardHeader(
          {
            children: [
              Card.cardTitle({ children: [copy.title] }, h),
              Card.cardDescription({ children: [copy.description] }, h),
              Card.cardAction(
                {
                  children: [
                    Button.button(
                      { variant: 'link', children: [copy.signUp] },
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
        Card.cardContent(
          {
            children: [
              h.div(
                [h.Class('grid gap-2')],
                [
                  Label.label({ for: 'card-email', children: [copy.email] }, h),
                  Input.input(
                    {
                      id: 'card-email',
                      type: 'email',
                      placeholder: 'm@example.com',
                      value: opts.email,
                      onInput: opts.onEmail,
                    },
                    h,
                  ),
                ],
              ),
              h.div(
                [h.Class('grid gap-2')],
                [
                  h.div(
                    [h.Class('flex items-center')],
                    [
                      Label.label(
                        { for: 'card-password', children: [copy.password] },
                        h,
                      ),
                      h.a(
                        [
                          h.Href('#'),
                          h.Class(
                            'ml-auto inline-block text-sm underline-offset-4 hover:underline',
                          ),
                        ],
                        [copy.forgot],
                      ),
                    ],
                  ),
                  Input.input(
                    {
                      id: 'card-password',
                      type: 'password',
                      value: opts.password,
                      onInput: opts.onPassword,
                    },
                    h,
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        Card.cardFooter(
          {
            class: 'flex-col gap-2',
            children: [
              Button.button({ class: 'w-full', children: [copy.login] }, h),
              Button.button(
                {
                  variant: 'outline',
                  class: 'w-full',
                  children: [copy.google],
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

const bullet = (text: string, h: HtmlBuilder<CardPreviewMessage>): Html =>
  h.li(
    [h.Class('flex gap-2')],
    [
      Icon.icon(
        'chevron-right',
        { class: 'mt-0.5 size-4 shrink-0 text-muted-foreground' },
        h,
      ),
      h.span([], [text]),
    ],
  )

export const cardTailwindPreviewProgram = definePreviewProgram<
  CardPreviewModel,
  CardPreviewMessage
>({
  Model: CardPreviewModel,
  Message: GotCardPreviewMessage,
  init: index => ({
    _docsPage: 'card',
    toggleGroup: ToggleGroup.init({ id: `card-spacing-${String(index)}` }),
    spacing: '4',
    email: '',
    password: '',
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedCardEmail':
        return { model: { ...model, email: message.value } }
      case 'ChangedCardPassword':
        return { model: { ...model, password: message.value } }
      case 'GotCardToggleMessage': {
        const result = PreviewToggleGroup.update(
          model.toggleGroup,
          message.message,
        )
        const commands = result.commands ?? []
        const selection = Option.fromNullishOr(result.outMessage)
        return {
          model: {
            ...model,
            toggleGroup: result.model,
            spacing: Option.getOrUndefined(selection)?.value ?? model.spacing,
          },
          commands: Command.mapMessages(commands, next =>
            GotCardPreviewMessage.GotCardToggleMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = cardFixtures[index] ?? cardFixtures[0]
    const inputProps = {
      email: model.email,
      password: model.password,
      onEmail: (value: string) =>
        GotCardPreviewMessage.ChangedCardEmail({ value }),
      onPassword: (value: string) =>
        GotCardPreviewMessage.ChangedCardPassword({ value }),
    }
    switch (fixture.kind) {
      case 'login':
        return loginCard({ ...inputProps }, h)
      case 'rtl':
        return h.div(
          [h.Dir('rtl'), h.Class('w-full max-w-sm')],
          [loginCard({ rtl: true, ...inputProps }, h)],
        )
      case 'small':
        return Card.card(
          {
            size: 'sm',
            class: 'mx-auto w-full max-w-xs',
            children: [
              Card.cardHeader(
                {
                  children: [
                    Card.cardTitle({ children: ['Scheduled reports'] }, h),
                    Card.cardDescription(
                      {
                        children: ['Weekly snapshots. No more manual exports.'],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              Card.cardContent(
                {
                  children: [
                    h.ul(
                      [h.Class('grid gap-2 py-2 text-sm')],
                      [
                        bullet('Choose a schedule (daily, or weekly).', h),
                        bullet('Send to channels or specific teammates.', h),
                        bullet('Include charts, tables, and key metrics.', h),
                      ],
                    ),
                  ],
                },
                h,
              ),
              Card.cardFooter(
                {
                  class: 'flex-col gap-2',
                  children: [
                    Button.button(
                      {
                        size: 'sm',
                        class: 'w-full',
                        children: ['Set up scheduled reports'],
                      },
                      h,
                    ),
                    Button.button(
                      {
                        variant: 'outline',
                        size: 'sm',
                        class: 'w-full',
                        children: ["See what's new"],
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
      case 'spacing':
        return h.div(
          [h.Class('mx-auto grid w-full max-w-sm gap-4 justify-items-center')],
          [
            PreviewToggleGroup.toggleGroup(
              {
                model: model.toggleGroup,
                toParentMessage: message =>
                  GotCardPreviewMessage.GotCardToggleMessage({ message }),
                ariaLabel: 'Card spacing',
                variant: 'outline',
                size: 'sm',
                value: model.spacing,
                items: spacingOptions.map(option => ({
                  value: option.value,
                  children: [option.label],
                })),
              },
              h,
            ),
            loginCard({ ...inputProps, spacing: model.spacing }, h),
          ],
        )
      case 'edge':
        return Card.card(
          {
            class: 'mx-auto w-full max-w-sm',
            children: [
              Card.cardHeader(
                {
                  children: [
                    Card.cardTitle({ children: ['Terms of Service'] }, h),
                    Card.cardDescription(
                      {
                        children: [
                          'Review the terms before accepting the agreement.',
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              Card.cardContent(
                {
                  class: '-mb-(--card-spacing)',
                  children: [
                    h.div(
                      [
                        h.Class(
                          '-mx-(--card-spacing) max-h-48 space-y-4 overflow-y-scroll border-t bg-muted/50 px-(--card-spacing) py-4 text-sm leading-relaxed',
                        ),
                      ],
                      [
                        h.p(
                          [],
                          [
                            'These terms govern your use of the workspace, including access to shared documents, project files, and collaboration tools.',
                          ],
                        ),
                        h.p(
                          [],
                          [
                            'You are responsible for the content you upload and for ensuring that your team has the appropriate permissions to view or edit it.',
                          ],
                        ),
                        h.p(
                          [],
                          [
                            'We may update features or limits as the service evolves. When those changes materially affect your workflow, we will notify your workspace administrators.',
                          ],
                        ),
                        h.p(
                          [],
                          [
                            "By continuing, you agree to keep your account credentials secure and to follow your organization's acceptable use policies.",
                          ],
                        ),
                      ],
                    ),
                  ],
                },
                h,
              ),
              Card.cardFooter(
                {
                  class: 'justify-end gap-2',
                  children: [
                    Button.button(
                      { variant: 'outline', children: ['Decline'] },
                      h,
                    ),
                    Button.button({ children: ['Accept'] }, h),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        )
      case 'image':
        return Card.card(
          {
            class: 'relative mx-auto w-full max-w-sm pt-0',
            children: [
              h.div([
                h.Class('absolute inset-0 z-30 aspect-video bg-black/35'),
              ]),
              h.img([
                h.Src(IMAGE_URL),
                h.Alt('Event cover'),
                h.Class(
                  'relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40',
                ),
              ]),
              Card.cardHeader(
                {
                  children: [
                    Card.cardAction(
                      {
                        children: [
                          Badge.badge(
                            { variant: 'secondary', children: ['Featured'] },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    Card.cardTitle({ children: ['Design systems meetup'] }, h),
                    Card.cardDescription(
                      {
                        children: [
                          'A practical talk on component APIs, accessibility, and shipping faster.',
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              Card.cardFooter(
                {
                  children: [
                    Button.button(
                      { class: 'w-full', children: ['View Event'] },
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
  },
})
