import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  avatarGroupFixtures,
  type AvatarEntry,
  type AvatarGroupSection,
} from '@/docs/components/pages/avatar-group/shared'
import * as Avatar from '@/ui/avatar'
import * as AvatarGroup from '@/ui/avatar-group'

const InteractedWithAvatarGroupPreview = defineMessageUnion({
  InteractedWithAvatarGroupPreview: {},
})
type InteractedWithAvatarGroupPreview =
  typeof InteractedWithAvatarGroupPreview.Type
const AvatarGroupPreviewModel = S.Struct({
  _docsPage: S.Literal('avatar-group'),
})
type AvatarGroupPreviewModel = typeof AvatarGroupPreviewModel.Type

const NO_OP =
  InteractedWithAvatarGroupPreview.InteractedWithAvatarGroupPreview()

const initials = (name: string): string =>
  name
    .split(' ')
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 2)

const avatarView = <Msg>(
  entry: AvatarEntry,
  size: AvatarGroupSection['size'],
  h: HtmlBuilder<Msg>,
) =>
  Avatar.avatar(
    {
      size,
      children: [
        entry.src === undefined
          ? Avatar.avatarFallback({ children: [initials(entry.name)] }, h)
          : Avatar.avatarImage(
              { src: entry.src, alt: entry.name, model: { status: 'loaded' } },
              h,
            ),
      ],
    },
    h,
  )

const sectionView = <Msg>(
  section: AvatarGroupSection,
  noop: Msg,
  h: HtmlBuilder<Msg>,
) =>
  h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.span([h.Class('text-xs text-muted-foreground')], [section.label]),
      AvatarGroup.avatarGroup(
        {
          avatarSize: section.size === 'default' ? 'md' : section.size,
          ...(section.ariaLabel === undefined
            ? {}
            : { ariaLabel: section.ariaLabel }),
          children: [
            ...section.avatars.map(entry => avatarView(entry, section.size, h)),
            ...(section.overflow === undefined
              ? []
              : [
                  AvatarGroup.avatarGroupOverflow(
                    {
                      avatarSize:
                        section.size === 'default' ? 'md' : section.size,
                      count: section.overflow.count,
                      ...(section.overflow.onClick === true
                        ? { onClick: noop }
                        : {}),
                    },
                    h,
                  ),
                ]),
          ],
        },
        h,
      ),
    ],
  )

const statusSectionView = <Msg>(h: HtmlBuilder<Msg>) =>
  h.div(
    [h.Class('flex items-center gap-4')],
    (avatarGroupFixtures[3]?.statusDots ?? []).map(dot =>
      h.div(
        [h.Class('relative')],
        [
          Avatar.avatar(
            {
              size: 'lg',
              children: [
                Avatar.avatarFallback({ children: [initials(dot.name)] }, h),
              ],
            },
            h,
          ),
          h.div(
            [h.Class('absolute -bottom-1 -end-1')],
            [
              AvatarGroup.avatarStatusDot(
                { variant: dot.variant, label: dot.label, avatarSize: 'lg' },
                h,
              ),
            ],
          ),
        ],
      ),
    ),
  )

export const avatarGroupTailwindPreviewProgram = definePreviewProgram<
  AvatarGroupPreviewModel,
  InteractedWithAvatarGroupPreview
>({
  Model: AvatarGroupPreviewModel,
  Message: InteractedWithAvatarGroupPreview,
  init: () => ({ _docsPage: 'avatar-group' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = avatarGroupFixtures[index] ?? avatarGroupFixtures[0]
    const noop = NO_OP as never
    return fixture.kind === 'status'
      ? statusSectionView(h)
      : h.div(
          [h.Class('flex flex-col gap-8')],
          fixture.sections.map(section => sectionView(section, noop, h)),
        )
  },
})
