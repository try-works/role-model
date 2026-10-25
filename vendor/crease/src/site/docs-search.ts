import { Option, Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { authoredPages } from '@/docs/components/pages'
import { LINT_RULE_GROUPS } from '@/docs/lint/rules'
import * as Icon from '@/lib/icon'
import { CommandMenu, Dialog } from '@/site/docs-search-ui'
import { skin } from '@/site/skin'

// Search the same registry that supplies the actual documentation routes.
export const DOC_PAGES = Object.values(authoredPages)
  .map(page => ({
    slug: page.slug,
    title: page.title,
    description: page.definition.description,
  }))
  .concat(
    LINT_RULE_GROUPS.flatMap(group =>
      group.rules.map(rule => ({
        slug: `lint:${rule.id}`,
        title: `${rule.title} (lint)`,
        description: rule.summary,
      })),
    ),
  )
  .sort((left, right) => left.title.localeCompare(right.title, 'en'))

const pagesBySlug = new Map(DOC_PAGES.map(page => [page.slug, page]))
const palette = CommandMenu.create<string>()

export const Model = S.Struct({
  dialog: Dialog.Model,
  command: CommandMenu.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  OpenedSearch: {},
  PressedSearchShortcut: {},
  GotDialogMessage: { message: Dialog.Message },
  GotCommandMessage: { message: CommandMenu.Message },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectedDoc: { slug: S.String },
})
export type OutMessage = typeof OutMessage.Type

const initCommand = (): CommandMenu.Model =>
  CommandMenu.init({ id: 'site-docs-search-command' })
export const init = (): Model => ({
  dialog: Dialog.init({
    id: 'site-docs-search-dialog',
    focusSelector: '[data-slot="command-input"]',
  }),
  command: initCommand(),
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const close = (model: Model): UpdateReturn => {
  const next = Dialog.close(model.dialog)
  return {
    model: { ...model, dialog: next.model },
    commands: Command.mapMessages(next.commands ?? [], message =>
      Message.GotDialogMessage({ message }),
    ),
  }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'OpenedSearch':
    case 'PressedSearchShortcut': {
      if (message._tag === 'PressedSearchShortcut' && model.dialog.isOpen)
        return close(model)
      const next = Dialog.open(model.dialog)
      return {
        model: { dialog: next.model, command: initCommand() },
        commands: Command.mapMessages(next.commands ?? [], message =>
          Message.GotDialogMessage({ message }),
        ),
      }
    }
    case 'GotDialogMessage': {
      const next = Dialog.update(model.dialog, message.message)
      return {
        model: { ...model, dialog: next.model },
        commands: Command.mapMessages(next.commands ?? [], message =>
          Message.GotDialogMessage({ message }),
        ),
      }
    }
    case 'GotCommandMessage': {
      const next = palette.update(model.command, message.message)
      const updated = { ...model, command: next.model }
      if (next.outMessage?._tag === 'Selected') {
        const closed = close(updated)
        return {
          ...closed,
          outMessage: OutMessage.SelectedDoc({ slug: next.outMessage.value }),
        }
      }
      return {
        model: updated,
        commands: Command.mapMessages(next.commands ?? [], message =>
          Message.GotCommandMessage({ message }),
        ),
      }
    }
  }
}

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  docsSearchShortcut: Subscription.persistent(
    Subscription.keyBindings({
      target: () => document,
      bindings: ['Control+K', 'Meta+K'].map(keys => ({
        keys,
        whileTyping: 'Allow' as const,
        mapEvent: () => Message.PressedSearchShortcut(),
      })),
    }),
  ),
}))

const rankedSlugs = (query: string): ReadonlyArray<string> => {
  const normalized = query.trim().toLocaleLowerCase()
  const rank = (title: string): number => {
    const label = title.toLocaleLowerCase()
    return label === normalized ? 0 : label.startsWith(normalized) ? 1 : 2
  }
  return [...DOC_PAGES]
    .sort((left, right) => rank(left.title) - rank(right.title))
    .map(page => page.slug)
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  Dialog.dialog(
    {
      model: model.dialog,
      toParentMessage: message => Message.GotDialogMessage({ message }),
      title: 'Search documentation',
      description: 'Find a component by name or what it does.',
      content: () => [
        h.div(
          [h.Class(skin.searchResults)],
          [
            palette.command(
              {
                model: model.command,
                maybeSelectedValue: Option.none(),
                restingInputValue: '',
                toParentMessage: message =>
                  Message.GotCommandMessage({ message }),
                items: rankedSlugs(model.command.inputValue),
                itemToConfig: slug => {
                  const page = pagesBySlug.get(slug)
                  return {
                    searchText: `${page?.title ?? slug} ${slug.replaceAll('-', ' ')} ${page?.description ?? ''}`,
                    content: h.div(
                      [h.Class(skin.searchResult)],
                      [
                        Icon.icon(
                          'book-open',
                          { class: skin.searchResultIcon },
                          h,
                        ),
                        h.div(
                          [h.Class(skin.searchResultCopy)],
                          [
                            h.span(
                              [h.Class(skin.searchResultTitle)],
                              [page?.title ?? slug],
                            ),
                            h.span(
                              [h.Class(skin.searchResultDescription)],
                              [page?.description ?? ''],
                            ),
                          ],
                        ),
                      ],
                    ),
                  }
                },
                placeholder: 'Search documentation…',
                ariaLabel: 'Search documentation pages',
                emptyContent:
                  'No documentation pages found. Try another search.',
              },
              h,
            ),
          ],
        ),
      ],
      footer: () => [
        h.div(
          [h.Class(skin.searchHelp)],
          [
            h.span([], ['↑ ↓ to navigate']),
            h.span([], ['Enter to open']),
            h.span([], ['Esc to close']),
          ],
        ),
      ],
    },
    h,
  )
