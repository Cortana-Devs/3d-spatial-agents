# Tailwind CSS 4.1 Setup Guide

This project uses Tailwind CSS 4.1 with CSS-based configuration instead of the traditional JavaScript config file approach.

## Key Changes from Tailwind v3 to v4

### 1. Configuration Method
- **v3**: Used `tailwind.config.js` with JavaScript configuration
- **v4**: Uses CSS-based configuration with `@theme` blocks in CSS files

### 2. Import Method
- **v3**: Required multiple `@tailwind` directives
- **v4**: Single `@import "tailwindcss";` statement

### 3. Content Detection
- **v3**: Manual content paths in config file
- **v4**: Automatic content detection (respects .gitignore)

## Project Configuration

### PostCSS Configuration (`postcss.config.mjs`)
```javascript
const config = {
  plugins: ["@tailwindcss/postcss"],
};
export default config;
```

### CSS Configuration (`app/globals.css`)
The theme is configured using CSS custom properties in the `@theme` block:

```css
@import "tailwindcss";

@theme {
  /* Axiom Design System Colors */
  --color-axiom-primary-500: #6366f1;
  --color-axiom-glow-cyan: #00f5ff;
  /* ... more colors */
}
```

## Axiom Design System Integration

### Color Palette
- **Primary**: Ethereal blues and purples (`axiom-primary-*`)
- **Glow**: Accent colors for effects (`axiom-glow-*`)
- **Neutral**: Grays with ethereal tint (`axiom-neutral-*`)
- **Block**: Specific colors for block types (`axiom-block-*`)

### Custom Animations
- `animate-glow-pulse`: Pulsing glow effect
- `animate-float`: Floating animation
- `animate-shimmer`: Shimmer effect

### Utility Classes
- `.glass-morphism`: Glassmorphism effect with backdrop blur
- `.floating-panel`: Pre-styled floating panel
- `.interactive-hover`: Smooth hover transitions
- `.glow-effect-*`: Various glow effects

## Usage Examples

### Using Axiom Colors
```jsx
<div className="bg-axiom-primary-500 text-axiom-neutral-50">
  Primary colored background
</div>
```

### Using Custom Animations
```jsx
<div className="animate-glow-pulse bg-axiom-glow-cyan">
  Glowing element
</div>
```

### Using Component Classes
```jsx
<div className="floating-panel interactive-hover">
  Floating panel with hover effects
</div>
```

## Performance Benefits

- **5x faster builds** compared to v3
- **100x faster incremental builds**
- **Automatic content detection** reduces configuration overhead
- **Modern CSS features** like cascade layers and CSS variables

## Migration Notes

If migrating from v3:
1. Remove `tailwind.config.js`
2. Update CSS imports to single `@import "tailwindcss";`
3. Move theme customizations to `@theme` blocks in CSS
4. Clear `.next` cache and rebuild

## Troubleshooting

### Classes Not Applying
1. Check browser console for PostCSS errors
2. Verify `@import "tailwindcss";` is present
3. Clear `.next` folder and rebuild
4. Ensure PostCSS configuration is correct

### Custom Classes Not Working
- Custom component classes are defined in `@layer components`
- Utility classes use the `@theme` configuration
- Check CSS syntax and ensure proper nesting