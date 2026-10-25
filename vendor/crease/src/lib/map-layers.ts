import type { Html, HtmlBuilder } from 'foldkit/html'
import type {
  FillLayerSpecification,
  GeoJSONSourceSpecification,
  LineLayerSpecification,
} from 'maplibre-gl'
import { lineLayers, renderMapLayer } from '@/lib/map-view'

export type MapRouteProps = Readonly<{
  id: string
  coordinates: ReadonlyArray<readonly [number, number]>
  color?: string
  width?: number
  opacity?: number
  dashArray?: ReadonlyArray<number>
  interactive?: boolean
}>
/** Draw supplied coordinates; routing/geocoding services remain application-owned. */
export const mapRoute = <Msg>(
  props: MapRouteProps,
  h: HtmlBuilder<Msg>,
): Html =>
  renderMapLayer(
    {
      id: props.id,
      source: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: props.coordinates.map(point => [...point]),
          },
        },
      },
      layers: lineLayers(props.id, props),
      interactive: props.interactive ?? false,
    },
    h,
  )

export type MapArcProps = Omit<MapRouteProps, 'coordinates'> &
  Readonly<{
    from: readonly [number, number]
    to: readonly [number, number]
    curvature?: number
    samples?: number
  }>
export const arcCoordinates = (
  props: Pick<MapArcProps, 'from' | 'to' | 'curvature' | 'samples'>,
): ReadonlyArray<readonly [number, number]> => {
  const [x, y] = props.from
  // Choose the short path when the arc crosses the antimeridian.
  const dx = ((props.to[0] - x + 540) % 360) - 180
  const dy = props.to[1] - y
  const bend = props.curvature ?? 0.2
  const count = Math.max(2, Math.min(256, Math.floor(props.samples ?? 64)))
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count
    const offset = 4 * t * (1 - t) * bend
    return [
      x + t * dx - offset * dy,
      Math.max(-85, Math.min(85, y + t * dy + offset * dx)),
    ] as const
  })
}
export const mapArc = <Msg>(props: MapArcProps, h: HtmlBuilder<Msg>): Html =>
  mapRoute({ ...props, coordinates: arcCoordinates(props) }, h)

export type MapGeoJSONProps = Readonly<{
  id: string
  data: GeoJSONSourceSpecification['data']
  fillPaint?: FillLayerSpecification['paint'] | false
  linePaint?: LineLayerSpecification['paint'] | false
  interactive?: boolean
}>
export const mapGeoJSON = <Msg>(
  props: MapGeoJSONProps,
  h: HtmlBuilder<Msg>,
): Html =>
  renderMapLayer(
    {
      id: props.id,
      source: { type: 'geojson', data: props.data },
      interactive: props.interactive ?? false,
      layers: [
        ...(props.fillPaint === false
          ? []
          : [
              {
                id: `${props.id}-fill`,
                type: 'fill' as const,
                source: props.id,
                paint: {
                  'fill-color': '#2563eb',
                  'fill-opacity': 0.15,
                  ...props.fillPaint,
                },
              },
            ]),
        ...(props.linePaint === false
          ? []
          : [
              {
                id: `${props.id}-outline`,
                type: 'line' as const,
                source: props.id,
                paint: {
                  'line-color': '#2563eb',
                  'line-width': 2,
                  ...props.linePaint,
                },
              },
            ]),
      ],
    },
    h,
  )

export type MapClusterLayerProps = Readonly<{
  id: string
  data: GeoJSONSourceSpecification['data']
  clusterRadius?: number
  clusterMaxZoom?: number
  clusterColors?: readonly [string, string, string]
  pointColor?: string
}>
export const mapClusterLayer = <Msg>(
  props: MapClusterLayerProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const colors = props.clusterColors ?? ['#2563eb', '#1d4ed8', '#1e40af']
  return renderMapLayer(
    {
      id: props.id,
      cluster: true,
      interactive: true,
      source: {
        type: 'geojson',
        data: props.data,
        cluster: true,
        clusterRadius: props.clusterRadius ?? 50,
        clusterMaxZoom: props.clusterMaxZoom ?? 14,
      },
      layers: [
        {
          id: `${props.id}-clusters`,
          type: 'circle',
          source: props.id,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              colors[0],
              20,
              colors[1],
              50,
              colors[2],
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              18,
              20,
              24,
              50,
              30,
            ],
          },
        },
        {
          id: `${props.id}-count`,
          type: 'symbol',
          source: props.id,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
            'text-font': ['Noto Sans Regular'],
          },
          paint: { 'text-color': '#ffffff' },
        },
        {
          id: `${props.id}-points`,
          type: 'circle',
          source: props.id,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': props.pointColor ?? colors[0],
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        },
      ],
    },
    h,
  )
}
