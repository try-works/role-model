import * as S from 'effect/Schema'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  itemFixtures,
  itemModels,
  itemMusic,
  itemPeople,
  itemRtlCopy,
  type ItemFixture,
} from '@/docs/components/pages/item/shared'
import * as Icon from '@/lib/icon'
import * as Avatar from '@/ui/avatar'
import * as Button from '@/ui/button'
import { buttonVariants } from '@/ui/button'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Item from '@/ui/item'

const ItemPreviewModel = S.Struct({
  _docsPage: S.Literal('item'),
  dropdown: DropdownMenu.Model,
})
type ItemPreviewModel = typeof ItemPreviewModel.Type

const ItemPreviewMessage = defineMessageUnion({
  GotDropdownMessage: { message: DropdownMenu.Message },
})
type ItemPreviewMessage = typeof ItemPreviewMessage.Type

type B = HtmlBuilder<ItemPreviewMessage>

const peopleAvatar = (
  person: (typeof itemPeople)[number],
  cls: string,
  h: B,
): Html =>
  Item.itemMedia(
    {
      children: [
        Avatar.avatar(
          {
            class: cls,
            children: [
              Avatar.avatarImage(
                { src: person.avatar, alt: `@${person.username}` },
                h,
              ),
              Avatar.avatarFallback(
                { children: [person.username.charAt(0)] },
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

const itemView = (
  fixture: ItemFixture,
  model: ItemPreviewModel,
  h: B,
): Html => {
  switch (fixture.kind) {
    case 'demo':
    case 'rtl': {
      const t = itemRtlCopy
      const isRtl = fixture.kind === 'rtl'
      const stack = h.div(
        [h.Class('flex w-full max-w-md flex-col gap-6')],
        [
          Item.item(
            {
              variant: 'outline',
              children: [
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle(
                        { children: [isRtl ? t.basicItem : 'Basic Item'] },
                        h,
                      ),
                      Item.itemDescription(
                        {
                          children: [
                            isRtl
                              ? t.basicItemDesc
                              : 'A simple item with title and description.',
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemActions(
                  {
                    children: [
                      Button.button(
                        {
                          variant: 'outline',
                          size: 'sm',
                          children: [isRtl ? t.action : 'Action'],
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
          Item.item(
            {
              variant: 'outline',
              size: 'sm',
              element: 'a',
              href: '#',
              children: [
                Item.itemMedia(
                  {
                    children: [
                      Icon.icon('badge-check', { class: 'size-5' }, h),
                    ],
                  },
                  h,
                ),
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle(
                        {
                          children: [
                            isRtl
                              ? t.verifiedTitle
                              : 'Your profile has been verified.',
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemActions(
                  {
                    children: [
                      Icon.icon('chevron-right', { class: 'size-4' }, h),
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
      return isRtl ? h.div([h.Dir('rtl'), h.Class('contents')], [stack]) : stack
    }
    case 'variant':
    case 'size': {
      const rows: ReadonlyArray<
        readonly [
          { variant?: 'outline' | 'muted'; size?: 'sm' | 'xs' },
          string,
          string,
        ]
      > =
        fixture.kind === 'variant'
          ? [
              [{}, 'Default Variant', 'Transparent background with no border.'],
              [
                { variant: 'outline' },
                'Outline Variant',
                'Outlined style with a visible border.',
              ],
              [
                { variant: 'muted' },
                'Muted Variant',
                'Muted background for secondary content.',
              ],
            ]
          : [
              [
                { variant: 'outline' },
                'Default Size',
                'The standard size for most use cases.',
              ],
              [
                { variant: 'outline', size: 'sm' },
                'Small Size',
                'A compact size for dense layouts.',
              ],
              [
                { variant: 'outline', size: 'xs' },
                'Extra Small Size',
                'The most compact size available.',
              ],
            ]
      return h.div(
        [h.Class('flex w-full max-w-md flex-col gap-6')],
        rows.map(([props, title, description]) =>
          Item.item(
            {
              ...props,
              children: [
                Item.itemMedia(
                  { variant: 'icon', children: [Icon.icon('inbox', {}, h)] },
                  h,
                ),
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle({ children: [title] }, h),
                      Item.itemDescription({ children: [description] }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ),
      )
    }
    case 'icon':
      return h.div(
        [h.Class('flex w-full max-w-lg flex-col gap-6')],
        [
          Item.item(
            {
              variant: 'outline',
              children: [
                Item.itemMedia(
                  {
                    variant: 'icon',
                    children: [Icon.icon('shield-alert', {}, h)],
                  },
                  h,
                ),
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle({ children: ['Security Alert'] }, h),
                      Item.itemDescription(
                        {
                          children: ['New login detected from unknown device.'],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemActions(
                  {
                    children: [
                      Button.button(
                        {
                          variant: 'outline',
                          size: 'sm',
                          children: ['Review'],
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
    case 'avatar':
      return h.div(
        [h.Class('flex w-full max-w-lg flex-col gap-6')],
        [
          Item.item(
            {
              variant: 'outline',
              children: [
                Item.itemMedia(
                  {
                    children: [
                      Avatar.avatar(
                        {
                          class: 'size-10',
                          children: [
                            Avatar.avatarImage(
                              {
                                src: 'https://github.com/evilrabbit.png',
                                alt: 'Evil Rabbit',
                              },
                              h,
                            ),
                            Avatar.avatarFallback({ children: ['ER'] }, h),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle({ children: ['Evil Rabbit'] }, h),
                      Item.itemDescription(
                        { children: ['Last seen 5 months ago'] },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemActions(
                  {
                    children: [
                      Button.button(
                        {
                          variant: 'outline',
                          size: 'icon-sm',
                          class: 'rounded-full',
                          ariaLabel: 'Invite',
                          children: [Icon.icon('plus', {}, h)],
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
          Item.item(
            {
              variant: 'outline',
              children: [
                Item.itemMedia(
                  {
                    children: [
                      h.div(
                        [
                          h.Class(
                            'flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:grayscale',
                          ),
                        ],
                        [
                          Avatar.avatar(
                            {
                              class: 'hidden sm:flex',
                              children: [
                                Avatar.avatarImage(
                                  {
                                    src: '/logo-mark.svg',
                                    alt: '@creaseui',
                                  },
                                  h,
                                ),
                                Avatar.avatarFallback({ children: ['CU'] }, h),
                              ],
                            },
                            h,
                          ),
                          Avatar.avatar(
                            {
                              class: 'hidden sm:flex',
                              children: [
                                Avatar.avatarImage(
                                  {
                                    src: 'https://github.com/maxleiter.png',
                                    alt: '@maxleiter',
                                  },
                                  h,
                                ),
                                Avatar.avatarFallback({ children: ['LR'] }, h),
                              ],
                            },
                            h,
                          ),
                          Avatar.avatar(
                            {
                              children: [
                                Avatar.avatarImage(
                                  {
                                    src: 'https://github.com/evilrabbit.png',
                                    alt: '@evilrabbit',
                                  },
                                  h,
                                ),
                                Avatar.avatarFallback({ children: ['ER'] }, h),
                              ],
                            },
                            h,
                          ),
                        ],
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle({ children: ['No Team Members'] }, h),
                      Item.itemDescription(
                        {
                          children: [
                            'Invite your team to collaborate on this project.',
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemActions(
                  {
                    children: [
                      Button.button(
                        {
                          variant: 'outline',
                          size: 'sm',
                          children: ['Invite'],
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
    case 'image':
      return h.div(
        [h.Class('flex w-full max-w-md flex-col gap-6')],
        [
          Item.itemGroup(
            {
              class: 'gap-4',
              children: itemMusic.map(song =>
                Item.item(
                  {
                    variant: 'outline',
                    element: 'a',
                    href: '#',
                    children: [
                      Item.itemMedia(
                        {
                          variant: 'image',
                          children: [
                            h.img([
                              h.Src(`https://avatar.vercel.sh/${song.title}`),
                              h.Alt(song.title),
                              h.Class('object-cover grayscale'),
                            ]),
                          ],
                        },
                        h,
                      ),
                      Item.itemContent(
                        {
                          children: [
                            Item.itemTitle(
                              {
                                class: 'line-clamp-1',
                                children: [
                                  `${song.title} - `,
                                  h.span(
                                    [h.Class('text-muted-foreground')],
                                    [song.album],
                                  ),
                                ],
                              },
                              h,
                            ),
                            Item.itemDescription(
                              { children: [song.artist] },
                              h,
                            ),
                          ],
                        },
                        h,
                      ),
                      Item.itemContent(
                        {
                          class: 'flex-none text-center',
                          children: [
                            Item.itemDescription(
                              { children: [song.duration] },
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
              ),
            },
            h,
          ),
        ],
      )
    case 'group':
      return Item.itemGroup(
        {
          class: 'max-w-sm',
          children: itemPeople.map(person =>
            Item.item(
              {
                variant: 'outline',
                children: [
                  peopleAvatar(person, 'size-10 grayscale', h),
                  Item.itemContent(
                    {
                      children: [
                        Item.itemTitle({ children: [person.username] }, h),
                        Item.itemDescription({ children: [person.email] }, h),
                      ],
                    },
                    h,
                  ),
                  Item.itemActions(
                    {
                      children: [
                        Button.button(
                          {
                            variant: 'ghost',
                            size: 'icon',
                            class: 'rounded-full',
                            ariaLabel: `Invite ${person.username}`,
                            children: [Icon.icon('plus', {}, h)],
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
          ),
        },
        h,
      )
    case 'header':
      return h.div(
        [h.Class('flex w-full max-w-xl flex-col gap-6')],
        [
          Item.itemGroup(
            {
              class: 'grid grid-cols-3 gap-4',
              children: itemModels.map(entry =>
                Item.item(
                  {
                    variant: 'outline',
                    children: [
                      Item.itemHeader(
                        {
                          children: [
                            h.img([
                              h.Src(entry.image),
                              h.Alt(entry.name),
                              h.Class(
                                'aspect-square w-full rounded-sm object-cover',
                              ),
                            ]),
                          ],
                        },
                        h,
                      ),
                      Item.itemContent(
                        {
                          children: [
                            Item.itemTitle({ children: [entry.name] }, h),
                            Item.itemDescription(
                              { children: [entry.description] },
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
              ),
            },
            h,
          ),
        ],
      )
    case 'link':
      return h.div(
        [h.Class('flex w-full max-w-md flex-col gap-4')],
        [
          Item.item(
            {
              element: 'a',
              href: '#',
              children: [
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle(
                        { children: ['Visit our documentation'] },
                        h,
                      ),
                      Item.itemDescription(
                        {
                          children: [
                            'Learn how to get started with our components.',
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemActions(
                  {
                    children: [
                      Icon.icon('chevron-right', { class: 'size-4' }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          Item.item(
            {
              variant: 'outline',
              element: 'a',
              href: '#',
              target: '_blank',
              rel: 'noopener noreferrer',
              children: [
                Item.itemContent(
                  {
                    children: [
                      Item.itemTitle({ children: ['External resource'] }, h),
                      Item.itemDescription(
                        {
                          children: [
                            'Opens in a new tab with security attributes.',
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Item.itemActions(
                  {
                    children: [
                      Icon.icon('external-link', { class: 'size-4' }, h),
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
    case 'dropdown':
      return DropdownMenu.dropdownMenu(
        {
          model: model.dropdown,
          toParentMessage: message =>
            ItemPreviewMessage.GotDropdownMessage({ message }),
          trigger: h.span(
            [h.Class('flex items-center gap-2')],
            ['Select', Icon.icon('chevron-down', { class: 'size-4' }, h)],
          ),
          triggerClass: buttonVariants({ variant: 'outline' }),
          ariaLabel: 'Select a person',
          align: 'end',
          items: itemPeople.map(person => person.username),
          itemToConfig: username => {
            const person =
              itemPeople.find(candidate => candidate.username === username) ??
              itemPeople[0]!
            return {
              label: Item.item(
                {
                  size: 'xs',
                  class: 'w-full p-2',
                  children: [
                    peopleAvatar(person, 'size-6.5 grayscale', h),
                    Item.itemContent(
                      {
                        children: [
                          Item.itemTitle({ children: [person.username] }, h),
                          Item.itemDescription(
                            { class: 'leading-none', children: [person.email] },
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
            }
          },
        },
        h,
      )
  }
}

export const itemTailwindPreviewProgram = definePreviewProgram<
  ItemPreviewModel,
  ItemPreviewMessage
>({
  Model: ItemPreviewModel,
  Message: ItemPreviewMessage,
  init: index => ({
    _docsPage: 'item',
    dropdown: DropdownMenu.init({
      id: `docs-item-${String(index)}-people`,
      isAnimated: false,
    }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotDropdownMessage': {
        const { model: dropdown, commands: dropdownCommands__ } =
          DropdownMenu.update(model.dropdown, message.message)
        const commands = dropdownCommands__ ?? []
        return {
          model: { ...model, dropdown },
          commands: Command.mapMessages(commands, next =>
            ItemPreviewMessage.GotDropdownMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    itemView(itemFixtures[index] ?? itemFixtures[0], model, h),
})
