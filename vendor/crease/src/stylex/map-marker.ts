import type { Html, HtmlBuilder } from 'foldkit/html'
import { renderMapMarker, renderMapMarkerPart } from '@/lib/map-view'
import type { MapMarkerProps } from '@/lib/map-view'
import { mapSkin } from '@/stylex/map'
export type { MapMarkerProps } from '@/lib/map-view'
export const mapMarker = <Msg>(
  props: MapMarkerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => renderMapMarker(props, mapSkin, h)
export const markerContent = <Msg>(
  props: Readonly<{ children: ReadonlyArray<Html | string> }>,
  h: HtmlBuilder<Msg>,
): Html => renderMapMarkerPart(props, 'markerContent', mapSkin, h)
export const markerLabel = <Msg>(
  props: Readonly<{ children: ReadonlyArray<Html | string> }>,
  h: HtmlBuilder<Msg>,
): Html => renderMapMarkerPart(props, 'label', mapSkin, h)
export const markerTooltip = <Msg>(
  props: Readonly<{ children: ReadonlyArray<Html | string> }>,
  h: HtmlBuilder<Msg>,
): Html => renderMapMarkerPart(props, 'tooltip', mapSkin, h)
