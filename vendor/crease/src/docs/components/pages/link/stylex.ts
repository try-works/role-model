import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  linkFixtures,
  type LinkFixture,
} from '@/docs/components/pages/link/shared'
import * as Link from '@/stylex/link'
import type * as Tooltip from '@/stylex/tooltip'
import { className } from '@/stylex/style'
import * as Text from '@/stylex/text'

const styles = stylex.create({
  column: {
    gap: '0.5rem',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
  },
})

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
        [h.Class(className(styles.column))],
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
        [h.Class(className(styles.column))],
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

export const linkStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  renderFixture(
    linkFixtures[exampleIndex] ?? linkFixtures[0],
    (model as { tooltips: ReadonlyArray<Tooltip.Model> }).tooltips,
    (index, message) =>
      onMessageJson(
        JSON.stringify({ _tag: 'GotLinkTooltipMessage', index, message }),
      ),
    h,
  )
