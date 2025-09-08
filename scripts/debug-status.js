#!/usr/bin/env node

/**
 * Debug Status Quick Check
 *
 * This script provides a quick status check of the Y-level positioning
 * debug system configuration and offers helpful commands.
 */

const fs = require('fs');
const path = require('path');

function loadEnvVars() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.slice(0, equalIndex).trim();
        const value = trimmedLine.slice(equalIndex + 1).trim().replace(/^["'](.*)["']$/, '$1');
        envVars[key] = value;
      }
    }
  });

  return envVars;
}

function checkDebugStatus() {
  console.log('🔍 Debug System Status Check\n');

  const envVars = loadEnvVars();

  // Check if .env.local exists
  if (Object.keys(envVars).length === 0) {
    console.log('❌ No .env.local file found or file is empty');
    console.log('\nQuick Fix:');
    console.log('  node scripts/fix-debug-env.js');
    return;
  }

  // Check required client variables
  const requiredVars = [
    'NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING',
    'NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING',
    'NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION',
    'NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL'
  ];

  let enabledCount = 0;
  const status = {};

  console.log('📊 Client-side Debug Variables:');
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    const isEnabled = value === 'true';

    if (isEnabled) enabledCount++;

    const emoji = isEnabled ? '✅' : '❌';
    const displayValue = value || 'missing';

    console.log(`  ${emoji} ${varName.replace('NEXT_PUBLIC_DEBUG_', '')}=${displayValue}`);
    status[varName] = isEnabled;
  });

  console.log(`\n📈 Summary: ${enabledCount}/${requiredVars.length} debug categories enabled`);

  // Environment check
  const nodeEnv = envVars.NODE_ENV || 'development';
  console.log(`🌍 Environment: ${nodeEnv}`);

  if (nodeEnv === 'production') {
    console.log('⚠️  Warning: Debug logging is disabled in production mode');
  }

  // Status assessment
  console.log('\n🎯 Status:');

  if (enabledCount === 0) {
    console.log('❌ Debug system is NOT configured');
    console.log('\n🔧 Quick Fix:');
    console.log('  node scripts/fix-debug-env.js');
    console.log('  npm run dev');
  } else if (enabledCount < requiredVars.length) {
    console.log('⚠️  Debug system is PARTIALLY configured');
    console.log('\n🔧 Complete Setup:');
    console.log('  node scripts/fix-debug-env.js');
    console.log('  npm run dev');
  } else {
    console.log('✅ Debug system is FULLY configured!');

    console.log('\n🚀 Expected Browser Console Output:');
    console.log('  🔧 Y-Level Debug System Status');
    console.log('  Simulant Debug: true');
    console.log('  Block Debug: true');
    console.log('  🔊 Debug logging enabled for: [...]');

    console.log('\n🧪 Test Debug Logging:');
    console.log('  1. Add simulant → Look for 🤖 logs');
    console.log('  2. Place block → Look for 🧱 logs');
    console.log('  3. Move camera → Look for positioning logs');
  }

  // Quick commands
  console.log('\n⚡ Quick Commands:');
  console.log('  Check this status:     node scripts/debug-status.js');
  console.log('  Fix configuration:     node scripts/fix-debug-env.js');
  console.log('  Test environment:      node scripts/test-env-vars.js');
  console.log('  Validate setup:        node scripts/validate-debug-fix.js');
  console.log('  Start dev server:      npm run dev');

  console.log('\n📖 Full guide: DEBUG_Y_POSITIONING.md');
}

// Run if called directly
if (require.main === module) {
  checkDebugStatus();
}

module.exports = { checkDebugStatus, loadEnvVars };
