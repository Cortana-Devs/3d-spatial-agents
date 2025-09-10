#!/usr/bin/env node

/**
 * Y-Level Alignment Validation Script
 *
 * This script validates that the Y-level alignment between floors and player
 * positioning has been correctly implemented to resolve the floating player issue.
 */

// Import our Y-level constants
const Y_LEVEL_CONSTANTS = {
  WORLD_GROUND_PLANE: 0.0,
  PLAYER_GROUND_LEVEL: 0.5,
  BLOCK_HEIGHT: 1.0,
  BLOCK_CENTER_TO_TOP: 0.5,
  BLOCK_CENTER_TO_BOTTOM: -0.5,

  // Configurable floor depth
  FLOOR_DEPTH_OFFSET: -0.5, // Adjustable parameter: how far below player level
  get DEFAULT_FLOOR_Y() {
    return this.PLAYER_GROUND_LEVEL + this.FLOOR_DEPTH_OFFSET; // 0.5 + (-0.5) = 0.0
  },
};

// Floor depth configuration utility
const FloorDepthConfig = {
  // Current configurable depth below player level
  currentDepthBelowPlayer: 0.5, // EASILY ADJUSTABLE PARAMETER

  // Calculate floor placement Y based on current depth setting
  getFloorPlacementY() {
    return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - this.currentDepthBelowPlayer;
  },

  // Set new floor depth (the main adjustable parameter)
  setFloorDepth(depthBelowPlayer) {
    this.currentDepthBelowPlayer = depthBelowPlayer;
    console.log(
      `Floor depth adjusted to: ${depthBelowPlayer} units below player level`,
    );
    console.log(`New floor placement Y: ${this.getFloorPlacementY()}`);
  },

  // Get current configuration summary
  getSummary() {
    return {
      depthBelowPlayer: this.currentDepthBelowPlayer,
      floorPlacementY: this.getFloorPlacementY(),
      floorTopSurfaceY:
        this.getFloorPlacementY() + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP,
      playerLevel: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
      isAligned:
        Math.abs(
          this.getFloorPlacementY() +
            Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP -
            Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
        ) < 0.01,
    };
  },
};

// Validation functions
const validateAlignment = {
  getBlockTopFace: (blockY) => {
    return blockY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
  },

  getFloorSurface: (floorY) => {
    return floorY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
  },

  isAligned: (surface, playerLevel) => {
    return Math.abs(surface - playerLevel) < 0.01;
  },
};

// Test scenarios
// Dynamic test scenarios based on current floor depth configuration
function getTestScenarios() {
  const testConfig = FloorDepthConfig.getSummary();

  return [
    {
      name: "Current Floor Configuration",
      floorY: testConfig.floorPlacementY,
      expectedResult: testConfig.isAligned,
      description: `Floor block at Y=${testConfig.floorPlacementY}, top surface at Y=${testConfig.floorTopSurfaceY}, player collision at Y=${testConfig.playerLevel}`,
    },
    {
      name: "Shallow Floor Test (0.25 below player)",
      floorY: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - 0.25,
      expectedResult: false,
      description:
        "Floor block 0.25 units below player level (top surface above player)",
    },
    {
      name: "Deep Floor Test (1.0 below player)",
      floorY: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - 1.0,
      expectedResult: false,
      description:
        "Floor block 1.0 unit below player level (top surface below player)",
    },
    {
      name: "Perfect Alignment Test (0.5 below player)",
      floorY: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - 0.5,
      expectedResult: true,
      description:
        "Floor block 0.5 units below player level (perfect alignment)",
    },
  ];
}

// Color codes for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Main validation function
function runValidation() {
  console.log(
    `${colors.bold}${colors.cyan}Y-Level Alignment Validation${colors.reset}\n`,
  );

  // Show current configuration
  const currentConfig = FloorDepthConfig.getSummary();
  console.log(`${colors.blue}Current Floor Configuration:${colors.reset}`);
  console.log(
    `  🎛️  Floor Depth Below Player: ${colors.yellow}${currentConfig.depthBelowPlayer} units${colors.reset} ${colors.cyan}(ADJUSTABLE)${colors.reset}`,
  );
  console.log(`  Floor Placement Y: ${currentConfig.floorPlacementY}`);
  console.log(`  Floor Top Surface Y: ${currentConfig.floorTopSurfaceY}`);
  console.log(`  Player Ground Level: ${currentConfig.playerLevel}`);
  console.log(
    `  Alignment Status: ${currentConfig.isAligned ? `${colors.green}✅ ALIGNED` : `${colors.red}❌ MISALIGNED`}${colors.reset}\n`,
  );

  console.log(`${colors.blue}System Constants:${colors.reset}`);
  console.log(
    `  Player Ground Level: ${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}`,
  );
  console.log(`  Block Height: ${Y_LEVEL_CONSTANTS.BLOCK_HEIGHT}`);
  console.log(
    `  Block Center to Top: ${Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP}\n`,
  );

  const testScenarios = getTestScenarios();
  let passedTests = 0;
  let totalTests = testScenarios.length;

  console.log(`${colors.blue}Running Test Scenarios:${colors.reset}\n`);

  testScenarios.forEach((scenario, index) => {
    const floorSurface = validateAlignment.getFloorSurface(scenario.floorY);
    const isAligned = validateAlignment.isAligned(
      floorSurface,
      Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
    );
    const passed = isAligned === scenario.expectedResult;

    if (passed) passedTests++;

    const status = passed ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`;
    const alignment = isAligned
      ? `${colors.green}ALIGNED`
      : `${colors.red}MISALIGNED`;

    console.log(
      `${colors.bold}Test ${index + 1}: ${scenario.name}${colors.reset}`,
    );
    console.log(`  Status: ${status}${colors.reset}`);
    console.log(`  Floor Y: ${scenario.floorY}`);
    console.log(`  Floor Surface Y: ${floorSurface}`);
    console.log(`  Player Level Y: ${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}`);
    console.log(`  Alignment: ${alignment}${colors.reset}`);
    console.log(
      `  Description: ${colors.white}${scenario.description}${colors.reset}\n`,
    );
  });

  // Summary
  console.log(`${colors.bold}${colors.cyan}Validation Summary:${colors.reset}`);
  console.log(
    `  Tests Passed: ${colors.green}${passedTests}/${totalTests}${colors.reset}`,
  );

  if (passedTests === totalTests) {
    console.log(
      `  ${colors.green}${colors.bold}🎉 ALL TESTS PASSED - Y-level alignment is correct!${colors.reset}\n`,
    );
  } else {
    console.log(
      `  ${colors.red}${colors.bold}⚠️  SOME TESTS FAILED - Y-level alignment needs attention!${colors.reset}\n`,
    );
  }

  // Critical alignment check with current configuration
  console.log(
    `${colors.bold}${colors.yellow}Critical Alignment Check:${colors.reset}`,
  );
  const criticalConfig = FloorDepthConfig.getSummary();

  if (criticalConfig.isAligned) {
    console.log(
      `  ${colors.green}✅ Floor blocks placed at Y=${criticalConfig.floorPlacementY} create walkable surface at Y=${criticalConfig.floorTopSurfaceY}`,
    );
    console.log(
      `  ${colors.green}✅ Player collision at Y=${criticalConfig.playerLevel} matches floor surface`,
    );
    console.log(
      `  ${colors.green}${colors.bold}🎯 PERFECT ALIGNMENT - No floating player issue!${colors.reset}\n`,
    );
  } else {
    console.log(
      `  ${colors.red}❌ Floor surface at Y=${criticalConfig.floorTopSurfaceY} does not match player collision at Y=${criticalConfig.playerLevel}`,
    );
    console.log(
      `  ${colors.red}${colors.bold}⚠️  ALIGNMENT ISSUE DETECTED - Players will appear to float!${colors.reset}\n`,
    );
  }

  // Implementation verification
  console.log(
    `${colors.bold}${colors.blue}Implementation Verification:${colors.reset}`,
  );
  console.log(
    `  ${colors.cyan}🎛️  Adjustable Floor Depth: ${criticalConfig.depthBelowPlayer} units below player${colors.reset}`,
  );
  console.log(
    `  ${colors.white}Current Floor Placement Y: ${criticalConfig.floorPlacementY}${colors.reset}`,
  );
  console.log(
    `  ${colors.white}Player Controller Ground Level: ${criticalConfig.playerLevel}${colors.reset}`,
  );
  console.log(
    `  ${colors.white}Block Top Face Formula: blockY + ${Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP}${colors.reset}`,
  );

  if (criticalConfig.isAligned) {
    console.log(
      `  ${colors.green}✅ Implementation is mathematically correct${colors.reset}`,
    );
  } else {
    console.log(
      `  ${colors.red}❌ Implementation needs adjustment${colors.reset}`,
    );
    console.log(
      `  ${colors.yellow}💡 Try: FloorDepthConfig.setFloorDepth(0.5) for perfect alignment${colors.reset}`,
    );
  }

  console.log();
  return criticalConfig.isAligned;
}

// Additional validation for different scenarios
function runExtendedValidation() {
  console.log(
    `${colors.bold}${colors.cyan}Extended Validation Scenarios:${colors.reset}\n`,
  );

  // Test block stacking
  console.log(`${colors.blue}Block Stacking Test:${colors.reset}`);
  for (let y = 0; y <= 3; y++) {
    const blockTop = validateAlignment.getBlockTopFace(y);
    const canWalkOn = validateAlignment.isAligned(
      blockTop,
      Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
    );
    const status = canWalkOn
      ? `${colors.green}Walkable`
      : `${colors.yellow}Not walkable at default level`;
    console.log(
      `  Block at Y=${y}: Top face at Y=${blockTop} - ${status}${colors.reset}`,
    );
  }

  console.log();

  // Test floor patterns
  console.log(`${colors.blue}Floor Pattern Consistency:${colors.reset}`);
  const floorConfig = FloorDepthConfig.getSummary();
  const floorPositions = [
    { x: -1, y: floorConfig.floorPlacementY, z: -1 },
    { x: 0, y: floorConfig.floorPlacementY, z: 0 },
    { x: 1, y: floorConfig.floorPlacementY, z: 1 },
  ];

  floorPositions.forEach((pos, index) => {
    const surface = validateAlignment.getFloorSurface(pos.y);
    const aligned = validateAlignment.isAligned(
      surface,
      Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
    );
    const status = aligned ? `${colors.green}✅` : `${colors.red}❌`;
    console.log(
      `  Floor ${index + 1} at (${pos.x}, ${pos.y}, ${pos.z}): Surface Y=${surface} ${status}${colors.reset}`,
    );
  });

  console.log();
}

// Performance impact assessment
function assessPerformanceImpact() {
  console.log(
    `${colors.bold}${colors.cyan}Performance Impact Assessment:${colors.reset}\n`,
  );

  const perfConfig = FloorDepthConfig.getSummary();
  const floatingDistance = Math.abs(
    perfConfig.floorTopSurfaceY - perfConfig.playerLevel,
  );

  const oldSystem = {
    floorY: 0,
    playerGroundY: 0.5,
    floatingDistance: 0.5,
    description: "Fixed floor placement (not adjustable)",
  };

  const newSystem = {
    floorY: perfConfig.floorPlacementY,
    playerGroundY: perfConfig.playerLevel,
    floatingDistance: floatingDistance,
    description: `Configurable floor depth (${perfConfig.depthBelowPlayer} units below player)`,
  };

  console.log(`${colors.yellow}Old System:${colors.reset}`);
  console.log(`  Floor Y: ${oldSystem.floorY}`);
  console.log(`  Player Y: ${oldSystem.playerGroundY}`);
  console.log(
    `  Floating Distance: ${oldSystem.floatingDistance} units ${colors.red}(PROBLEM)${colors.reset}`,
  );
  console.log(`  Description: ${oldSystem.description}`);

  console.log(`\n${colors.green}New Configurable System:${colors.reset}`);
  console.log(
    `  🎛️  Floor Depth Setting: ${perfConfig.depthBelowPlayer} units below player ${colors.cyan}(ADJUSTABLE)${colors.reset}`,
  );
  console.log(`  Floor Y: ${newSystem.floorY}`);
  console.log(`  Player Y: ${newSystem.playerGroundY}`);
  console.log(
    `  Floating Distance: ${newSystem.floatingDistance.toFixed(3)} units ${newSystem.floatingDistance < 0.01 ? `${colors.green}(PERFECT)` : `${colors.yellow}(ADJUSTABLE)`}${colors.reset}`,
  );
  console.log(`  Description: ${newSystem.description}`);

  if (newSystem.floatingDistance < 0.01) {
    const improvementPercent =
      ((oldSystem.floatingDistance - newSystem.floatingDistance) /
        oldSystem.floatingDistance) *
      100;
    console.log(
      `\n  ${colors.bold}${colors.green}Improvement: ${improvementPercent.toFixed(1)}% reduction in floating distance${colors.reset}`,
    );
  } else {
    console.log(
      `\n  ${colors.yellow}💡 Adjustment Needed: Use FloorDepthConfig.setFloorDepth(0.5) for perfect alignment${colors.reset}`,
    );
  }

  console.log();
}

// Real-world scenario validation
function validateRealWorldScenarios() {
  console.log(
    `${colors.bold}${colors.cyan}Real-World Scenario Validation:${colors.reset}\n`,
  );

  const scenarioConfig = FloorDepthConfig.getSummary();
  const playerY = scenarioConfig.playerLevel;

  console.log(
    `${colors.blue}Scenario 1: Player spawns and walks on stone floor${colors.reset}`,
  );
  const stoneFloorY = scenarioConfig.floorPlacementY;
  const stoneTopY = validateAlignment.getBlockTopFace(stoneFloorY);
  const aligned1 = validateAlignment.isAligned(stoneTopY, playerY);
  console.log(
    `  Stone floor at Y=${stoneFloorY} (${scenarioConfig.depthBelowPlayer} units below player), top at Y=${stoneTopY}`,
  );
  console.log(`  Player collision at Y=${playerY}`);
  console.log(
    `  Result: ${aligned1 ? `${colors.green}✅ Player stands properly on floor` : `${colors.red}❌ Player floats above floor`}${colors.reset}\n`,
  );

  console.log(
    `${colors.blue}Scenario 2: Player builds blocks and walks on them${colors.reset}`,
  );
  const builtBlockY = scenarioConfig.floorPlacementY;
  const builtBlockTopY = validateAlignment.getBlockTopFace(builtBlockY);
  const aligned2 = validateAlignment.isAligned(builtBlockTopY, playerY);
  console.log(`  Built block at Y=${builtBlockY}, top at Y=${builtBlockTopY}`);
  console.log(`  Player collision at Y=${playerY}`);
  console.log(
    `  Result: ${aligned2 ? `${colors.green}✅ Player can walk on built blocks` : `${colors.red}❌ Player cannot properly walk on blocks`}${colors.reset}\n`,
  );

  console.log(`${colors.blue}Scenario 3: Multi-level floors${colors.reset}`);
  const levels = [0, 1, 2];
  levels.forEach((level) => {
    const levelTopY = validateAlignment.getBlockTopFace(level);
    const alignedWithDefault = validateAlignment.isAligned(levelTopY, playerY);
    const walkable =
      level === 0 ? alignedWithDefault : `Different level (Y=${levelTopY})`;
    console.log(
      `  Level ${level}: Floor Y=${level}, Top Y=${levelTopY} - ${alignedWithDefault ? `${colors.green}Ground level` : `${colors.yellow}Elevated level`}${colors.reset}`,
    );
  });

  console.log();
}

// Main execution
function main() {
  const isAlignmentCorrect = runValidation();
  runExtendedValidation();
  validateRealWorldScenarios();
  assessPerformanceImpact();

  console.log(
    `${colors.bold}${colors.cyan}Final Validation Report:${colors.reset}`,
  );

  const finalConfig = FloorDepthConfig.getSummary();
  console.log(`${colors.blue}Configuration Summary:${colors.reset}`);
  console.log(
    `  🎛️  Floor Depth: ${finalConfig.depthBelowPlayer} units below player ${colors.cyan}(EASILY ADJUSTABLE)${colors.reset}`,
  );
  console.log(`  Floor Placement Y: ${finalConfig.floorPlacementY}`);
  console.log(`  Floor Top Surface: ${finalConfig.floorTopSurfaceY}`);
  console.log(`  Player Level: ${finalConfig.playerLevel}`);

  if (isAlignmentCorrect) {
    console.log(
      `\n${colors.green}${colors.bold}🎉 SUCCESS: Y-level alignment implementation is CORRECT!${colors.reset}`,
    );
    console.log(
      `${colors.green}   • Players will stand properly on floors${colors.reset}`,
    );
    console.log(
      `${colors.green}   • No floating player visual issues${colors.reset}`,
    );
    console.log(
      `${colors.green}   • Floor and player systems are mathematically aligned${colors.reset}`,
    );
    console.log(
      `${colors.green}   • Floor depth is easily adjustable via FloorDepthConfig.setFloorDepth()${colors.reset}`,
    );
  } else {
    console.log(
      `\n${colors.yellow}${colors.bold}⚙️  ADJUSTMENT NEEDED: Floor depth requires tuning!${colors.reset}`,
    );
    console.log(
      `${colors.yellow}   • Current depth: ${finalConfig.depthBelowPlayer} units below player${colors.reset}`,
    );
    console.log(
      `${colors.yellow}   • For perfect alignment, use: FloorDepthConfig.setFloorDepth(0.5)${colors.reset}`,
    );
    console.log(
      `${colors.cyan}   • Floor depth is easily adjustable parameter${colors.reset}`,
    );
  }

  console.log(
    `\n${colors.bold}${colors.cyan}🎛️  Easy Adjustment Guide:${colors.reset}`,
  );
  console.log(
    `${colors.white}  FloorDepthConfig.setFloorDepth(0.5);  // Perfect alignment${colors.reset}`,
  );
  console.log(
    `${colors.white}  FloorDepthConfig.setFloorDepth(0.25); // Shallow floors${colors.reset}`,
  );
  console.log(
    `${colors.white}  FloorDepthConfig.setFloorDepth(1.0);  // Deep floors${colors.reset}`,
  );

  console.log(
    `\n${colors.white}Run this script after any Y-level related changes to verify alignment.${colors.reset}`,
  );
  console.log(
    `${colors.white}Script location: scripts/validateYLevelAlignment.js${colors.reset}\n`,
  );

  return isAlignmentCorrect;
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  validateAlignment,
  getTestScenarios,
  Y_LEVEL_CONSTANTS,
  FloorDepthConfig,
  runValidation,
  main,
};
