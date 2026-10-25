import type { Html, HtmlBuilder } from 'foldkit/html'
import { renderMapPopup } from '@/lib/map-view'
import type { MapPopupProps } from '@/lib/map-view'
import { mapSkin } from '@/stylex/map'
export type { MapPopupProps } from '@/lib/map-view'
export const mapPopup = <Msg>(
  props: MapPopupProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => renderMapPopup(props, mapSkin, h)
