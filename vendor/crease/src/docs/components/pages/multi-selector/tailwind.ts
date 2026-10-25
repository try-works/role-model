import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  ALL_COLUMNS,
  COLUMNS,
  COUNTRIES,
  PERMISSIONS,
  STATUSES,
  TEAMS,
  multiSelectorFixtures,
} from '@/docs/components/pages/multi-selector/shared'
import * as MultiSelector from '@/ui/multi-selector'

const PreviewMessages = defineMessageUnion({
  GotMultiSelectorMessage: {
    slot: S.Number,
    message: MultiSelector.Message,
  },
})
type PreviewMessage = typeof PreviewMessages.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('multi-selector'),
  selectors: S.Array(MultiSelector.Model),
})
type PreviewModel = typeof PreviewModel.Type

const initFixture = (
  index: number,
  fixture: (typeof multiSelectorFixtures)[number],
): ReadonlyArray<MultiSelector.Model> => {
  const id = (slot: number) =>
    `docs-multi-selector-${String(index)}-${String(slot)}`
  const withOptions = (
    slot: number,
    values: ReadonlyArray<string>,
    optionValues: ReadonlyArray<string>,
  ) => MultiSelector.init({ id: id(slot), values, optionValues })
  switch (fixture.kind) {
    case 'columns':
      return [
        withOptions(
          0,
          ['name', 'email', 'role', 'status'],
          ALL_COLUMNS.map(o => o.value),
        ),
      ]
    case 'form':
      return [
        withOptions(
          0,
          ['name', 'email'],
          ALL_COLUMNS.slice(0, 5).map(o => o.value),
        ),
        withOptions(
          1,
          [],
          STATUSES.map(o => o.value),
        ),
      ]
    case 'ghostToolbar':
      return [
        withOptions(
          0,
          ['name', 'email'],
          COLUMNS.map(o => o.value),
        ),
        withOptions(
          1,
          ['active'],
          STATUSES.map(o => o.value),
        ),
      ]
    case 'searchable':
      return [
        withOptions(
          0,
          [],
          COUNTRIES.map(o => o.value),
        ),
      ]
    case 'sectioned':
      return [
        withOptions(
          0,
          [],
          PERMISSIONS.flatMap(s => s.options.map(o => o.value)),
        ),
      ]
    case 'bottomSheet':
      return [
        withOptions(
          0,
          [],
          TEAMS.map(o => o.value),
        ),
      ]
    default:
      return [
        withOptions(
          0,
          [],
          COLUMNS.map(o => o.value),
        ),
      ]
  }
}

export const multiSelectorTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: index => {
    const fixture = multiSelectorFixtures[index] ?? multiSelectorFixtures[0]!
    return {
      _docsPage: 'multi-selector',
      selectors: [...initFixture(index, fixture)],
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotMultiSelectorMessage': {
        const target = model.selectors[message.slot]
        if (target === undefined) return { model }
        const next = MultiSelector.update(target, message.message)
        const selectors = model.selectors.map((entry, i) =>
          i === message.slot ? next.model : entry,
        )
        return {
          model: { ...model, selectors },
          commands: Command.mapMessages(next.commands ?? [], m =>
            PreviewMessages.GotMultiSelectorMessage({
              slot: message.slot,
              message: m,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = multiSelectorFixtures[index] ?? multiSelectorFixtures[0]!
    const selectorAt = (
      slot: number,
      props: Omit<
        MultiSelector.MultiSelectorProps<PreviewMessage>,
        'model' | 'toParentMessage' | 'options'
      >,
      options: MultiSelector.MultiSelectorProps<PreviewMessage>['options'],
    ): Html =>
      MultiSelector.multiSelector(
        {
          model: model.selectors[slot]!,
          toParentMessage: message =>
            PreviewMessages.GotMultiSelectorMessage({ slot, message }),
          options,
          ...props,
        },
        h,
      )
    const stack = (children: ReadonlyArray<Html>): Html =>
      h.div([h.Class('grid w-full max-w-75 min-w-60 gap-4')], [...children])
    switch (fixture.kind) {
      case 'showcase':
        return stack([
          selectorAt(
            0,
            { label: 'Columns', placeholder: 'Select columns...' },
            [...COLUMNS],
          ),
        ])
      case 'searchable':
        return stack([
          selectorAt(
            0,
            {
              label: 'Countries',
              placeholder: 'Select countries...',
              hasSearch: true,
              hasSelectAll: true,
            },
            [...COUNTRIES],
          ),
        ])
      case 'sectioned':
        return stack([
          selectorAt(
            0,
            { label: 'Permissions', placeholder: 'Select permissions...' },
            [...PERMISSIONS],
          ),
        ])
      case 'columns':
        return stack([
          selectorAt(
            0,
            {
              label: 'Columns',
              isLabelHidden: true,
              hasSelectAll: true,
              hasSearch: true,
              triggerDisplay: 'count',
              placeholder: 'Columns',
            },
            [...ALL_COLUMNS],
          ),
        ])
      case 'form':
        return stack([
          selectorAt(
            0,
            {
              label: 'Visible columns',
              description: 'Choose which columns to display in the table',
              hasSelectAll: true,
              isRequired: true,
              triggerDisplay: 'labels',
            },
            [...ALL_COLUMNS.slice(0, 5)],
          ),
          selectorAt(
            1,
            {
              label: 'Status filter',
              description: 'Filter by status',
              isOptional: true,
              triggerDisplay: 'badges',
              placeholder: 'All statuses',
            },
            [...STATUSES],
          ),
        ])
      case 'ghostToolbar':
        return h.div(
          [h.Class('flex items-center gap-2')],
          [
            h.button(
              [
                h.Type('button'),
                h.Class(
                  'rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent',
                ),
              ],
              ['Refresh'],
            ),
            selectorAt(
              0,
              {
                label: 'Columns',
                isLabelHidden: true,
                variant: 'ghost',
                triggerDisplay: 'labels',
                placeholder: 'Columns',
              },
              [...COLUMNS],
            ),
            selectorAt(
              1,
              {
                label: 'Status',
                isLabelHidden: true,
                variant: 'ghost',
                triggerDisplay: 'labels',
                placeholder: 'Status',
                status: {
                  type: 'warning',
                  message: 'Some filters hide archived rows',
                },
                statusVariant: 'tooltip',
              },
              [...STATUSES],
            ),
            h.button(
              [
                h.Type('button'),
                h.Class(
                  'rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent',
                ),
              ],
              ['Export'],
            ),
          ],
        )
      case 'bottomSheet':
        return stack([
          selectorAt(
            0,
            {
              label: 'Teams',
              hasSelectAll: true,
              presentation: 'bottom-sheet',
              placeholder: 'Choose teams',
            },
            [...TEAMS],
          ),
        ])
      default:
        return stack([])
    }
  },
})
