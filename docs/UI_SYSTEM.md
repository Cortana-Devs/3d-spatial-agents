# Universal FloatingPanel UI System

This document explains how to use the universal FloatingPanel system for consistent, beautiful UI components across the application.

## Overview

The FloatingPanel system provides a glassmorphism design with automatic light/dark theme adaptation. It consists of:

- **Base FloatingPanel**: Core container with glassmorphism effect
- **Composable Components**: Header, Content, Items, Sections, Dividers
- **Pre-built Variants**: Ready-to-use components for common patterns
- **Text Components**: Consistent typography system

## Quick Start

### Basic Panel

```tsx
import { FloatingPanel, FloatingPanelHeader } from "../components/ui/FloatingPanel";

<FloatingPanel>
  <FloatingPanelHeader>My Panel</FloatingPanelHeader>
  <div>Content goes here</div>
</FloatingPanel>
```

### Stats Panel (Most Common)

```tsx
import { FloatingStats } from "../components/ui/FloatingPanel";

<FloatingStats
  title="World Stats"
  stats={[
    { label: "Blocks", value: "966 / 10000", mono: true },
    { label: "Players", value: 5 },
    { label: "Active Time", value: "2h 34m", mono: true }
  ]}
/>
```

### Help Panel

```tsx
import { FloatingHelp } from "../components/ui/FloatingPanel";

<FloatingHelp
  instructions={[
    "Tap to place • Drag to orbit",           // Mobile
    "Click to place • Drag to orbit • Scroll" // Desktop
  ]}
  action="Click to place blocks"
  className="ml-4"
/>
```

## Components Reference

### FloatingPanel (Base)

The core container component.

**Props:**
- `size?: "sm" | "md" | "lg"` - Controls padding and spacing
- `variant?: "default" | "compact"` - Spacing variant
- `className?: string` - Additional CSS classes

**Sizes:**
- `sm`: Small padding (8px), tight spacing
- `md`: Medium padding (16px), normal spacing (default)
- `lg`: Large padding (24px), loose spacing

### FloatingPanelHeader

Consistent header styling for panel titles.

```tsx
<FloatingPanelHeader>Panel Title</FloatingPanelHeader>
```

### FloatingPanelItem

Key-value pair display with consistent styling.

**Props:**
- `label: string` - Left side label
- `value: string | number` - Right side value
- `mono?: boolean` - Use monospace font for value

```tsx
<FloatingPanelItem label="Blocks" value="966 / 10000" mono />
```

### FloatingPanelSection

Groups related content with a section title.

```tsx
<FloatingPanelSection title="Block Types">
  <FloatingPanelItem label="Stone" value={45} mono />
  <FloatingPanelItem label="Wood" value={23} mono />
</FloatingPanelSection>
```

### FloatingPanelDivider

Visual separator between sections.

```tsx
<FloatingPanelDivider />
<FloatingPanelItem label="Total" value={68} mono />
```

## Pre-built Variants

### FloatingCard

Simple card with title and content area.

```tsx
<FloatingCard title="Settings">
  <Button>Save Changes</Button>
  <Button variant="outline">Cancel</Button>
</FloatingCard>
```

### FloatingStats

Optimized for displaying statistics and metrics.

```tsx
<FloatingStats
  title="Performance"
  stats={[
    { label: "FPS", value: 60, mono: true },
    { label: "Memory", value: "234 MB", mono: true },
    { label: "Entities", value: 1247 }
  ]}
/>
```

### FloatingHelp

For contextual help and instructions.

```tsx
<FloatingHelp
  instructions={["Mobile instruction", "Desktop instruction"]}
  action="Primary action text"
/>
```

## Text Components

Use these for consistent typography within panels.

### Text

```tsx
import { Text } from "../components/ui/Text";

<Text variant="body">Regular body text</Text>
<Text variant="secondary">Secondary/muted text</Text>
<Text variant="primary">Emphasized text</Text>
<Text variant="muted">Very subtle text</Text>
```

### Heading

```tsx
import { Heading } from "../components/ui/Text";

<Heading level={1}>Large heading</Heading>
<Heading level={2}>Medium heading</Heading>
<Heading level={3}>Small heading (default)</Heading>
<Heading level={4}>Tiny heading</Heading>
```

### Mono

```tsx
import { Mono } from "../components/ui/Text";

<Mono variant="primary">123.45</Mono>
<Mono variant="secondary">debug-info</Mono>
```

### Accent

```tsx
import { Accent } from "../components/ui/Text";

<Accent color="primary">Important note</Accent>
<Accent color="success">Success message</Accent>
<Accent color="warning">Warning text</Accent>
<Accent color="error">Error message</Accent>
```

## Best Practices

### DO ✅

```tsx
// Use pre-built variants when possible
<FloatingStats title="Stats" stats={data} />

// Combine components for custom layouts
<FloatingPanel>
  <FloatingPanelHeader>Custom Panel</FloatingPanelHeader>
  <FloatingPanelSection title="Section 1">
    <FloatingPanelItem label="Item" value="Value" mono />
  </FloatingPanelSection>
  <FloatingPanelDivider />
  <FloatingPanelItem label="Total" value={42} />
</FloatingPanel>

// Use consistent text components
<Text variant="body">Use semantic variants</Text>
<Mono variant="primary">{value}</Mono>
```

### DON'T ❌

```tsx
// Don't use raw floating-panel class
<div className="floating-panel p-4">...</div>

// Don't use inconsistent text styling
<span className="text-sm text-gray-600">Inconsistent text</span>

// Don't hardcode colors
<div className="text-red-500">Error message</div>
```

## Migration Guide

### Before (Old Way)
```tsx
<div className="floating-panel p-4 space-y-3">
  <h3 className="text-sm font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300">
    World Stats
  </h3>
  <div className="flex justify-between items-center">
    <span className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
      Blocks
    </span>
    <span className="text-sm font-mono text-axiom-neutral-900 dark:text-axiom-neutral-100">
      966 / 10000
    </span>
  </div>
</div>
```

### After (New Way)
```tsx
<FloatingStats
  title="World Stats"
  stats={[
    { label: "Blocks", value: "966 / 10000", mono: true }
  ]}
/>
```

## Color System

The system uses the Axiom color palette:

- **axiom-neutral-*** for backgrounds, borders, and text
- **axiom-primary-*** for accents and highlights
- **axiom-success/warning/error-*** for status colors

All colors automatically adapt to light/dark themes using Tailwind's `dark:` variants.

## Integration Guide

### Step 1: Import Components

```tsx
// For pre-built variants (recommended)
import { FloatingStats, FloatingHelp, FloatingCard } from "../components/ui/FloatingPanel";

// For custom layouts
import {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelItem,
  FloatingPanelSection,
  FloatingPanelDivider,
} from "../components/ui/FloatingPanel";

// For consistent text
import { Text, Heading, Mono, Accent } from "../components/ui/Text";
```

### Step 2: Replace Existing Panels

**Find components using:**
```bash
# Search for old floating-panel usage
grep -r "floating-panel" components/
grep -r "text-axiom-neutral" components/
```

**Replace patterns:**
```tsx
// OLD: Manual floating panel
<div className="floating-panel p-4 space-y-3">
  <h3 className="text-sm font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300">
    Stats
  </h3>
  // ... items
</div>

// NEW: Pre-built component
<FloatingStats title="Stats" stats={statsArray} />
```

### Step 3: Update Styling Classes

**Remove these patterns:**
- `floating-panel` class usage
- Manual `text-axiom-neutral-*` color classes
- Manual `dark:text-axiom-neutral-*` classes
- Hardcoded padding/spacing in panels

**Use these instead:**
- `<FloatingPanel>` component
- `<Text variant="...">` components
- Pre-built variants when possible

### Step 4: Test Responsiveness

All new components automatically include:
- ✅ Light/dark theme adaptation
- ✅ Glassmorphism effects
- ✅ Consistent spacing
- ✅ Responsive design
- ✅ Accessibility features

## Examples

See existing updated components:
- `components/world/WorldInfo.tsx` - Stats panel (✅ Updated)
- `app/page.tsx` - Help panel (✅ Updated)
- `components/simulants/SimpleAnimationControls.tsx` - Custom panel (✅ Updated)
- `components/examples/FloatingPanelExamples.tsx` - All patterns

## Quick Conversion Script

Create a script to help migrate existing components:

```bash
# Find all files with old patterns
find components/ -name "*.tsx" -exec grep -l "floating-panel\|text-axiom-neutral-" {} \;
```

Then manually update each file following the patterns in the examples.

## Future Additions

Planned components:
- `FloatingMenu` - For dropdown/context menus
- `FloatingForm` - For input forms
- `FloatingNotification` - For alerts/toasts
- `FloatingModal` - For modal dialogs