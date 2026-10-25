import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type ItemKind =
  | 'demo'
  | 'variant'
  | 'size'
  | 'icon'
  | 'avatar'
  | 'image'
  | 'group'
  | 'header'
  | 'link'
  | 'dropdown'
  | 'rtl'

export type ItemFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: ItemKind
}>

export const itemFixtures: Readonly<[ItemFixture, ...Array<ItemFixture>]> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Variant',
    description: 'Use the variant prop to change the visual style of the item.',
    kind: 'variant',
  },
  {
    title: 'Size',
    description:
      'Use the size prop to change the size of the item. Available sizes are default, sm, and xs.',
    kind: 'size',
  },
  {
    title: 'Icon',
    description: 'Use itemMedia with the icon variant to display an icon.',
    kind: 'icon',
  },
  {
    title: 'Avatar',
    description: 'Use itemMedia to display an avatar.',
    kind: 'avatar',
  },
  {
    title: 'Image',
    description: 'Use itemMedia with the image variant to display an image.',
    kind: 'image',
  },
  {
    title: 'Group',
    description: 'Use itemGroup to group related items together.',
    kind: 'group',
  },
  {
    title: 'Header',
    description: 'Use itemHeader to add a header above the item content.',
    kind: 'header',
  },
  {
    title: 'Link',
    description:
      'Render the item as a link. The hover and focus states are applied to the anchor element.',
    kind: 'link',
  },
  { title: 'Dropdown', kind: 'dropdown' },
  {
    title: 'RTL',
    description:
      'Items mirror their layout and copy in right-to-left contexts.',
    kind: 'rtl',
  },
]

/* Arabic copy, verbatim from upstream item-rtl.tsx. */
export const itemRtlCopy = {
  basicItem: 'عنصر أساسي',
  basicItemDesc: 'عنصر بسيط يحتوي على عنوان ووصف.',
  action: 'إجراء',
  verifiedTitle: 'تم التحقق من ملفك الشخصي.',
} as const

export const itemMusic = [
  {
    title: 'Midnight City Lights',
    artist: 'Neon Dreams',
    album: 'Electric Nights',
    duration: '3:45',
  },
  {
    title: 'Coffee Shop Conversations',
    artist: 'The Morning Brew',
    album: 'Urban Stories',
    duration: '4:05',
  },
  {
    title: 'Digital Rain',
    artist: 'Cyber Symphony',
    album: 'Binary Beats',
    duration: '3:30',
  },
] as const

export const itemPeople = [
  {
    username: 'CreaseUI',
    avatar: '/logo-mark.svg',
    email: 'creaseui@example.com',
  },
  {
    username: 'maxleiter',
    avatar: 'https://github.com/maxleiter.png',
    email: 'maxleiter@vercel.com',
  },
  {
    username: 'evilrabbit',
    avatar: 'https://github.com/evilrabbit.png',
    email: 'evilrabbit@vercel.com',
  },
] as const

export const itemModels = [
  {
    name: 'v0-1.5-sm',
    description: 'Everyday tasks and UI generation.',
    image:
      'https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?q=80&w=640&auto=format&fit=crop',
  },
  {
    name: 'v0-1.5-lg',
    description: 'Advanced thinking or reasoning.',
    image:
      'https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop',
  },
  {
    name: 'v0-2.0-mini',
    description: 'Open Source model for everyone.',
    image:
      'https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop',
  },
] as const

const sq = (value: string): string => value.replaceAll("'", "\\'")

const kindUsesIcon = (kind: ItemKind): boolean =>
  kind === 'demo' ||
  kind === 'variant' ||
  kind === 'size' ||
  kind === 'icon' ||
  kind === 'avatar' ||
  kind === 'group' ||
  kind === 'link' ||
  kind === 'dropdown' ||
  kind === 'rtl'
const kindUsesButton = (kind: ItemKind): boolean =>
  kind === 'demo' ||
  kind === 'icon' ||
  kind === 'avatar' ||
  kind === 'group' ||
  kind === 'dropdown' ||
  kind === 'rtl'
const kindUsesAvatar = (kind: ItemKind): boolean =>
  kind === 'avatar' || kind === 'group' || kind === 'dropdown'
const kindUsesDropdown = (kind: ItemKind): boolean => kind === 'dropdown'
const kindUsesImage = (kind: ItemKind): boolean =>
  kind === 'image' || kind === 'header'

const emitImports = (fixture: ItemFixture, isStyleX: boolean): string => {
  const base = isStyleX ? 'stylex' : 'ui'
  const parts: Array<string> = [
    "import { Command, Runtime, Subscription, Update } from 'foldkit'",
    "import { type Document, type HtmlBuilder } from 'foldkit/html'",
    "import { defineMessageUnion } from 'foldkit/message'",
  ]
  if (isStyleX) {
    parts.push(
      '',
      "import * as stylex from '@stylexjs/stylex'\nimport { layoutStyle } from '@/stylex/contracts'",
    )
  }
  if (kindUsesAvatar(fixture.kind)) {
    parts.push(`import * as Avatar from '@/${base}/avatar'`)
  }
  if (kindUsesButton(fixture.kind)) {
    parts.push(`import * as Button from '@/${base}/button'`)
  }
  if (kindUsesDropdown(fixture.kind)) {
    parts.push(`import * as DropdownMenu from '@/${base}/dropdown-menu'`)
  }
  parts.push(`import * as Item from '@/${base}/item'`)
  if (!isStyleX && fixture.kind === 'dropdown') {
    parts.push("import { buttonVariants } from '@/ui/button'")
  }
  if (kindUsesIcon(fixture.kind)) {
    parts.push("import * as Icon from '@/lib/icon'")
  }
  return parts.join('\n')
}

const emitStyles = (fixture: ItemFixture): string => {
  const extras: Array<string> = []
  switch (fixture.kind) {
    case 'demo':
    case 'rtl':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '28rem', width: '100%' },",
      )
      break
    case 'variant':
    case 'size':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '28rem', width: '100%' },",
      )
      break
    case 'icon':
    case 'avatar':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '32rem', width: '100%' },",
      )
      break
    case 'image':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '28rem', width: '100%' },",
      )
      extras.push(
        "  songTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },",
      )
      extras.push("  muted: { color: 'var(--muted-foreground)' },")
      extras.push(
        "  cover: { borderRadius: 'calc(var(--radius) - 4px)', objectFit: 'cover' },",
      )
      extras.push('  duration: { flexGrow: 0, flexShrink: 0 },')
      break
    case 'group':
      extras.push("  group: { maxWidth: '24rem' },")
      break
    case 'header':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '36rem', width: '100%' },",
      )
      extras.push(
        "  headerImg: { aspectRatio: '1 / 1', borderRadius: 'calc(var(--radius) - 4px)', objectFit: 'cover', width: '100%' },",
      )
      break
    case 'link':
      extras.push(
        "  stack: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '28rem', width: '100%' },",
      )
      break
    case 'dropdown':
      extras.push("  menuItem: { width: '100%' },")
      break
    default:
      break
  }
  return extras.join('\n')
}

const emitModel = (fixture: ItemFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const Model = S.Struct({
  dropdown: DropdownMenu.Model,
})
export type Model = typeof Model.Type`
  }
  return `export const Model = S.Struct({})
export type Model = typeof Model.Type`
}

const emitMessages = (fixture: ItemFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const Message = defineMessageUnion({
  GotDropdownMessage: { message: DropdownMenu.Message },
})
export type Message = typeof Message.Type`
  }
  return `import { taggedStruct } from 'foldkit/schema'
// This example has no interaction. Runtime applications still expose a
// closed Message schema so the program boundary remains explicit.
export const NoOp = taggedStruct('NoOpItem${fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')}');
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`
}

const emitInit = (fixture: ItemFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const init = (): Update.Return<Model, Message> => ({
  model: { dropdown: DropdownMenu.init({ id: 'people-menu', isAnimated: false }) },
})`
  }
  return `export const init = (): Update.Return<Model, Message> => ({ model: {} })`
}

const emitUpdate = (fixture: ItemFixture): string => {
  if (kindUsesDropdown(fixture.kind)) {
    return `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotDropdownMessage': {
      const { model: dropdown, commands: dropdownCommands__ } = DropdownMenu.update(model.dropdown, message.message)
      const commands = dropdownCommands__ ?? []
      return {
        model: { ...model, dropdown },
        commands: Command.mapMessages(commands, next => Message.GotDropdownMessage({ message: next })),
      }
    }
  }
}`
  }
  return `export const update = (
  model: Model,
  _message: Message,
): Update.Return<Model, Message> => ({ model: model })`
}

/* Emits a const data array for fixtures that render repeated items. */
const emitData = (fixture: ItemFixture): string => {
  switch (fixture.kind) {
    case 'image':
      return `const music = [
  { title: 'Midnight City Lights', artist: 'Neon Dreams', album: 'Electric Nights', duration: '3:45' },
  { title: 'Coffee Shop Conversations', artist: 'The Morning Brew', album: 'Urban Stories', duration: '4:05' },
  { title: 'Digital Rain', artist: 'Cyber Symphony', album: 'Binary Beats', duration: '3:30' },
] as const

`
    case 'group':
    case 'dropdown':
      return `const people = [
  { username: 'CreaseUI', avatar: '/logo-mark.svg', email: 'creaseui@example.com' },
  { username: 'maxleiter', avatar: 'https://github.com/maxleiter.png', email: 'maxleiter@vercel.com' },
  { username: 'evilrabbit', avatar: 'https://github.com/evilrabbit.png', email: 'evilrabbit@vercel.com' },
] as const

`
    case 'header':
      return `const models = [
  {
    name: 'v0-1.5-sm',
    description: 'Everyday tasks and UI generation.',
    image: 'https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?q=80&w=640&auto=format&fit=crop',
  },
  {
    name: 'v0-1.5-lg',
    description: 'Advanced thinking or reasoning.',
    image: 'https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop',
  },
  {
    name: 'v0-2.0-mini',
    description: 'Open Source model for everyone.',
    image: 'https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop',
  },
] as const

`
    default:
      return ''
  }
}

const emitBody = (fixture: ItemFixture, isStyleX: boolean): string => {
  const cls = (twClass: string, sxName: string): string =>
    isStyleX ? `stylex.props(styles.${sxName}).className ?? ''` : `'${twClass}'`
  const icon = (name: string, extras: string = ''): string =>
    `Icon.icon('${name}', {${extras}}, h)`
  const inbox = isStyleX ? icon('inbox') : icon('inbox', " class: 'size-4'")
  const personItem = (
    media: string,
    contentExtras: string,
    tail: string,
  ): string => `Item.item({
          variant: 'outline',
          children: [
            ${media},
            Item.itemContent({
              ${contentExtras}
              children: [
                Item.itemTitle({ children: [person.username] }, h),
                Item.itemDescription({ children: [person.email] }, h),
              ],
            }, h),
            ${tail}
          ],
        }, h)`
  const personAvatar = isStyleX
    ? `Item.itemMedia({
              children: [
                Avatar.avatar({
                  size: 'sm',
                  children: [
                    Avatar.avatarImage({ src: person.avatar, alt: \`@\${person.username}\` }, h),
                    Avatar.avatarFallback({ children: [person.username.charAt(0)] }, h),
                  ],
                }, h),
              ],
            }, h)`
    : `Item.itemMedia({
              children: [
                Avatar.avatar({
                  class: 'size-10 grayscale',
                  children: [
                    Avatar.avatarImage({ src: person.avatar, alt: \`@\${person.username}\` }, h),
                    Avatar.avatarFallback({ children: [person.username.charAt(0)] }, h),
                  ],
                }, h),
              ],
            }, h)`
  const plusAction = isStyleX
    ? `Item.itemActions({
              children: [
                Button.button({
                  variant: 'ghost',
                  size: 'icon',
                  ariaLabel: \`Invite \${person.username}\`,
                  children: [${icon('plus')}],
                }, h),
              ],
            }, h)`
    : `Item.itemActions({
              children: [
                Button.button({
                  variant: 'ghost',
                  size: 'icon',
                  class: 'rounded-full',
                  ariaLabel: \`Invite \${person.username}\`,
                  children: [${icon('plus')}],
                }, h),
              ],
            }, h)`

  switch (fixture.kind) {
    case 'demo':
    case 'rtl': {
      const t = itemRtlCopy
      const isRtl = fixture.kind === 'rtl'
      const title1 = isRtl ? t.basicItem : 'Basic Item'
      const desc1 = isRtl
        ? t.basicItemDesc
        : 'A simple item with title and description.'
      const action = isRtl ? t.action : 'Action'
      const verified = isRtl
        ? t.verifiedTitle
        : 'Your profile has been verified.'
      const first = `Item.item({
          variant: 'outline',
          children: [
            Item.itemContent({
              children: [
                Item.itemTitle({ children: ['${sq(title1)}'] }, h),
                Item.itemDescription({ children: ['${sq(desc1)}'] }, h),
              ],
            }, h),
            Item.itemActions({
              children: [
                Button.button({ variant: 'outline', size: 'sm', children: ['${sq(action)}'] }, h),
              ],
            }, h),
          ],
        }, h)`
      const second = `Item.item({
          variant: 'outline',
          size: 'sm',
          element: 'a',
          href: '#',
          children: [
            Item.itemMedia({
              children: [${icon('badge-check', isStyleX ? '' : " class: 'size-5'")}],
            }, h),
            Item.itemContent({
              children: [
                Item.itemTitle({ children: ['${sq(verified)}'] }, h),
              ],
            }, h),
            Item.itemActions({
              children: [${icon('chevron-right', isStyleX ? '' : " class: 'size-4'")}],
            }, h),
          ],
        }, h)`
      const stack = `h.div([h.Class(${cls('flex w-full max-w-md flex-col gap-6', 'stack')})], [
      ${first},
      ${second},
    ])`
      return isRtl
        ? `    h.div([h.Dir('rtl'), h.Class('contents')], [
      ${stack},
    ])`
        : `    ${stack}`
    }
    case 'variant':
    case 'size': {
      const rows: ReadonlyArray<readonly [string, string, string]> =
        fixture.kind === 'variant'
          ? [
              ['', 'Default Variant', 'Transparent background with no border.'],
              [
                "variant: 'outline'",
                'Outline Variant',
                'Outlined style with a visible border.',
              ],
              [
                "variant: 'muted'",
                'Muted Variant',
                'Muted background for secondary content.',
              ],
            ]
          : [
              [
                "variant: 'outline'",
                'Default Size',
                'The standard size for most use cases.',
              ],
              [
                "variant: 'outline',\n          size: 'sm'",
                'Small Size',
                'A compact size for dense layouts.',
              ],
              [
                "variant: 'outline',\n          size: 'xs'",
                'Extra Small Size',
                'The most compact size available.',
              ],
            ]
      const items = rows
        .map(
          ([props, title, description]) => `Item.item({
          ${props === '' ? '' : `${props},\n          `}children: [
            Item.itemMedia({ variant: 'icon', children: [${inbox}] }, h),
            Item.itemContent({
              children: [
                Item.itemTitle({ children: ['${title}'] }, h),
                Item.itemDescription({ children: ['${description}'] }, h),
              ],
            }, h),
          ],
        }, h)`,
        )
        .join(',\n      ')
      return `    h.div([h.Class(${cls('flex w-full max-w-md flex-col gap-6', 'stack')})], [
      ${items},
    ])`
    }
    case 'icon':
      return `    h.div([h.Class(${cls('flex w-full max-w-lg flex-col gap-6', 'stack')})], [
      Item.item({
        variant: 'outline',
        children: [
          Item.itemMedia({ variant: 'icon', children: [${icon('shield-alert')}] }, h),
          Item.itemContent({
            children: [
              Item.itemTitle({ children: ['Security Alert'] }, h),
              Item.itemDescription({ children: ['New login detected from unknown device.'] }, h),
            ],
          }, h),
          Item.itemActions({
            children: [
              Button.button({ variant: 'outline', size: 'sm', children: ['Review'] }, h),
            ],
          }, h),
        ],
      }, h),
    ])`
    case 'avatar': {
      const single = `Item.item({
          variant: 'outline',
          children: [
            Item.itemMedia({
              children: [
                Avatar.avatar({
                  ${isStyleX ? "size: 'lg'," : "class: 'size-10',"}
                  children: [
                    Avatar.avatarImage({ src: 'https://github.com/evilrabbit.png', alt: 'Evil Rabbit' }, h),
                    Avatar.avatarFallback({ children: ['ER'] }, h),
                  ],
                }, h),
              ],
            }, h),
            Item.itemContent({
              children: [
                Item.itemTitle({ children: ['Evil Rabbit'] }, h),
                Item.itemDescription({ children: ['Last seen 5 months ago'] }, h),
              ],
            }, h),
            Item.itemActions({
              children: [
                Button.button({
                  variant: 'outline',
                  size: 'icon-sm',
                  ${isStyleX ? '' : "class: 'rounded-full',"}
                  ariaLabel: 'Invite',
                  children: [${icon('plus')}],
                }, h),
              ],
            }, h),
          ],
        }, h)`
      const team = `Item.item({
          variant: 'outline',
          children: [
            Item.itemMedia({
              children: [
                h.div([h.Class(${cls('flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:grayscale', 'avatarStack')})], [
                  Avatar.avatar({
                    ${isStyleX ? "size: 'sm'," : "class: 'hidden sm:flex',"}
                    children: [
                      Avatar.avatarImage({ src: '/logo-mark.svg', alt: '@creaseui' }, h),
                      Avatar.avatarFallback({ children: ['CU'] }, h),
                    ],
                  }, h),
                  Avatar.avatar({
                    ${isStyleX ? "size: 'sm'," : "class: 'hidden sm:flex',"}
                    children: [
                      Avatar.avatarImage({ src: 'https://github.com/maxleiter.png', alt: '@maxleiter' }, h),
                      Avatar.avatarFallback({ children: ['LR'] }, h),
                    ],
                  }, h),
                  Avatar.avatar({
                    ${isStyleX ? "size: 'sm'," : ''}
                    children: [
                      Avatar.avatarImage({ src: 'https://github.com/evilrabbit.png', alt: '@evilrabbit' }, h),
                      Avatar.avatarFallback({ children: ['ER'] }, h),
                    ],
                  }, h),
                ]),
              ],
            }, h),
            Item.itemContent({
              children: [
                Item.itemTitle({ children: ['No Team Members'] }, h),
                Item.itemDescription({ children: ['Invite your team to collaborate on this project.'] }, h),
              ],
            }, h),
            Item.itemActions({
              children: [
                Button.button({ variant: 'outline', size: 'sm', children: ['Invite'] }, h),
              ],
            }, h),
          ],
        }, h)`
      return `    h.div([h.Class(${cls('flex w-full max-w-lg flex-col gap-6', 'stack')})], [
      ${single},
      ${team},
    ])`
    }
    case 'image':
      return `    h.div([h.Class(${cls('flex w-full max-w-md flex-col gap-6', 'stack')})], [
      Item.itemGroup({
        ${isStyleX ? "spacing: 'md'," : "class: 'gap-4',"}
        children: music.map(song =>
          Item.item({
            variant: 'outline',
            element: 'a',
            href: '#',
            children: [
              Item.itemMedia({
                variant: 'image',
                children: [
                  h.img([
                    h.Src(\`https://avatar.vercel.sh/\${song.title}\`),
                    h.Alt(song.title),
                    ${isStyleX ? "h.Class(stylex.props(styles.cover).className ?? '')," : "h.Class('object-cover grayscale'),"}
                  ]),
                ],
              }, h),
              Item.itemContent({
                children: [
                  Item.itemTitle({
                    ${isStyleX ? '' : "class: 'line-clamp-1',"}
                    children: [
                      ${
                        isStyleX
                          ? `h.span([h.Class(stylex.props(styles.songTitle).className ?? '')], [
                        \`\${song.title} - \`,
                        h.span([h.Class(stylex.props(styles.muted).className ?? '')], [song.album]),
                      ]),`
                          : `\`\${song.title} - \`,
                      h.span([h.Class('text-muted-foreground')], [song.album]),`
                      }
                    ],
                  }, h),
                  Item.itemDescription({ children: [song.artist] }, h),
                ],
              }, h),
              Item.itemContent({
                ${isStyleX ? 'layoutStyle: layoutStyle({ flexGrow: 0, flexShrink: 0 }),' : "class: 'flex-none text-center',"}
                children: [
                  Item.itemDescription({ children: [song.duration] }, h),
                ],
              }, h),
            ],
          }, h),
        ),
      }, h),
    ])`
    case 'group':
      return `    Item.itemGroup({
      ${isStyleX ? 'layoutStyle: layoutStyle({ maxWidth: "24rem" }),' : "class: 'max-w-sm',"}
      children: people.map(person =>
        ${personItem(personAvatar, isStyleX ? '' : '', plusAction)}
      ),
    }, h)`
    case 'header':
      return `    h.div([h.Class(${cls('flex w-full max-w-xl flex-col gap-6', 'stack')})], [
      Item.itemGroup({
        ${isStyleX ? "columns: 3,\n        spacing: 'md'," : "class: 'grid grid-cols-3 gap-4',"}
        children: models.map(model =>
          Item.item({
            variant: 'outline',
            children: [
              Item.itemHeader({
                children: [
                  h.img([
                    h.Src(model.image),
                    h.Alt(model.name),
                    ${isStyleX ? "h.Class(stylex.props(styles.headerImg).className ?? '')," : "h.Class('aspect-square w-full rounded-sm object-cover'),"}
                  ]),
                ],
              }, h),
              Item.itemContent({
                children: [
                  Item.itemTitle({ children: [model.name] }, h),
                  Item.itemDescription({ children: [model.description] }, h),
                ],
              }, h),
            ],
          }, h),
        ),
      }, h),
    ])`
    case 'link':
      return `    h.div([h.Class(${cls('flex w-full max-w-md flex-col gap-4', 'stack')})], [
      Item.item({
        element: 'a',
        href: '#',
        children: [
          Item.itemContent({
            children: [
              Item.itemTitle({ children: ['Visit our documentation'] }, h),
              Item.itemDescription({ children: ['Learn how to get started with our components.'] }, h),
            ],
          }, h),
          Item.itemActions({
            children: [${icon('chevron-right', isStyleX ? '' : " class: 'size-4'")}],
          }, h),
        ],
      }, h),
      Item.item({
        variant: 'outline',
        element: 'a',
        href: '#',
        target: '_blank',
        rel: 'noopener noreferrer',
        children: [
          Item.itemContent({
            children: [
              Item.itemTitle({ children: ['External resource'] }, h),
              Item.itemDescription({ children: ['Opens in a new tab with security attributes.'] }, h),
            ],
          }, h),
          Item.itemActions({
            children: [${icon('external-link', isStyleX ? '' : " class: 'size-4'")}],
          }, h),
        ],
      }, h),
    ])`
    case 'dropdown': {
      const menuItem = `Item.item({
              size: 'xs',
              ${isStyleX ? 'layoutStyle: layoutStyle({ width: "100%" }),' : "class: 'w-full p-2',"}
              children: [
                Item.itemMedia({
                  children: [
                    Avatar.avatar({
                      ${isStyleX ? "size: 'sm'," : "class: 'size-6.5 grayscale',"}
                      children: [
                        Avatar.avatarImage({ src: person.avatar, alt: \`@\${person.username}\` }, h),
                        Avatar.avatarFallback({ children: [person.username.charAt(0)] }, h),
                      ],
                    }, h),
                  ],
                }, h),
                Item.itemContent({
                  children: [
                    Item.itemTitle({ children: [person.username] }, h),
                    Item.itemDescription({
                      ${isStyleX ? '' : "class: 'leading-none',"}
                      children: [person.email],
                    }, h),
                  ],
                }, h),
              ],
            }, h)`
      const trigger = isStyleX
        ? `trigger: h.span([], ['Select', ${icon('chevron-down')}]),
                  triggerButtonVariant: 'outline',`
        : `trigger: h.span([h.Class('flex items-center gap-2')], ['Select', ${icon('chevron-down', " class: 'size-4'")}]),
                  triggerClass: buttonVariants({ variant: 'outline' }),`
      return `    DropdownMenu.dropdownMenu({
      model: model.dropdown,
      toParentMessage: message => Message.GotDropdownMessage({ message }),
      ${trigger}
      ariaLabel: 'Select a person',
      align: 'end',
      items: people.map(person => person.username),
      itemToConfig: username => {
        const person = people.find(candidate => candidate.username === username) ?? people[0]!
        return {
          label: ${menuItem},
        }
      },
    }, h)`
    }
    default:
      return `    h.div([], [])`
  }
}

const emitApplication = (fixture: ItemFixture, isStyleX: boolean): string => {
  const stylesBlock = isStyleX
    ? `const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '1rem' },
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  ${fixture.kind === 'avatar' ? "avatarStack: { display: 'flex', gap: '-0.5rem' }," : ''}
${emitStyles(fixture)}
})

`
    : ''
  const bodyStart = isStyleX
    ? `h.main([h.Class(stylex.props(styles.page).className ?? '')], [`
    : `h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-4'"})], [`
  return foldkitApplication({
    title: `Item — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'\n${emitImports(fixture, isStyleX)}\n\n${stylesBlock}${emitData(fixture)}`,
    model: emitModel(fixture),
    messages: emitMessages(fixture),
    init: emitInit(fixture),
    update: emitUpdate(fixture),
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Item — ${sq(fixture.title)}',
  body: ${bodyStart}
    ${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const itemExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  itemFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer !== 'tailwind'),
  }))

export const itemExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, itemExamplesFor(renderer))
