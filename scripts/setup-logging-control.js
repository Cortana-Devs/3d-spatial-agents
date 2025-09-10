#!/usr/bin/env node

/**
 * Setup Logging Control Script
 *
 * This script helps configure development logging controls in your .env.local file.
 * It adds the necessary environment variables to control console logging behavior.
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env.local');
const LOGGING_VARS = `
# Development Logging Controls
# Set to "false" to disable all development console logging
# Set to "true" to enable development console logging
NEXT_PUBLIC_DEV_LOG=true
NEXT_PUBLIC_DEBUG_LOG=true

# Alternative: Use this for granular control
# NEXT_PUBLIC_LOGS=true

# You can also control logging at runtime:
# - Add ?devlog=false to URL to disable logging
# - Use window.__DEV_LOGS__.disable() in browser console
# - Use window.__DEV_LOGS__.enable() to re-enable
`;

function setupLoggingControl() {
  console.log('🔧 Setting up development logging control...\n');

  try {
    let envContent = '';

    // Read existing .env.local if it exists
    if (fs.existsSync(ENV_FILE)) {
      envContent = fs.readFileSync(ENV_FILE, 'utf8');
      console.log('✅ Found existing .env.local file');

      // Check if logging variables already exist
      if (envContent.includes('NEXT_PUBLIC_DEV_LOG') ||
          envContent.includes('NEXT_PUBLIC_DEBUG_LOG') ||
          envContent.includes('NEXT_PUBLIC_LOGS')) {
        console.log('ℹ️  Logging control variables already exist in .env.local');
        console.log('📖 Current configuration:');

        const lines = envContent.split('\n');
        lines.forEach(line => {
          if (line.includes('DEV_LOG') || line.includes('DEBUG_LOG') ||
              (line.includes('NEXT_PUBLIC_LOGS') && !line.includes('DEV_LOG'))) {
            console.log(`   ${line}`);
          }
        });

        console.log('\n💡 To disable all console logs, set these to "false"');
        console.log('💡 To enable console logs, set these to "true"');
        return;
      }
    } else {
      console.log('📄 Creating new .env.local file');
    }

    // Add logging control variables
    const updatedContent = envContent + LOGGING_VARS;
    fs.writeFileSync(ENV_FILE, updatedContent);

    console.log('✅ Added development logging controls to .env.local');
    console.log('\n📖 Added configuration:');
    console.log('   NEXT_PUBLIC_DEV_LOG=true');
    console.log('   NEXT_PUBLIC_DEBUG_LOG=true');

    console.log('\n🎮 Usage:');
    console.log('   • Set to "false" to disable all console logging');
    console.log('   • Set to "true" to enable console logging');
    console.log('   • Add ?devlog=false to URL for runtime control');
    console.log('   • Use browser console: window.__DEV_LOGS__.disable()');

    console.log('\n🔄 Restart your dev server after changing these values');

  } catch (error) {
    console.error('❌ Error setting up logging control:', error.message);
    process.exit(1);
  }
}

function showUsage() {
  console.log('📋 Development Logging Control Options:\n');

  console.log('🔧 Environment Variables (in .env.local):');
  console.log('   NEXT_PUBLIC_DEV_LOG=false     # Disable all dev logging');
  console.log('   NEXT_PUBLIC_DEBUG_LOG=false   # Disable debug logging');
  console.log('   NEXT_PUBLIC_LOGS=false        # Alternative control\n');

  console.log('🌐 Runtime Controls (in browser):');
  console.log('   ?devlog=false                 # Add to URL');
  console.log('   window.__DEV_LOGS__.disable() # In browser console');
  console.log('   window.__DEV_LOGS__.enable()  # Re-enable logging');
  console.log('   window.__DEV_LOGS__.status()  # Check current status\n');

  console.log('📦 NPM Scripts:');
  console.log('   npm run setup:logging         # Run this setup script');
  console.log('   npm run dev                   # Start dev server (respects .env.local)');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showUsage();
} else {
  setupLoggingControl();
}
