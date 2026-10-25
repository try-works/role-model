import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { MAP_PALETTES, OPENFREEMAP_STYLES } from '@/lib/map-style'
import type { MapConfig } from '@/lib/map-runtime'
import { MapMessage } from '@/lib/map-runtime'
import {
  renderMap,
  renderMapControls,
  renderMapMarker,
  renderMapPopup,
  renderMapMarkerPart,
} from '@/lib/map-view'
import type { MapSkin } from '@/lib/map-view'
import { mapSkin as tailwindSkin } from '@/ui/map'
import { mapRoute } from '@/ui/map-route'
import { mapArc } from '@/ui/map-arc'
import { mapGeoJSON } from '@/ui/map-geojson'
import { mapClusterLayer } from '@/ui/map-cluster'
import * as Select from '@/ui/select'
import * as Button from '@/ui/button'
import * as Label from '@/ui/label'
import * as Text from '@/ui/text'

const DemoMessage = defineMessageUnion({
  GotMapDemoSelectMessage: { message: Select.Message },
  ToggledMapDemoPopup: {},
  ResetMapDemoViewport: {},
})
export const Message = S.Union([MapMessage, DemoMessage])
type Message = typeof Message.Type
const Viewport = S.Struct({
  center: S.Tuple([S.Number, S.Number]),
  zoom: S.Number,
  bearing: S.Number,
  pitch: S.Number,
})
const Model = S.Struct({
  _docsPage: S.String,
  selectedStyle: S.String,
  language: S.String,
  popupOpen: S.Boolean,
  longitude: S.Number,
  latitude: S.Number,
  viewport: Viewport,
  detail: S.String,
  select: Select.Model,
})
export type MapDemoModel = typeof Model.Type
type Model = MapDemoModel
const INITIAL_VIEWPORT = {
  center: [11.576124, 48.137154] as [number, number],
  zoom: 11,
  bearing: 0,
  pitch: 0,
}

export const munichRoute: ReadonlyArray<readonly [number, number]> = [
  [11.576124, 48.137154],
  [11.57595, 48.1381],
  [11.5767, 48.1386],
  [11.577, 48.1397],
  [11.5772, 48.1412],
  [11.577248, 48.142751],
]
export const munichRegion = {
  type: 'Feature' as const,
  properties: { name: 'Central Munich' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [11.55, 48.125],
        [11.605, 48.125],
        [11.605, 48.155],
        [11.55, 48.155],
        [11.55, 48.125],
      ],
    ],
  },
}
export const munichPoints = {
  type: 'FeatureCollection' as const,
  features: Array.from({ length: 120 }, (_, index) => ({
    type: 'Feature' as const,
    properties: { name: `Location ${index + 1}` },
    geometry: {
      type: 'Point' as const,
      coordinates: [
        11.49 + ((index * 37) % 120) / 700,
        48.097 + ((index * 53) % 120) / 1400,
      ],
    },
  })),
}

export type MapDemoSkin = Readonly<
  Record<'toolbar' | 'field' | 'readout', string>
>
type MapDemoItem = Readonly<{ value: string; label: string }>
export type MapDemoComponents = Readonly<{
  select: <Msg>(
    props: Pick<
      Select.SelectProps<MapDemoItem, string, Msg>,
      | 'model'
      | 'maybeSelectedValue'
      | 'toParentMessage'
      | 'items'
      | 'itemToValue'
      | 'itemToLabel'
      | 'ariaLabel'
    >,
    h: HtmlBuilder<Msg>,
  ) => Html
  button: <Msg>(
    props: Pick<Button.ButtonProps<Msg>, 'onClick' | 'children'> &
      Readonly<{ variant: 'outline'; size: 'lg' }>,
    h: HtmlBuilder<Msg>,
  ) => Html
  label: <Msg>(
    props: Pick<Label.LabelProps, 'for' | 'children'>,
    h: HtmlBuilder<Msg>,
  ) => Html
  text: <Msg>(
    props: Pick<
      Text.TextProps,
      | 'children'
      | 'type'
      | 'weight'
      | 'color'
      | 'as'
      | 'display'
      | 'hasTabularNumbers'
    >,
    h: HtmlBuilder<Msg>,
  ) => Html
}>
const tailwindComponents: MapDemoComponents = {
  select: Select.select,
  button: Button.button,
  label: Label.label,
  text: Text.text,
}
const tailwindDemoSkin: MapDemoSkin = {
  toolbar:
    'absolute top-3 left-3 flex flex-wrap items-center gap-3 rounded-lg bg-background p-2 text-sm text-foreground shadow-md',
  field: 'flex items-center gap-3',
  readout:
    'absolute bottom-10 left-3 right-3 z-10 max-h-20 overflow-auto rounded-md bg-background p-2 shadow-sm',
}

export const demoConfig = (
  slug: string,
  index: number,
  model: Model,
): MapConfig => {
  const config: MapConfig = {
    center: [11.576124, 48.137154],
    zoom:
      slug === 'map-arc'
        ? 4
        : ['map-marker', 'map-popup', 'map-route'].includes(slug)
          ? 14
          : 11,
    language: model.language,
  }
  if (slug === 'map' && index === 1)
    return { ...config, viewport: model.viewport }
  if (slug === 'map-styles') {
    if (index === 1)
      return {
        ...config,
        themed: true,
        palette: {
          ...MAP_PALETTES.light,
          water: model.selectedStyle === 'warm' ? '#b9d9ca' : '#b9cde8',
          park: model.selectedStyle === 'warm' ? '#e4ead9' : '#e2eaf4',
          bg: model.selectedStyle === 'warm' ? '#fcf7ef' : '#f0f4fa',
          landuse: model.selectedStyle === 'warm' ? '#f1ebdf' : '#e8eef6',
        },
      }
    const selected =
      OPENFREEMAP_STYLES[
        model.selectedStyle as keyof typeof OPENFREEMAP_STYLES
      ] ?? OPENFREEMAP_STYLES.positron
    return { ...config, styles: { light: selected, dark: selected } }
  }
  if (slug === 'map-geojson' && index === 1) return { ...config, blank: true }
  return config
}

export const renderDemo = <Msg>(
  slug: string,
  index: number,
  model: Model,
  skin: MapSkin,
  toMessage: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
  demoSkin: MapDemoSkin = tailwindDemoSkin,
  components: MapDemoComponents = tailwindComponents,
): Html => {
  const controls: Html[] = [
    renderMapControls(
      {
        language: model.language,
        ...(slug === 'map-localization' && index === 1
          ? {
              translations: {
                zoomIn:
                  model.language === 'de'
                    ? 'Karte vergrößern'
                    : model.language === 'fr'
                      ? 'Agrandir la carte'
                      : 'Enlarge the map',
              },
            }
          : {}),
        showLocate: slug === 'map-controls' && index === 1,
        showFullscreen: slug === 'map-controls',
        position:
          index === 1 && slug === 'map-controls' ? 'bottom-left' : 'top-right',
      },
      skin,
      h,
    ),
  ]
  if (slug === 'map-marker' || slug === 'map-popup' || slug === 'map-route') {
    controls.push(
      renderMapMarker(
        {
          id: 'marienplatz',
          longitude:
            slug === 'map-marker' && index === 1 ? model.longitude : 11.576124,
          latitude:
            slug === 'map-marker' && index === 1 ? model.latitude : 48.137154,
          ariaLabel: 'Marienplatz',
          draggable: slug === 'map-marker' && index === 1,
          onClick: toMessage(DemoMessage.ToggledMapDemoPopup()),
          children: [
            renderMapMarkerPart({ children: ['●'] }, 'markerContent', skin, h),
            renderMapMarkerPart(
              { children: ['Marienplatz'] },
              'label',
              skin,
              h,
            ),
          ],
        },
        skin,
        h,
      ),
    )
    if (index === 0 || slug === 'map-route')
      controls.push(
        renderMapMarker(
          {
            id: 'odeonsplatz',
            longitude: 11.577248,
            latitude: 48.142751,
            ariaLabel: 'Odeonsplatz',
            children: [
              renderMapMarkerPart(
                { children: ['●'] },
                'markerContent',
                skin,
                h,
              ),
              renderMapMarkerPart(
                { children: ['Odeonsplatz'] },
                'tooltip',
                skin,
                h,
              ),
            ],
          },
          skin,
          h,
        ),
      )
  }
  if (slug === 'map-popup' && model.popupOpen)
    controls.push(
      renderMapPopup(
        {
          longitude: 11.576124,
          latitude: 48.137154,
          ariaLabel: 'Place details',
          language: model.language,
          onClose: toMessage(DemoMessage.ToggledMapDemoPopup()),
          children: [
            components.text(
              {
                as: 'p',
                weight: 'semibold',
                children: [index === 1 ? 'Central Munich' : 'Marienplatz'],
              },
              h,
            ),
            components.text(
              { as: 'p', children: ['Explore this location on OpenFreeMap.'] },
              h,
            ),
          ],
        },
        skin,
        h,
      ),
    )
  if (slug === 'map-route')
    controls.push(
      mapRoute(
        {
          id: 'munich-route',
          coordinates: munichRoute,
          ...(index === 1 ? { dashArray: [2, 2], color: '#0f766e' } : {}),
          interactive: true,
        },
        h,
      ),
    )
  if (slug === 'map-arc')
    controls.push(
      mapArc(
        {
          id: 'munich-paris',
          from: [11.576124, 48.137154],
          to: [2.3522, 48.8566],
          curvature: index === 1 ? -0.3 : 0.2,
          color: index === 1 ? '#0f766e' : '#2563eb',
          interactive: true,
        },
        h,
      ),
    )
  if (slug === 'map-geojson')
    controls.push(
      mapGeoJSON(
        {
          id: 'central-munich',
          data: munichRegion,
          interactive: true,
          ...(index === 1 ? { fillPaint: false } : {}),
        },
        h,
      ),
    )
  if (slug === 'map-cluster')
    controls.push(
      mapClusterLayer(
        {
          id: 'munich-locations',
          data: munichPoints,
          clusterRadius: index === 1 ? 80 : 50,
          ...(index === 1
            ? { clusterColors: ['#0f766e', '#115e59', '#134e4a'] as const }
            : {}),
        },
        h,
      ),
    )
  const toolbar: Html[] = []
  if (slug === 'map-styles')
    toolbar.push(
      h.div(
        [h.Class(demoSkin.field)],
        [
          components.label(
            { for: `${model.select.id}-button`, children: ['Map style'] },
            h,
          ),
          components.select(
            {
              model: model.select,
              maybeSelectedValue: Option.some(model.selectedStyle),
              toParentMessage: message =>
                toMessage(DemoMessage.GotMapDemoSelectMessage({ message })),
              ariaLabel: 'Map style',
              items: (index === 1
                ? ['cool', 'warm']
                : ['positron', 'liberty', 'bright', 'dark']
              ).map(value => ({
                value,
                label: value[0]!.toUpperCase() + value.slice(1),
              })),
              itemToValue: item => item.value,
              itemToLabel: item => item.label,
            },
            h,
          ),
        ],
      ),
    )
  if (slug === 'map-localization')
    toolbar.push(
      h.div(
        [h.Class(demoSkin.field)],
        [
          components.label(
            { for: `${model.select.id}-button`, children: ['Language'] },
            h,
          ),
          components.select(
            {
              model: model.select,
              maybeSelectedValue: Option.some(model.language),
              toParentMessage: message =>
                toMessage(DemoMessage.GotMapDemoSelectMessage({ message })),
              ariaLabel: 'Map language',
              items: [
                { value: 'en', label: 'English' },
                { value: 'de', label: 'Deutsch' },
                { value: 'fr', label: 'Français' },
                { value: 'native', label: 'Local names' },
              ],
              itemToValue: item => item.value,
              itemToLabel: item => item.label,
            },
            h,
          ),
        ],
      ),
    )
  if (slug === 'map' && index === 1)
    toolbar.push(
      components.button(
        {
          variant: 'outline',
          size: 'lg',
          onClick: toMessage(DemoMessage.ResetMapDemoViewport()),
          children: ['Reset view'],
        },
        h,
      ),
    )
  if (slug === 'map-popup' && !model.popupOpen)
    toolbar.push(
      components.button(
        {
          variant: 'outline',
          size: 'lg',
          onClick: toMessage(DemoMessage.ToggledMapDemoPopup()),
          children: ['Open popup'],
        },
        h,
      ),
    )
  const readout =
    slug === 'map' && index === 1
      ? `Longitude ${model.viewport.center[0].toFixed(3)} · Latitude ${model.viewport.center[1].toFixed(3)} · Zoom ${model.viewport.zoom.toFixed(1)}`
      : slug === 'map-marker' && index === 1
        ? `Drag the marker · ${model.longitude.toFixed(4)}, ${model.latitude.toFixed(4)}`
        : model.detail
  return renderMap(
    {
      ...demoConfig(slug, index, model),
      ariaLabel: `${slug.replaceAll('-', ' ')} example in Munich`,
      toMessage: message => toMessage(message),
      children: [
        ...controls,
        ...(toolbar.length
          ? [h.div([h.Class(demoSkin.toolbar)], toolbar)]
          : []),
        ...(readout
          ? [
              h.div(
                [h.Class(demoSkin.readout), h.AriaLive('polite')],
                [
                  components.text(
                    {
                      as: 'p',
                      type: 'supporting',
                      color: 'secondary',
                      hasTabularNumbers: true,
                      children: [readout],
                    },
                    h,
                  ),
                ],
              ),
            ]
          : []),
      ],
    },
    skin,
    h,
  )
}

export const mapPreviewProgram = (slug: string) =>
  definePreviewProgram<Model, Message>({
    Model: S.Struct({ ...Model.fields, _docsPage: S.Literal(slug) }),
    Message,
    init: index => ({
      _docsPage: slug,
      selectedStyle: slug === 'map-styles' && index === 1 ? 'cool' : 'positron',
      language: 'en',
      popupOpen: true,
      longitude: 11.576124,
      latitude: 48.137154,
      viewport: INITIAL_VIEWPORT,
      detail: '',
      select: Select.init({
        id: `docs-${slug}-select-${String(index)}`,
        isAnimated: true,
      }),
    }),
    update: (model, message) => {
      switch (message._tag) {
        case 'GotMapDemoSelectMessage': {
          const next = Select.update(model.select, message.message)
          const selected =
            next.outMessage?._tag === 'Selected'
              ? next.outMessage.value
              : undefined
          return {
            model: {
              ...model,
              select: next.model,
              ...(selected === undefined
                ? {}
                : slug === 'map-localization'
                  ? { language: selected }
                  : { selectedStyle: selected }),
            },
            commands: Command.mapMessages(next.commands ?? [], message =>
              DemoMessage.GotMapDemoSelectMessage({ message }),
            ),
          }
        }
        case 'ToggledMapDemoPopup':
          return { model: { ...model, popupOpen: !model.popupOpen } }
        case 'ResetMapDemoViewport':
          return { model: { ...model, viewport: INITIAL_VIEWPORT } }
        case 'MapViewportChanged':
          return {
            model: {
              ...model,
              viewport: {
                center: message.center,
                zoom: message.zoom,
                bearing: message.bearing,
                pitch: message.pitch,
              },
            },
          }
        case 'MapMarkerDragged':
          return {
            model: {
              ...model,
              longitude: message.longitude,
              latitude: message.latitude,
            },
          }
        case 'MapFeatureClicked':
          return {
            model: {
              ...model,
              detail: `Selected ${message.layerId}: ${message.propertiesJson}`,
            },
          }
        case 'MapFailed':
          return { model: { ...model, detail: message.reason } }
        default:
          return { model }
      }
    },
    view: (index, model, h) =>
      renderDemo(slug, index, model, tailwindSkin, message => message, h),
  })
