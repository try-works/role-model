import type { Html, HtmlBuilder } from 'foldkit/html'
import { renderMapControls } from '@/lib/map-view'
import type { MapControlsProps } from '@/lib/map-view'
import { mapSkin } from '@/stylex/map'
export type { MapControlsProps } from '@/lib/map-view'
export const mapControls = <Msg>(
  props: MapControlsProps,
  h: HtmlBuilder<Msg>,
): Html => renderMapControls(props, mapSkin, h)
