#!/usr/bin/env node

/**
 * Floor Depth Adjustment Utility
 *
 * Simple command-line tool for adjusting floor depth in the Descendants metaverse.
 * This tool allows developers to easily configure how far below player level
 * floor blocks should be placed.
 *
 * Usage:
 *   node scripts/adjustFloorDepth.js
 *   node scripts/adjustFloorDepth.js 0.5
 *   node scripts/adjustFloorDepth.js --preset shallow
 *   node scripts/adjustFloorDepth.js --validate
 */

// Configuration constants
const PLAYER_GROUND_LEVEL = 0.5;
const BLOCK_CENTER_TO_TOP = 0.5;

// Floor depth presets
const PRESETS = {
  shallow: {
    depth: 0.25,
    description: "Shallow floors - blocks 0.25 units below player"
  },
  default: {
    depth: 0.5,
    description: "Default floors - blocks 0.5 units below player (perfect alignment)"
  },
  deep: {
    depth: 1.0,
    description: "Deep floors - blocks 1.0 unit below player"
  },
  flush: {
    depth: 0.5,
    description: "Flush floors - top surface exactly at player level"
  }
};

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Utility functions
function calculateFloorAlignment(depthBelowPlayer) {
  const floorPlacementY = PLAYER_GROUND_LEVEL - depthBelowPlayer;
  const floorTopSurfaceY = floorPlacementY + BLOCK_CENTER_TO_TOP;
  const isAligned = Math.abs(floorTopSurfaceY - PLAYER_GROUND_LEVEL) < 0.01;

  return {
    depthBelowPlayer,
    floorPlacementY,
    floorTopSurfaceY,
    playerLevel: PLAYER_GROUND_LEVEL,
    isAligned,
    floatingDistance: Math.abs(floorTopSurfaceY - PLAYER_GROUND_LEVEL)
  };
}

function displayConfiguration(config) {
  console.log(`${colors.bold}${colors.cyan}Floor Depth Configuration${colors.reset}\n`);

  console.log(`${colors.blue}Configuration Details:${colors.reset}`);
  console.log(`  🎛️  Floor Depth: ${colors.yellow}${config.depthBelowPlayer} units${colors.reset} below player`);
  console.log(`  📐 Floor Placement Y: ${config.floorPlacementY}`);
  console.log(`  🔝 Floor Top Surface Y: ${config.floorTopSurfaceY}`);
  console.log(`  👤 Player Ground Level: ${config.playerLevel}`);
  console.log(`  📏 Floating Distance: ${config.floatingDistance.toFixed(3)} units`);

  const alignmentStatus = config.isAligned ?
    `${colors.green}✅ PERFECTLY ALIGNED` :
    `${colors.red}❌ MISALIGNED`;
  console.log(`  ⚖️  Alignment Status: ${alignmentStatus}${colors.reset}\n`);

  if (config.isAligned) {
    console.log(`${colors.green}${colors.bold}🎯 Perfect! Players will stand directly on floor surfaces.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Players will ${config.floatingDistance > 0 ? 'float above' : 'sink into'} floor surfaces by ${config.floatingDistance.toFixed(3)} units.${colors.reset}`);
    console.log(`${colors.cyan}💡 For perfect alignment, use depth of 0.5 units.${colors.reset}`);
  }
}

function showUsage() {
  console.log(`${colors.bold}${colors.cyan}Floor Depth Adjustment Tool${colors.reset}\n`);

  console.log(`${colors.bold}Usage:${colors.reset}`);
  console.log(`  node scripts/adjustFloorDepth.js                    # Interactive mode`);
  console.log(`  node scripts/adjustFloorDepth.js 0.5                # Set depth to 0.5 units`);
  console.log(`  node scripts/adjustFloorDepth.js --preset default   # Use preset configuration`);
  console.log(`  node scripts/adjustFloorDepth.js --validate         # Validate current settings`);
  console.log(`  node scripts/adjustFloorDepth.js --presets          # Show available presets`);
  console.log(`  node scripts/adjustFloorDepth.js --help             # Show this help\n`);

  console.log(`${colors.bold}Examples:${colors.reset}`);
  console.log(`  ${colors.white}node scripts/adjustFloorDepth.js 0.5${colors.reset}        # Perfect alignment`);
  console.log(`  ${colors.white}node scripts/adjustFloorDepth.js 0.25${colors.reset}       # Shallow floors`);
  console.log(`  ${colors.white}node scripts/adjustFloorDepth.js 1.0${colors.reset}        # Deep floors`);
  console.log(`  ${colors.white}node scripts/adjustFloorDepth.js --preset shallow${colors.reset}  # Use shallow preset\n`);
}

function showPresets() {
  console.log(`${colors.bold}${colors.cyan}Available Floor Depth Presets${colors.reset}\n`);

  Object.entries(PRESETS).forEach(([name, preset]) => {
    const config = calculateFloorAlignment(preset.depth);
    const status = config.isAligned ? `${colors.green}✅` : `${colors.yellow}⚠️`;

    console.log(`${colors.bold}${name.toUpperCase()}${colors.reset}`);
    console.log(`  Description: ${preset.description}`);
    console.log(`  Depth: ${preset.depth} units below player`);
    console.log(`  Status: ${status} ${config.isAligned ? 'Aligned' : 'Misaligned'}${colors.reset}`);
    console.log();
  });
}

function validateConfiguration() {
  console.log(`${colors.bold}${colors.cyan}Floor Depth Validation${colors.reset}\n`);

  // Test different depth values
  const testDepths = [0.25, 0.5, 0.75, 1.0];

  console.log(`${colors.blue}Testing Different Floor Depths:${colors.reset}`);
  testDepths.forEach(depth => {
    const config = calculateFloorAlignment(depth);
    const status = config.isAligned ? `${colors.green}✅ ALIGNED` : `${colors.red}❌ MISALIGNED`;
    const recommendation = config.isAligned ? `${colors.green}RECOMMENDED` : '';

    console.log(`  Depth ${depth}: Floor Y=${config.floorPlacementY}, Surface Y=${config.floorTopSurfaceY} - ${status} ${recommendation}${colors.reset}`);
  });

  console.log(`\n${colors.yellow}💡 For perfect alignment: Use depth of 0.5 units${colors.reset}`);
  console.log(`${colors.cyan}🎛️  This places floor blocks at Y=0 with top surface at Y=0.5 (player level)${colors.reset}\n`);
}

function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`${colors.bold}${colors.cyan}Interactive Floor Depth Configuration${colors.reset}\n`);
  console.log(`${colors.yellow}Enter floor depth in units below player level (e.g., 0.5)${colors.reset}`);
  console.log(`${colors.white}Or type 'presets' to see available presets, 'quit' to exit${colors.reset}\n`);

  function askForDepth() {
    rl.question(`${colors.cyan}Floor depth (units below player): ${colors.reset}`, (answer) => {
      const input = answer.trim().toLowerCase();

      if (input === 'quit' || input === 'exit') {
        console.log(`${colors.green}Goodbye!${colors.reset}`);
        rl.close();
        return;
      }

      if (input === 'presets') {
        console.log();
        showPresets();
        askForDepth();
        return;
      }

      if (input in PRESETS) {
        const preset = PRESETS[input];
        console.log(`\n${colors.green}Using preset: ${preset.description}${colors.reset}`);
        const config = calculateFloorAlignment(preset.depth);
        displayConfiguration(config);
        console.log();
        askForDepth();
        return;
      }

      const depth = parseFloat(input);
      if (isNaN(depth)) {
        console.log(`${colors.red}Invalid input. Please enter a number or 'presets' or 'quit'.${colors.reset}`);
        askForDepth();
        return;
      }

      if (depth < 0) {
        console.log(`${colors.red}Warning: Negative depth will place floors above player level!${colors.reset}`);
      }

      if (depth > 2) {
        console.log(`${colors.yellow}Warning: Very deep floors may cause visual issues.${colors.reset}`);
      }

      console.log();
      const config = calculateFloorAlignment(depth);
      displayConfiguration(config);

      if (config.isAligned) {
        console.log(`${colors.green}${colors.bold}🎉 This configuration provides perfect alignment!${colors.reset}`);
        console.log(`${colors.green}You can implement this by setting FLOOR_DEPTH_OFFSET to ${-depth} in yLevelConstants.ts${colors.reset}`);
      } else {
        console.log(`${colors.yellow}This configuration will cause ${depth < 0.5 ? 'floating' : 'sinking'} issues.${colors.reset}`);
        console.log(`${colors.cyan}Try depth of 0.5 for perfect alignment.${colors.reset}`);
      }

      console.log();
      askForDepth();
    });
  }

  askForDepth();
}

function implementConfiguration(depth) {
  console.log(`${colors.bold}${colors.cyan}Implementation Guide${colors.reset}\n`);

  const config = calculateFloorAlignment(depth);
  displayConfiguration(config);

  if (config.isAligned) {
    console.log(`${colors.green}${colors.bold}🎯 Perfect Configuration!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  This configuration will cause alignment issues.${colors.reset}\n`);
  }

  console.log(`${colors.bold}To implement this configuration:${colors.reset}`);
  console.log(`${colors.white}1. Open: config/yLevelConstants.ts${colors.reset}`);
  console.log(`${colors.white}2. Set: FLOOR_DEPTH_OFFSET: ${-depth}${colors.reset}`);
  console.log(`${colors.white}3. Run: npm run validate:y-levels${colors.reset}`);
  console.log(`${colors.white}4. Verify: Floor blocks will be placed at Y=${config.floorPlacementY}${colors.reset}\n`);

  console.log(`${colors.cyan}Code snippet:${colors.reset}`);
  console.log(`${colors.white}export const Y_LEVEL_CONSTANTS = {${colors.reset}`);
  console.log(`${colors.white}  FLOOR_DEPTH_OFFSET: ${-depth}, // ${depth} units below player${colors.reset}`);
  console.log(`${colors.white}  // ... other constants${colors.reset}`);
  console.log(`${colors.white}};${colors.reset}\n`);
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    interactiveMode();
    return;
  }

  const firstArg = args[0];

  // Handle help
  if (firstArg === '--help' || firstArg === '-h') {
    showUsage();
    return;
  }

  // Handle presets list
  if (firstArg === '--presets') {
    showPresets();
    return;
  }

  // Handle validation
  if (firstArg === '--validate') {
    validateConfiguration();
    return;
  }

  // Handle preset usage
  if (firstArg === '--preset' && args[1]) {
    const presetName = args[1].toLowerCase();
    if (presetName in PRESETS) {
      const preset = PRESETS[presetName];
      console.log(`${colors.green}Using preset: ${preset.description}${colors.reset}\n`);
      implementConfiguration(preset.depth);
    } else {
      console.log(`${colors.red}Unknown preset: ${presetName}${colors.reset}`);
      console.log(`${colors.white}Available presets:${colors.reset}`);
      Object.keys(PRESETS).forEach(name => {
        console.log(`  ${name}`);
      });
    }
    return;
  }

  // Handle direct depth value
  const depth = parseFloat(firstArg);
  if (!isNaN(depth)) {
    implementConfiguration(depth);
    return;
  }

  // Invalid argument
  console.log(`${colors.red}Invalid argument: ${firstArg}${colors.reset}`);
  showUsage();
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  calculateFloorAlignment,
  displayConfiguration,
  PRESETS,
  main
};
