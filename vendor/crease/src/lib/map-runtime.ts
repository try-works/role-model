import { Effect, Queue, Schema as S, Stream } from 'effect'
import { Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type {
  GeoJSONSourceSpecification,
  LayerSpecification,
  Map as MapLibreMap,
  MapMouseEvent,
  StyleSpecification,
} from 'maplibre-gl'
import type * as MapLibre from 'maplibre-gl'

import {
  createMapStyle,
  mapTranslations,
  OPENFREEMAP_STYLES,
  readMapPalette,
} from '@/lib/map-style'
import type { MapPalette, MapTranslations } from '@/lib/map-style'

export type MapViewport = Readonly<{
  center: readonly [number, number]
  zoom: number
  bearing: number
  pitch: number
}>
export type MapConfig = Readonly<{
  center?: readonly [number, number]
  zoom?: number
  viewport?: MapViewport
  styles?: Readonly<{
    light?: string | StyleSpecification
    dark?: string | StyleSpecification
  }>
  theme?: 'light' | 'dark'
  /** Map labels and controls default to English. */
  language?: string
  translations?: Partial<MapTranslations>
  palette?: Partial<MapPalette>
  themed?: boolean
  blank?: boolean
  interactive?: boolean
  /** Optional modifier-key gestures; wheel zoom works directly by default. */
  cooperativeGestures?: boolean
}>

export type MapLayerConfig = Readonly<{
  id: string
  source: GeoJSONSourceSpecification
  layers: ReadonlyArray<LayerSpecification>
  cluster?: boolean
  interactive?: boolean
}>

export const MapMessage = defineMessageUnion({
  MapLoaded: {},
  MapFailed: { reason: S.String },
  MapViewportChanged: {
    center: S.Tuple([S.Number, S.Number]),
    zoom: S.Number,
    bearing: S.Number,
    pitch: S.Number,
  },
  MapClicked: { longitude: S.Number, latitude: S.Number },
  MapFeatureClicked: {
    layerId: S.String,
    propertiesJson: S.String,
    longitude: S.Number,
    latitude: S.Number,
  },
  MapMarkerDragged: { id: S.String, longitude: S.Number, latitude: S.Number },
})
export type MapMessage = typeof MapMessage.Type

const parseConfig = (element: Element): MapConfig =>
  ({
    language: 'en',
    ...JSON.parse(element.getAttribute('data-map-config') ?? '{}'),
  }) as MapConfig

/** Runtime resources belong to the host Mount, never to the application model. */
export const MountMap = Mount.defineStream('MountCreaseMap', {
  messages: [
    MapMessage.MapLoaded,
    MapMessage.MapFailed,
    MapMessage.MapViewportChanged,
    MapMessage.MapClicked,
    MapMessage.MapFeatureClicked,
    MapMessage.MapMarkerDragged,
  ],
  execute: ({ element }) =>
    Stream.callback<MapMessage>(queue =>
      Effect.gen(function* () {
        if (!(element instanceof HTMLElement)) return yield* Effect.never
        const emit = (message: MapMessage) => Queue.offerUnsafe(queue, message)
        const [api, worker] = yield* Effect.promise(() =>
          Promise.all([
            import('maplibre-gl'),
            import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
            import('maplibre-gl/dist/maplibre-gl.css'),
          ]),
        )
        const workerUrl = worker.default
        api.setWorkerUrl(workerUrl)
        yield* Effect.acquireRelease(
          Effect.sync(() => mountMap(element, api, emit)),
          release => Effect.sync(release),
        )
        return yield* Effect.never
      }),
    ),
})

type MapLibreApi = typeof MapLibre

/** Kept separate from Mount so lifecycle behavior can be tested with a deterministic renderer. */
export const mountMap = (
  root: HTMLElement,
  api: MapLibreApi,
  emit: (message: MapMessage) => void,
): (() => void) => {
  const host = root.querySelector<HTMLElement>('[data-slot="map-canvas"]')!
  const status = root.querySelector<HTMLElement>('[data-slot="map-status"]')!
  const statusText = root.querySelector<HTMLElement>(
    '[data-slot="map-status-text"]',
  )!
  const retry = root.querySelector<HTMLButtonElement>(
    '[data-map-action="retry"]',
  )!
  let config = parseConfig(root)
  let map: MapLibreMap | undefined
  let disposed = false
  let request: AbortController | undefined
  let styleRevision = 0
  let appliedStyleRevision = 0
  let styleKey = ''
  let styleReady = false
  let layerKey = ''
  let frame = 0
  let drag:
    | { element: HTMLElement; id: string; longitude: number; latitude: number }
    | undefined
  const theme = () =>
    config.theme ?? (root.closest('.dark') !== null ? 'dark' : 'light')
  const translations = () =>
    mapTranslations(config.language, config.translations)
  const localizeControls = () => {
    const actions = {
      'zoom-in': 'zoomIn',
      'zoom-out': 'zoomOut',
      north: 'resetBearing',
      locate: 'locate',
      fullscreen: 'fullscreen',
    } as const
    for (const group of root.querySelectorAll<HTMLElement>(
      '[data-slot="map-controls"]',
    )) {
      const overrides = JSON.parse(group.dataset.mapControlsConfig ?? '{}') as {
        language?: string
        translations?: Partial<MapTranslations>
      }
      const t = mapTranslations(overrides.language ?? config.language, {
        ...config.translations,
        ...overrides.translations,
      })
      group.setAttribute('aria-label', t.controls)
      for (const button of group.querySelectorAll<HTMLElement>(
        '[data-map-action]',
      )) {
        const action = button.dataset.mapAction as keyof typeof actions
        if (actions[action]) {
          button.setAttribute('aria-label', t[actions[action]])
          button.title = t[actions[action]]
        }
      }
    }
    for (const popup of root.querySelectorAll<HTMLElement>(
      '[data-slot="map-popup"]',
    )) {
      const overrides = JSON.parse(popup.dataset.mapPopupConfig ?? '{}') as {
        language?: string
        translations?: Partial<MapTranslations>
      }
      const t = mapTranslations(overrides.language ?? config.language, {
        ...config.translations,
        ...overrides.translations,
      })
      const close = popup.querySelector<HTMLElement>(
        '[data-slot="map-popup-close"]',
      )
      close?.setAttribute('aria-label', t.close)
      if (close) close.title = t.close
    }
    const attribution = root.querySelector<HTMLElement>(
      '.maplibregl-ctrl-attrib-button',
    )
    attribution?.setAttribute('aria-label', translations().attribution)
    if (attribution) attribution.title = translations().attribution
  }
  const setStatus = (state: 'loading' | 'ready' | 'error', reason?: string) => {
    root.dataset.mapState = state
    root.setAttribute('aria-busy', String(state === 'loading'))
    status.hidden = state === 'ready'
    status.setAttribute('role', state === 'error' ? 'alert' : 'status')
    statusText.textContent =
      state === 'error' ? translations().error : translations().loading
    retry.textContent = translations().retry
    retry.hidden = state !== 'error'
    if (state === 'error')
      emit(MapMessage.MapFailed({ reason: reason ?? translations().error }))
  }
  const duration = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400
  const projectOverlays = () => {
    if (!map) return
    for (const overlay of root.querySelectorAll<HTMLElement>(
      '[data-map-coordinate]',
    )) {
      const coordinate = JSON.parse(overlay.dataset.mapCoordinate!) as [
        number,
        number,
      ]
      const point = map.project(coordinate)
      overlay.style.left = `${point.x}px`
      overlay.style.top = `${point.y}px`
      overlay.style.visibility =
        point.x < -100 ||
        point.y < -100 ||
        point.x > root.clientWidth + 100 ||
        point.y > root.clientHeight + 100
          ? 'hidden'
          : 'visible'
    }
  }
  let installedLayers: MapLayerConfig[] = []
  const syncLayers = () => {
    if (!map || !styleReady) return
    const descriptors = [
      ...root.querySelectorAll<HTMLElement>('[data-map-layer]'),
    ].map(node => JSON.parse(node.dataset.mapLayer!) as MapLayerConfig)
    const nextKey = JSON.stringify(descriptors)
    if (nextKey === layerKey) return
    for (const descriptor of installedLayers) {
      for (const layer of [...descriptor.layers].reverse())
        if (map.getLayer(layer.id)) map.removeLayer(layer.id)
      if (map.getSource(descriptor.id)) map.removeSource(descriptor.id)
    }
    installedLayers = []
    const ids = new Set<string>()
    for (const descriptor of descriptors) {
      if (ids.has(descriptor.id) || map.getSource(descriptor.id))
        throw new Error(`Map layer id must be unique: ${descriptor.id}`)
      ids.add(descriptor.id)
      map.addSource(descriptor.id, descriptor.source)
      installedLayers.push(descriptor)
      for (const layer of descriptor.layers) map.addLayer(layer)
    }
    layerKey = nextKey
  }
  const syncViewport = () => {
    if (!map || !config.viewport) return
    const current = map.getCenter()
    const next = config.viewport
    if (
      Math.abs(current.lng - next.center[0]) > 1e-7 ||
      Math.abs(current.lat - next.center[1]) > 1e-7 ||
      Math.abs(map.getZoom() - next.zoom) > 1e-7 ||
      Math.abs(map.getBearing() - next.bearing) > 1e-7 ||
      Math.abs(map.getPitch() - next.pitch) > 1e-7
    )
      map.jumpTo({ ...next, center: [...next.center] })
  }
  const reportViewport = () => {
    if (!map) return
    const center = map.getCenter()
    emit(
      MapMessage.MapViewportChanged({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      }),
    )
  }
  const onStyleLoad = () => {
    if (appliedStyleRevision !== styleRevision) return
    styleReady = true
    layerKey = ''
    try {
      syncLayers()
      projectOverlays()
      localizeControls()
    } catch (error) {
      setStatus('error', String(error))
    }
  }
  const onClick = (event: MapMouseEvent) => {
    if (!map) return
    const ids = installedLayers
      .filter(layer => layer.interactive || layer.cluster)
      .flatMap(layer => layer.layers.map(item => item.id))
      .filter(id => map!.getLayer(id))
    const feature =
      ids.length > 0
        ? map.queryRenderedFeatures(event.point, { layers: ids })[0]
        : undefined
    if (feature) {
      const descriptor = installedLayers.find(layer =>
        layer.layers.some(item => item.id === feature.layer.id),
      )!
      const properties = feature.properties ?? {}
      if (
        descriptor.cluster &&
        typeof properties.cluster_id === 'number' &&
        feature.geometry.type === 'Point'
      ) {
        const coordinates = feature.geometry.coordinates as [number, number]
        const source = map.getSource(descriptor.id)
        if (source instanceof api.GeoJSONSource)
          void source
            .getClusterExpansionZoom(properties.cluster_id)
            .then(zoom => {
              if (!disposed)
                map?.easeTo({ center: coordinates, zoom, duration: duration() })
            })
            .catch(error => {
              if (!disposed)
                emit(MapMessage.MapFailed({ reason: String(error) }))
            })
      }
      emit(
        MapMessage.MapFeatureClicked({
          layerId: descriptor.id,
          propertiesJson: JSON.stringify(properties),
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        }),
      )
    } else
      emit(
        MapMessage.MapClicked({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        }),
      )
  }
  const loadStyle = async (force = false) => {
    const selected = config.blank
      ? ({
          version: 8,
          glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
          sources: {},
          layers: [],
        } as StyleSpecification)
      : (config.styles?.[theme()] ??
        (theme() === 'dark'
          ? OPENFREEMAP_STYLES.dark
          : OPENFREEMAP_STYLES.positron))
    const palette =
      config.themed === true || config.palette !== undefined
        ? readMapPalette(root, theme(), config.palette)
        : undefined
    const key = JSON.stringify([selected, palette, config.language])
    if (!force && key === styleKey) return
    styleKey = key
    const revision = ++styleRevision
    styleReady = false
    request?.abort()
    request = new AbortController()
    setStatus('loading')
    try {
      let base: StyleSpecification
      if (typeof selected === 'string') {
        const response = await fetch(selected, { signal: request.signal })
        if (!response.ok)
          throw new Error(`Map style request failed (${response.status})`)
        base = (await response.json()) as StyleSpecification
        // Preserve relative resources when loading a hosted custom style ourselves.
        const resolve = (url: string) =>
          /^(?:https?:|data:|mapbox:|pmtiles:)/.test(url)
            ? url
            : new URL(url, response.url || selected).href
        if (base.glyphs) base.glyphs = resolve(base.glyphs)
        if (typeof base.sprite === 'string') base.sprite = resolve(base.sprite)
        else if (Array.isArray(base.sprite))
          base.sprite = base.sprite.map(sprite => ({
            ...sprite,
            url: resolve(sprite.url),
          }))
        for (const source of Object.values(base.sources)) {
          if ('url' in source && typeof source.url === 'string')
            source.url = resolve(source.url)
          if ('tiles' in source && Array.isArray(source.tiles))
            source.tiles = source.tiles.map(resolve)
        }
      } else base = selected
      if (disposed || revision !== styleRevision) return
      const style = createMapStyle(base, {
        ...(palette ? { palette } : {}),
        ...(config.language ? { language: config.language } : {}),
      })
      layerKey = ''
      installedLayers = []
      appliedStyleRevision = revision
      if (map) map.setStyle(style, { diff: false })
      else {
        map = new api.Map({
          container: host,
          style,
          center: [
            ...(config.viewport?.center ??
              config.center ?? [11.576124, 48.137154]),
          ],
          zoom: config.viewport?.zoom ?? config.zoom ?? 11,
          bearing: config.viewport?.bearing ?? 0,
          pitch: config.viewport?.pitch ?? 0,
          interactive: config.interactive ?? true,
          cooperativeGestures: config.cooperativeGestures ?? false,
          attributionControl: { compact: true },
          locale: {
            'AttributionControl.ToggleAttribution': translations().attribution,
          },
        })
        map.on('style.load', onStyleLoad)
        map.on('idle', () => {
          if (styleReady && root.dataset.mapState === 'loading') {
            setStatus('ready')
            emit(MapMessage.MapLoaded())
          }
        })
        map.on('move', projectOverlays)
        map.on('moveend', reportViewport)
        map.on('click', onClick)
        map.on('error', event => {
          if (root.dataset.mapState === 'loading')
            setStatus('error', event.error.message)
        })
        map
          .getCanvas()
          .setAttribute('aria-label', root.getAttribute('aria-label') ?? 'Map')
      }
    } catch (error) {
      if (!disposed && revision === styleRevision)
        setStatus('error', String(error))
    }
  }
  const reconcile = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      config = parseConfig(root)
      localizeControls()
      void loadStyle()
      syncViewport()
      try {
        syncLayers()
        projectOverlays()
      } catch (error) {
        setStatus('error', String(error))
      }
    })
  }
  const observer = new MutationObserver(records => {
    if (
      records.some(
        record =>
          record.type === 'attributes' ||
          [...record.addedNodes, ...record.removedNodes].some(
            node =>
              node instanceof Element &&
              (node.matches(
                '[data-map-layer], [data-map-coordinate], [data-slot="map-controls"], [data-slot="map-popup"]',
              ) ||
                node.querySelector('[data-map-layer], [data-map-coordinate]')),
          ),
      )
    )
      reconcile()
  })
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      'data-map-config',
      'data-map-layer',
      'data-map-coordinate',
      'data-map-controls-config',
      'data-map-popup-config',
    ],
  })
  const themeObserver = new MutationObserver(reconcile)
  for (
    let ancestor: HTMLElement | null = root;
    ancestor;
    ancestor = ancestor.parentElement
  )
    themeObserver.observe(ancestor, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
  const resize = new ResizeObserver(() => {
    map?.resize()
    projectOverlays()
  })
  resize.observe(root)
  const controls = (event: MouseEvent) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-map-action]')
        : null
    if (!target || !root.contains(target)) return
    const action = target.dataset.mapAction
    if (action === 'retry') {
      void loadStyle(true)
      return
    }
    if (!map) return
    if (action === 'zoom-in') map.zoomIn({ duration: duration() })
    if (action === 'zoom-out') map.zoomOut({ duration: duration() })
    if (action === 'north')
      map.easeTo({ bearing: 0, pitch: 0, duration: duration() })
    if (action === 'fullscreen')
      void (
        document.fullscreenElement === root
          ? document.exitFullscreen()
          : root.requestFullscreen()
      ).catch(error => emit(MapMessage.MapFailed({ reason: String(error) })))
    if (action === 'locate') {
      if (!navigator.geolocation) {
        emit(MapMessage.MapFailed({ reason: 'Geolocation is unavailable.' }))
        return
      }
      navigator.geolocation.getCurrentPosition(
        position => {
          if (!disposed)
            map?.easeTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: 14,
              duration: duration(),
            })
        },
        error => {
          if (!disposed) emit(MapMessage.MapFailed({ reason: error.message }))
        },
      )
    }
  }
  const pointerDown = (event: PointerEvent) => {
    const marker =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-map-draggable="true"]')
        : null
    if (!marker || !map) return
    event.preventDefault()
    const coordinate = JSON.parse(marker.dataset.mapCoordinate!) as [
      number,
      number,
    ]
    drag = {
      element: marker,
      id: marker.dataset.mapMarkerId ?? '',
      longitude: coordinate[0],
      latitude: coordinate[1],
    }
    marker.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: PointerEvent) => {
    if (!drag || !map) return
    const rect = host.getBoundingClientRect()
    const point = map.unproject([
      event.clientX - rect.left,
      event.clientY - rect.top,
    ])
    drag.longitude = point.lng
    drag.latitude = point.lat
    drag.element.dataset.mapCoordinate = JSON.stringify([point.lng, point.lat])
    projectOverlays()
  }
  const pointerUp = (event: PointerEvent) => {
    if (!drag) return
    if (drag.element.hasPointerCapture(event.pointerId))
      drag.element.releasePointerCapture(event.pointerId)
    emit(
      MapMessage.MapMarkerDragged({
        id: drag.id,
        longitude: drag.longitude,
        latitude: drag.latitude,
      }),
    )
    drag = undefined
  }
  const moveMarkerWithKeyboard = (event: KeyboardEvent) => {
    const marker =
      event.target instanceof HTMLElement &&
      event.target.matches('[data-map-draggable="true"]')
        ? event.target
        : undefined
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-5, 0],
      ArrowRight: [5, 0],
      ArrowUp: [0, -5],
      ArrowDown: [0, 5],
    }
    const delta = deltas[event.key]
    if (!marker || !map || !delta) return
    event.preventDefault()
    const point = map.project(
      JSON.parse(marker.dataset.mapCoordinate!) as [number, number],
    )
    const next = map.unproject([point.x + delta[0], point.y + delta[1]])
    marker.dataset.mapCoordinate = JSON.stringify([next.lng, next.lat])
    projectOverlays()
    emit(
      MapMessage.MapMarkerDragged({
        id: marker.dataset.mapMarkerId ?? '',
        longitude: next.lng,
        latitude: next.lat,
      }),
    )
  }
  root.addEventListener('click', controls)
  root.addEventListener('pointerdown', pointerDown)
  root.addEventListener('pointermove', pointerMove)
  root.addEventListener('pointerup', pointerUp)
  root.addEventListener('pointercancel', pointerUp)
  root.addEventListener('keydown', moveMarkerWithKeyboard)
  void loadStyle()
  return () => {
    disposed = true
    request?.abort()
    cancelAnimationFrame(frame)
    observer.disconnect()
    themeObserver.disconnect()
    resize.disconnect()
    root.removeEventListener('click', controls)
    root.removeEventListener('pointerdown', pointerDown)
    root.removeEventListener('pointermove', pointerMove)
    root.removeEventListener('pointerup', pointerUp)
    root.removeEventListener('pointercancel', pointerUp)
    root.removeEventListener('keydown', moveMarkerWithKeyboard)
    map?.remove()
  }
}
