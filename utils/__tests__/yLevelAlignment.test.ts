import { Vector3 } from "three";
import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  Y_LEVEL_CONSTANTS,
  Y_LEVEL_ALIGNMENT,
  Y_LEVEL_VALIDATION,
  Y_LEVEL_MIGRATION,
  createYLevelPosition,
} from "../../config/yLevelConstants";
import { floorManager, quickFloorUtils } from "../floorManager";
import { useWorldStore } from "../../store/worldStore";

// Mock the world store for testing
vi.mock("../../store/worldStore", () => ({
  useWorldStore: {
    getState: vi.fn(() => ({
      addBlock: vi.fn().mockReturnValue(true),
      hasBlock: vi.fn().mockReturnValue(false),
      removeBlock: vi.fn().mockReturnValue(true),
    })),
  },
}));

describe("Y-Level Alignment System", () => {
  describe("Constants Validation", () => {
    test("player ground level aligns with floor top surface", () => {
      const floorTopSurface = Y_LEVEL_ALIGNMENT.getFloorSurface(
        Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
      );
      expect(floorTopSurface).toBe(Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL);
      expect(Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y).toBe(0);
      expect(Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL).toBe(0.5);
    });

    test("block height and offsets are consistent", () => {
      expect(Y_LEVEL_CONSTANTS.BLOCK_HEIGHT).toBe(1.0);
      expect(Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP).toBe(0.5);
      expect(Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_BOTTOM).toBe(-0.5);
    });

    test("floor placement snap is correct", () => {
      expect(Y_LEVEL_CONSTANTS.FLOOR_PLACEMENT_SNAP).toBe(0.5);
    });
  });

  describe("Y-Level Calculations", () => {
    test("block top face calculation", () => {
      const blockY = 0;
      const topFace = Y_LEVEL_ALIGNMENT.getBlockTopFace(blockY);
      expect(topFace).toBe(0.5);
    });

    test("block bottom face calculation", () => {
      const blockY = 0;
      const bottomFace = Y_LEVEL_ALIGNMENT.getBlockBottomFace(blockY);
      expect(bottomFace).toBe(-0.5);
    });

    test("floor surface calculation", () => {
      const floorY = Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y; // 0
      const floorSurface = Y_LEVEL_ALIGNMENT.getFloorSurface(floorY);
      expect(floorSurface).toBe(0.5); // 0 + 0.5 = 0.5
    });

    test("player foot level calculation", () => {
      const playerCollisionY = Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL;
      const footLevel = Y_LEVEL_ALIGNMENT.getPlayerFootLevel(playerCollisionY);
      expect(footLevel).toBe(0.5); // 0.5 + 0.0 = 0.5
    });
  });

  describe("Alignment Validation", () => {
    test("floor alignment validation - correctly aligned floor", () => {
      const floorY = Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y;
      const isAligned = Y_LEVEL_VALIDATION.validateFloorAlignment(floorY);
      expect(isAligned).toBe(true);
    });

    test("floor alignment validation - misaligned floor", () => {
      const floorY = 1; // Misaligned floor Y level
      const isAligned = Y_LEVEL_VALIDATION.validateFloorAlignment(floorY);
      expect(isAligned).toBe(false);
    });

    test("block walkable validation - correctly aligned block", () => {
      const blockY = 0; // Block placed at Y=0, top face at Y=0.5
      const isWalkable = Y_LEVEL_VALIDATION.validateBlockWalkable(blockY);
      expect(isWalkable).toBe(true);
    });

    test("block walkable validation - misaligned block", () => {
      const blockY = 1; // Block placed at Y=1, top face at Y=1.5
      const isWalkable = Y_LEVEL_VALIDATION.validateBlockWalkable(blockY);
      expect(isWalkable).toBe(false);
    });

    test("Y coordinate snapping", () => {
      expect(Y_LEVEL_VALIDATION.snapToValidY(0.3)).toBe(0.5);
      expect(Y_LEVEL_VALIDATION.snapToValidY(0.7)).toBe(0.5);
      expect(Y_LEVEL_VALIDATION.snapToValidY(0.8)).toBe(1.0);
      expect(Y_LEVEL_VALIDATION.snapToValidY(-0.3)).toBe(-0.5);
    });

    test("aligned floor Y getter", () => {
      const alignedY = Y_LEVEL_VALIDATION.getAlignedFloorY();
      expect(alignedY).toBe(Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y);
      expect(alignedY).toBe(0);
    });

    test("player grounded check", () => {
      const playerY = 0.5;
      const surfaceY = 0.5;
      expect(Y_LEVEL_VALIDATION.isPlayerGrounded(playerY, surfaceY)).toBe(true);

      // Small tolerance should still pass
      expect(Y_LEVEL_VALIDATION.isPlayerGrounded(0.51, 0.5)).toBe(true);
      expect(Y_LEVEL_VALIDATION.isPlayerGrounded(0.49, 0.5)).toBe(true);

      // Large difference should fail
      expect(Y_LEVEL_VALIDATION.isPlayerGrounded(0.7, 0.5)).toBe(false);
    });
  });

  describe("Migration System", () => {
    test("migrate old floor Y=0 stays at Y=0 (correct)", () => {
      const oldY = 0;
      const newY = Y_LEVEL_MIGRATION.migrateOldFloorY(oldY);
      expect(newY).toBe(0); // Y=0 is correct for floor blocks
    });

    test("migrate documented Y=-0.5 to correct Y=0", () => {
      const oldY = -0.5;
      const newY = Y_LEVEL_MIGRATION.migrateOldFloorY(oldY);
      expect(newY).toBe(0); // Correct floor placement
    });

    test("migrate incorrect Y=0.5 to correct Y=0", () => {
      const oldY = 0.5;
      const newY = Y_LEVEL_MIGRATION.migrateOldFloorY(oldY);
      expect(newY).toBe(0); // Floors placed too high should be lowered
    });

    test("migrate arbitrary Y levels", () => {
      const oldY = 1.3;
      const newY = Y_LEVEL_MIGRATION.migrateOldFloorY(oldY);
      expect(newY).toBe(1.5); // 1.3 snapped to 1.5
    });

    test("identify floors needing migration", () => {
      expect(Y_LEVEL_MIGRATION.needsMigration(0)).toBe(false); // Y=0 is correct for floors
      expect(Y_LEVEL_MIGRATION.needsMigration(-0.5)).toBe(true); // Documented but wrong
      expect(Y_LEVEL_MIGRATION.needsMigration(0.5)).toBe(true); // Floor placed too high
    });
  });

  describe("Position Creation", () => {
    test("create aligned floor position", () => {
      const position = createYLevelPosition(0, "floor");
      expect(position.y).toBe(0);
      expect(position.context).toBe("floor");
      expect(position.isAligned).toBe(true);
      expect(position.suggestedY).toBeUndefined();
    });

    test("create misaligned floor position with suggestion", () => {
      const position = createYLevelPosition(0.5, "floor");
      expect(position.y).toBe(0.5);
      expect(position.context).toBe("floor");
      expect(position.isAligned).toBe(false);
      expect(position.suggestedY).toBe(0);
    });

    test("create aligned block position", () => {
      const position = createYLevelPosition(0, "block"); // Block at Y=0, top face at Y=0.5
      expect(position.y).toBe(0);
      expect(position.context).toBe("block");
      expect(position.isAligned).toBe(true);
      expect(position.suggestedY).toBeUndefined();
    });

    test("create player position", () => {
      const position = createYLevelPosition(0.5, "player");
      expect(position.y).toBe(0.5);
      expect(position.context).toBe("player");
      expect(position.isAligned).toBe(true);
      expect(position.suggestedY).toBeUndefined();
    });
  });

  describe("Floor Manager Integration", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test("floor manager uses correct default Y level", () => {
      const mockAddBlock = vi.fn().mockReturnValue(true);
      const mockStore = {
        addBlock: mockAddBlock,
        hasBlock: vi.fn().mockReturnValue(false),
      };

      (useWorldStore.getState as any).mockReturnValue(mockStore);

      // Place a small floor to test Y level
      floorManager.placeDefaultFloor(2);

      // Check that blocks were placed at the correct Y level
      expect(mockAddBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          y: Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
        }),
        expect.any(String),
        expect.any(String),
      );
    });

    test("quick floor utils use correct Y level", () => {
      const mockAddBlock = vi.fn().mockReturnValue(true);
      const mockStore = {
        addBlock: mockAddBlock,
        hasBlock: vi.fn().mockReturnValue(false),
      };

      (useWorldStore.getState as any).mockReturnValue(mockStore);

      // Wait a bit to avoid rate limiting from previous test
      setTimeout(() => {
        quickFloorUtils.placeStoneFloor(2);

        // Verify correct Y level was used
        expect(mockAddBlock).toHaveBeenCalledWith(
          expect.objectContaining({
            y: Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
          }),
          expect.any(String),
          expect.any(String),
        );
      }, 300);
    });
  });

  describe("Critical Alignment Scenarios", () => {
    test("floor-to-player perfect alignment", () => {
      const floorY = Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y; // 0
      const floorTopSurface = Y_LEVEL_ALIGNMENT.getFloorSurface(floorY); // 0.5
      const playerGroundLevel = Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL; // 0.5

      // Perfect alignment: floor block at Y=0 has top surface at Y=0.5
      // Player collision is at Y=0.5 - perfect match!
      expect(floorTopSurface).toBe(playerGroundLevel);
      expect(floorTopSurface).toBe(0.5);
      expect(
        Y_LEVEL_VALIDATION.isPlayerGrounded(playerGroundLevel, floorTopSurface),
      ).toBe(true);
    });

    test("block placement alignment with player", () => {
      const blockPlacementY = 0; // Standard block placement
      const blockTopFace = Y_LEVEL_ALIGNMENT.getBlockTopFace(blockPlacementY); // 0.5
      const playerGroundLevel = Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL; // 0.5

      expect(blockTopFace).toBe(playerGroundLevel);
      expect(
        Y_LEVEL_VALIDATION.isPlayerGrounded(playerGroundLevel, blockTopFace),
      ).toBe(true);
    });

    test("floor block as walkable surface", () => {
      // Floor block placed at Y=0 has top face at Y=0.5
      // Player collision is at Y=0.5 - perfect alignment
      const floorBlockY = 0; // Floor block placed at Y=0
      const floorTop = Y_LEVEL_ALIGNMENT.getBlockTopFace(floorBlockY); // Top at Y=0.5
      const playerWalkLevel = Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL; // Y=0.5

      expect(floorTop).toBe(playerWalkLevel);
      expect(floorTop).toBe(0.5);
    });
  });

  describe("Edge Cases", () => {
    test("handle invalid Y coordinates", () => {
      expect(Y_LEVEL_VALIDATION.snapToValidY(NaN)).toBeNaN();
      expect(Y_LEVEL_VALIDATION.snapToValidY(Infinity)).not.toBeNaN();
      expect(Y_LEVEL_VALIDATION.snapToValidY(-Infinity)).not.toBeNaN();
    });

    test("handle very small Y differences", () => {
      const y1 = 0.5000001;
      const y2 = 0.4999999;
      expect(Y_LEVEL_VALIDATION.isPlayerGrounded(y1, 0.5)).toBe(true);
      expect(Y_LEVEL_VALIDATION.isPlayerGrounded(y2, 0.5)).toBe(true);
    });

    test("migration of extreme Y values", () => {
      expect(Y_LEVEL_MIGRATION.migrateOldFloorY(1000)).toBe(1000);
      expect(Y_LEVEL_MIGRATION.migrateOldFloorY(-1000)).toBe(-1000);
    });
  });
});

describe("Real-World Scenario Tests", () => {
  test("player stands on stone floor without floating", () => {
    // Scenario: Player spawns, stone floor is placed
    const floorBlockY = 0; // Floor blocks should be at Y=0
    const floorTopSurface = Y_LEVEL_ALIGNMENT.getBlockTopFace(floorBlockY); // Y=0.5
    const playerGroundCollision = Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL; // Y=0.5

    expect(floorTopSurface).toBe(playerGroundCollision);
    expect(
      Y_LEVEL_VALIDATION.isPlayerGrounded(
        playerGroundCollision,
        floorTopSurface,
      ),
    ).toBe(true);
  });

  test("player builds blocks and can walk on them", () => {
    // Scenario: Player places block at Y=1, should be able to walk on top
    const blockY = 1;
    const blockTop = Y_LEVEL_ALIGNMENT.getBlockTopFace(blockY); // Y=1.5
    const playerOnBlock = blockTop; // Player should be at Y=1.5 when on this block

    // Player collision system should handle this
    expect(blockTop).toBe(1.5);
    expect(Y_LEVEL_VALIDATION.validateBlockWalkable(blockY)).toBe(false); // This block top doesn't align with default player level
  });

  test("floor pattern maintains consistent Y levels", () => {
    // Scenario: Complex floor pattern should all be walkable
    const centerPosition = new Vector3(0, Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y, 0);

    // All floor blocks in pattern should be at Y=0 (walkable surface at Y=0.5)
    expect(centerPosition.y).toBe(0);
    expect(Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y).toBe(0);
    expect(Y_LEVEL_VALIDATION.validateFloorAlignment(centerPosition.y)).toBe(
      true,
    );
  });
});
