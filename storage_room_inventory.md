# Storage Room Inventory

## Location Data

- **Zone**: North-West Quadrant
- **Coordinates**:
  - X: `[-100, 0]`
  - Z: `[-75, -20]`
  - Y: `[0, 30]`

## Structural Elements

### Walls

1.  **Wall-North**: Rear boundary wall.
2.  **Wall-West**: Left boundary wall.
3.  **Wall-Divide-Center-Back**: Internal partition separating Storage from Conference Room (at X=0).
4.  **Wall-Divide-Storage-Left**: Front partition wall (Left of Door).
5.  **Wall-Divide-Storage-Right**: Front partition wall (Right of Door).

### Floor & Ceiling

1.  **Floor-Main-Slab**: Concrete slab base.
2.  **Tile Floor**: Tiled surface covering the room area.
3.  **Ceiling-Main**: Concrete ceiling slab at Y=30.

## Fixtures & access

### Door

- **ID**: `door-storage`
- **Label**: "Storage"
- **Position**: `[-50, 4, -20]`
- **Type**: Vertical Sliding Glass Door (Automatic).

### Lighting

- **Ceiling Light**:
  - **Position**: `[-50, 32, -50]`
  - **Color**: `#e0e0ff` (Cool White)
  - **Intensity**: 800
  - **Status**: Always On.

## Furniture & Storage
### Shelving Units (Fixed)

- **Count**: 2 Large Units (Refactored)
- **Structure**: 3-Tier Multi-Rack System.
- **Dimensions**: 80 (W) x 12 (H) x 5 (D)
- **Configuration**:
  - **Rack 1 (Bottom)**: Y = 2
  - **Rack 2 (Middle)**: Y = 7
  - **Rack 3 (Top)**: Y = 12
  - _Designed for future extensive grid-based item placement._
- **Material**: Metal Frame / Dark Gray Racks
- **Positions**:
  1.  Unit 1: `[-50, 0, -60]`
  2.  Unit 2: `[-50, 0, -40]`
