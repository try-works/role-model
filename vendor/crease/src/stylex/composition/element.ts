import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import type { LayoutElement, PrimitiveChildren, PrimitiveData } from './types'

export const primitiveAttributes = <Message>(
  classValue: string,
  slot: string | undefined,
  data: PrimitiveData | undefined,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Attribute<Message>> => [
  h.Class(classValue),
  ...(slot === undefined ? [] : [h.DataAttribute('slot', slot)]),
  ...Object.entries(data ?? {}).map(([name, value]) =>
    h.DataAttribute(name, value),
  ),
]

export const primitiveElement = <Message>(
  as: LayoutElement,
  attributes: ReadonlyArray<Attribute<Message>>,
  children: PrimitiveChildren,
  h: HtmlBuilder<Message>,
): Html => {
  switch (as) {
    case 'article':
      return h.article(attributes, children)
    case 'aside':
      return h.aside(attributes, children)
    case 'footer':
      return h.footer(attributes, children)
    case 'header':
      return h.header(attributes, children)
    case 'li':
      return h.li(attributes, children)
    case 'main':
      return h.main(attributes, children)
    case 'nav':
      return h.nav(attributes, children)
    case 'ol':
      return h.ol(attributes, children)
    case 'section':
      return h.section(attributes, children)
    case 'ul':
      return h.ul(attributes, children)
    case 'div':
      return h.div(attributes, children)
  }
}
