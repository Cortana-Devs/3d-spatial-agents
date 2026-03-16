# Office Wall Layout Analysis

## Overview

This document outlines the coordinate layout of all walls in the `OfficeHub` environment.

- **Center**: `(0, 0)` is the center of the building.
- **Dimensions**: 200 (Width) x 150 (Depth).
- **Y-Position**: Walls are centered vertically based on `bHeight = 30`.

## ASCII Map

```
          (North)
     Z = -75
      +-------------------------+-------------------------+
      |                         |                         |
      |      STORAGE ROOM       |     CONFERENCE ROOM     |
      |      ( Shelves )        |        ( Table )        |
      |                         |                         |
      |      Door: -50          |        Door: +50        |
Z=-20 +-------+   +-------+  +--+-------+   +-------+-----+
      |       |___|       |  |  |       |___|       |     |
      |                   |     |                   |     |
      |                   |  ^  |                   |     |
      |    OPEN OFFICE    |  |  |    OPEN OFFICE    |     |
      |    (Left Desks)   |     |    (Right Desks)  |     |
      |                   |     |                   |     |
      |                   |     |                   |     |
      |                   |     |                   |     |
Z=+40 +-------+           +-----+           +-------+-----+
      |       |                                     |     |
      |       |               LOBBY                 |     |
      |       |                                     |     |
      +-------+----------+  ENTRANCE  +-------------+-----+
     Z = +75           (South)
```

## Outer Shell

| Wall Name            | Start (X, Z)  | End (X, Z)    | Dimensions (Approx) | Description                     |
| :------------------- | :------------ | :------------ | :------------------ | :------------------------------ |
| **Wall-North**       | `(-100, -75)` | `(100, -75)`  | 200 x 30            | Rear boundary wall.             |
| **Wall-East**        | `(100, -75)`  | `(100, 75)`   | 150 x 30            | Right boundary wall.            |
| **Wall-West**        | `(-100, 75)`  | `(-100, -75)` | 150 x 30            | Left boundary wall.             |
| **Wall-South-Left**  | `(-100, 75)`  | `(-15, 75)`   | 85 x 30             | Front wall (Left of Entrance).  |
| **Wall-South-Right** | `(15, 75)`    | `(100, 75)`   | 85 x 30             | Front wall (Right of Entrance). |

**Note**: The main entrance is a 30-unit gap between `X: -15` and `X: 15` at `Z: 75`.

---

## Internal Partitions

### Back Rooms Divider (Z = -20)

Separates the **Open Office** from the **Storage** and **Conference Rooms**.

| Wall Name                     | Start (X, Z)  | End (X, Z)   | Description                               |
| :---------------------------- | :------------ | :----------- | :---------------------------------------- |
| **Wall-Divide-Storage-Left**  | `(-100, -20)` | `(-57, -20)` | Far left section of the divider.          |
| **Wall-Divide-Storage-Right** | `(-43, -20)`  | `(-5, -20)`  | Mid-left section (Right of Storage Door). |
| **Wall-Divide-Conf-Left**     | `(5, -20)`    | `(43, -20)`  | Mid-right section (Left of Conf Door).    |
| **Wall-Divide-Conf-Right**    | `(57, -20)`   | `(100, -20)` | Far right section of the divider.         |

**Doors**:

- **Storage Door**: 14-unit gap at `X: -50`.
- **Conference Door**: 14-unit gap at `X: 50`.
- **Corridor**: 10-unit central gap at `X: 0`.

### Back Room Splitter

Separates **Storage Room** (Left) from **Conference Room** (Right).

| Wall Name                   | Start (X, Z) | End (X, Z) | Description                             |
| :-------------------------- | :----------- | :--------- | :-------------------------------------- |
| **Wall-Divide-Center-Back** | `(0, -20)`   | `(0, -75)` | Central spine wall running North-South. |

### Lobby Divider (Z = 40)

Separates the **Lobby** from the **Open Office**.

| Wall Name            | Start (X, Z) | End (X, Z)  | Description               |
| :------------------- | :----------- | :---------- | :------------------------ |
| **Wall-Lobby-Left**  | `(-100, 40)` | `(-15, 40)` | Left lobby wall (Glass).  |
| **Wall-Lobby-Right** | `(15, 40)`   | `(100, 40)` | Right lobby wall (Glass). |

**Door**:

- **Lobby Door**: 30-unit gap at `X: 0` (Centered).

## Identified Connection Issues (FIXED)

### 1. Lobby Internal Wall & Door (Fixed)

- **Problem**: The gap in the partition wall was **30 units** wide.
- **Fix**: Narrowed the gap to **18 units** (`-9` to `9`) to perfectly match the door frame.

### 2. Central Spine Wall (Fixed)

- **Problem**: The `Wall-Divide-Center-Back` ended abruptly.
- **Fix**: Added a **Structural Pillar** (`2x30x2`) at the end `(0, -20)` to cap the wall and frame the corridor split properly.

### 3. Back Rooms Divider Gaps (Fixed)

- **Problem**: Gaps between walls were inconsistent or unconnected.
- **Fixes**:
  - **Doors**: Adjusted to **18 units** (`-59` to `-41` and `41` to `59`) to match frames.
  - **Corridor**: Closed the central gap by extending walls to `+/- 1.5`, connecting them to the central pillar.
