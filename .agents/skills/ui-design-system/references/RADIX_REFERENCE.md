# Radix UI Primitives Reference

Complete guide to Radix UI accessible component primitives for building custom components.

## Table of Contents
- [What is Radix UI](#what-is-radix-ui)
- [Core Primitives](#core-primitives)
- [Overlay Components](#overlay-components)
- [Form Components](#form-components)
- [Navigation Components](#navigation-components)
- [Accessibility Features](#accessibility-features)

## What is Radix UI

**Radix UI** provides unstyled, accessible component primitives that handle:
- **Behavior**: Component logic and interactions
- **Accessibility**: ARIA attributes, keyboard navigation, focus management
- **Flexibility**: Unopinionated styling, full customization

**Use Radix when:**
- Building custom component libraries
- Need accessibility out of the box
- Want full control over styling
- shadcn/ui doesn't have the component you need

## Core Primitives

### Dialog

Accessible modal dialog with portal, overlay, and focus management.

```tsx
import * as Dialog from '@radix-ui/react-dialog'

export function CustomDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="...">Open Dialog</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />

        {/* Content */}
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-lg">
          <Dialog.Title className="text-2xl font-bold">Title</Dialog.Title>
          <Dialog.Description className="text-gray-600">
            Description text
          </Dialog.Description>

          {/* Your content */}
          <div>Content goes here</div>

          <Dialog.Close asChild>
            <button className="...">Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Key Features:**
- Automatic focus management
- Focus trap within modal
- Escape key to close
- Click outside to close (configurable)
- Body scroll lock when open
- ARIA attributes auto-applied

### Popover

Floating content anchored to a trigger element.

```tsx
import * as Popover from '@radix-ui/react-popover'

export function CustomPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="...">Open</button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bg-white p-4 rounded-lg shadow-lg"
          sideOffset={5}
        >
          <Popover.Arrow className="fill-white" />
          <div>Popover content</div>
          <Popover.Close className="...">Close</Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
```

**Positioning Props:**
- `side`: "top" | "right" | "bottom" | "left"
- `align`: "start" | "center" | "end"
- `sideOffset`: Distance from trigger
- `alignOffset`: Offset along aligned axis

### Dropdown Menu

Context menu with nested items, keyboard navigation.

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export function CustomDropdown() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="...">Options</button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="bg-white rounded-lg shadow-lg p-2">
          <DropdownMenu.Item className="px-3 py-2 hover:bg-gray-100 rounded">
            Edit
          </DropdownMenu.Item>

          <DropdownMenu.Item className="px-3 py-2 hover:bg-gray-100 rounded">
            Duplicate
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="px-3 py-2">
              More →
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className="...">
                <DropdownMenu.Item>Nested item</DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

          <DropdownMenu.Item className="px-3 py-2 text-red-600 hover:bg-red-50 rounded">
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
```

**Features:**
- Arrow key navigation
- Type-ahead search
- Nested submenus
- Checkbox and radio items

### Accordion

Collapsible sections with single or multiple open panels.

```tsx
import * as Accordion from '@radix-ui/react-accordion'

export function CustomAccordion() {
  return (
    <Accordion.Root type="single" collapsible className="...">
      <Accordion.Item value="item-1" className="border-b">
        <Accordion.Header>
          <Accordion.Trigger className="flex justify-between w-full py-4">
            <span>Question 1</span>
            <ChevronDownIcon className="..." />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="py-4">
          Answer to question 1
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="item-2" className="border-b">
        <Accordion.Header>
          <Accordion.Trigger className="...">
            Question 2
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="...">
          Answer to question 2
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  )
}
```

**Types:**
- `type="single"`: Only one panel open at a time
- `type="multiple"`: Multiple panels can be open
- `collapsible`: Allow closing the open panel

### Tabs

Accessible tab navigation with keyboard support.

```tsx
import * as Tabs from '@radix-ui/react-tabs'

export function CustomTabs() {
  return (
    <Tabs.Root defaultValue="tab1" className="...">
      <Tabs.List className="flex gap-2 border-b">
        <Tabs.Trigger value="tab1" className="px-4 py-2">
          Tab 1
        </Tabs.Trigger>
        <Tabs.Trigger value="tab2" className="px-4 py-2">
          Tab 2
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="tab1" className="p-4">
        Content for tab 1
      </Tabs.Content>

      <Tabs.Content value="tab2" className="p-4">
        Content for tab 2
      </Tabs.Content>
    </Tabs.Root>
  )
}
```

## Overlay Components

### Alert Dialog

Modal dialog for confirmations and destructive actions.

```tsx
import * as AlertDialog from '@radix-ui/react-alert-dialog'

export function DeleteConfirmation() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button className="...">Delete</button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-lg">
          <AlertDialog.Title className="text-xl font-bold">
            Are you sure?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-gray-600">
            This action cannot be undone.
          </AlertDialog.Description>

          <div className="flex gap-4 mt-6">
            <AlertDialog.Cancel asChild>
              <button className="...">Cancel</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button className="... bg-red-600">Delete</button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
```

### Tooltip

Accessible tooltip with automatic positioning.

```tsx
import * as Tooltip from '@radix-ui/react-tooltip'

export function WithTooltip() {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button className="...">Hover me</button>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-900 text-white px-3 py-2 rounded text-sm"
            sideOffset={5}
          >
            Tooltip content
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
```

## Form Components

### Checkbox

Accessible checkbox with indeterminate state support.

```tsx
import * as Checkbox from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

export function CustomCheckbox() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox.Root
        className="w-5 h-5 border rounded flex items-center justify-center"
        id="terms"
      >
        <Checkbox.Indicator>
          <CheckIcon className="w-4 h-4" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <label htmlFor="terms">Accept terms</label>
    </div>
  )
}
```

### Radio Group

Accessible radio button group.

```tsx
import * as RadioGroup from '@radix-ui/react-radio-group'

export function CustomRadioGroup() {
  return (
    <RadioGroup.Root defaultValue="option1" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <RadioGroup.Item
          value="option1"
          id="option1"
          className="w-5 h-5 border rounded-full"
        >
          <RadioGroup.Indicator className="block w-3 h-3 bg-blue-600 rounded-full m-auto" />
        </RadioGroup.Item>
        <label htmlFor="option1">Option 1</label>
      </div>

      <div className="flex items-center gap-2">
        <RadioGroup.Item value="option2" id="option2" className="...">
          <RadioGroup.Indicator className="..." />
        </RadioGroup.Item>
        <label htmlFor="option2">Option 2</label>
      </div>
    </RadioGroup.Root>
  )
}
```

### Select

Accessible select dropdown with search and keyboard navigation.

```tsx
import * as Select from '@radix-ui/react-select'

export function CustomSelect() {
  return (
    <Select.Root>
      <Select.Trigger className="inline-flex items-center gap-2 px-4 py-2 border rounded">
        <Select.Value placeholder="Select option..." />
        <Select.Icon>▼</Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="bg-white rounded-lg shadow-lg p-2">
          <Select.Viewport>
            <Select.Item value="option1" className="px-3 py-2 hover:bg-gray-100 rounded">
              <Select.ItemText>Option 1</Select.ItemText>
              <Select.ItemIndicator>✓</Select.ItemIndicator>
            </Select.Item>

            <Select.Item value="option2" className="px-3 py-2 hover:bg-gray-100 rounded">
              <Select.ItemText>Option 2</Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
```

### Slider

Accessible range slider with single or multiple thumbs.

```tsx
import * as Slider from '@radix-ui/react-slider'

export function CustomSlider() {
  return (
    <Slider.Root
      className="relative flex items-center w-full h-5"
      defaultValue={[50]}
      max={100}
      step={1}
    >
      <Slider.Track className="relative h-1 bg-gray-200 rounded-full flex-grow">
        <Slider.Range className="absolute h-full bg-blue-600 rounded-full" />
      </Slider.Track>
      <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-blue-600 rounded-full" />
    </Slider.Root>
  )
}
```

### Switch

Accessible toggle switch.

```tsx
import * as Switch from '@radix-ui/react-switch'

export function CustomSwitch() {
  return (
    <div className="flex items-center gap-2">
      <Switch.Root
        className="w-11 h-6 bg-gray-300 rounded-full data-[state=checked]:bg-blue-600"
        id="airplane-mode"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform data-[state=checked]:translate-x-5" />
      </Switch.Root>
      <label htmlFor="airplane-mode">Airplane Mode</label>
    </div>
  )
}
```

## Navigation Components

### Navigation Menu

Accessible multi-level navigation with keyboard support.

```tsx
import * as NavigationMenu from '@radix-ui/react-navigation-menu'

export function CustomNav() {
  return (
    <NavigationMenu.Root className="...">
      <NavigationMenu.List className="flex gap-4">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="...">
            Products
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="absolute top-full left-0 bg-white rounded-lg shadow-lg p-4">
            <ul className="...">
              <li><a href="/product1">Product 1</a></li>
              <li><a href="/product2">Product 2</a></li>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Link href="/about" className="...">
            About
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}
```

## Accessibility Features

### Built-in ARIA Support

Radix automatically handles:
- `role` attributes
- `aria-*` attributes
- `id` linking between components
- Focus management
- Keyboard navigation

### Keyboard Navigation

**Dialog/AlertDialog:**
- `Escape`: Close dialog
- `Tab`: Focus trap within dialog

**DropdownMenu:**
- `Space/Enter`: Open menu
- `↑↓`: Navigate items
- `→`: Open submenu
- `←`: Close submenu
- `Escape`: Close menu
- Type to search items

**Tabs:**
- `Tab`: Focus active tab panel
- `Arrow keys`: Navigate between tabs
- `Home/End`: First/last tab

**Accordion:**
- `Space/Enter`: Toggle panel
- `Arrow keys`: Navigate headers

### Focus Management

All Radix primitives handle focus correctly:
- Focus trap in modals
- Focus return on close
- Focus visible indicators
- Skip links support

### Screen Reader Support

Radix ensures screen reader compatibility:
- Proper semantic HTML
- ARIA labels and descriptions
- Live regions for dynamic content
- Hidden decorative elements

## Best Practices

1. **Always use asChild prop** when wrapping custom components:
   ```tsx
   <Dialog.Trigger asChild>
     <button>Custom button</button>
   </Dialog.Trigger>
   ```

2. **Style with Tailwind** or CSS-in-JS:
   ```tsx
   <Dialog.Content className="fixed left-[50%] top-[50%] ...">
   ```

3. **Use Portal for overlays** to render outside parent DOM:
   ```tsx
   <Dialog.Portal>
     <Dialog.Overlay />
     <Dialog.Content />
   </Dialog.Portal>
   ```

4. **Leverage data attributes** for state-based styling:
   ```tsx
   <Switch.Root className="data-[state=checked]:bg-blue-600">
   ```

5. **Compose primitives** for custom components:
   ```tsx
   // Build complex components from simple primitives
   <Popover.Root>
     <Popover.Trigger>
       <Select.Root>
         {/* Combine primitives */}
       </Select.Root>
     </Popover.Trigger>
   </Popover.Root>
   ```

## Resources

- Official Documentation: https://www.radix-ui.com/primitives
- GitHub: https://github.com/radix-ui/primitives
- Accessibility: https://www.radix-ui.com/primitives/docs/overview/accessibility

---

**Note:** shadcn/ui components are built on Radix UI primitives. You can modify shadcn/ui components or use Radix directly for full customization.
