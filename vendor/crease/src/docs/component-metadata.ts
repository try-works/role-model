import type { ApiEntry } from './generated-component-api'
export const COMPONENTS = [
  'Accordion',
  'Action Bar',
  'Alert',
  'Alert Dialog',
  'Aspect Ratio',
  'Attachment',
  'Avatar',
  'Avatar Group',
  'Badge',
  'Banner',
  'Blockquote',
  'Breadcrumb',
  'Button',
  'Button Group',
  'Bubble',
  'Calendar',
  'Carousel',
  'Card',
  'Chart',
  'Chat Reasoning',
  'Checkbox',
  'Center',
  'Circular Progress',
  'Code',
  'Code Block',
  'Collapsible',
  'Color Picker',
  'Combobox',
  'Command',
  'Context Menu',
  'Data Grid',
  'Data Table',
  'Date Input',
  'Date Picker',
  'Date Range Input',
  'Date Time Input',
  'Dialog',
  'Direction',
  'Dropdown Menu',
  'Drawer',
  'Empty',
  'Field',
  'Field Status',
  'File Input',
  'Form',
  'Grid',
  'Heading',
  'Hover Card',
  'Indicator',
  'Info Tip',
  'Input',
  'Input Group',
  'Input OTP',
  'Item',
  'Kbd',
  'Label',
  'Lightbox',
  'Link',
  'List',
  'List Input',
  'Log Stream',
  'Map',
  'Map Controls',
  'Map Marker',
  'Map Popup',
  'Map Route',
  'Map Arc',
  'Map GeoJSON',
  'Map Cluster',
  'Map Styles',
  'Map Localization',
  'Markdown',
  'Marker',
  'Message',
  'Message Scroller',
  'Menubar',
  'Metadata List',
  'Mobile Nav',
  'More Menu',
  'Multi Selector',
  'Native Select',
  'Navigation Menu',
  'Number Input',
  'Overflow List',
  'Pagination',
  'Popover',
  'Progress',
  'Radio Group',
  'Resizable',
  'Scroll Area',
  'Section',
  'Select',
  'Selectable Card',
  'Separator',
  'Sheet',
  'Sidebar',
  'Skeleton',
  'Slider',
  'Spinner',
  'Stack',
  'Stat',
  'Status Dot',
  'Stepper',
  'Switch',
  'Table',
  'Tabs',
  'Text',
  'Textarea',
  'Thumbnail',
  'Time Input',
  'Timer',
  'Timestamp',
  'Toast',
  'Toggle',
  'Toggle Group',
  'Token',
  'Tokenizer',
  'Toolbar',
  'Tooltip',
  'Top Nav',
  'Transfer List',
  'Tree List',
  'Typography',
  'Visually Hidden',
] as const

export const MAP_COMPONENTS = [
  'Map',
  'Map Controls',
  'Map Marker',
  'Map Popup',
  'Map Route',
  'Map Arc',
  'Map GeoJSON',
  'Map Cluster',
  'Map Styles',
  'Map Localization',
] as const

type ComponentName = (typeof COMPONENTS)[number]
type MapComponentName = (typeof MAP_COMPONENTS)[number]
type NonMapComponentName = Exclude<ComponentName, MapComponentName>

const COMPONENT_GROUP_ORDER = [
  'Actions & Menus',
  'Chat & Messaging',
  'Collections',
  'Content',
  'Data Display',
  'Date & Time',
  'Feedback & Status',
  'Forms & Inputs',
  'Layout',
  'Navigation',
  'Overlays',
] as const
type ComponentGroupLabel = (typeof COMPONENT_GROUP_ORDER)[number]

const COMPONENT_GROUP_BY_NAME = {
  Accordion: 'Collections',
  'Action Bar': 'Actions & Menus',
  Alert: 'Feedback & Status',
  'Alert Dialog': 'Overlays',
  'Aspect Ratio': 'Layout',
  Attachment: 'Chat & Messaging',
  Avatar: 'Data Display',
  'Avatar Group': 'Data Display',
  Badge: 'Data Display',
  Banner: 'Feedback & Status',
  Blockquote: 'Content',
  Breadcrumb: 'Navigation',
  Button: 'Actions & Menus',
  'Button Group': 'Actions & Menus',
  Bubble: 'Chat & Messaging',
  Calendar: 'Date & Time',
  Carousel: 'Collections',
  Card: 'Collections',
  Chart: 'Data Display',
  'Chat Reasoning': 'Chat & Messaging',
  Checkbox: 'Forms & Inputs',
  Center: 'Layout',
  'Circular Progress': 'Feedback & Status',
  Code: 'Content',
  'Code Block': 'Content',
  Collapsible: 'Collections',
  'Color Picker': 'Forms & Inputs',
  Combobox: 'Forms & Inputs',
  Command: 'Actions & Menus',
  'Context Menu': 'Actions & Menus',
  'Data Grid': 'Data Display',
  'Data Table': 'Data Display',
  'Date Input': 'Date & Time',
  'Date Picker': 'Date & Time',
  'Date Range Input': 'Date & Time',
  'Date Time Input': 'Date & Time',
  Dialog: 'Overlays',
  Direction: 'Layout',
  'Dropdown Menu': 'Actions & Menus',
  Drawer: 'Overlays',
  Empty: 'Feedback & Status',
  Field: 'Forms & Inputs',
  'Field Status': 'Forms & Inputs',
  'File Input': 'Forms & Inputs',
  Form: 'Forms & Inputs',
  Grid: 'Layout',
  Heading: 'Content',
  'Hover Card': 'Overlays',
  Indicator: 'Feedback & Status',
  'Info Tip': 'Overlays',
  Input: 'Forms & Inputs',
  'Input Group': 'Forms & Inputs',
  'Input OTP': 'Forms & Inputs',
  Item: 'Collections',
  Kbd: 'Actions & Menus',
  Label: 'Forms & Inputs',
  Lightbox: 'Overlays',
  Link: 'Navigation',
  List: 'Collections',
  'List Input': 'Forms & Inputs',
  'Log Stream': 'Chat & Messaging',
  Markdown: 'Content',
  Marker: 'Content',
  Message: 'Chat & Messaging',
  'Message Scroller': 'Chat & Messaging',
  Menubar: 'Actions & Menus',
  'Metadata List': 'Data Display',
  'Mobile Nav': 'Navigation',
  'More Menu': 'Actions & Menus',
  'Multi Selector': 'Forms & Inputs',
  'Native Select': 'Forms & Inputs',
  'Navigation Menu': 'Navigation',
  'Number Input': 'Forms & Inputs',
  'Overflow List': 'Collections',
  Pagination: 'Navigation',
  Popover: 'Overlays',
  Progress: 'Feedback & Status',
  'Radio Group': 'Forms & Inputs',
  Resizable: 'Layout',
  'Scroll Area': 'Layout',
  Section: 'Layout',
  Select: 'Forms & Inputs',
  'Selectable Card': 'Collections',
  Separator: 'Layout',
  Sheet: 'Overlays',
  Sidebar: 'Layout',
  Skeleton: 'Feedback & Status',
  Slider: 'Forms & Inputs',
  Spinner: 'Feedback & Status',
  Stack: 'Layout',
  Stat: 'Data Display',
  'Status Dot': 'Feedback & Status',
  Stepper: 'Feedback & Status',
  Switch: 'Forms & Inputs',
  Table: 'Data Display',
  Tabs: 'Navigation',
  Text: 'Content',
  Textarea: 'Forms & Inputs',
  Thumbnail: 'Data Display',
  'Time Input': 'Date & Time',
  Timer: 'Date & Time',
  Timestamp: 'Date & Time',
  Toast: 'Feedback & Status',
  Toggle: 'Actions & Menus',
  'Toggle Group': 'Actions & Menus',
  Token: 'Forms & Inputs',
  Tokenizer: 'Forms & Inputs',
  Toolbar: 'Actions & Menus',
  Tooltip: 'Overlays',
  'Top Nav': 'Navigation',
  'Transfer List': 'Forms & Inputs',
  'Tree List': 'Collections',
  Typography: 'Content',
  'Visually Hidden': 'Content',
} as const satisfies Record<NonMapComponentName, ComponentGroupLabel>

const NON_MAP_COMPONENTS = COMPONENTS.filter(
  (name): name is NonMapComponentName =>
    !MAP_COMPONENTS.includes(name as MapComponentName),
)

export const COMPONENT_GROUPS = [
  ...COMPONENT_GROUP_ORDER.map(label => ({
    label,
    components: NON_MAP_COMPONENTS.filter(
      name => COMPONENT_GROUP_BY_NAME[name] === label,
    ),
  })),
  { label: 'Maps', components: MAP_COMPONENTS },
] as const

/** Page-to-page navigation follows the same category order as the sidebar. */
export const COMPONENT_NAV_ORDER = COMPONENT_GROUPS.flatMap(
  group => group.components,
)

export const toSlug = (name: string): string =>
  name.toLowerCase().replaceAll(' ', '-')

/** Removed components whose docs URLs now forward to the page that absorbed
    them. */
const COMPONENT_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'bottom-sheet': 'sheet',
}

export const canonicalComponentSlug = (slug: string): string =>
  COMPONENT_SLUG_ALIASES[slug] ?? slug

export const componentTitle = (slug: string): string | undefined =>
  COMPONENTS.find(name => toSlug(name) === canonicalComponentSlug(slug))
export const apiPurpose = (entry: ApiEntry): string => {
  switch (entry.name) {
    case 'Model':
      return 'State owned by the component and stored in the parent model.'
    case 'Message':
      return 'Child events delegated through the parent update loop.'
    case 'OutMessage':
      return 'Typed events emitted for the parent domain to interpret.'
    case 'init':
      return 'Creates the initial component model.'
    case 'update':
      return 'Applies a child message and returns state, commands, and optional output.'
    case 'view':
      return 'Submodel view embedded with h.submodel.'
    default:
      return entry.kind === 'function'
        ? 'Public operation or render helper.'
        : entry.kind === 'type'
          ? 'Public configuration or data contract.'
          : 'Public schema, message constructor, or compatibility export.'
  }
}
