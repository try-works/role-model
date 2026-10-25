import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { cardFixtures, cardRtlCopy } from '@/docs/components/pages/card/shared'
import * as Badge from '@/pleat/badge'
import * as Button from '@/pleat/button'
import * as Card from '@/pleat/card'
import * as Icon from '@/lib/icon'
import * as Input from '@/pleat/input'
import * as Label from '@/pleat/label'
import * as ToggleGroup from '@/pleat/toggle-group'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const IMAGE_URL = 'https://avatar.vercel.sh/creaseui'
type SpacingValue = '4' | '5' | '6' | '8'

const styles = {
  frame: layoutStyle({ maxWidth: '24rem', width: '100%' }),
  smallCard: layoutStyle({
    marginInline: 'auto',
    maxWidth: '20rem',
    width: '100%',
  }),
  loginWrap: Style.make({
    gap: '1rem',
    marginInline: 'auto',
    display: 'grid',
    justifyItems: 'center',
    maxWidth: '24rem',
    width: '100%',
  }),
  fieldGrid: Style.make({ gap: '0.5rem', display: 'grid' }),
  fieldRow: Style.make({ alignItems: 'center', display: 'flex' }),
  link: Style.make({
    color: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    textDecorationLine: 'none',
    textUnderlineOffset: '4px',
    marginLeft: 'auto',
  }).pipe(Style.when(When.hover, { textDecorationLine: 'underline' })),
  footerCol: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }),
  wFull: layoutStyle({ width: '100%' }),
  list: Style.make({
    gap: '0.5rem',
    listStyle: 'none',
    paddingBlock: '0.5rem',
    display: 'grid',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    paddingInlineStart: 0,
  }),
  li: Style.make({ gap: '0.5rem', display: 'flex' }),
  liIcon: Style.make({
    color: 'var(--muted-foreground)',
    flexShrink: 0,
    marginTop: '0.125rem',
  }),
  edgeCard: layoutStyle({
    marginInline: 'auto',
    maxWidth: '24rem',
    width: '100%',
  }),
  edgeContent: layoutStyle({
    marginBlockEnd: 'calc(var(--card-spacing, 1.5rem) * -1)',
  }),
  edgeScroll: Style.make({
    gap: '1rem',
    marginInline: 'calc(var(--card-spacing,1.5rem) * -1)',
    paddingBlock: '1rem',
    paddingInline: 'var(--card-spacing,1.5rem)',
    backgroundColor: 'color-mix(in oklab, var(--muted) 50%, transparent)',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: 1.625,
    borderTopColor: 'var(--border)',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    maxHeight: '12rem',
    overflowY: 'scroll',
  }),
  edgeFooterInner: Style.make({
    gap: '0.5rem',
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
  }),
  imageWrap: Style.make({
    marginInline: 'auto',
    position: 'relative',
    maxWidth: '24rem',
    width: '100%',
  }),
  overlay: Style.make({
    inset: 0,
    aspectRatio: '16 / 9',
    backgroundColor:
      'color-mix(in oklab, var(--color-black, #000) 35%, transparent)',
    position: 'absolute',
    zIndex: 30,
  }),
  cover: Style.make({
    aspectRatio: '16 / 9',
    filter: 'grayscale(100%) brightness(0.6)',
    objectFit: 'cover',
    position: 'relative',
    zIndex: 20,
    width: '100%',
  }),
  liMarker: Style.make({ height: '1rem', width: '1rem' }),
}

type PreviewModel = Readonly<{
  toggleGroup: ToggleGroup.Model
  spacing: SpacingValue
  email: string
  password: string
}>

const spacingOptions: ReadonlyArray<{ value: SpacingValue; label: string }> = [
  { value: '4', label: '16px' },
  { value: '5', label: '20px' },
  { value: '6', label: '24px' },
  { value: '8', label: '32px' },
]

const loginCard = <Msg>(
  opts: Readonly<{
    rtl?: boolean
    spacing?: string
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
      layoutStyle: styles.frame,
      ...(opts.spacing === undefined ? {} : { spacing: opts.spacing }),
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
                [h.Class(className(styles.fieldGrid))],
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
                [h.Class(className(styles.fieldGrid))],
                [
                  h.div(
                    [h.Class(className(styles.fieldRow))],
                    [
                      Label.label(
                        { for: 'card-password', children: [copy.password] },
                        h,
                      ),
                      h.a(
                        [
                          h.Href('#'),
                          h.Class(className(reset.link, styles.link)),
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
            layoutStyle: styles.footerCol as ComponentLayoutStyle,
            children: [
              Button.button(
                { layoutStyle: styles.wFull, children: [copy.login] },
                h,
              ),
              Button.button(
                {
                  variant: 'outline',
                  layoutStyle: styles.wFull,
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

export const cardPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = cardFixtures[exampleIndex] ?? cardFixtures[0]
  const previewModel = model as PreviewModel
  const inputProps = {
    email: previewModel.email,
    password: previewModel.password,
    onEmail: (value: string) =>
      onMessageJson(JSON.stringify({ _tag: 'ChangedCardEmail', value })),
    onPassword: (value: string) =>
      onMessageJson(JSON.stringify({ _tag: 'ChangedCardPassword', value })),
  }
  switch (fixture.kind) {
    case 'login':
      return loginCard({ ...inputProps }, h)
    case 'rtl':
      return h.div(
        [h.Dir('rtl'), h.Class(className(styles.frame))],
        [loginCard({ rtl: true, ...inputProps }, h)],
      )
    case 'small':
      return Card.card(
        {
          size: 'sm',
          layoutStyle: styles.smallCard,
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
                    [h.Class(className(reset.list, styles.list))],
                    [
                      h.li(
                        [h.Class(className(styles.li))],
                        [
                          Icon.icon(
                            'chevron-right',
                            {
                              class: className(styles.liIcon, styles.liMarker),
                            },
                            h,
                          ),
                          h.span([], ['Choose a schedule (daily, or weekly).']),
                        ],
                      ),
                      h.li(
                        [h.Class(className(styles.li))],
                        [
                          Icon.icon(
                            'chevron-right',
                            {
                              class: className(styles.liIcon, styles.liMarker),
                            },
                            h,
                          ),
                          h.span(
                            [],
                            ['Send to channels or specific teammates.'],
                          ),
                        ],
                      ),
                      h.li(
                        [h.Class(className(styles.li))],
                        [
                          Icon.icon(
                            'chevron-right',
                            {
                              class: className(styles.liIcon, styles.liMarker),
                            },
                            h,
                          ),
                          h.span(
                            [],
                            ['Include charts, tables, and key metrics.'],
                          ),
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
                layoutStyle: styles.footerCol as ComponentLayoutStyle,
                children: [
                  Button.button(
                    {
                      size: 'sm',
                      layoutStyle: styles.wFull,
                      children: ['Set up scheduled reports'],
                    },
                    h,
                  ),
                  Button.button(
                    {
                      variant: 'outline',
                      size: 'sm',
                      layoutStyle: styles.wFull,
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
        [h.Class(className(styles.loginWrap))],
        [
          ToggleGroup.toggleGroup(
            {
              model: previewModel.toggleGroup,
              toParentMessage: message =>
                onMessageJson(
                  JSON.stringify({ _tag: 'GotCardToggleMessage', message }),
                ),
              ariaLabel: 'Card spacing',
              variant: 'outline',
              size: 'sm',
              value: previewModel.spacing,
              items: spacingOptions.map(option => ({
                value: option.value,
                children: [option.label],
              })),
            },
            h,
          ),
          loginCard(
            {
              spacing: `${Number(previewModel.spacing) * 4}px`,
              ...inputProps,
            },
            h,
          ),
        ],
      )
    case 'edge':
      return Card.card(
        {
          layoutStyle: styles.edgeCard,
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
                layoutStyle: styles.edgeContent,
                children: [
                  h.div(
                    [h.Class(className(styles.edgeScroll))],
                    [
                      h.p(
                        [h.Class(className(reset.text))],
                        [
                          'These terms govern your use of the workspace, including access to shared documents, project files, and collaboration tools.',
                        ],
                      ),
                      h.p(
                        [h.Class(className(reset.text))],
                        [
                          'You are responsible for the content you upload and for ensuring that your team has the appropriate permissions to view or edit it.',
                        ],
                      ),
                      h.p(
                        [h.Class(className(reset.text))],
                        [
                          'We may update features or limits as the service evolves. When those changes materially affect your workflow, we will notify your workspace administrators.',
                        ],
                      ),
                      h.p(
                        [h.Class(className(reset.text))],
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
                layoutStyle: styles.edgeFooterInner as ComponentLayoutStyle,
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
          density: 'flush',
          layoutStyle: styles.imageWrap as ComponentLayoutStyle,
          children: [
            h.div([h.Class(className(styles.overlay))]),
            h.img([
              h.Src(IMAGE_URL),
              h.Alt('Event cover'),
              h.Class(className(reset.media, styles.cover)),
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
                    { layoutStyle: styles.wFull, children: ['View Event'] },
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
}
