#!/usr/bin/env node

/**
 * Fix Debug Environment Variables Script
 *
 * This script automatically adds the missing NEXT_PUBLIC_ prefixed debug variables
 * to .env.local file to enable client-side debugging in the browser console.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Debug Environment Variables\n');

const envPath = path.join(process.cwd(), '.env.local');

// Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found!');
  console.log('Please create .env.local file first or copy from .env.local.example');
  process.exit(1);
}

// Read current .env.local content
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Successfully read .env.local');
} catch (error) {
  console.error('❌ Error reading .env.local:', error.message);
  process.exit(1);
}

// Parse existing environment variables
const existingLines = envContent.split('\n');
const existingVars = new Set();

existingLines.forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key] = trimmedLine.split('=');
    if (key) {
      existingVars.add(key.trim());
    }
  }
});

console.log(`📊 Found ${existingVars.size} existing environment variables`);

// Define the debug variables we need to add
const debugVars = {
  'NEXT_PUBLIC_DEBUG_SIMULANT_Y_POSITIONING': 'true',
  'NEXT_PUBLIC_DEBUG_BLOCK_Y_POSITIONING': 'true',
  'NEXT_PUBLIC_DEBUG_Y_LEVEL_VALIDATION': 'true',
  'NEXT_PUBLIC_DEBUG_POSITIONING_GENERAL': 'true'
};

// Check which variables are missing
const missingVars = [];
const existingClientVars = [];

Object.keys(debugVars).forEach(varName => {
  if (existingVars.has(varName)) {
    existingClientVars.push(varName);
  } else {
    missingVars.push(varName);
  }
});

console.log(`\n🔍 Analysis:`);
console.log(`  Existing client debug vars: ${existingClientVars.length}`);
console.log(`  Missing client debug vars: ${missingVars.length}`);

if (existingClientVars.length > 0) {
  console.log(`\n✅ Already configured:`);
  existingClientVars.forEach(varName => {
    console.log(`  ${varName}`);
  });
}

if (missingVars.length === 0) {
  console.log('\n🎉 All client-side debug variables are already configured!');
  console.log('If debugging still doesn\'t work, try restarting your development server:');
  console.log('  npm run dev');
  process.exit(0);
}

console.log(`\n📝 Adding missing variables:`);
missingVars.forEach(varName => {
  console.log(`  ${varName}=${debugVars[varName]}`);
});

// Create backup
const backupPath = envPath + '.backup.' + Date.now();
try {
  fs.writeFileSync(backupPath, envContent);
  console.log(`\n💾 Created backup: ${path.basename(backupPath)}`);
} catch (error) {
  console.error('⚠️  Warning: Could not create backup:', error.message);
  console.log('Continuing anyway...');
}

// Build new content
let newContent = envContent;

// Ensure file ends with newline
if (newContent && !newContent.endsWith('\n')) {
  newContent += '\n';
}

// Add header comment if this is the first time adding debug vars
if (!envContent.includes('DEBUG_')) {
  newContent += '\n# Debug Environment Variables (added by fix-debug-env.js)\n';
} else {
  newContent += '\n# Client-side debug variables (added by fix-debug-env.js)\n';
}

// Add missing variables
missingVars.forEach(varName => {
  newContent += `${varName}=${debugVars[varName]}\n`;
});

// Write updated content
try {
  fs.writeFileSync(envPath, newContent);
  console.log('\n✅ Successfully updated .env.local');
} catch (error) {
  console.error('❌ Error writing .env.local:', error.message);
  process.exit(1);
}

// Verify the changes
console.log('\n🔍 Verification:');
try {
  const updatedContent = fs.readFileSync(envPath, 'utf8');
  const updatedLines = updatedContent.split('\n');
  const foundVars = [];

  updatedLines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key] = trimmedLine.split('=');
      if (key && key.includes('NEXT_PUBLIC_DEBUG_')) {
        foundVars.push(key.trim());
      }
    }
  });

  console.log(`✅ Found ${foundVars.length} NEXT_PUBLIC_DEBUG_ variables:`);
  foundVars.forEach(varName => {
    console.log(`  ${varName}`);
  });

} catch (error) {
  console.error('⚠️  Could not verify changes:', error.message);
}

// Instructions
console.log('\n🎯 Next Steps:');
console.log('1. Restart your development server:');
console.log('   npm run dev');
console.log('');
console.log('2. Open your browser console and look for:');
console.log('   🔧 Y-Level Debug System Status');
console.log('   Environment: development');
console.log('   Simulant Debug: true  ← Should now show "true"');
console.log('   Block Debug: true     ← Should now show "true"');
console.log('');
console.log('3. Test debug logging by:');
console.log('   - Adding a simulant (FloatingSidebar → Animation → Add Simulant)');
console.log('   - Placing a block (select block type, click in 3D world)');
console.log('   - Moving the camera (WASD keys)');
console.log('');
console.log('4. If you see debug logs in console, debugging is working! 🎉');
console.log('');
console.log('📚 For troubleshooting, see: DEBUG_Y_POSITIONING.md');

// Show current .env.local content for reference
console.log('\n📄 Updated .env.local content preview:');
console.log('─'.repeat(50));
const previewLines = newContent.split('\n').slice(-10); // Show last 10 lines
previewLines.forEach(line => {
  if (line.trim()) {
    console.log(line);
  }
});
if (newContent.split('\n').length > 10) {
  console.log('...(showing last 10 lines)');
}
console.log('─'.repeat(50));

console.log('\n✨ Debug environment setup complete!');
