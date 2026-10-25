import { Stream } from 'effect'
import { Subscription } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'

const SIDEBAR_SCROLL_KEY = 'creaseui-docs-sidebar-scroll'

export const sidebarScrollMemory = <Msg>(h: HtmlBuilder<Msg>, scrolled: Msg) =>
  h.OnMount({
    name: 'docs-sidebar-scroll',
    f: element => {
      if (!(element instanceof HTMLElement)) return Stream.empty
      const saved = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY))
      if (Number.isFinite(saved)) element.scrollTop = saved
      return Subscription.fromEvent<HTMLElement, 'scroll', Msg>({
        target: element,
        type: 'scroll',
        options: { passive: true },
        mapEvent: () => {
          sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(element.scrollTop))
          return scrolled
        },
      })
    },
  })
