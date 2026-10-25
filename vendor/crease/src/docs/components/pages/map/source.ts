import { foldkitApplication } from '@/docs/components/pages/authored-page'
import {
  munichPoints,
  munichRegion,
  munichRoute,
} from '@/docs/components/pages/map/preview'
import type { DocsExample } from '@/docs/components/page-definition'

export const mapExampleSource = (
  slug: string,
  index: number,
  title: string,
  renderer: 'tailwind' | 'stylex' | 'pleat',
): string => {
  const folder = renderer === 'stylex' ? 'stylex' : 'ui'
  const primary =
    slug === 'map' ? '' : `\nimport * as Component from '@/${folder}/${slug}'`
  let options = ''
  let overlay = ''
  let toolbar = ''
  const selectToolbar = (
    label: string,
    ariaLabel: string,
    items: ReadonlyArray<Readonly<{ value: string; label: string }>>,
  ) => `Label.label({ for: 'map-select-button', children: ['${label}'] }, h),
    Select.select({
      model: model.select,
      maybeSelectedValue: Option.some(model.selected),
      toParentMessage: message => DemoMessage.GotSelectMessage({ message }),
      ariaLabel: '${ariaLabel}',
      items: ${JSON.stringify(items)},
      itemToValue: item => item.value,
      itemToLabel: item => item.label,
    }, h),`
  if (slug === 'map' && index === 1) options = `viewport: model.viewport,`
  if (slug === 'map-controls')
    overlay = `Component.mapControls({ showLocate: ${index === 1}, showFullscreen: true, position: '${index === 1 ? 'bottom-left' : 'top-right'}' }, h)`
  if (slug === 'map-marker')
    overlay = `Component.mapMarker({ id: 'gate', longitude: model.longitude, latitude: model.latitude, ariaLabel: 'Marienplatz', draggable: ${index === 1}, children: [Component.markerContent({ children: ['●'] }, h), Component.markerLabel({ children: ['Marienplatz'] }, h)] }, h)`
  if (slug === 'map-popup') {
    overlay = `...(model.popupOpen ? [Component.mapPopup({ longitude: 11.576124, latitude: 48.137154, ariaLabel: 'Place details', onClose: DemoMessage.ToggledPopup(), children: [Text.text({ as: 'p', weight: 'semibold', children: ['Marienplatz'] }, h), Text.text({ as: 'p', children: ['An iconic landmark in central Munich.'] }, h)] }, h)] : [])`
    toolbar = `Button.button({ variant: 'outline', onClick: DemoMessage.ToggledPopup(), children: ['Toggle popup'] }, h),`
  }
  if (slug === 'map-route')
    overlay = `Component.mapRoute({ id: 'route', coordinates: ${JSON.stringify(munichRoute)}, ${index === 1 ? "dashArray: [2, 2], color: '#0f766e'," : ''} interactive: true }, h)`
  if (slug === 'map-arc') {
    options = `zoom: 4,`
    overlay = `Component.mapArc({ id: 'arc', from: [11.576124, 48.137154], to: [2.3522, 48.8566], curvature: ${index === 1 ? -0.3 : 0.2} }, h)`
  }
  if (slug === 'map-geojson') {
    options = index === 1 ? 'blank: true,' : ''
    overlay = `Component.mapGeoJSON({ id: 'region', data: ${JSON.stringify(munichRegion)}, ${index === 1 ? 'fillPaint: false,' : ''} interactive: true }, h)`
  }
  if (slug === 'map-cluster')
    overlay = `Component.mapClusterLayer({ id: 'locations', data: ${JSON.stringify(munichPoints)}, clusterRadius: ${index === 1 ? 80 : 50} }, h)`
  if (slug === 'map-styles') {
    options =
      index === 1
        ? `themed: true, palette: { ...Component.MAP_PALETTES.light, water: model.selected === 'warm' ? '#b9d9ca' : '#b9cde8', bg: model.selected === 'warm' ? '#fcf7ef' : '#f0f4fa' },`
        : `styles: { light: Component.OPENFREEMAP_STYLES[model.selected as keyof typeof Component.OPENFREEMAP_STYLES], dark: Component.OPENFREEMAP_STYLES[model.selected as keyof typeof Component.OPENFREEMAP_STYLES] },`
    toolbar = selectToolbar(
      'Map style',
      'Map style',
      (index === 1
        ? ['cool', 'warm']
        : ['positron', 'liberty', 'bright', 'dark']
      ).map(value => ({
        value,
        label: value[0]!.toUpperCase() + value.slice(1),
      })),
    )
  }
  if (slug === 'map-localization') {
    options = `language: model.selected, translations: Component.mapTranslations(model.selected),`
    overlay = `Controls.mapControls({ language: model.selected, translations: Component.mapTranslations(model.selected, { zoomIn: 'Enlarge the map' }) }, h)`
    toolbar = selectToolbar('Language', 'Map language', [
      { value: 'en', label: 'English' },
      { value: 'de', label: 'Deutsch' },
      { value: 'fr', label: 'Français' },
      { value: 'native', label: 'Local names' },
    ])
  }
  return foldkitApplication({
    title,
    imports: `import { Option, Schema as S } from 'effect'\nimport { Command, Runtime, Subscription, Update } from 'foldkit'\nimport type { Document, HtmlBuilder } from 'foldkit/html'\nimport { defineMessageUnion } from 'foldkit/message'\nimport * as Map from '@/${folder}/map'\nimport * as Controls from '@/${folder}/map-controls'\nimport * as Select from '@/${folder}/select'\nimport * as Button from '@/${folder}/button'\nimport * as Label from '@/${folder}/label'\nimport * as Text from '@/${folder}/text'${primary}`,
    model: `const Viewport = S.Struct({ center: S.Tuple([S.Number, S.Number]), zoom: S.Number, bearing: S.Number, pitch: S.Number })\nexport const Model = S.Struct({ selected: S.String, select: Select.Model, popupOpen: S.Boolean, longitude: S.Number, latitude: S.Number, viewport: Viewport })\nexport type Model = typeof Model.Type`,
    messages: `const DemoMessage = defineMessageUnion({ GotSelectMessage: { message: Select.Message }, ToggledPopup: {} })\nexport const Message = S.Union([Map.MapMessage, DemoMessage])\nexport type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { selected: '${slug === 'map-localization' ? 'en' : slug === 'map-styles' && index === 1 ? 'cool' : 'positron'}', select: Select.init({ id: 'map-select', isAnimated: true }), popupOpen: true, longitude: 11.576124, latitude: 48.137154, viewport: { center: [11.576124, 48.137154], zoom: 11, bearing: 0, pitch: 0 } } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {\n  switch (message._tag) {\n    case 'GotSelectMessage': {\n      const next = Select.update(model.select, message.message)\n      return {\n        model: { ...model, select: next.model, selected: next.outMessage?._tag === 'Selected' ? next.outMessage.value : model.selected },\n        commands: Command.mapMessages(next.commands ?? [], message => DemoMessage.GotSelectMessage({ message })),\n      }\n    }\n    case 'ToggledPopup': return { model: { ...model, popupOpen: !model.popupOpen } }\n    case 'MapViewportChanged': return { model: { ...model, viewport: { center: message.center, zoom: message.zoom, bearing: message.bearing, pitch: message.pitch } } }\n    case 'MapMarkerDragged': return { model: { ...model, longitude: message.longitude, latitude: message.latitude } }\n    default: return { model }\n  }\n}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({\n  title: '${title}',\n  body: h.main([], [\n    ${toolbar}\n    Map.map({\n      center: [11.576124, 48.137154], ${slug === 'map-arc' ? '' : 'zoom: ' + (['map-marker', 'map-popup', 'map-route'].includes(slug) ? 14 : 11) + ','} ariaLabel: '${title}',\n      ${options}\n      toMessage: message => message,\n      children: [${slug === 'map-controls' || slug === 'map-localization' ? '' : 'Controls.mapControls({}, h),'}\n        ${overlay}\n      ],\n    }, h),\n  ]),\n})`,
  })
}

export const mapDocsExamples = (
  slug: string,
  fixtures: ReadonlyArray<Readonly<{ title: string; description: string }>>,
  renderer: 'tailwind' | 'stylex' | 'pleat',
): ReadonlyArray<DocsExample> =>
  fixtures.map((fixture, index) => ({
    ...fixture,
    keepIdsCanonical: true,
    previewLayout: 'full-bleed',
    code: mapExampleSource(slug, index, fixture.title, renderer),
  }))
