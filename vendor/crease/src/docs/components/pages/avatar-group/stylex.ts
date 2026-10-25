import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import {
  avatarGroupFixtures,
  type AvatarEntry,
  type AvatarGroupSection,
} from '@/docs/components/pages/avatar-group/shared'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'
import * as Avatar from '@/stylex/avatar'
import * as AvatarGroup from '@/stylex/avatar-group'

const styles = stylex.create({
  column: { gap: '2rem', display: 'flex', flexDirection: 'column' },
  section: { gap: '0.375rem', display: 'flex', flexDirection: 'column' },
  caption: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  row: { gap: '1rem', alignItems: 'center', display: 'flex' },
  avatarWrap: { position: 'relative' },
  dotSlot: { insetInlineEnd: '-4px', position: 'absolute', bottom: '-4px' },
  /* Member-avatar negative margins mirror the group's --avatar-group-overlap
     (25% of 24/32/40px) — StyleX cannot read the custom property. The
     box-content + 2px surface border mirrors the group's
     [&_[data-slot=avatar]]:box-content/:border-2/:border-background selector. */
  memberSm: {
    borderColor: tokens.background,
    borderStyle: 'solid',
    borderWidth: '2px',
    boxSizing: 'content-box',
    marginInlineStart: '-0.375rem',
  },
  memberDefault: {
    borderColor: tokens.background,
    borderStyle: 'solid',
    borderWidth: '2px',
    boxSizing: 'content-box',
    marginInlineStart: '-0.5rem',
  },
  memberLg: {
    borderColor: tokens.background,
    borderStyle: 'solid',
    borderWidth: '2px',
    boxSizing: 'content-box',
    marginInlineStart: '-0.625rem',
  },
})

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
      layoutStyle: (size === 'lg'
        ? styles.memberLg
        : size === 'sm'
          ? styles.memberSm
          : styles.memberDefault) as ComponentLayoutStyle,
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
    [h.Class(className(styles.section))],
    [
      h.span([h.Class(className(styles.caption))], [section.label]),
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
    [h.Class(className(styles.row))],
    (avatarGroupFixtures[3]?.statusDots ?? []).map(dot =>
      h.div(
        [h.Class(className(styles.avatarWrap))],
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
            [h.Class(className(styles.dotSlot))],
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

export const avatarGroupStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = avatarGroupFixtures[exampleIndex] ?? avatarGroupFixtures[0]
  const noop = onMessageJson(
    JSON.stringify({ _tag: 'InteractedWithAvatarGroupPreview' }),
  )
  return fixture.kind === 'status'
    ? statusSectionView(h)
    : h.div(
        [h.Class(className(styles.column))],
        fixture.sections.map(section => sectionView(section, noop, h)),
      )
}
