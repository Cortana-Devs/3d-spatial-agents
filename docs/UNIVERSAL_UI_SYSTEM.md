# Universal FloatingPanel UI System

## Overview

We've created a universal, beautiful UI system that makes the glassmorphism floating panels consistent across the entire application. This replaces the old manual `floating-panel` class usage with easy-to-use React components.

## What We Built

### ✅ Core Components
- **FloatingPanel** - Base container with glassmorphism effect
- **FloatingPanelHeader** - Consistent headers
- **FloatingPanelItem** - Key-value pairs (label/value)
- **FloatingPanelSection** - Grouped content with titles
- **FloatingPanelDivider** - Visual separators

### ✅ Pre-built Variants
- **FloatingStats** - For statistics/metrics (most common)
- **FloatingHelp** - For instructions/help text
- **FloatingCard** - Simple card with title and content

### ✅ Text Components
- **Text** - Body text with variants (body, secondary, primary, muted)
- **Heading** - Headers (h1-h4) with consistent styling
- **Mono** - Monospace text for values/codes
- **Accent** - Highlighted text with colors

## Quick Usage

### 90% of cases - Use FloatingStats:
```tsx
import { FloatingStats } from "@components/ui/FloatingPanel";

<FloatingStats
  title="World Stats"
  stats={[
    { label: "Blocks", value: "966 / 10000", mono: true },
    { label: "Players", value: 5 },
    { label: "AI Simulants", value: 13, mono: true }
  ]}
/>
```

### Help panels:
```tsx
import { FloatingHelp } from "@components/ui/FloatingPanel";

<FloatingHelp
  instructions={[
    "Tap to place • Drag to orbit",           // Mobile
    "Click to place • Drag to orbit • Scroll" // Desktop
  ]}
  action="Click to place blocks"
/>
```

### Custom layouts:
```tsx
import {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelItem,
  FloatingPanelDivider,
} from "@components/ui/FloatingPanel";

<FloatingPanel>
  <FloatingPanelHeader>Custom Panel</FloatingPanelHeader>
  <FloatingPanelItem label="Health" value="100/100" mono />
  <FloatingPanelDivider />
  <FloatingPanelItem label="Level" value={42} />
</FloatingPanel>
```

## What We Updated

### ✅ Already Updated:
- `components/world/WorldInfo.tsx` - Now uses FloatingStats
- `app/page.tsx` - Now uses FloatingHelp
- `components/simulants/SimpleAnimationControls.tsx` - Custom panel

### 🔄 Need to Update:
All other components currently using:
- `className="floating-panel"`
- Manual `text-axiom-neutral-*` classes
- Hardcoded panel layouts

## Migration Pattern

### Before (Old):
```tsx
<div className="floating-panel p-4 space-y-3">
  <h3 className="text-sm font-semibold text-axiom-neutral-700 dark:text-axiom-neutral-300">
    Stats
  </h3>
  <div className="flex justify-between items-center">
    <span className="text-sm text-axiom-neutral-600 dark:text-axiom-neutral-400">
      Blocks
    </span>
    <span className="text-sm font-mono text-axiom-neutral-900 dark:text-axiom-neutral-100">
      966
    </span>
  </div>
</div>
```

### After (New):
```tsx
<FloatingStats
  title="Stats"
  stats={[
    { label: "Blocks", value: 966, mono: true }
  ]}
/>
```

## Benefits

- ✅ **Consistent styling** across all UI components
- ✅ **Automatic dark/light theme** adaptation
- ✅ **Beautiful glassmorphism** effects everywhere
- ✅ **Simple to use** - no more manual CSS classes
- ✅ **Responsive design** built-in
- ✅ **Easy to maintain** - change once, updates everywhere

## Files Created

- `components/ui/FloatingPanel.tsx` - All panel components
- `components/ui/Text.tsx` - Text components
- `components/examples/FloatingPanelExamples.tsx` - Usage examples
- `docs/UI_SYSTEM.md` - Complete documentation

## Next Steps

1. **Find components to update:**
   ```bash
   grep -r "floating-panel" components/
   ```

2. **Replace with new system** using patterns above

3. **Test in both light/dark modes**

4. **Remove old manual CSS classes**

That's it! The system is ready to use and makes beautiful, consistent UI panels effortless to create.