import { Match as M, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Icon from '@/demo/icon-preview'
import {
  breadcrumb,
  breadcrumbItem,
  breadcrumbLink,
  breadcrumbList,
  breadcrumbPage,
  breadcrumbSeparator,
} from '@/ui/breadcrumb'
import { buttonVariants } from '@/ui/button'
import { card, cardContent, cardHeader } from '@/ui/card'
import * as DropdownMenu from '@/ui/dropdown-menu'
import {
  itemContent,
  itemDescription,
  itemGroup,
  itemMedia,
  itemTitle,
  itemVariants,
} from '@/ui/item'

type MenuItem = 'profile' | 'statements' | 'documents'

const menuItems: ReadonlyArray<MenuItem> = [
  'profile',
  'statements',
  'documents',
]

const paymentItems = [
  {
    icon: 'gauge',
    title: 'Change transfer limit',
    description: 'Adjust how much you can send from your balance.',
  },
  {
    icon: 'calendar',
    title: 'Scheduled transfers',
    description: 'Set up a transfer to send at a later date.',
  },
  {
    icon: 'repeat',
    title: 'Direct Debits',
    description: 'Set up and manage regular payments.',
  },
  {
    icon: 'refresh-cw',
    title: 'Recurring card payments',
    description: 'Manage your repeated card transactions.',
  },
] as const

export const Model = S.Struct({
  menu: DropdownMenu.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotMenuMessage: {
    message: DropdownMenu.Message,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotMenuMessage: ({ message: childMessage }) => {
        const menuOp__ = DropdownMenu.update(model.menu, childMessage)
        const menu = menuOp__.model
        const commands = menuOp__.commands ?? []
        return {
          model: modifyFields(model, { menu: () => menu }),
          commands: Command.mapMessages(commands, next =>
            Message.GotMenuMessage({ message: next }),
          ),
        }
      },
    }),
  )

export const init = (): Model => ({
  menu: DropdownMenu.init({
    id: 'payments-account-options',
    isAnimated: true,
  }),
})

const paymentLink = (
  icon: string,
  title: string,
  description: string,
  h: HtmlBuilder<Message>,
): Html => {
  // PORT NOTE: src/ui/item.ts does not expose shadcn's asChild behavior,
  // so the link applies the exported Item variant classes directly.
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
          children: [Icon.icon(icon, {}, h)],
        },
        h,
      ),
      itemContent(
        {
          children: [
            itemTitle({ children: [title] }, h),
            itemDescription({ children: [description] }, h),
          ],
        },
        h,
      ),
      Icon.icon(
        'chevron-right',
        {
          class: 'size-4 shrink-0 text-muted-foreground',
        },
        h,
      ),
    ],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const menuTrigger = h.span(
    [h.Class('contents')],
    [
      Icon.moreHorizontal({}, h),
      h.span([h.Class('sr-only')], ['Account options']),
    ],
  )

  return card<Message>(
    {
      children: [
        cardHeader(
          {
            class: 'flex flex-col gap-3',
            children: [
              breadcrumb(
                {
                  children: [
                    breadcrumbList(
                      {
                        children: [
                          breadcrumbItem(
                            {
                              children: [
                                breadcrumbLink(
                                  {
                                    href: '#',
                                    children: ['Home'],
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          breadcrumbSeparator({}, h),
                          breadcrumbItem(
                            {
                              children: [
                                DropdownMenu.dropdownMenu<MenuItem, Message>(
                                  {
                                    model: model.menu,
                                    toParentMessage: message =>
                                      Message.GotMenuMessage({ message }),
                                    trigger: menuTrigger,
                                    triggerClass: `${buttonVariants({
                                      variant: 'ghost',
                                      size: 'icon',
                                    })} size-8`,
                                    items: menuItems,
                                    itemToConfig: item => ({
                                      label:
                                        item === 'profile'
                                          ? 'Profile'
                                          : item === 'statements'
                                            ? 'Statements'
                                            : 'Documents',
                                      group: '',
                                    }),
                                    align: 'start',
                                    ariaLabel: 'Account options',
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          breadcrumbSeparator({}, h),
                          breadcrumbItem(
                            {
                              children: [
                                breadcrumbPage({ children: ['Payments'] }, h),
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
        ),
        cardContent(
          {
            children: [
              itemGroup(
                {
                  class: 'w-full',
                  children: paymentItems.map(
                    payment =>
                      paymentLink(
                        payment.icon,
                        payment.title,
                        payment.description,
                        h,
                      ),
                    h,
                  ),
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

/*
Stateful? yes.
Submodels wired: DropdownMenu (breadcrumb account options).
PORT NOTEs: Item asChild links are local anchors using itemVariants because the shared Item wrapper renders a div.
*/
