#!/usr/bin/env node

/**
 * Validate Debug Fix Script
 *
 * This script loads .env.local like Next.js does and validates that
 * debug environment variables are properly configured for client-side debugging.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Debug Environment Fix (Next.js simulation)\n');

// Load .env.local like Next.js does
const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found!');
  process.exit(1);
}

// Parse .env.local manually (like Next.js does)
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.slice(0, equalIndex).trim();
      const value = trimmedLine.slice(equalIndex + 1).trim();
      // Remove quotes if present
      envVars[key] = value.replace(/^["'](.*)["']$/, '$1');
    }
  }
});

console.log(`📊 Loaded ${Object.keys(envVars).length} environment variables from .env.local`);

// Check debug variables specifically
const debugVars = {
  server: {},
  client: {}
};

Object.entries(envVars).forEach(([key, value]) => {
  if (key.startsWith('DEBUG_')) {
    debugVars.server[key] = value;
  } else if (key.startsWith('NEXT_PUBLIC_DEBUG_')) {
    debugVars.client[key] = value;
  }
});

console.log('\n🖥️  Server-side Debug Variables:');
if (Object.keys(debugVars.server).length === 0) {
  console.log('   (none found)');
} else {
  Object.entries(debugVars.server).forEach(([key, value]) => {
    const status = value === 'true' ? '✅' : '⚠️';
    console.log(`   ${status} ${key}=${value}`);
  });
}

console.log('\n🌐 Client-side Debug Variables (NEXT_PUBLIC_):');
if (Object.keys(debugVars.client).length === 0) {
  console.log('   ❌ None found! This is the problem.');
} else {
  Object.entries(debugVars.client).forEach(([key, value]) => {
    const status = value === 'true' ? '✅' : '⚠️';
    console.log(`   ${status} ${key}=${value}`);
  });
}

// Validate specific required variables
const requiredClientVars = [
  'NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING',
  'NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING',
  'NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION',
  'NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL'
];

console.log('\n🎯 Required Client Variables Check:');
let allRequiredPresent = true;

requiredClientVars.forEach(varName => {
  const isPresent = envVars.hasOwnProperty(varName);
  const isEnabled = envVars[varName] === 'true';

  if (!isPresent) {
    console.log(`   ❌ ${varName}: MISSING`);
    allRequiredPresent = false;
  } else if (!isEnabled) {
    console.log(`   ⚠️  ${varName}=${envVars[varName]} (should be 'true')`);
    allRequiredPresent = false;
  } else {
    console.log(`   ✅ ${varName}=true`);
  }
});

// Simulate Next.js environment variable behavior
console.log('\n🔧 Next.js Environment Simulation:');
console.log('   NODE_ENV:', envVars.NODE_ENV || 'development');

// Simulate what the browser will see
const browserEnv = {};
Object.entries(envVars).forEach(([key, value]) => {
  if (key.startsWith('NEXT_PUBLIC_')) {
    browserEnv[key] = value;
  }
});

console.log(`   Browser accessible vars: ${Object.keys(browserEnv).length}`);

// Test debug logger logic simulation
console.log('\n🧪 Debug Logger Logic Test:');

const testDebugEnabled = (category) => {
  const envVarMap = {
    'simulant-y-positioning': 'NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING',
    'block-y-positioning': 'NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING',
    'y-level-validation': 'NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION',
    'positioning-general': 'NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL'
  };

  const serverVar = envVarMap[category].replace('NEXT_PUBLIC_', '');
  const clientVar = envVarMap[category];

  // Client-side takes precedence (browser environment)
  const clientValue = browserEnv[clientVar];
  const serverValue = envVars[serverVar];

  const finalValue = clientValue || serverValue;
  const isEnabled = finalValue === 'true';

  return {
    category,
    serverVar,
    clientVar,
    serverValue: serverValue || 'undefined',
    clientValue: clientValue || 'undefined',
    finalValue: finalValue || 'undefined',
    isEnabled
  };
};

const categories = [
  'simulant-y-positioning',
  'block-y-positioning',
  'y-level-validation',
  'positioning-general'
];

categories.forEach(category => {
  const result = testDebugEnabled(category);
  const status = result.isEnabled ? '✅' : '❌';
  console.log(`   ${status} ${result.category}: ${result.finalValue} (client: ${result.clientValue})`);
});

// Final assessment
console.log('\n📋 Assessment:');

if (allRequiredPresent) {
  console.log('✅ All required NEXT_PUBLIC_ debug variables are present and enabled!');

  console.log('\n🎉 Debug system should now work! Expected behavior:');
  console.log('   1. Browser console will show "Simulant Debug: true"');
  console.log('   2. Browser console will show "Block Debug: true"');
  console.log('   3. Adding simulants will generate 🤖 debug logs');
  console.log('   4. Placing blocks will generate 🧱 debug logs');

} else {
  console.log('❌ Some required debug variables are missing or incorrect.');
  console.log('\nRun this command to fix:');
  console.log('   node scripts/fix-debug-env.js');
}

console.log('\n🚀 Next Steps:');
console.log('1. If variables are correct: restart development server');
console.log('   npm run dev');
console.log('2. Open browser console and look for:');
console.log('   🔧 Y-Level Debug System Status');
console.log('3. Test by adding simulants or placing blocks');
console.log('4. You should see colorful debug logs with emojis!');

console.log('\n📖 For full guide: DEBUG_Y_POSITIONING.md');

// Show sample expected output
if (allRequiredPresent) {
  console.log('\n📄 Expected Browser Console Output:');
  console.log('─'.repeat(60));
  console.log('🔧 Y-Level Debug System Status');
  console.log('Environment: development');
  console.log('Simulant Debug: true');
  console.log('Block Debug: true');
  console.log('Validation Debug: true');
  console.log('General Debug: true');
  console.log('🔊 Debug logging enabled for: [');
  console.log('  "simulant-y-positioning",');
  console.log('  "block-y-positioning",');
  console.log('  "y-level-validation",');
  console.log('  "positioning-general"');
  console.log(']');
  console.log('');
  console.log('🤖 ℹ️ [14:30:15.123] SIMULANT-Y-POSITIONING: Default Y positioning...');
  console.log('🧱 ℹ️ [14:30:15.456] BLOCK-Y-POSITIONING: Initial Y positioning...');
  console.log('─'.repeat(60));
}
