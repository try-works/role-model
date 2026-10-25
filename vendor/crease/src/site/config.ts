export type Renderer = 'tailwind' | 'stylex' | 'pleat' | 'pleat'

const RENDERER_ORDER: ReadonlyArray<Renderer> = ['tailwind', 'stylex', 'pleat']

const RENDERER_LABELS: Readonly<Record<Renderer, string>> = {
  tailwind: 'Tailwind',
  stylex: 'StyleX',
  pleat: 'Pleat',
}

const RENDERER_PORTS: Readonly<Record<Renderer, readonly [number, number]>> = {
  tailwind: [5173, 4173],
  stylex: [5174, 4174],
  pleat: [5175, 4175],
}

// Replaced by Vite for each independently built site. The fallback keeps
// renderer-neutral unit/Scene tests usable without a Vite environment.
export const renderer: Renderer =
  typeof __CREASEUI_RENDERER__ === 'undefined'
    ? 'tailwind'
    : __CREASEUI_RENDERER__

const nextRenderer = (self: Renderer): Renderer =>
  RENDERER_ORDER[(RENDERER_ORDER.indexOf(self) + 1) % RENDERER_ORDER.length] ??
  'tailwind'

export const otherRenderer = nextRenderer(renderer)
export const rendererLabel = RENDERER_LABELS[renderer]
export const otherRendererLabel = RENDERER_LABELS[otherRenderer]

export const siteOrigin = (skin: Renderer): string =>
  skin === 'tailwind' ? 'https://creaseui.com' : `https://${skin}.creaseui.com`

export const counterpartUrl = (url: URL): string => {
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  const preview =
    url.port === '4173' || url.port === '4174' || url.port === '4175'
  const origin = local
    ? `${url.protocol}//${url.hostname}:${preview ? RENDERER_PORTS[otherRenderer][1] : RENDERER_PORTS[otherRenderer][0]}`
    : siteOrigin(otherRenderer)
  return `${origin}${url.pathname}${url.search}${url.hash}`
}
