#!/usr/bin/env node

/**
 * Performance Mode Activation Script
 * Enables butter-smooth performance by disabling all debug logging
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.env.local';
const TEMPLATE_FILE = '.env.local.debug.disable';
const BACKUP_SUFFIX = '.backup.' + Date.now();

console.log('🚀 Performance Mode Activation Script\n');

function main() {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  const templatePath = path.join(process.cwd(), TEMPLATE_FILE);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.error('❌ Template file not found:', TEMPLATE_FILE);
    console.log('Please ensure you have the .env.local.debug.disable file');
    process.exit(1);
  }

  // Backup existing .env.local if it exists
  if (fs.existsSync(configPath)) {
    const backupPath = configPath + BACKUP_SUFFIX;
    fs.copyFileSync(configPath, backupPath);
    console.log('💾 Backed up existing .env.local to:', path.basename(backupPath));
  }

  // Copy performance template to .env.local
  fs.copyFileSync(templatePath, configPath);
  console.log('✅ Performance mode configuration applied!');

  console.log('\n🎯 Performance optimizations enabled:');
  console.log('   • All debug logging disabled');
  console.log('   • Block positioning logs off');
  console.log('   • Simulant positioning logs off');
  console.log('   • Dev logger disabled');
  console.log('   • Performance monitoring silenced');

  console.log('\n📋 Next steps:');
  console.log('   1. Restart your dev server: npm run dev');
  console.log('   2. Refresh your browser for clean console');
  console.log('   3. Enjoy butter-smooth 60fps performance!');

  console.log('\n🔧 To re-enable debugging later:');
  console.log('   • Edit .env.local and set NEXT_PUBLIC_PERF_MODE=false');
  console.log('   • Or use browser console: window.__DEBUG_LOGS__.enableAll()');

  console.log('\n✨ Performance mode activated successfully!\n');
}

function showUsage() {
  console.log('Usage: node scripts/enable-performance-mode.js');
  console.log('');
  console.log('This script will:');
  console.log('  1. Backup your current .env.local (if exists)');
  console.log('  2. Apply performance-optimized environment variables');
  console.log('  3. Disable all debug logging for smooth performance');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h    Show this help message');
  console.log('');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
