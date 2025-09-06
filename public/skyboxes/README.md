# Skybox Assets

This directory contains skybox texture assets for the Descendants metaverse.

## ✅ Status: IMPLEMENTED & WORKING
- Enhanced skybox system with no flashing issues
- Tutorial-style simplicity with advanced features available
- Proper state management prevents white flashing on interactions
- Multiple usage modes: Simple, Tutorial, and Store-integrated

## Directory Structure

```
public/skyboxes/
├── default/           # Default skybox (required)
│   ├── 1.jpg         # Right face (+X)
│   ├── 2.jpg         # Left face (-X)
│   ├── 3.jpg         # Top face (+Y)
│   ├── 4.jpg         # Bottom face (-Y)
│   ├── 5.jpg         # Front face (+Z)
│   └── 6.jpg         # Back face (-Z)
├── sunset/           # Example additional skybox
├── space/            # Example additional skybox
└── README.md         # This file
```

## Skybox Format

### Numbered Format (Recommended)
- Files named: `1.jpg`, `2.jpg`, `3.jpg`, `4.jpg`, `5.jpg`, `6.jpg`
- Order follows Three.js cube map convention:
  1. **1.jpg** - Right face (+X axis)
  2. **2.jpg** - Left face (-X axis)
  3. **3.jpg** - Top face (+Y axis)
  4. **4.jpg** - Bottom face (-Y axis)
  5. **5.jpg** - Front face (+Z axis)
  6. **6.jpg** - Back face (-Z axis)

### Standard Format (Alternative)
- Files named: `px.jpg`, `nx.jpg`, `py.jpg`, `ny.jpg`, `pz.jpg`, `nz.jpg`
- p = positive, n = negative, x/y/z = axis

## Image Requirements

- **Resolution**: 1024x1024 or 2048x2048 pixels (square)
- **Format**: JPG, PNG, WebP, or AVIF
- **Quality**: High quality for best visual results
- **Seamless**: Images should tile seamlessly at edges
- **Consistent lighting**: All 6 faces should have consistent lighting

## Getting Skybox Images

### Free Sources
- [HDRI Haven](https://hdri-haven.com/) - High quality HDRI environments
- [Poly Haven](https://polyhaven.com/hdris) - Free HDRI collection
- [FreePBR](https://freepbr.com/materials/) - Free PBR materials and HDRIs

### Converting HDRI to Cube Maps
1. Use tools like:
   - [HDRI to CubeMap](https://jaxry.github.io/panorama-to-cubemap/)
   - Blender (built-in HDRI to cube map conversion)
   - Adobe Photoshop (3D > Spherical Panorama > Export Cube Map)

### Creating Custom Skyboxes
1. Take 6 photos facing each direction (N, S, E, W, Up, Down)
2. Ensure consistent exposure and white balance
3. Use photo editing software to match edges
4. Crop to square aspect ratio

## Quick Setup (WORKS NOW!)

✅ **Current Status**: System is implemented and working!

1. **Add 6 skybox images** to `public/skyboxes/default/`:
   - `1.jpg` (right face) 
   - `2.jpg` (left face)
   - `3.jpg` (top face)
   - `4.jpg` (bottom face)
   - `5.jpg` (front face)
   - `6.jpg` (back face)

2. **Your skybox loads automatically** - no code changes needed!

3. **Test it**: Visit `/skybox-test` to see it working

### Free Skybox Sources:
- [HDRI Haven](https://hdri-haven.com/) - High quality HDRIs
- [Poly Haven](https://polyhaven.com/hdris) - Free HDRI collection  
- [OpenGameArt](https://opengameart.org/art-search-advanced?keys=skybox) - Free skyboxes

## Example: Quick Setup with a Free Skybox

```bash
# 1. Create the directory (already done)
mkdir -p public/skyboxes/default

# 2. Download any 6-sided cube map or convert HDRI
# 3. Place files as:
#    public/skyboxes/default/1.jpg (right)
#    public/skyboxes/default/2.jpg (left)
#    public/skyboxes/default/3.jpg (top)
#    public/skyboxes/default/4.jpg (bottom)
#    public/skyboxes/default/5.jpg (front)
#    public/skyboxes/default/6.jpg (back)

# 4. Your skybox will load automatically
```

## Troubleshooting

### Skybox Not Loading
1. Check browser console for error messages
2. Verify all 6 images exist in correct path
3. Check image file sizes (not too large)
4. Ensure images are valid and not corrupted

### Skybox Looks Wrong
1. Verify image order matches cube map convention
2. Check that images are seamless at edges
3. Ensure consistent lighting across all faces
4. Try different image formats (JPG vs PNG)

### Performance Issues
1. Reduce image resolution (1024x1024 vs 2048x2048)
2. Use JPG format for smaller file sizes
3. Enable compression in skybox settings
4. Use performance mode in skybox controls

## Adding New Skyboxes

1. **Create new directory**: `public/skyboxes/your-skybox-name/`
2. **Add 6 images** following naming convention
3. **Update code** to include new preset in `skyboxPresets.ts`
4. **Test loading** through skybox controls

## Technical Notes

- Images are loaded using Three.js `CubeTextureLoader`
- Textures are cached for performance
- Memory usage is monitored and optimized
- Supports progressive loading and error recovery
- Compatible with PBR materials for realistic reflections

## Performance Recommendations

- **2048x2048**: High-end devices, showcase quality
- **1024x1024**: Recommended for most users
- **512x512**: Low-end devices, performance mode
- Use JPG for smaller file sizes
- Consider WebP for better compression with quality

## Current Implementation Features

✅ **Fixed Issues:**
- **No white flashing** on camera movements or block placements
- **Proper state management** prevents re-loading on every render
- **SSR safe** - works with Next.js server-side rendering

✅ **Available Components:**
- `SimpleSkybox` - Tutorial-style, just works
- `EnhancedSkybox` - Advanced features, configurable
- `StoreSkybox` - Full preset system with performance monitoring

✅ **Usage Examples:**
```tsx
// Simple - just add to your Canvas
import { SimpleSkybox } from '@/components/skybox'
<SimpleSkybox />

// Custom path
<SimpleSkybox path="/skyboxes/sunset/" />

// With callbacks  
<SimpleSkybox 
  onLoad={() => console.log('Loaded!')}
  onError={(err) => console.error(err)} 
/>
```

## Integration Status

✅ **Already integrated** in:
- Main voxel world (`VoxelCanvas.tsx`)
- Test page (`/skybox-test`)
- Full store system available for advanced use

---

**Need help?** 
- Check browser console for helpful loading messages
- Visit `/skybox-test` to verify system is working
- See `components/skybox/` for technical implementation details