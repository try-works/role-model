# Runtime UI Design System

## Intent

This runtime UI follows a Swiss International Style baseline:

- grid first
- mobile first
- whitespace as structure
- opacity, not hue, for hierarchy
- one accent color
- rectilinear surfaces

The runtime shell is an operator tool, so the system favors dense inspection layouts, narrow readable text columns, and explicit technical labeling over decorative UI.

## Core rules

1. **No rounded structural elements.** Cards, inputs, buttons, nav items, badges, and code blocks are rectilinear.
2. **One accent color.** Use the runtime accent only for actions, active state, and sparse emphasis.
3. **Typography stays light and precise.** IBM Plex Sans is the primary face; JetBrains Mono is reserved for paths, ids, and payloads.
4. **12-column thinking, even when implemented with split grids.** Mobile stacks first; larger breakpoints introduce two-column tension.
5. **Body copy stays narrow.** Explanatory text should stay near `60ch`.

## Tokens

### Typography

- Primary font: `IBM Plex Sans`
- Mono font: `JetBrains Mono`
- Labels: uppercase with wide tracking
- Page titles: light or normal weight, never heavy display bolding

### Color

- Background: warm stone
- Surface: lighter stone / white
- Text hierarchy: full, 72%, 52% opacity of the same foreground hue
- Accent: Swiss red

### Geometry

- Radius: `0`
- Border weight: hairline default, stronger only for active/focus states
- Shadows: subtle depth only on major shell surfaces

## Shell layout

- Desktop: left sidebar + main content
- Mobile: sidebar content stacks above the main region
- Sidebar contains grouped navigation and preserved host links
- Main header contains the route description, template note, and quick links

## Navigation groups

| Group | Routes |
| --- | --- |
| Operate | Dashboard, Workbench |
| Configure | Providers, Accounts, Endpoints |
| Inspect | Requests, Runtime |

## Page templates

| Route | Template | Layout definition |
| --- | --- | --- |
| `/app` | `overview-grid` | Summary stats first, then a split between recent requests and provider readiness |
| `/app/providers` | `catalog-grid` | Provider dossiers in a two-column grid with direct next-step actions |
| `/app/accounts` | `split-form-ledger` | Left: account form and OAuth actions. Right: current session and saved accounts |
| `/app/endpoints` | `split-form-ledger` | Left: endpoint activation workflow. Right: live registry table |
| `/app/workbench` | `composer-result` | Left: compact request composer. Right: dominant result pane |
| `/app/requests` | `request-ledger` | Single ledger with dense, scan-friendly request rows |
| `/app/requests/:requestId` | `detail-inspector` | Two equal inspection panes: request artifact and endpoint profile |
| `/app/runtime` | `system-contract` | Lifecycle summary, preserved host surfaces, and downstream provider contract |

## Component rules

### Cards and panels

- Use borders and spacing for separation
- Prefer internal dividers over nested decorative containers
- Use accent top rules only when a section truly needs emphasis

### Buttons

- Rectilinear only
- Minimum height `44px`
- Primary: filled dark foreground or accent
- Secondary: outlined

### Inputs

- Transparent or light surface
- Explicit focus border/ring
- No rounded treatments

### Badges

- Rectilinear labels
- Uppercase tracked text
- Accent badge only for the most important state

### Tables and payload blocks

- Always allow horizontal overflow
- Use mono for ids, paths, and JSON
- Use tabular numerals where numeric comparison matters

## Runtime-specific guidance

- Preserve links to `/logs`, `/api/metrics`, and `/ui` as adjacent host tools
- Keep request ids, endpoint ids, and model ids visually distinct with mono styling
- Treat OAuth state as operational status, not onboarding chrome
- Prefer direct action labels like `Configure account`, `Activate endpoint`, and `Run request`
