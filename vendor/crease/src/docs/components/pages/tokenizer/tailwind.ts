import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  SKILLS,
  TAGS,
  USERS,
  tokenizerFixtures,
} from '@/docs/components/pages/tokenizer/shared'
import * as Tokenizer from '@/ui/tokenizer'

const PreviewMessages = defineMessageUnion({
  GotTokenizerMessage: { slot: S.Number, message: Tokenizer.Message },
})
type PreviewMessage = typeof PreviewMessages.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('tokenizer'),
  tokenizers: S.Array(Tokenizer.Model),
})
type PreviewModel = typeof PreviewModel.Type

const STATE_FIELDS = [
  { label: 'Disabled field', isDisabled: true, seed: [0, 2] },
  {
    label: 'Error message',
    status: { type: 'error', message: 'At least one reviewer is required' },
    seed: [],
  },
  {
    label: 'Warning message',
    status: {
      type: 'warning',
      message: 'Consider adding at least 2 approvers',
    },
    seed: [0],
  },
  {
    label: 'Success message',
    status: { type: 'success', message: 'All required reviewers added' },
    seed: [1, 3],
  },
] as const

const initFixture = (
  index: number,
  fixture: (typeof tokenizerFixtures)[number],
): ReadonlyArray<Tokenizer.Model> => {
  const id = (slot: number) => `docs-tokenizer-${String(index)}-${String(slot)}`
  switch (fixture.kind) {
    case 'showcase':
      return [Tokenizer.init({ id: id(0), tokens: [...TAGS] })]
    case 'clear':
      return [
        Tokenizer.init({
          id: id(0),
          tokens: [USERS[0]!, USERS[1]!],
          items: [...USERS],
        }),
      ]
    case 'icon':
    case 'endContent':
      return [
        Tokenizer.init({
          id: id(0),
          tokens: [USERS[0]!, USERS[2]!],
          items: [...USERS],
        }),
      ]
    case 'creatable':
      return [
        Tokenizer.init({ id: id(0) }),
        Tokenizer.init({ id: id(1), items: [...USERS] }),
      ]
    case 'maxEntries':
      return [
        Tokenizer.init({
          id: id(0),
          tokens: [SKILLS[0]!, SKILLS[1]!],
          items: [...SKILLS],
          maxEntries: 3,
        }),
      ]
    case 'overflow':
      return [
        Tokenizer.init({ id: id(0), tokens: [...USERS], items: [...USERS] }),
        Tokenizer.init({ id: id(1), tokens: [...USERS], items: [...USERS] }),
      ]
    case 'states':
      return STATE_FIELDS.map((field, i) =>
        Tokenizer.init({
          id: id(i),
          tokens: field.seed.map(n => USERS[n]!),
          items: [...USERS],
        }),
      )
    default:
      return [Tokenizer.init({ id: id(0), items: [...USERS] })]
  }
}

const supporting = (text: string, h: HtmlBuilder<PreviewMessage>): Html =>
  h.p([h.Class('text-muted-foreground text-sm')], [text])

export const tokenizerTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: index => {
    const fixture = tokenizerFixtures[index] ?? tokenizerFixtures[0]!
    return {
      _docsPage: 'tokenizer',
      tokenizers: [...initFixture(index, fixture)],
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotTokenizerMessage': {
        const target = model.tokenizers[message.slot]
        if (target === undefined) return { model }
        const next = Tokenizer.update(target, message.message)
        const tokenizers = model.tokenizers.map((entry, i) =>
          i === message.slot ? next.model : entry,
        )
        return {
          model: { ...model, tokenizers },
          commands: Command.mapMessages(next.commands ?? [], m =>
            PreviewMessages.GotTokenizerMessage({
              slot: message.slot,
              message: m,
            }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = tokenizerFixtures[index] ?? tokenizerFixtures[0]!
    const tokenizerAt = (
      slot: number,
      props: Omit<
        Tokenizer.TokenizerProps<PreviewMessage>,
        'model' | 'toParentMessage'
      >,
    ): Html =>
      Tokenizer.tokenizer(
        {
          model: model.tokenizers[slot]!,
          toParentMessage: message =>
            PreviewMessages.GotTokenizerMessage({ slot, message }),
          ...props,
        },
        h,
      )
    const stack = (children: ReadonlyArray<Html>): Html =>
      h.div(
        [h.Class('grid w-full max-w-100 min-w-0 grid-cols-1 gap-4')],
        [...children],
      )
    switch (fixture.kind) {
      case 'showcase':
        return stack([
          tokenizerAt(0, {
            label: 'Tags',
            placeholder: 'Search...',
            items: [],
            width: 400,
          }),
        ])
      case 'clear':
        return stack([
          supporting('Clear-all button appears when tokens are selected', h),
          tokenizerAt(0, {
            label: 'Team Members',
            placeholder: 'Search people...',
            items: [...USERS],
            hasClear: true,
            width: 400,
          }),
        ])
      case 'creatable':
        return stack([
          supporting('Free-text only', h),
          tokenizerAt(0, {
            label: 'Tags',
            placeholder: 'Type a tag and press Enter...',
            items: [],
            hasCreate: true,
            width: 400,
          }),
          supporting('Create or search', h),
          tokenizerAt(1, {
            label: 'Team Members',
            placeholder: 'Search or type a new name...',
            items: [...USERS],
            hasCreate: true,
            hasEntriesOnFocus: true,
            width: 400,
          }),
        ])
      case 'endContent':
        return stack([
          supporting('Action button in the end slot', h),
          tokenizerAt(0, {
            label: 'Team Members',
            placeholder: 'Search people...',
            items: [...USERS],
            endContent: h.button(
              [
                h.Type('button'),
                h.Class(
                  'rounded-md bg-primary px-2 py-1 text-sm font-medium text-primary-foreground',
                ),
              ],
              ['Apply'],
            ),
            width: 400,
          }),
        ])
      case 'icon':
        return stack([
          supporting('Leading icon reinforces the search affordance', h),
          tokenizerAt(0, {
            label: 'Team Members',
            placeholder: 'Search people...',
            items: [...USERS],
            hasStartIcon: true,
            width: 400,
          }),
        ])
      case 'maxEntries':
        return stack([
          supporting(
            `Limited to 3 selections — ${String(3 - (model.tokenizers[0]?.tokens.length ?? 0))} remaining`,
            h,
          ),
          tokenizerAt(0, {
            label: 'Top Skills',
            description: 'Choose up to 3 skills',
            placeholder: 'Search skills...',
            items: [...SKILLS],
            maxEntries: 3,
            width: 400,
          }),
        ])
      case 'overflow':
        return stack([
          supporting('Inline overflow — content shifts down on expand', h),
          tokenizerAt(0, {
            label: 'Inline Overflow',
            placeholder: 'Add more...',
            items: [...USERS],
            tokenOverflowBehavior: 'unfocusedInline',
            width: 400,
          }),
          supporting('Layer overflow — expands as overlay, no layout shift', h),
          tokenizerAt(1, {
            label: 'Layer Overflow',
            placeholder: 'Add more...',
            items: [...USERS],
            tokenOverflowBehavior: 'unfocusedLayer',
            width: 400,
          }),
        ])
      case 'states':
        return stack(
          STATE_FIELDS.map((field, i) =>
            tokenizerAt(i, {
              label: field.label,
              placeholder: 'Search people...',
              items: [...USERS],
              isDisabled: 'isDisabled' in field && field.isDisabled,
              isRequired: i === 1,
              ...('status' in field ? { status: field.status } : {}),
              width: 400,
            }),
          ),
        )
      default:
        return stack([])
    }
  },
})
