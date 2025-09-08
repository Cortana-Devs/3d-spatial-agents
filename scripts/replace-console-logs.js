#!/usr/bin/env node

/**
 * Console Log Replacement Script
 *
 * Automatically replaces direct console.log/warn/error statements with
 * the project's devLog/devWarn/devError system for better development
 * logging control.
 */

const fs = require('fs');
const path = require('path');

// Directories to scan for console statements
const SCAN_DIRECTORIES = [
  'app',
  'components',
  'hooks',
  'lib',
  'utils',
  'systems',
  'store',
  'services'
];

// Files to exclude from replacement
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /build/,
  /dist/,
  /coverage/,
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  /devLogger\.(ts|js)$/,
  /setup-logging-control\.js$/,
  /replace-console-logs\.js$/
];

// Console method mappings
const CONSOLE_MAPPINGS = {
  'console.log': 'devLog',
  'console.warn': 'devWarn',
  'console.error': 'devError',
  'console.info': 'devLog',
  'console.debug': 'devLog'
};

class ConsoleReplacer {
  constructor() {
    this.replacements = 0;
    this.filesModified = 0;
    this.errors = [];
    this.dryRun = false;
  }

  /**
   * Main entry point - scan and replace console statements
   */
  async run(options = {}) {
    this.dryRun = options.dryRun || false;

    console.log('🔍 Scanning for console statements...\n');

    for (const dir of SCAN_DIRECTORIES) {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        await this.scanDirectory(fullPath);
      }
    }

    this.printSummary();
  }

  /**
   * Recursively scan directory for files to process
   */
  async scanDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!this.shouldExclude(fullPath)) {
            await this.scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          // Process TypeScript/JavaScript files
          if (this.isProcessableFile(entry.name) && !this.shouldExclude(fullPath)) {
            await this.processFile(fullPath);
          }
        }
      }
    } catch (error) {
      this.errors.push(`Error scanning directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Check if file should be excluded from processing
   */
  shouldExclude(filePath) {
    return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if file is a processable TypeScript/JavaScript file
   */
  isProcessableFile(filename) {
    return /\.(ts|tsx|js|jsx)$/.test(filename);
  }

  /**
   * Process individual file for console statement replacement
   */
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const result = this.replaceConsoleStatements(content, filePath);

      if (result.modified) {
        if (!this.dryRun) {
          fs.writeFileSync(filePath, result.content);
        }

        this.filesModified++;
        this.replacements += result.replacementCount;

        console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${result.replacementCount} replacements`);

        if (result.needsImport && !this.dryRun) {
          console.log(`   📦 Added devLogger imports`);
        }
      }
    } catch (error) {
      this.errors.push(`Error processing ${filePath}: ${error.message}`);
    }
  }

  /**
   * Replace console statements in file content
   */
  replaceConsoleStatements(content, filePath) {
    let modified = false;
    let replacementCount = 0;
    let needsImport = false;
    let newContent = content;

    // Track which dev functions are needed
    const usedDevFunctions = new Set();

    // Find and replace console statements
    for (const [consoleMethod, devMethod] of Object.entries(CONSOLE_MAPPINGS)) {
      const regex = new RegExp(`\\b${consoleMethod.replace('.', '\\.')}\\b`, 'g');
      const matches = newContent.match(regex);

      if (matches) {
        // Skip if already wrapped in ifDev or similar
        const lines = newContent.split('\n');
        let shouldReplace = [];

        lines.forEach((line, index) => {
          if (regex.test(line)) {
            // Check if line is already wrapped in development checks
            const prevLines = lines.slice(Math.max(0, index - 3), index).join(' ');
            const currentLine = line;
            const nextLines = lines.slice(index + 1, Math.min(lines.length, index + 4)).join(' ');
            const context = prevLines + ' ' + currentLine + ' ' + nextLines;

            // Skip if already using dev logging or wrapped in dev checks
            if (this.isAlreadyHandled(context)) {
              shouldReplace.push(false);
            } else {
              shouldReplace.push(true);
              usedDevFunctions.add(devMethod);
            }
          }
        });

        // Perform replacements for non-excluded matches
        let matchIndex = 0;
        newContent = newContent.replace(regex, (match) => {
          const replace = shouldReplace[matchIndex];
          matchIndex++;

          if (replace) {
            modified = true;
            replacementCount++;
            return devMethod;
          }
          return match;
        });
      }
    }

    // Add import if needed and not already present
    if (usedDevFunctions.size > 0 && !this.hasDevLoggerImport(newContent)) {
      needsImport = true;
      newContent = this.addDevLoggerImport(newContent, Array.from(usedDevFunctions));
      modified = true;
    }

    return {
      content: newContent,
      modified,
      replacementCount,
      needsImport
    };
  }

  /**
   * Check if console statement is already properly handled
   */
  isAlreadyHandled(context) {
    const devPatterns = [
      /ifDev\s*\(/,
      /process\.env\.NODE_ENV\s*===\s*['"]development['"]/,
      /devLog|devWarn|devError/,
      /createScopedLogger/,
      /import.*devLogger/,
      /from\s+['"]@\/utils\/devLogger['"]/
    ];

    return devPatterns.some(pattern => pattern.test(context));
  }

  /**
   * Check if file already has devLogger import
   */
  hasDevLoggerImport(content) {
    return /import.*from\s+['"]@\/utils\/devLogger['"]/.test(content) ||
           /import.*devLogger.*from/.test(content);
  }

  /**
   * Add devLogger import to file
   */
  addDevLoggerImport(content, usedFunctions) {
    const importStatement = `import { ${usedFunctions.join(', ')} } from "@/utils/devLogger";\n`;

    // Find the best place to insert the import
    const lines = content.split('\n');
    let insertIndex = 0;

    // Look for existing imports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('import ') || line.startsWith('const ') && line.includes('require')) {
        insertIndex = i + 1;
      } else if (line.startsWith('"use client"') || line.startsWith("'use client'")) {
        insertIndex = i + 1;
      } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
        break;
      }
    }

    // Insert the import
    lines.splice(insertIndex, 0, importStatement);
    return lines.join('\n');
  }

  /**
   * Print summary of replacements made
   */
  printSummary() {
    console.log('\n📊 Replacement Summary:');
    console.log(`   Files modified: ${this.filesModified}`);
    console.log(`   Total replacements: ${this.replacements}`);

    if (this.dryRun) {
      console.log('\n💡 This was a dry run. Use --apply to make actual changes.');
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    if (this.filesModified > 0 && !this.dryRun) {
      console.log('\n✅ Console statement replacement completed!');
      console.log('\n🎮 Usage after replacement:');
      console.log('   • Set NEXT_PUBLIC_DEV_LOG=false in .env.local to disable logging');
      console.log('   • Add ?devlog=false to URL for runtime control');
      console.log('   • Use window.__DEV_LOGS__.disable() in browser console');
      console.log('\n🔄 Restart your dev server to see the changes take effect');
    }
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes('--apply')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📋 Console Log Replacement Script

Usage:
  node scripts/replace-console-logs.js [options]

Options:
  --apply     Apply changes (default is dry run)
  --help, -h  Show this help message

Examples:
  node scripts/replace-console-logs.js           # Dry run (preview changes)
  node scripts/replace-console-logs.js --apply   # Apply changes

This script will:
  • Find direct console.log/warn/error statements
  • Replace them with devLog/devWarn/devError
  • Add necessary imports from @/utils/devLogger
  • Skip statements already wrapped in dev checks
  • Preserve existing dev logging patterns

After running with --apply:
  • Run "npm run setup:logging" to configure .env.local
  • Restart your dev server
  • Use environment variables to control logging behavior
`);
    return;
  }

  const replacer = new ConsoleReplacer();
  replacer.run(options);
}

if (require.main === module) {
  main();
}

module.exports = { ConsoleReplacer };
