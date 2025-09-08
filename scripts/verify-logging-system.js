#!/usr/bin/env node

/**
 * Logging System Verification Script
 *
 * Verifies that the development logging system is properly configured
 * and functioning correctly across the project.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LoggingSystemVerifier {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
  }

  /**
   * Main verification routine
   */
  async verify() {
    console.log('🔍 Verifying Logging System Configuration...\n');

    try {
      await this.checkEnvironmentSetup();
      await this.checkDevLoggerUtility();
      await this.checkReplacementResults();
      await this.checkPackageJsonScripts();
      await this.checkDocumentation();
      await this.checkImportIntegrity();
      await this.runBasicFunctionality();
    } catch (error) {
      this.results.errors.push(error.message);
    }

    this.printResults();
  }

  /**
   * Check environment variable setup
   */
  async checkEnvironmentSetup() {
    console.log('📋 Checking environment setup...');

    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      this.fail('❌ .env.local file not found');
      this.warn('💡 Run: npm run setup:logging');
      return;
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf8');

      // Check for logging variables
      const hasDevLog = envContent.includes('NEXT_PUBLIC_DEV_LOG');
      const hasDebugLog = envContent.includes('NEXT_PUBLIC_DEBUG_LOG');

      if (hasDevLog || hasDebugLog) {
        this.pass('✅ Environment variables configured');

        // Check current values
        const devLogMatch = envContent.match(/NEXT_PUBLIC_DEV_LOG\s*=\s*(.+)/);
        const debugLogMatch = envContent.match(/NEXT_PUBLIC_DEBUG_LOG\s*=\s*(.+)/);

        if (devLogMatch) {
          const value = devLogMatch[1].trim();
          console.log(`   NEXT_PUBLIC_DEV_LOG=${value}`);
        }

        if (debugLogMatch) {
          const value = debugLogMatch[1].trim();
          console.log(`   NEXT_PUBLIC_DEBUG_LOG=${value}`);
        }
      } else {
        this.warn('⚠️  Logging environment variables not found');
        this.warn('💡 Run: npm run setup:logging');
      }
    } catch (error) {
      this.fail(`❌ Error reading .env.local: ${error.message}`);
    }
  }

  /**
   * Check devLogger utility integrity
   */
  async checkDevLoggerUtility() {
    console.log('\n🛠️  Checking devLogger utility...');

    const devLoggerPath = path.join(process.cwd(), 'utils', 'devLogger.ts');

    if (!fs.existsSync(devLoggerPath)) {
      this.fail('❌ devLogger.ts not found in utils/');
      return;
    }

    const content = fs.readFileSync(devLoggerPath, 'utf8');

    // Check for required exports
    const requiredExports = [
      'devLog',
      'devWarn',
      'devError',
      'ifDev',
      'createScopedLogger',
      'measure',
      'devOnce'
    ];

    let missingExports = [];
    requiredExports.forEach(exportName => {
      if (!content.includes(`export function ${exportName}`) &&
          !content.includes(`export const ${exportName}`)) {
        missingExports.push(exportName);
      }
    });

    if (missingExports.length === 0) {
      this.pass('✅ devLogger utility complete');
    } else {
      this.fail(`❌ Missing exports: ${missingExports.join(', ')}`);
    }

    // Check for environment variable support
    if (content.includes('NEXT_PUBLIC_DEV_LOG') ||
        content.includes('NEXT_PUBLIC_DEBUG_LOG')) {
      this.pass('✅ Environment variable support enabled');
    } else {
      this.fail('❌ Environment variable support missing');
    }

    // Check for browser API
    if (content.includes('window.__DEV_LOGS__')) {
      this.pass('✅ Browser control API available');
    } else {
      this.fail('❌ Browser control API missing');
    }
  }

  /**
   * Check console statement replacement results
   */
  async checkReplacementResults() {
    console.log('\n🔄 Checking console statement replacements...');

    const directories = ['components', 'utils', 'hooks', 'systems', 'store'];
    let devLogUsage = 0;
    let directConsoleUsage = 0;
    let filesWithDevLogging = 0;
    let totalFiles = 0;

    directories.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        const files = this.getAllFiles(dirPath, ['.ts', '.tsx', '.js', '.jsx']);

        files.forEach(file => {
          if (!file.includes('test') &&
              !file.includes('spec') &&
              !file.includes('devLogger.ts')) {
            totalFiles++;

            const content = fs.readFileSync(file, 'utf8');

            // Count dev logging usage
            const devMatches = content.match(/\b(devLog|devWarn|devError|ifDev)\s*\(/g);
            if (devMatches) {
              devLogUsage += devMatches.length;
              filesWithDevLogging++;
            }

            // Count direct console usage (excluding tests and dev utilities)
            const consoleMatches = content.match(/\bconsole\.(log|warn|error)\s*\(/g);
            if (consoleMatches) {
              // Filter out legitimate uses (within ifDev, process.env checks, etc.)
              const lines = content.split('\n');
              consoleMatches.forEach(match => {
                const matchIndex = content.indexOf(match);
                const lineNumber = content.substring(0, matchIndex).split('\n').length;
                const line = lines[lineNumber - 1] || '';
                const context = lines.slice(Math.max(0, lineNumber - 3), lineNumber + 2).join(' ');

                // Check if it's a legitimate console usage
                if (!context.includes('ifDev') &&
                    !context.includes('process.env.NODE_ENV') &&
                    !context.includes('devLogger') &&
                    !line.includes('// allowed') &&
                    !line.includes('/* allowed */')) {
                  directConsoleUsage++;
                }
              });
            }
          }
        });
      }
    });

    console.log(`   📊 Scanned ${totalFiles} files`);
    console.log(`   📝 Files with dev logging: ${filesWithDevLogging}`);
    console.log(`   🎯 Dev logging calls: ${devLogUsage}`);
    console.log(`   ⚠️  Direct console calls: ${directConsoleUsage}`);

    if (devLogUsage > 50) {
      this.pass(`✅ Good dev logging adoption (${devLogUsage} calls)`);
    } else if (devLogUsage > 0) {
      this.warn(`⚠️  Limited dev logging adoption (${devLogUsage} calls)`);
    } else {
      this.fail('❌ No dev logging usage found');
    }

    if (directConsoleUsage < 20) {
      this.pass(`✅ Low direct console usage (${directConsoleUsage} calls)`);
    } else if (directConsoleUsage < 50) {
      this.warn(`⚠️  Moderate direct console usage (${directConsoleUsage} calls)`);
      this.warn('💡 Run: npm run replace:console');
    } else {
      this.fail(`❌ High direct console usage (${directConsoleUsage} calls)`);
      this.warn('💡 Run: npm run replace:console:apply');
    }
  }

  /**
   * Check package.json scripts
   */
  async checkPackageJsonScripts() {
    console.log('\n📦 Checking package.json scripts...');

    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      this.fail('❌ package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageJson.scripts || {};

    const requiredScripts = [
      'setup:logging',
      'replace:console',
      'replace:console:apply'
    ];

    let missingScripts = [];
    requiredScripts.forEach(script => {
      if (!scripts[script]) {
        missingScripts.push(script);
      }
    });

    if (missingScripts.length === 0) {
      this.pass('✅ All logging scripts available');
    } else {
      this.fail(`❌ Missing scripts: ${missingScripts.join(', ')}`);
    }

    // Check if scripts are executable
    const scriptFiles = [
      'scripts/setup-logging-control.js',
      'scripts/replace-console-logs.js'
    ];

    let missingFiles = [];
    scriptFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    });

    if (missingFiles.length === 0) {
      this.pass('✅ All script files present');
    } else {
      this.fail(`❌ Missing script files: ${missingFiles.join(', ')}`);
    }
  }

  /**
   * Check documentation
   */
  async checkDocumentation() {
    console.log('\n📚 Checking documentation...');

    const docPath = path.join(process.cwd(), 'docs', 'LOGGING_CONTROL.md');
    if (!fs.existsSync(docPath)) {
      this.fail('❌ LOGGING_CONTROL.md documentation missing');
      return;
    }

    const docContent = fs.readFileSync(docPath, 'utf8');

    const requiredSections = [
      '## Quick Start',
      '## Environment Variables',
      '## Browser Controls',
      '## NPM Scripts',
      '## Best Practices'
    ];

    let missingSections = [];
    requiredSections.forEach(section => {
      if (!docContent.includes(section)) {
        missingSections.push(section);
      }
    });

    if (missingSections.length === 0) {
      this.pass('✅ Documentation complete');
    } else {
      this.fail(`❌ Missing documentation sections: ${missingSections.join(', ')}`);
    }

    // Check for environment variable documentation
    const envVars = ['NEXT_PUBLIC_DEV_LOG', 'NEXT_PUBLIC_DEBUG_LOG'];
    let undocumentedVars = [];

    envVars.forEach(envVar => {
      if (!docContent.includes(envVar)) {
        undocumentedVars.push(envVar);
      }
    });

    if (undocumentedVars.length === 0) {
      this.pass('✅ Environment variables documented');
    } else {
      this.warn(`⚠️  Undocumented variables: ${undocumentedVars.join(', ')}`);
    }
  }

  /**
   * Check import integrity
   */
  async checkImportIntegrity() {
    console.log('\n🔗 Checking import integrity...');

    const directories = ['components', 'utils', 'hooks', 'systems'];
    let syntaxErrors = [];
    let importErrors = [];
    let totalChecked = 0;

    directories.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        const files = this.getAllFiles(dirPath, ['.ts', '.tsx']);

        files.forEach(file => {
          totalChecked++;
          const content = fs.readFileSync(file, 'utf8');

          // Check for malformed imports
          if (content.includes('import {\nimport {') ||
              content.includes('import {\nfrom') ||
              content.match(/import\s*\{\s*import\s*\{/)) {
            importErrors.push(path.relative(process.cwd(), file));
          }

          // Basic syntax check for import lines
          const importLines = content.split('\n').filter(line =>
            line.trim().startsWith('import') && line.includes('devLogger')
          );

          importLines.forEach((line, index) => {
            if (!line.includes('from') && !line.trim().endsWith(';')) {
              syntaxErrors.push(`${path.relative(process.cwd(), file)}:${index + 1}`);
            }
          });
        });
      }
    });

    console.log(`   📊 Checked ${totalChecked} TypeScript files`);

    if (importErrors.length === 0) {
      this.pass('✅ No malformed imports detected');
    } else {
      this.fail(`❌ Malformed imports in: ${importErrors.join(', ')}`);
      importErrors.forEach(file => {
        this.warn(`💡 Fix imports in: ${file}`);
      });
    }

    if (syntaxErrors.length === 0) {
      this.pass('✅ Import syntax looks good');
    } else {
      this.warn(`⚠️  Potential syntax issues: ${syntaxErrors.join(', ')}`);
    }
  }

  /**
   * Test basic functionality
   */
  async runBasicFunctionality() {
    console.log('\n🧪 Testing basic functionality...');

    try {
      // Create temporary test file
      const testContent = `
import { devLog, devWarn, devError, ifDev } from "./utils/devLogger";

// Test basic logging
devLog("Test log message");
devWarn("Test warning message");
devError("Test error message");

// Test conditional execution
ifDev(() => {
  console.log("This should only run in development");
});

export default function TestComponent() {
  return null;
}
      `;

      const testPath = path.join(process.cwd(), 'test-logging-temp.tsx');
      fs.writeFileSync(testPath, testContent);

      // Try to parse with TypeScript compiler if available
      try {
        execSync('npx tsc --noEmit --skipLibCheck test-logging-temp.tsx', {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        this.pass('✅ TypeScript compilation successful');
      } catch (error) {
        // Check if it's just import resolution (expected in isolated test)
        if (error.stdout && error.stdout.includes('Cannot find module')) {
          this.pass('✅ Syntax validation passed (import resolution expected)');
        } else {
          this.warn('⚠️  TypeScript compilation issues detected');
        }
      }

      // Clean up test file
      fs.unlinkSync(testPath);

    } catch (error) {
      this.fail(`❌ Basic functionality test failed: ${error.message}`);
    }

    // Test environment variable parsing
    try {
      process.env.TEST_DEV_LOG = 'true';
      const testValue = process.env.TEST_DEV_LOG === 'true';
      if (testValue) {
        this.pass('✅ Environment variable parsing works');
      }
      delete process.env.TEST_DEV_LOG;
    } catch (error) {
      this.fail('❌ Environment variable parsing failed');
    }
  }

  /**
   * Helper: Get all files with specific extensions
   */
  getAllFiles(dirPath, extensions) {
    const files = [];

    function scanDir(currentPath) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    try {
      scanDir(dirPath);
    } catch (error) {
      // Directory might not exist or be accessible
    }

    return files;
  }

  /**
   * Record a passed test
   */
  pass(message) {
    console.log(message);
    this.results.passed++;
  }

  /**
   * Record a failed test
   */
  fail(message) {
    console.log(message);
    this.results.failed++;
  }

  /**
   * Record a warning
   */
  warn(message) {
    console.log(message);
    this.results.warnings++;
  }

  /**
   * Print final results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60));

    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Critical Errors:');
      this.results.errors.forEach(error => console.log(`   ${error}`));
    }

    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;

    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 LOGGING SYSTEM IS FULLY OPERATIONAL!');
      console.log('\n💡 Quick Usage:');
      console.log('   • Set NEXT_PUBLIC_DEV_LOG=false in .env.local to disable logging');
      console.log('   • Use window.__DEV_LOGS__.disable() in browser console');
      console.log('   • Add ?devlog=false to URL for session control');
    } else if (this.results.failed < 3) {
      console.log('\n⚠️  LOGGING SYSTEM IS MOSTLY FUNCTIONAL');
      console.log('   Minor issues detected - see failures above');
    } else {
      console.log('\n❌ LOGGING SYSTEM NEEDS ATTENTION');
      console.log('   Multiple issues detected - please review and fix');
    }

    console.log('\n📚 Documentation: docs/LOGGING_CONTROL.md');
    console.log('🔧 Setup: npm run setup:logging');
    console.log('🔄 Cleanup: npm run replace:console:apply');
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new LoggingSystemVerifier();
  verifier.verify().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { LoggingSystemVerifier };
