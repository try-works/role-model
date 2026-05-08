# Advanced Integration Patterns

Advanced patterns for integrating TailwindCSS, Radix UI, and shadcn/ui in production applications.

## Table of Contents
- [Theme System Architecture](#theme-system-architecture)
- [Component Variant Patterns](#component-variant-patterns)
- [Form Patterns](#form-patterns)
- [Responsive Component Patterns](#responsive-component-patterns)
- [Performance Optimization](#performance-optimization)
- [Testing Strategies](#testing-strategies)

## Theme System Architecture

### CSS Variables + Tailwind Config

```css
/* globals.css */
@layer base {
  :root {
    /* Color primitives */
    --gray-50: 250 250 250;
    --gray-900: 24 24 27;

    /* Semantic tokens */
    --background: var(--gray-50);
    --foreground: var(--gray-900);
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;

    /* Component tokens */
    --radius: 0.5rem;
    --input-height: 2.5rem;
  }

  .dark {
    --background: var(--gray-900);
    --foreground: var(--gray-50);
    /* ... other dark tokens */
  }
}
```

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
}
```

### Multi-Brand Theme Switching

```tsx
// contexts/theme-context.tsx
export const THEMES = {
  default: {
    primary: '222 47% 11%',
    radius: '0.5rem',
  },
  rounded: {
    primary: '221 83% 53%',
    radius: '1rem',
  },
  sharp: {
    primary: '142 71% 45%',
    radius: '0rem',
  },
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<keyof typeof THEMES>('default')

  useEffect(() => {
    const root = document.documentElement
    const tokens = THEMES[theme]

    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

## Component Variant Patterns

### Using Class Variance Authority

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### Compound Variants

```tsx
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      primary: "bg-primary",
      secondary: "bg-secondary",
    },
    size: {
      small: "text-sm",
      large: "text-lg",
    },
  },
  compoundVariants: [
    {
      variant: "primary",
      size: "large",
      className: "font-bold uppercase", // Only when both match
    },
  ],
})
```

## Form Patterns

### Reusable Form Fields

```tsx
// components/form/form-field-wrapper.tsx
import { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"

interface FormFieldWrapperProps {
  form: UseFormReturn<any>
  name: string
  label?: string
  description?: string
  required?: boolean
  children: (field: any) => React.ReactNode
}

export function FormFieldWrapper({
  form,
  name,
  label,
  description,
  required,
  children,
}: FormFieldWrapperProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>{children(field)}</FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// Usage
<FormFieldWrapper
  form={form}
  name="email"
  label="Email"
  description="We'll never share your email"
  required
>
  {(field) => <Input type="email" placeholder="you@example.com" {...field} />}
</FormFieldWrapper>
```

### Multi-Step Forms

```tsx
// components/form/multi-step-form.tsx
export function MultiStepForm() {
  const [step, setStep] = useState(1)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })

  const steps = [
    { title: "Personal Info", fields: ["name", "email"] },
    { title: "Address", fields: ["street", "city"] },
    { title: "Confirmation", fields: [] },
  ]

  function onSubmit(data: z.infer<typeof schema>) {
    if (step < steps.length) {
      setStep(step + 1)
      return
    }
    // Final submission
    console.log(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < step ? "bg-primary" : "bg-gray-200"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        {step === 1 && <Step1Fields form={form} />}
        {step === 2 && <Step2Fields form={form} />}
        {step === 3 && <Step3Summary form={form} />}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button type="submit">
            {step < steps.length ? "Next" : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

## Responsive Component Patterns

### Responsive Dialog/Drawer

```tsx
// components/responsive-dialog.tsx
import { useMediaQuery } from "@/hooks/use-media-query"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Drawer, DrawerContent } from "@/components/ui/drawer"

interface ResponsiveDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ResponsiveDialog({
  children,
  open,
  onOpenChange,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">{children}</DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>{children}</DrawerContent>
    </Drawer>
  )
}

// Usage
<ResponsiveDialog>
  <DialogHeader>
    <DialogTitle>Edit Profile</DialogTitle>
  </DialogHeader>
  {/* Content works for both dialog and drawer */}
</ResponsiveDialog>
```

### Responsive Navigation

```tsx
// components/nav.tsx
export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-6">
        <NavLink href="/">Home</NavLink>
        <NavLink href="/about">About</NavLink>
        <NavLink href="/contact">Contact</NavLink>
      </nav>

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <MenuIcon />
      </Button>

      {/* Mobile sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left">
          <nav className="flex flex-col gap-4">
            <NavLink href="/" onClick={() => setMobileMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink href="/about" onClick={() => setMobileMenuOpen(false)}>
              About
            </NavLink>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

## Performance Optimization

### Code Splitting Components

```tsx
// Lazy load heavy components
import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const DataTable = lazy(() => import('@/components/data-table'))
const Chart = lazy(() => import('@/components/chart'))

export function Dashboard() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <DataTable />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
        <Chart />
      </Suspense>
    </div>
  )
}
```

### Virtualized Lists

```tsx
// components/virtualized-list.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function VirtualizedList({ items }: { items: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated row height
    overscan: 5, // Render extra items off-screen
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ListItem item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Optimizing Tailwind Bundle

```javascript
// tailwind.config.ts
export default {
  // Only scan files that use Tailwind
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    // Don't scan node_modules except specific packages
    './node_modules/@my-company/ui/**/*.{ts,tsx}',
  ],

  // Remove unused variants
  corePlugins: {
    float: false,
    objectFit: false,
    objectPosition: false,
    // ... disable unused utilities
  },
}
```

## Testing Strategies

### Component Testing with Testing Library

```tsx
// __tests__/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Accessibility Testing

```tsx
// __tests__/dialog.test.tsx
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

expect.extend(toHaveNoViolations)

describe('Dialog accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>Content</DialogContent>
      </Dialog>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('traps focus within dialog', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <button>First</button>
          <button>Last</button>
        </DialogContent>
      </Dialog>
    )

    const first = screen.getByRole('button', { name: /first/i })
    const last = screen.getByRole('button', { name: /last/i })

    // Tab through and verify focus trap
    first.focus()
    await userEvent.tab()
    expect(last).toHaveFocus()
    await userEvent.tab()
    expect(first).toHaveFocus() // Should loop back
  })
})
```

### Visual Regression Testing

```tsx
// __tests__/visual/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
}

export default meta
type Story = StoryObj<typeof Button>

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
}
```

## Best Practices Summary

1. **Theme System**: Use CSS variables + Tailwind config for flexible theming
2. **Component Variants**: Use CVA for type-safe variant management
3. **Forms**: Create reusable field wrappers, use Zod for validation
4. **Responsive**: Build mobile-first, use media queries or responsive components
5. **Performance**: Code split, virtualize large lists, optimize Tailwind
6. **Testing**: Test behavior, accessibility, and visual regressions
7. **Composition**: Build complex components from simple primitives
8. **Customization**: Modify shadcn/ui components directly (you own the code)

---

These patterns provide a solid foundation for building production-ready applications with the modern UI stack.
