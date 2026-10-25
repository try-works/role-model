import { previewLayout } from '@/docs/components/preview-layout.stylex'
import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  itemFixtures,
  itemModels,
  itemMusic,
  itemPeople,
  itemRtlCopy,
} from '@/docs/components/pages/item/shared'
import * as Icon from '@/lib/icon'
import * as Avatar from '@/stylex/avatar'
import * as Button from '@/stylex/button'
import * as DropdownMenu from '@/stylex/dropdown-menu'
import * as Item from '@/stylex/item'
import { tokens } from '../../../../stylex/tokens.stylex'
import { className } from '@/stylex/style'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import type * as DropdownMenuModel from '@/stylex/dropdown-menu'

const styles = stylex.create({
  triggerBorderTransparent: { borderColor: tokens.transparent },
  stackMd: {
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '28rem',
    width: '100%',
  },
  stackLg: {
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '32rem',
    width: '100%',
  },
  stackXl: {
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '36rem',
    width: '100%',
  },
  stackTight: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '28rem',
    width: '100%',
  },
  group: { maxWidth: '24rem' },
  headerImg: {
    borderRadius: 'calc(var(--radius) - 4px)',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    width: '100%',
  },
  cover: { filter: 'grayscale(100%)', objectFit: 'cover' },
  muted: { color: 'var(--muted-foreground)' },
  titleClamp: {
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 1,
    display: '-webkit-box',
  },
  duration: {
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    textAlign: 'center',
  },
  avatarStack: { display: 'flex' },
  avatarOverlap: { marginRight: '-0.5rem' },
  avatar65: { height: '1.625rem', width: '1.625rem' },
  icon4: { height: '1rem', width: '1rem' },
  icon5: { height: '1.25rem', width: '1.25rem' },
  iconBtn4: { flexShrink: 0, height: '1rem', width: '1rem' },
  menuItem: { width: '100%' },
  triggerContent: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
})

type ItemPreviewShape = Readonly<{ dropdown: DropdownMenuModel.Model }>

const sx = (style: stylex.StaticStyles): string => className(style)

const peopleAvatar = <Msg>(
  person: (typeof itemPeople)[number],
  layoutStyle: ComponentLayoutStyle | null,
  h: HtmlBuilder<Msg>,
): Html =>
  Item.itemMedia(
    {
      children: [
        Avatar.avatar(
          {
            size: 'lg',
            grayscale: true,
            layoutStyle: layoutStyle ?? undefined,
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

const demoStack = <Msg>(
  h: HtmlBuilder<Msg>,
  t: typeof itemRtlCopy | null,
): Html => {
  const title1 = t === null ? 'Basic Item' : t.basicItem
  const desc1 =
    t === null ? 'A simple item with title and description.' : t.basicItemDesc
  const action = t === null ? 'Action' : t.action
  const verified =
    t === null ? 'Your profile has been verified.' : t.verifiedTitle
  return h.div(
    [h.Class(sx(styles.stackMd))],
    [
      Item.item(
        {
          variant: 'outline',
          children: [
            Item.itemContent(
              {
                children: [
                  Item.itemTitle({ children: [title1] }, h),
                  Item.itemDescription({ children: [desc1] }, h),
                ],
              },
              h,
            ),
            Item.itemActions(
              {
                children: [
                  Button.button(
                    { variant: 'outline', size: 'sm', children: [action] },
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
                  Icon.icon('badge-check', { class: sx(styles.icon5) }, h),
                ],
              },
              h,
            ),
            Item.itemContent(
              { children: [Item.itemTitle({ children: [verified] }, h)] },
              h,
            ),
            Item.itemActions(
              {
                children: [
                  Icon.icon('chevron-right', { class: sx(styles.icon4) }, h),
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
}

export const itemStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const shape = model as ItemPreviewShape
  const fixture = itemFixtures[index] ?? itemFixtures[0]
  switch (fixture.kind) {
    case 'demo':
      return demoStack(h, null)
    case 'rtl':
      return h.div(
        [h.Dir('rtl'), h.Class(className(previewLayout.contents))],
        [demoStack(h, itemRtlCopy)],
      )
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
        [h.Class(sx(styles.stackMd))],
        rows.map(([props, title, description]) =>
          Item.item(
            {
              ...props,
              children: [
                Item.itemMedia(
                  {
                    variant: 'icon',
                    children: [
                      Icon.icon('inbox', { class: sx(styles.icon4) }, h),
                    ],
                  },
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
        [h.Class(sx(styles.stackLg))],
        [
          Item.item(
            {
              variant: 'outline',
              children: [
                Item.itemMedia(
                  {
                    variant: 'icon',
                    children: [
                      Icon.icon('shield-alert', { class: sx(styles.icon4) }, h),
                    ],
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
        [h.Class(sx(styles.stackLg))],
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
                          size: 'lg',
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
                          rounded: true,
                          ariaLabel: 'Invite',
                          children: [
                            Icon.icon(
                              'plus',
                              { class: sx(styles.iconBtn4) },
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
          Item.item(
            {
              variant: 'outline',
              children: [
                Item.itemMedia(
                  {
                    children: [
                      h.div(
                        [h.Class(sx(styles.avatarStack))],
                        [
                          Avatar.avatar(
                            {
                              ring: true,
                              grayscale: true,
                              layoutStyle: styles.avatarOverlap,
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
                              ring: true,
                              grayscale: true,
                              layoutStyle: styles.avatarOverlap,
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
                              ring: true,
                              grayscale: true,
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
        [h.Class(sx(styles.stackMd))],
        [
          Item.itemGroup(
            {
              spacing: 'lg',
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
                              h.Class(className(reset.media, styles.cover)),
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
                                layoutStyle:
                                  styles.titleClamp as ComponentLayoutStyle,
                                children: [
                                  `${song.title} - `,
                                  h.span(
                                    [h.Class(sx(styles.muted))],
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
                          layoutStyle: styles.duration as ComponentLayoutStyle,
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
          layoutStyle: styles.group,
          children: itemPeople.map(person =>
            Item.item(
              {
                variant: 'outline',
                children: [
                  peopleAvatar(person, null, h),
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
                            rounded: true,
                            ariaLabel: `Invite ${person.username}`,
                            children: [
                              Icon.icon(
                                'plus',
                                { class: sx(styles.iconBtn4) },
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
          ),
        },
        h,
      )
    case 'header':
      return h.div(
        [h.Class(sx(styles.stackXl))],
        [
          Item.itemGroup(
            {
              columns: 3,
              spacing: 'lg',
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
                              h.Class(className(reset.media, styles.headerImg)),
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
        [h.Class(sx(styles.stackTight))],
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
                      Icon.icon(
                        'chevron-right',
                        { class: sx(styles.icon4) },
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
                      Icon.icon(
                        'external-link',
                        { class: sx(styles.icon4) },
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
    case 'dropdown':
      return DropdownMenu.dropdownMenu(
        {
          model: shape.dropdown,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotDropdownMessage', message }),
            ),
          trigger: h.span(
            [h.Class(sx(styles.triggerContent))],
            [
              'Select',
              Icon.icon('chevron-down', { class: sx(styles.iconBtn4) }, h),
            ],
          ),
          triggerButtonVariant: 'outline',
          triggerLayoutStyle:
            styles.triggerBorderTransparent as ComponentLayoutStyle,
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
                  layoutStyle: styles.menuItem,
                  children: [
                    peopleAvatar(person, styles.avatar65, h),
                    Item.itemContent(
                      {
                        children: [
                          Item.itemTitle({ children: [person.username] }, h),
                          Item.itemDescription({ children: [person.email] }, h),
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
