import type { Html, HtmlBuilder } from 'foldkit/html'
import { renderMapMarker } from '@/lib/map-view'
import type { MapMarkerProps } from '@/lib/map-view'
import { mapSkin } from '@/ui/map'
export type { MapMarkerProps } from '@/lib/map-view'
export const mapMarker = <Msg>(
  props: MapMarkerProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => renderMapMarker(props, mapSkin, h)
export const markerContent = <Msg>(
  props: Readonly<{ children: ReadonlyArray<Html | string> }>,
  h: HtmlBuilder<Msg>,
): Html => h.span([h.Class(mapSkin.markerContent)], props.children)
export const markerLabel = <Msg>(
  props: Readonly<{ children: ReadonlyArray<Html | string> }>,
  h: HtmlBuilder<Msg>,
): Html => h.span([h.Class(mapSkin.label)], props.children)
export const markerTooltip = <Msg>(
  props: Readonly<{ children: ReadonlyArray<Html | string> }>,
  h: HtmlBuilder<Msg>,
): Html => h.span([h.Class(mapSkin.tooltip), h.Role('tooltip')], props.children)
