import { Mount } from 'foldkit'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { LayerSpecification } from 'maplibre-gl'

import { MountMap } from '@/lib/map-runtime'
import type { MapConfig, MapLayerConfig, MapMessage } from '@/lib/map-runtime'
import { mapTranslations } from '@/lib/map-style'
import type { MapTranslations } from '@/lib/map-style'

export type MapSkin = Readonly<
  Record<
    | 'root'
    | 'canvas'
    | 'status'
    | 'controlGroup'
    | 'control'
    | 'marker'
    | 'markerContent'
    | 'label'
    | 'tooltip'
    | 'popup'
    | 'close',
    string
  >
>
export type MapViewProps<Msg> = MapConfig &
  Readonly<{
    ariaLabel: string
    toMessage: (message: MapMessage) => Msg
    children?: ReadonlyArray<Html | string>
  }>
export type MapMarkerProps<Msg> = Readonly<{
  id: string
  longitude: number
  latitude: number
  ariaLabel: string
  draggable?: boolean
  onClick?: Msg
  children?: ReadonlyArray<Html | string>
}>
export type MapPopupProps<Msg> = Readonly<{
  longitude: number
  latitude: number
  ariaLabel: string
  children: ReadonlyArray<Html | string>
  onClose?: Msg
  language?: string
  translations?: Partial<MapTranslations>
}>
export type MapControlsProps = Readonly<{
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showZoom?: boolean
  showCompass?: boolean
  showLocate?: boolean
  showFullscreen?: boolean
  language?: string
  translations?: Partial<MapTranslations>
}>

export const renderMap = <Msg>(
  props: MapViewProps<Msg>,
  skin: MapSkin,
  h: HtmlBuilder<Msg>,
): Html => {
  const { children, ariaLabel, toMessage, ...config } = props
  return h.div(
    [
      h.DataAttribute('slot', 'map'),
      h.Class(skin.root),
      h.Role('region'),
      h.AriaLabel(ariaLabel),
      h.DataAttribute('map-config', JSON.stringify(config)),
      h.OnMount(Mount.mapMessage(MountMap(), toMessage)),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'map-canvas'),
          h.Class(skin.canvas),
          // MapLibre's unlayered stylesheet sets its host to position: relative.
          // Inline geometry keeps this host stretched inside either renderer's root.
          h.Style({ position: 'absolute', inset: '0' }),
        ],
        [],
      ),
      ...(children ?? []),
      h.div(
        [
          h.DataAttribute('slot', 'map-status'),
          h.Class(skin.status),
          h.Role('status'),
        ],
        [
          h.span([h.DataAttribute('slot', 'map-status-text')], []),
          h.button(
            [
              h.Type('button'),
              h.DataAttribute('map-action', 'retry'),
              h.Class(skin.control),
            ],
            [],
          ),
        ],
      ),
    ],
  )
}

const positionStyle = (position: MapControlsProps['position']) => ({
  ...(position?.endsWith('left') ? { left: '12px' } : { right: '12px' }),
  ...(position?.startsWith('bottom') ? { bottom: '32px' } : { top: '12px' }),
})

export const renderMapControls = <Msg>(
  props: MapControlsProps,
  skin: MapSkin,
  h: HtmlBuilder<Msg>,
): Html => {
  const t = mapTranslations(props.language, props.translations)
  const button = (action: string, label: string, symbol: string) =>
    h.button(
      [
        h.Type('button'),
        h.Class(skin.control),
        h.DataAttribute('map-action', action),
        h.AriaLabel(label),
        h.Title(label),
      ],
      [h.span([h.AriaHidden(true)], [symbol])],
    )
  return h.div(
    [
      h.DataAttribute('slot', 'map-controls'),
      h.DataAttribute('map-controls-config', JSON.stringify(props)),
      h.Class(skin.controlGroup),
      h.Style(positionStyle(props.position)),
      h.Role('group'),
      h.AriaLabel(t.controls),
    ],
    [
      ...(props.showZoom === false
        ? []
        : [
            button('zoom-in', t.zoomIn, '+'),
            button('zoom-out', t.zoomOut, '−'),
          ]),
      ...(props.showCompass === false
        ? []
        : [button('north', t.resetBearing, '↑')]),
      ...(props.showLocate ? [button('locate', t.locate, '◎')] : []),
      ...(props.showFullscreen
        ? [button('fullscreen', t.fullscreen, '⛶')]
        : []),
    ],
  )
}

export const renderMapMarker = <Msg>(
  props: MapMarkerProps<Msg>,
  skin: MapSkin,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.DataAttribute('slot', 'map-marker'),
      h.DataAttribute('map-marker-id', props.id),
      h.DataAttribute(
        'map-coordinate',
        JSON.stringify([props.longitude, props.latitude]),
      ),
      h.DataAttribute('map-draggable', String(props.draggable ?? false)),
      h.Class(skin.marker),
      h.AriaLabel(props.ariaLabel),
      ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
    ],
    props.children ?? [
      h.span([h.Class(skin.markerContent), h.AriaHidden(true)], ['●']),
    ],
  )

export const renderMapPopup = <Msg>(
  props: MapPopupProps<Msg>,
  skin: MapSkin,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'map-popup'),
      h.DataAttribute(
        'map-popup-config',
        JSON.stringify({
          language: props.language,
          translations: props.translations,
        }),
      ),
      h.DataAttribute(
        'map-coordinate',
        JSON.stringify([props.longitude, props.latitude]),
      ),
      h.Class(skin.popup),
      h.Role('dialog'),
      h.AriaLabel(props.ariaLabel),
      ...(props.onClose === undefined
        ? []
        : [
            h.OnKeyDownPreventDefault(key =>
              key === 'Escape' ? Option.some(props.onClose!) : Option.none(),
            ),
          ]),
    ],
    [
      ...props.children,
      ...(props.onClose === undefined
        ? []
        : [
            h.button(
              [
                h.Type('button'),
                h.DataAttribute('slot', 'map-popup-close'),
                h.Class(skin.close),
                h.AriaLabel(
                  mapTranslations(props.language, props.translations).close,
                ),
                h.OnClick(props.onClose),
              ],
              ['×'],
            ),
          ]),
    ],
  )

export const renderMapLayer = <Msg>(
  config: MapLayerConfig,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.Hidden(true),
      h.DataAttribute('slot', 'map-layer'),
      h.DataAttribute('map-layer', JSON.stringify(config)),
    ],
    [],
  )

export const renderMapMarkerPart = <Msg>(
  props: Readonly<{ children: ReadonlyArray<Html | string> }>,
  part: 'markerContent' | 'label' | 'tooltip',
  skin: MapSkin,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [h.Class(skin[part]), ...(part === 'tooltip' ? [h.Role('tooltip')] : [])],
    props.children,
  )

export const lineLayers = (
  id: string,
  options: Readonly<{
    color?: string
    width?: number
    opacity?: number
    dashArray?: ReadonlyArray<number>
  }>,
): ReadonlyArray<LayerSpecification> => [
  {
    id: `${id}-line`,
    type: 'line',
    source: id,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': options.color ?? '#2563eb',
      'line-width': options.width ?? 4,
      'line-opacity': options.opacity ?? 0.85,
      ...(options.dashArray
        ? { 'line-dasharray': [...options.dashArray] }
        : {}),
    },
  },
]
