import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  linkFixtures,
  type LinkFixture,
} from '@/docs/components/pages/link/shared'
import * as Link from '@/ui/link'
import * as Tooltip from '@/ui/tooltip'
import * as Text from '@/ui/text'

const LinkPreviewMessage = defineMessageUnion({
  GotLinkTooltipMessage: { index: S.Number, message: Tooltip.Message },
})
type LinkPreviewMessage = typeof LinkPreviewMessage.Type
const LinkPreviewModel = S.Struct({
  _docsPage: S.Literal('link'),
  tooltips: S.Array(Tooltip.Model),
})
type LinkPreviewModel = typeof LinkPreviewModel.Type

const renderFixture = <Msg>(
  fixture: LinkFixture,
  tooltips: ReadonlyArray<Tooltip.Model>,
  onTooltipMessage: (index: number, message: Tooltip.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return Link.link(
        { href: '#', isStandalone: true, children: ['Documentation'] },
        h,
      )
    case 'underlined':
      return Link.link(
        {
          href: '#',
          variant: 'underlined',
          isStandalone: true,
          children: ['Underlined documentation'],
        },
        h,
      )
    case 'inline':
      return Text.text(
        {
          type: 'body',
          display: 'block',
          children: [
            'Browse the ',
            Link.link({ href: '#', children: ['documentation'] }, h),
            ' for installation steps.',
          ],
        },
        h,
      )
    case 'external':
      return h.div(
        [h.Class('flex flex-col gap-2 items-start')],
        (
          [
            ['GitHub', 'https://github.com', false],
            ['MDN', 'https://developer.mozilla.org', false],
            ['Foldkit', 'https://foldkit.dev', true],
          ] as const
        ).map(([label, url, underlined]) =>
          Link.link(
            {
              href: url,
              isExternalLink: true,
              isStandalone: true,
              ...(underlined ? { variant: 'underlined' as const } : {}),
              children: [label],
            },
            h,
          ),
        ),
      )
    case 'tooltips':
      return h.div(
        [h.Class('flex flex-col gap-2 items-start')],
        (
          [
            ['Settings', '/settings', 'Manage your application preferences'],
            ['Profile', '/profile', 'View and edit your profile'],
            ['Help', '/help', 'Browse help articles and support'],
          ] as const
        ).map(([label, url, tip], index) =>
          Link.link(
            {
              href: url,
              isStandalone: true,
              tooltip: {
                model: tooltips[index]!,
                toParentMessage: message => onTooltipMessage(index, message),
                content: tip,
              },
              ...(index === 2 ? { color: 'secondary' as const } : {}),
              children: [label],
            },
            h,
          ),
        ),
      )
  }
}

export const linkTailwindPreviewProgram = definePreviewProgram<
  LinkPreviewModel,
  LinkPreviewMessage
>({
  Model: LinkPreviewModel,
  Message: LinkPreviewMessage,
  init: exampleIndex => ({
    _docsPage: 'link',
    tooltips:
      (linkFixtures[exampleIndex] ?? linkFixtures[0]).kind === 'tooltips'
        ? Array.from({ length: 3 }, (_, index) =>
            Tooltip.init({
              id: `docs-link-tooltip-${String(exampleIndex)}-${String(index)}`,
              showDelay: 400,
            }),
          )
        : [],
  }),
  update: (model, message) => {
    const current = model.tooltips[message.index]
    if (current === undefined) return { model }
    const result = Tooltip.update(current, message.message)
    return {
      model: {
        ...model,
        tooltips: model.tooltips.map((tip, index) =>
          index === message.index ? result.model : tip,
        ),
      },
      commands: Command.mapMessages(result.commands ?? [], next =>
        LinkPreviewMessage.GotLinkTooltipMessage({
          index: message.index,
          message: next,
        }),
      ),
    }
  },
  view: (index, model, h) =>
    renderFixture(
      linkFixtures[index] ?? linkFixtures[0],
      model.tooltips,
      (index, message) =>
        LinkPreviewMessage.GotLinkTooltipMessage({ index, message }),
      h,
    ),
})
