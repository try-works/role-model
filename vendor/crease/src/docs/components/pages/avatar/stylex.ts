import type { Html, HtmlBuilder } from 'foldkit/html'

import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  avatarFixtures,
  type AvatarClusterSpec,
  type AvatarFixture,
  type AvatarItemSpec,
} from '@/docs/components/pages/avatar/shared'
import * as Icon from '@/lib/icon'
import * as Avatar from '@/stylex/avatar'
import * as DropdownMenu from '@/stylex/dropdown-menu'
import { className } from '@/stylex/style'

const styles = stylex.create({
  hero: {
    gap: {
      default: '1.5rem',
      '@media (min-width: 768px)': '3rem',
    },
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizesRow: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    filter: 'grayscale(100%)',
    flexWrap: 'wrap',
  },
  badgeIcon: { height: '0.5rem', width: '0.5rem' },
  countIcon: { height: '1rem', width: '1rem' },
})

type PreviewSnapshot = {
  avatars: Readonly<Record<string, Avatar.Model>>
  menu: DropdownMenu.Model
}

const avatarModel = (model: PreviewSnapshot, key: string): Avatar.Model =>
  model.avatars[key] ?? Avatar.init()

const itemView = <Msg>(
  model: PreviewSnapshot,
  item: AvatarItemSpec,
  index: number,
  overlap: boolean,
  ring: boolean,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const badge: Html | undefined =
    item.badge === 'green'
      ? Avatar.avatarBadge({ tone: 'success' }, h)
      : item.badge === 'icon'
        ? Avatar.avatarBadge(
            {
              children: [
                Icon.icon('plus', { class: className(styles.badgeIcon) }, h),
              ],
            },
            h,
          )
        : undefined
  return Avatar.avatar(
    {
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.grayscale === 'avatar' ? { grayscale: true } : {}),
      ...(ring ? { ring: true } : {}),
      ...(overlap ? { overlap: true } : {}),
      children: [
        Avatar.avatarImage(
          {
            src: item.src,
            alt: item.alt,
            ...(item.grayscale === 'image' ? { grayscale: true } : {}),
            model: avatarModel(model, item.key),
            toParentMessage: message =>
              onMessageJson(
                JSON.stringify({
                  _tag: 'GotAvatarMessage',
                  key: item.key,
                  message,
                }),
              ),
          },
          h,
        ),
        Avatar.avatarFallback(
          {
            model: avatarModel(model, item.key),
            children: [item.fallback],
          },
          h,
        ),
        ...(badge === undefined ? [] : [badge]),
      ],
    },
    h,
  )
}

const clusterView = <Msg>(
  model: PreviewSnapshot,
  fixture: AvatarFixture,
  cluster: AvatarClusterSpec,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html> => {
  if (cluster.grouped === true) {
    const count: Html | undefined =
      cluster.count !== undefined
        ? Avatar.avatarGroupCount({ children: [cluster.count] }, h)
        : cluster.countIcon === true
          ? Avatar.avatarGroupCount(
              {
                children: [
                  Icon.icon('plus', { class: className(styles.countIcon) }, h),
                ],
              },
              h,
            )
          : undefined
    return [
      Avatar.avatarGroup(
        {
          ...(cluster.grayscale === true ? { grayscale: true } : {}),
          children: [
            ...cluster.items.map((item, index) =>
              itemView(
                model,
                item,
                index,
                index < cluster.items.length - 1 || count !== undefined,
                true,
                onMessageJson,
                h,
              ),
            ),
            ...(count === undefined ? [] : [count]),
          ],
        },
        h,
      ),
    ]
  }
  const item = cluster.items[0]
  if (item === undefined) return []
  if (fixture.menuItems !== undefined) {
    return [
      DropdownMenu.dropdownMenu(
        {
          model: model.menu,
          toParentMessage: message =>
            onMessageJson(JSON.stringify({ _tag: 'GotMenuMessage', message })),
          trigger: Avatar.avatar(
            {
              children: [
                Avatar.avatarImage(
                  {
                    src: item.src,
                    alt: item.alt,
                    model: avatarModel(model, item.key),
                    toParentMessage: message =>
                      onMessageJson(
                        JSON.stringify({
                          _tag: 'GotAvatarMessage',
                          key: item.key,
                          message,
                        }),
                      ),
                  },
                  h,
                ),
                Avatar.avatarFallback(
                  {
                    model: avatarModel(model, item.key),
                    children: [item.fallback],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          triggerButtonVariant: 'ghost',
          triggerButtonSize: 'icon-sm',
          triggerButtonRounded: true,
          items: fixture.menuItems.map(entry => entry.label),
          itemToConfig: item =>
            fixture.menuItems?.find(entry => entry.label === item)
              ?.destructive === true
              ? {
                  label: item,
                  group: 'account',
                  separatorBefore: true,
                  variant: 'destructive' as const,
                }
              : { label: item, group: 'main' },
        },
        h,
      ),
    ]
  }
  return cluster.items.map((entry, index) =>
    itemView(model, entry, index, false, false, onMessageJson, h),
  )
}

export const avatarStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = avatarFixtures[exampleIndex] ?? avatarFixtures[0]
  const previewModel = model as PreviewSnapshot
  const clusters = fixture.clusters.flatMap(cluster =>
    clusterView(previewModel, fixture, cluster, onMessageJson, h),
  )
  if (fixture.frame === 'plain') return clusters[0] ?? h.empty
  return h.div(
    [
      h.Class(
        className(fixture.frame === 'sizesRow' ? styles.sizesRow : styles.hero),
      ),
      ...(fixture.rtl === true ? [h.Dir('rtl')] : []),
    ],
    clusters,
  )
}
