import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/lib/icon'
import {
  type AppRoute,
  homePath,
  gettingStartedPath,
  createPath,
  chartsPath,
  blocksIndexPath,
} from '@/route'
import { rendererLabel, otherRendererLabel } from '@/site/config'
import { skin } from '@/site/skin'

export const header = <Msg>(
  props: Readonly<{
    route: AppRoute
    isDark: boolean
    onThemeToggle: Msg
    onSearchOpen: Msg
    isSearchOpen: boolean
    counterpartHref: string
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const links = [
    {
      href: gettingStartedPath(),
      label: 'Docs',
      active:
        props.route._tag === 'GettingStarted' ||
        props.route._tag === 'Theming' ||
        props.route._tag === 'LintRules' ||
        props.route._tag === 'LintRule' ||
        props.route._tag === 'ComponentDocs',
    },
    {
      href: createPath(),
      label: 'Create',
      active: props.route._tag === 'Create',
    },
    {
      href: chartsPath('area'),
      label: 'Charts',
      active: props.route._tag === 'Charts',
    },
    {
      href: blocksIndexPath(),
      label: 'Blocks',
      active: ['BlocksIndex', 'BlocksStyleX', 'BlocksStyleXTable'].includes(
        props.route._tag,
      ),
    },
  ]
  const navLinks = () =>
    links.map(link =>
      h.a(
        [
          h.Href(link.href),
          h.Class(link.active ? skin.active : skin.link),
          ...(link.active ? [h.AriaCurrent('page')] : []),
        ],
        [link.label],
      ),
    )
  const themeLabel = props.isDark
    ? 'Switch to light mode'
    : 'Switch to dark mode'
  return h.header(
    [h.Class(skin.header), h.DataAttribute('site-header', rendererLabel)],
    [
      h.div(
        [h.Class(skin.bar)],
        [
          h.a([h.Href(homePath()), h.Class(skin.brand)], ['crease/ui']),
          h.nav(
            [h.AriaLabel('Site navigation'), h.Class(skin.nav)],
            navLinks(),
          ),
          h.div(
            [h.Class(skin.actions)],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Id('site-docs-search-trigger'),
                  h.OnClick(props.onSearchOpen),
                  h.AriaLabel('Search documentation'),
                  h.AriaHasPopup('dialog'),
                  h.AriaExpanded(props.isSearchOpen),
                  h.AriaControls('site-docs-search-dialog'),
                  h.Class(skin.searchTrigger),
                ],
                [
                  Icon.icon('search', { class: skin.icon }, h),
                  h.span([h.Class(skin.searchLabel)], ['Search docs…']),
                  h.kbd([h.Class(skin.searchShortcut)], ['Ctrl/⌘ K']),
                ],
              ),
              h.a(
                [
                  h.Href(props.counterpartHref),
                  h.Class(skin.other),
                  h.AriaLabel(`View this page in ${otherRendererLabel}`),
                ],
                [otherRendererLabel, ' ↗'],
              ),
              h.a(
                [
                  h.Href('https://github.com/Potti1234/creaseui'),
                  h.Target('_blank'),
                  h.Rel('noopener noreferrer'),
                  h.AriaLabel('GitHub repository'),
                  h.Title('GitHub repository'),
                  h.Class(skin.iconLink),
                ],
                [Icon.icon('github', { class: skin.icon }, h)],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(props.onThemeToggle),
                  h.AriaLabel(themeLabel),
                  h.Title(themeLabel),
                  h.Class(skin.theme),
                ],
                [
                  h.span(
                    [h.Class(skin.themeIconWrap)],
                    [
                      Icon.icon('sun', { class: skin.themeIconSun }, h),
                      Icon.icon('moon', { class: skin.themeIconMoon }, h),
                    ],
                  ),
                ],
              ),
            ],
          ),
          h.details(
            [h.Class(skin.mobile)],
            [
              h.summary(
                [h.AriaLabel('Open site navigation'), h.Class(skin.summary)],
                [Icon.icon('menu', { class: skin.icon }, h)],
              ),
              h.nav(
                [h.AriaLabel('Mobile site navigation'), h.Class(skin.menu)],
                navLinks(),
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

export const notFound = <Msg>(path: string, h: HtmlBuilder<Msg>): Html =>
  h.main([h.Class(skin.notFound)], [`No page at ${path}.`])
