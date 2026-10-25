import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  listFixtures,
  type ListFixture,
  type ListItemSpec,
} from '@/docs/components/pages/list/shared'
import * as Avatar from '@/ui/avatar'
import * as Badge from '@/ui/badge'
import * as List from '@/ui/list'

const InteractedWithListPreview = defineMessageUnion({
  InteractedWithListPreview: {},
})
type InteractedWithListPreview = typeof InteractedWithListPreview.Type
const ListPreviewModel = S.Struct({ _docsPage: S.Literal('list') })
type ListPreviewModel = typeof ListPreviewModel.Type

const item = (
  spec: ListItemSpec,
  fixture: ListFixture,
  h: HtmlBuilder<InteractedWithListPreview>,
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
            onClick: InteractedWithListPreview['InteractedWithListPreview'](),
          }),
      ...(spec.badge === undefined
        ? {}
        : { endContent: Badge.badge({ children: [spec.badge] }, h) }),
    },
    h,
  )

const renderFixture = (
  fixture: ListFixture,
  h: HtmlBuilder<InteractedWithListPreview>,
): Html =>
  List.list(
    {
      children: fixture.items.map(spec => item(spec, fixture, h)),
      ...(fixture.listStyle === undefined
        ? {}
        : { listStyle: fixture.listStyle }),
      ...(fixture.hasDividers === true ? { hasDividers: true } : {}),
    },
    h,
  )

export const listTailwindPreviewProgram = definePreviewProgram<
  ListPreviewModel,
  InteractedWithListPreview
>({
  Model: ListPreviewModel,
  Message: InteractedWithListPreview,
  init: () => ({ _docsPage: 'list' }),
  update: model => ({ model: model }),
  view: (index, _model, h) =>
    renderFixture(listFixtures[index] ?? listFixtures[0], h),
})
