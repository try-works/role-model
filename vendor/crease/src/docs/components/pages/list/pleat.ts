import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  listFixtures,
  type ListFixture,
  type ListItemSpec,
} from '@/docs/components/pages/list/shared'
import * as Avatar from '@/pleat/avatar'
import * as Badge from '@/pleat/badge'
import * as List from '@/pleat/list'

const InteractedWithListPreview = defineMessageUnion({
  InteractedWithListPreview: {},
})

const item = <Msg>(
  spec: ListItemSpec,
  fixture: ListFixture,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  List.listItem(
    {
      label: spec.label,
      // listItem is context-free — forward the parent list's shared config.
      ...(fixture.listStyle === undefined
        ? {}
        : { listStyle: fixture.listStyle }),
      ...(fixture.hasDividers === true ? { hasDividers: true } : {}),
      ...(spec.description === undefined
        ? {}
        : { description: spec.description }),
      ...(spec.initials === undefined
        ? {}
        : {
            startContent: Avatar.avatar(
              {
                children: [
                  Avatar.avatarFallback({ children: [spec.initials] }, h),
                ],
              },
              h,
            ),
            onClick: onMessageJson(
              JSON.stringify(
                InteractedWithListPreview['InteractedWithListPreview'](),
              ),
            ),
          }),
      ...(spec.badge === undefined
        ? {}
        : { endContent: Badge.badge({ children: [spec.badge] }, h) }),
    },
    h,
  )

const renderFixture = <Msg>(
  fixture: ListFixture,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  List.list(
    {
      children: fixture.items.map(spec =>
        item(spec, fixture, onMessageJson, h),
      ),
      ...(fixture.listStyle === undefined
        ? {}
        : { listStyle: fixture.listStyle }),
      ...(fixture.hasDividers === true ? { hasDividers: true } : {}),
    },
    h,
  )

export const listPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  renderFixture(listFixtures[exampleIndex] ?? listFixtures[0], onMessageJson, h)
