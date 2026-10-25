import { reset } from '@/stylex/reset'
import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as stylex from '@stylexjs/stylex'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/stylex/button'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/stylex/card'
import { field, fieldGroup, fieldLabel } from '@/stylex/field'
import { input } from '@/stylex/input'
import {
  itemContent,
  itemDescription,
  itemMedia,
  itemTitle,
  itemVariants,
} from '@/stylex/item'
import { className } from '@/stylex/style'
import { tokens } from '../../stylex/tokens.stylex'

const styles = stylex.create({
  dangerIcon: { color: tokens.destructive },
  clamp: {
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 1,
    display: '-webkit-box',
  },
  arrowIcon: { height: '1rem', width: '1rem' },
  labelRow: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  forgotLink: {
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.05em',
    lineHeight: '1rem',
    textTransform: 'uppercase',
  },
  footer: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  fullWidth: { width: '100%' },
})

export const Model = S.Struct({
  email: S.String,
  password: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedEmail: { value: S.String },
  UpdatedPassword: { value: S.String },
})
export type Message = typeof Message.Type

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> =>
  M.value(message).pipe(
    M.withReturnType<Update.Return<Model, Message>>(),
    M.tagsExhaustive({
      UpdatedEmail: ({ value }) => ({
        model: modifyFields(model, { email: () => value }),
      }),
      UpdatedPassword: ({ value }) => ({
        model: modifyFields(model, { password: () => value }),
      }),
    }),
  )

export const init = (): Model => ({
  email: 'artist@studio.inc',
  password: 'password123',
})

const dangerZone = (h: HtmlBuilder<Message>): Html => {
  // PORT NOTE: src/ui/item.ts does not expose shadcn's asChild behavior,
  // so this local anchor applies the exported Item variant classes directly.
  return h.a(
    [
      h.Href('#'),
      h.DataAttribute('slot', 'item'),
      h.DataAttribute('variant', 'muted'),
      h.DataAttribute('size', 'default'),
      h.Class(itemVariants({ variant: 'muted' })),
    ],
    [
      itemMedia(
        {
          variant: 'icon',
          children: [
            Icon.icon(
              'circle-alert',
              { class: className(styles.dangerIcon) },
              h,
            ),
          ],
        },
        h,
      ),
      itemContent(
        {
          children: [
            itemTitle({ children: ['Danger Zone'] }, h),
            itemDescription(
              {
                children: [
                  h.span(
                    [h.Class(className(styles.clamp))],
                    ['Archive account and remove catalog'],
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      ),
      Icon.icon('arrow-right', { class: className(styles.arrowIcon) }, h),
    ],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return card<Message>(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Account Access'] }, h),
              cardDescription(
                {
                  children: ['Update your credentials or re-authenticate.'],
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              fieldGroup(
                {
                  children: [
                    field(
                      {
                        children: [
                          fieldLabel(
                            {
                              for: 'account-access-email',
                              children: ['Email Address'],
                            },
                            h,
                          ),
                          input(
                            {
                              id: 'account-access-email',
                              type: 'email',
                              value: model.email,
                              onInput: value => Message.UpdatedEmail({ value }),
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    field(
                      {
                        children: [
                          h.div(
                            [h.Class(className(styles.labelRow))],
                            [
                              fieldLabel(
                                {
                                  for: 'account-access-password',
                                  children: ['Current Password'],
                                },
                                h,
                              ),
                              h.a(
                                [
                                  h.Href('#'),
                                  h.Class(
                                    className(reset.link, styles.forgotLink),
                                  ),
                                ],
                                ['Forgot?'],
                              ),
                            ],
                          ),
                          input(
                            {
                              id: 'account-access-password',
                              type: 'password',
                              value: model.password,
                              onInput: value =>
                                Message.UpdatedPassword({ value }),
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
        cardFooter(
          {
            children: [
              h.div(
                [h.Class(className(styles.footer))],
                [
                  h.div(
                    [h.Class(className(styles.fullWidth))],
                    [
                      button(
                        {
                          layoutStyle: styles.fullWidth,
                          children: [
                            Icon.icon('lock-keyhole', {}, h),
                            'Update Security',
                          ],
                        },
                        h,
                      ),
                    ],
                  ),
                  dangerZone(h),
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
}

/*
Stateful? yes.
Submodels wired: none; controlled Input values are local card fields.
PORT NOTEs: Item asChild is represented by a local anchor using itemVariants because the shared Item wrapper renders a div.
*/
