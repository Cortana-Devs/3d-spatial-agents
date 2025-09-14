#!/usr/bin/env node

/**
 * Environment Variables Test Script
 *
 * This script tests if debug environment variables are being loaded correctly
 * in both Node.js and Next.js contexts.
 */

console.log('🧪 Testing Environment Variables for Debug System\n');

// Test Node.js environment variables (server-side)
console.log('📋 Server-side Environment Variables (NODE_ENV context):');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('DEBUG_SIMULANT_Y_POSITIONING:', process.env.DEBUG_SIMULANT_Y_POSITIONING || 'undefined');
console.log('DEBUG_BLOCK_Y_POSITIONING:', process.env.DEBUG_BLOCK_Y_POSITIONING || 'undefined');
console.log('DEBUG_Y_LEVEL_VALIDATION:', process.env.DEBUG_Y_LEVEL_VALIDATION || 'undefined');
console.log('DEBUG_POSITIONING_GENERAL:', process.env.DEBUG_POSITIONING_GENERAL || 'undefined');

console.log('\n📱 Client-side Environment Variables (NEXT_PUBLIC_ prefixed):');
console.log('NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING:', process.env.NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING || 'undefined');
console.log('NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING:', process.env.NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING || 'undefined');
console.log('NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION:', process.env.NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION || 'undefined');
console.log('NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL:', process.env.NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL || 'undefined');

// Test debug logger functionality
console.log('\n🔧 Testing Debug Logger:');
try {
  // Import the debug logger
  const debugModule = require('../utils/debugLogger.ts');

  console.log('✅ Debug logger module loaded successfully');

  // Test if any debug is enabled
  const isAnyEnabled = debugModule.isAnyDebugEnabled();
  console.log('Any debug enabled:', isAnyEnabled);

  // Get enabled categories
  const enabledCategories = debugModule.getEnabledDebugCategories();
  console.log('Enabled categories:', enabledCategories);

  // Test individual category checks
  const categories = [
    'simulant-y-positioning',
    'block-y-positioning',
    'y-level-validation',
    'positioning-general'
  ];

  console.log('\n📊 Individual Category Status:');
  categories.forEach(category => {
    const isEnabled = debugModule.default.isEnabled(category);
    console.log(`  ${category}: ${isEnabled ? '✅ enabled' : '❌ disabled'}`);
  });

} catch (error) {
  console.error('❌ Error testing debug logger:', error.message);

  if (error.message.includes('TypeScript')) {
    console.log('\n💡 Tip: This script needs to run with ts-node or in a compiled environment.');
    console.log('Try: npx ts-node scripts/test-env-vars.js');
  }
}

// Environment file existence check
console.log('\n📁 Environment Files Check:');
const fs = require('fs');
const path = require('path');

const envFiles = [
  '.env.local',
  '.env.debug.example',
  '.env.local.example'
];

envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${file}: ${exists ? '✅ exists' : '❌ missing'}`);

  if (exists && file === '.env.local') {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      console.log(`    📄 Contains ${lines.length} non-comment lines`);

      // Check for debug variables
      const debugVars = lines.filter(line => line.includes('DEBUG_'));
      const nextPublicDebugVars = lines.filter(line => line.includes('NEXT_PUBLIC_DEBUG_'));

      console.log(`    🔍 Server debug vars: ${debugVars.length}`);
      console.log(`    🌐 Client debug vars: ${nextPublicDebugVars.length}`);

      if (debugVars.length > 0) {
        console.log('    Server vars found:');
        debugVars.forEach(line => console.log(`      ${line.trim()}`));
      }

      if (nextPublicDebugVars.length > 0) {
        console.log('    Client vars found:');
        nextPublicDebugVars.forEach(line => console.log(`      ${line.trim()}`));
      }

    } catch (readError) {
      console.log(`    ❌ Error reading file: ${readError.message}`);
    }
  }
});

// Provide recommendations
console.log('\n💡 Recommendations:');

const hasServerVars = process.env.DEBUG_SIMULANT_Y_POSITIONING ||
                     process.env.DEBUG_BLOCK_Y_POSITIONING ||
                     process.env.DEBUG_Y_LEVEL_VALIDATION ||
                     process.env.DEBUG_POSITIONING_GENERAL;

const hasClientVars = process.env.NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING ||
                     process.env.NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING ||
                     process.env.NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION ||
                     process.env.NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL;

if (!hasServerVars && !hasClientVars) {
  console.log('❌ No debug environment variables found!');
  console.log('');
  console.log('To enable client-side debugging (browser console), add to .env.local:');
  console.log('  NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING=true');
  console.log('  NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING=true');
  console.log('  NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION=true');
  console.log('  NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL=true');
  console.log('');
  console.log('Then restart your development server: npm run dev');
} else if (hasServerVars && !hasClientVars) {
  console.log('⚠️  Only server-side debug variables found!');
  console.log('For browser console debugging, add NEXT_PUBLIC_ prefixed versions to .env.local');
} else if (hasClientVars) {
  console.log('✅ Client-side debug variables configured!');
  console.log('Make sure to restart your development server if you just added them.');
}

console.log('\n🎯 Next Steps:');
console.log('1. Ensure .env.local has NEXT_PUBLIC_ prefixed debug variables');
console.log('2. Restart development server: npm run dev');
console.log('3. Check browser console for "🔧 Y-Level Debug System Status"');
console.log('4. Look for debug logs when interacting with simulants/blocks');

console.log('\n📖 For full troubleshooting guide, see: DEBUG_Y_POSITIONING.md');
