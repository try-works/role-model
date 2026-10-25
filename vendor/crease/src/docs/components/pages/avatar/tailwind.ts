import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  avatarFixtures,
  type AvatarClusterSpec,
  type AvatarFixture,
  type AvatarItemSpec,
} from '@/docs/components/pages/avatar/shared'
import * as Avatar from '@/ui/avatar'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Icon from '@/lib/icon'

const PreviewMessage = defineMessageUnion({
  GotAvatarMessage: { key: S.String, message: Avatar.Message },
  GotMenuMessage: { message: DropdownMenu.Message },
})
type PreviewMessage = typeof PreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('avatar'),
  avatars: S.Record(S.String, Avatar.Model),
  menu: DropdownMenu.Model,
})
type PreviewModel = typeof PreviewModel.Type

const avatarModel = (model: PreviewModel, key: string): Avatar.Model =>
  model.avatars[key] ?? Avatar.init()

const badgeView = (
  item: AvatarItemSpec,
  h: HtmlBuilder<PreviewMessage>,
): Html | undefined => {
  if (item.badge === 'green')
    return Avatar.avatarBadge({ class: 'bg-green-600 dark:bg-green-800' }, h)
  if (item.badge === 'icon')
    return Avatar.avatarBadge({ children: [Icon.icon('plus', {}, h)] }, h)
  return undefined
}

const itemView = (
  model: PreviewModel,
  item: AvatarItemSpec,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const badge = badgeView(item, h)
  return Avatar.avatar(
    {
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.grayscale === 'avatar' ? { class: 'grayscale' } : {}),
      children: [
        Avatar.avatarImage(
          {
            src: item.src,
            alt: item.alt,
            ...(item.grayscale === 'image' ? { class: 'grayscale' } : {}),
            model: avatarModel(model, item.key),
            toParentMessage: message =>
              PreviewMessage.GotAvatarMessage({ key: item.key, message }),
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

const clusterView = (
  model: PreviewModel,
  fixture: AvatarFixture,
  cluster: AvatarClusterSpec,
  h: HtmlBuilder<PreviewMessage>,
): ReadonlyArray<Html> => {
  if (cluster.grouped === true) {
    const count: Html | undefined =
      cluster.count !== undefined
        ? Avatar.avatarGroupCount({ children: [cluster.count] }, h)
        : cluster.countIcon === true
          ? Avatar.avatarGroupCount({ children: [Icon.icon('plus', {}, h)] }, h)
          : undefined
    return [
      Avatar.avatarGroup(
        {
          ...(cluster.grayscale === true ? { class: 'grayscale' } : {}),
          children: [
            ...cluster.items.map(item => itemView(model, item, h)),
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
            PreviewMessage.GotMenuMessage({ message }),
          trigger: Avatar.avatar(
            {
              children: [
                Avatar.avatarImage(
                  {
                    src: item.src,
                    alt: item.alt,
                    model: avatarModel(model, item.key),
                    toParentMessage: message =>
                      PreviewMessage.GotAvatarMessage({
                        key: item.key,
                        message,
                      }),
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
          triggerClass: 'rounded-full',
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
  return cluster.items.map(entry => itemView(model, entry, h))
}

const fixtureView = (
  fixture: AvatarFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const clusters = fixture.clusters.flatMap(cluster =>
    clusterView(model, fixture, cluster, h),
  )
  if (fixture.frame === 'plain') return clusters[0] ?? h.empty
  const frameClass =
    fixture.frame === 'sizesRow'
      ? 'flex flex-wrap items-center gap-2 grayscale'
      : 'flex flex-row flex-wrap items-center gap-6 md:gap-12'
  return h.div(
    [h.Class(frameClass), ...(fixture.rtl === true ? [h.Dir('rtl')] : [])],
    clusters,
  )
}

export const avatarTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => ({
    _docsPage: 'avatar',
    avatars: {},
    menu: DropdownMenu.init({
      id: `docs-avatar-${String(index)}`,
      isAnimated: false,
    }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotAvatarMessage': {
        const current = model.avatars[message.key] ?? Avatar.init()
        return {
          model: {
            ...model,
            avatars: {
              ...model.avatars,
              [message.key]: Avatar.update(current, message.message),
            },
          },
        }
      }
      case 'GotMenuMessage': {
        const result = DropdownMenu.update(model.menu, message.message)
        return {
          model: { ...model, menu: result.model },
          commands: Command.mapMessages(result.commands, next =>
            PreviewMessage.GotMenuMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    fixtureView(avatarFixtures[index] ?? avatarFixtures[0], model, h),
})
