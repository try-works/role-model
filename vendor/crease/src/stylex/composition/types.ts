import type { Html } from 'foldkit/html'

export type PrimitiveChildren = ReadonlyArray<Html | string>

export type LayoutElement =
  | 'article'
  | 'aside'
  | 'div'
  | 'footer'
  | 'header'
  | 'li'
  | 'main'
  | 'nav'
  | 'ol'
  | 'section'
  | 'ul'

export type SpaceToken = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
export type ResponsiveSpaceToken = SpaceToken | 'createBoard'

export type PrimitiveData = Readonly<Record<string, string>>
