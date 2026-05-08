# Component Customization & Theming

## Component Customization Strategies

### Strategy 1: Direct Modification
shadcn/ui components live in your codebase - full ownership.

**Approach:**
- Edit files in `components/ui/` directly
- Add new variants with CVA (Class Variance Authority)
- Modify default styles
- You own the code - complete control

**When to use:**
- Project-specific components
- Unique design requirements
- Custom behavior needed

### Strategy 2: Variant Extension
Use Class Variance Authority (CVA) for type-safe variants.

**Example:**
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

**Benefits:**
- Type-safe component props
- Consistent variant patterns
- Easy to extend
- Compound variants for combinations

### Strategy 3: Wrapper Components
Create higher-level components with custom logic.

**Approach:**
- Wrap shadcn/ui components with custom components
- Add default props and behaviors
- Enforce design system constraints
- Add project-specific logic

**Example:**
```tsx
export function PrimaryButton({ children, ...props }) {
  return (
    <Button
      variant="default"
      size="lg"
      className="font-semibold"
      {...props}
    >
      {children}
    </Button>
  )
}
```

### Strategy 4: Theme Customization
Modify design tokens globally.

**Approach:**
- Change colors, spacing, typography in CSS variables
- Affects all components automatically
- Maintain consistency across application
- Single source of truth

**Example:**
```css
:root {
  --primary: 220 90% 56%;
  --radius: 0.5rem;
}
```

## Dark Mode Implementation

### Setup Requirements

#### 1. ThemeProvider
Wrap app with next-themes provider:
```tsx
import { ThemeProvider } from "next-themes"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

#### 2. Class Strategy
Use `class` dark mode (not media query):
```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // not 'media'
}
```

#### 3. Hydration Fix
Add `suppressHydrationWarning` to `<html>`:
```tsx
<html lang="en" suppressHydrationWarning>
```

#### 4. CSS Variables
Define dark mode tokens in `.dark` class:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

### Design Considerations

#### Contrast Requirements
- **Test all components in both modes**
- **Ensure WCAG AA minimum** (4.5:1 text, 3:1 UI)
- **Verify focus indicators** remain visible
- **Check disabled states** have sufficient contrast

#### Color Strategy
- **Use semantic tokens**: `background`, `foreground`, not color names
- **Test gradients**: May need different values per theme
- **Image handling**: Consider dark mode versions of images
- **Chart colors**: Adjust for legibility in both modes

#### Transitions
Smooth theme switching:
```css
* {
  transition: background-color 0.2s, color 0.2s;
}
```

Disable during switch to prevent flash:
```tsx
<ThemeProvider disableTransitionOnChange>
```

### Toggle Component

#### Requirements
- **Show current theme state** (sun/moon icon)
- **Keyboard accessible** (Space/Enter to toggle)
- **Visible focus indicator**
- **System preference detection**

#### Example Implementation
```tsx
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

### Testing Checklist
- [ ] All components visible in both modes
- [ ] Text contrast meets WCAG AA (4.5:1)
- [ ] UI components meet WCAG AA (3:1)
- [ ] Focus indicators visible in both modes
- [ ] Images appropriate for both modes
- [ ] Gradients work in both modes
- [ ] System preference detected correctly
- [ ] Toggle component keyboard accessible
- [ ] No flash of wrong theme on load
- [ ] Transitions smooth and performant

## Form Architecture

### Validation Strategy: React Hook Form + Zod

#### Benefits
- **Schema-first validation** with type inference
- **Unified error handling** and display
- **Accessible error messages**
- **Performance optimized** (minimal re-renders)

#### Setup
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* form fields */}
      </form>
    </Form>
  )
}
```

### Reusable Patterns

#### Field Wrappers
Consistent field structure:
```tsx
<FormField
  control={form.control}
  name="username"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Username</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormDescription>
        This is your public display name.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Required Indicators
Clear visual indication:
```tsx
<FormLabel>
  Email <span className="text-destructive">*</span>
</FormLabel>
```

#### Multi-Step Forms
Progress tracking:
```tsx
const [step, setStep] = useState(1)

<div className="mb-8">
  <Progress value={(step / totalSteps) * 100} />
  <p className="text-sm text-muted-foreground mt-2">
    Step {step} of {totalSteps}
  </p>
</div>
```

### Accessibility Requirements
- [ ] Associate labels with inputs (`htmlFor`, `id`)
- [ ] Provide error messages with `aria-describedby`
- [ ] Mark required fields (`aria-required`, `required`)
- [ ] Use appropriate input types (`email`, `tel`, `number`)
- [ ] Include helpful descriptions (`FormDescription`)
- [ ] Ensure keyboard navigation works
- [ ] Validate on blur for immediate feedback
- [ ] Submit on Enter key press
- [ ] Focus first error on submit
- [ ] Announce errors to screen readers
