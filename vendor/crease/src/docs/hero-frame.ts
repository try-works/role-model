import { Stream } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { HeroExampleConfig } from './component-page'
import { toSlug } from './component-metadata'

const HERO_ID_SUFFIX = '-hero'
const HERO_ID_REF_ATTRIBUTES = [
  'for',
  'form',
  'list',
  'headers',
  'aria-labelledby',
  'aria-describedby',
  'aria-details',
  'aria-controls',
  'aria-activedescendant',
  'aria-errormessage',
  'aria-owns',
  'aria-flowto',
] as const

/** Heading-less copy of the first example, rendered directly under the page
    header like shadcn's unnamed top preview. The hero and the named section
    render the same example, so element ids could duplicate: the hero rewrites
    every colliding id (and intra-hero id reference) inside its subtree with a
    suffix, keeping the canonical ids on the named section. Ids that are
    already unique — preview programs mint them per state slot — are left
    canonical: components resolve their own elements with literal
    `getElementById` lookups (Dialog's ShowDialog, popover anchorSetup, …), and
    suffixing a model-owned id would make the lookup miss and the component
    tear itself down (an opening `<dialog>` self-closing ~10ms later). */
export const heroFrame = <Msg>(
  config: HeroExampleConfig<Msg>,
  content: Html,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.AriaLabel(`${config.title} preview`),
      h.OnMount({
        name: `docs-hero-${toSlug(config.title)}`,
        f: element => {
          if (!(element instanceof HTMLElement)) return Stream.empty
          if (config.keepIdsCanonical === true) return Stream.empty
          const scopedIds = new Set<string>()
          element.querySelectorAll<HTMLElement>('[id]').forEach(node => {
            if (node.id.length > 0 && !node.id.endsWith(HERO_ID_SUFFIX))
              scopedIds.add(node.id)
          })
          const rewrittenIds = new Set<string>()
          scopedIds.forEach(id => {
            const copies = element.ownerDocument.querySelectorAll<HTMLElement>(
              `#${CSS.escape(id)}`,
            )
            if (copies.length <= 1) return
            const node = element.querySelector<HTMLElement>(
              `#${CSS.escape(id)}`,
            )
            if (node !== null) {
              node.id = `${id}${HERO_ID_SUFFIX}`
              rewrittenIds.add(id)
            }
          })
          HERO_ID_REF_ATTRIBUTES.forEach(attribute => {
            element
              .querySelectorAll<HTMLElement>(`[${attribute}]`)
              .forEach(node => {
                const value = node.getAttribute(attribute)
                if (value === null) return
                const rewritten = value
                  .split(/\s+/)
                  .map(token =>
                    rewrittenIds.has(token)
                      ? `${token}${HERO_ID_SUFFIX}`
                      : token,
                  )
                  .join(' ')
                if (rewritten !== value) node.setAttribute(attribute, rewritten)
              })
          })
          return Stream.empty
        },
      }),
    ],
    [content],
  )
}
