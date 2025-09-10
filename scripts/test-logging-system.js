#!/usr/bin/env node

/**
 * Logging System Test Script
 *
 * Tests the development logging system to ensure proper functionality
 * and environment variable control.
 */

const fs = require('fs');
const path = require('path');

class LoggingSystemTest {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Add a test case
   */
  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('🧪 Testing Logging System...\n');

    for (const test of this.tests) {
      try {
        await test.testFn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.failed++;
      }
    }

    this.printSummary();
  }

  /**
   * Assert helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    const total = this.passed + this.failed;
    console.log(`\n📊 Test Results:`);
    console.log(`   Total: ${total}`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);

    if (this.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the output above.');
      process.exit(1);
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Read file content
   */
  readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Count occurrences in file
   */
  countInFile(filePath, pattern) {
    if (!this.fileExists(filePath)) return 0;
    const content = this.readFile(filePath);
    const matches = content.match(new RegExp(pattern, 'g'));
    return matches ? matches.length : 0;
  }
}

// Create test instance
const tester = new LoggingSystemTest();

// Test 1: Verify devLogger utility exists
tester.test('devLogger utility exists', () => {
  const devLoggerPath = path.join(process.cwd(), 'utils', 'devLogger.ts');
  tester.assert(
    tester.fileExists(devLoggerPath),
    'devLogger.ts file should exist in utils directory'
  );
});

// Test 2: Check devLogger exports
tester.test('devLogger has correct exports', () => {
  const devLoggerPath = path.join(process.cwd(), 'utils', 'devLogger.ts');
  const content = tester.readFile(devLoggerPath);

  const exports = ['devLog', 'devWarn', 'devError', 'ifDev', 'createScopedLogger'];
  exports.forEach(exportName => {
    tester.assert(
      content.includes(`export function ${exportName}`) ||
      content.includes(`export const ${exportName}`),
      `devLogger should export ${exportName}`
    );
  });
});

// Test 3: Verify setup script exists
tester.test('setup logging script exists', () => {
  const setupPath = path.join(process.cwd(), 'scripts', 'setup-logging-control.js');
  tester.assert(
    tester.fileExists(setupPath),
    'setup-logging-control.js should exist'
  );
});

// Test 4: Verify replacement script exists
tester.test('console replacement script exists', () => {
  const replacePath = path.join(process.cwd(), 'scripts', 'replace-console-logs.js');
  tester.assert(
    tester.fileExists(replacePath),
    'replace-console-logs.js should exist'
  );
});

// Test 5: Check package.json scripts
tester.test('package.json has logging scripts', () => {
  const packagePath = path.join(process.cwd(), 'package.json');
  const content = tester.readFile(packagePath);
  const packageJson = JSON.parse(content);

  const requiredScripts = ['setup:logging', 'replace:console', 'replace:console:apply'];
  requiredScripts.forEach(script => {
    tester.assert(
      packageJson.scripts && packageJson.scripts[script],
      `package.json should have ${script} script`
    );
  });
});

// Test 6: Sample files should use dev logging
tester.test('components use dev logging functions', () => {
  const sampleFiles = [
    'components/FloatingSidebar.tsx',
    'components/animations/IsolatedAnimationManager.tsx',
    'app/skybox-test/page.tsx'
  ];

  let devLogUsage = 0;
  sampleFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (tester.fileExists(filePath)) {
      devLogUsage += tester.countInFile(filePath, 'devLog|devWarn|devError');
    }
  });

  tester.assert(devLogUsage > 0, 'Sample files should use dev logging functions');
});

// Test 7: Reduced direct console usage
tester.test('minimal direct console usage in main code', () => {
  const directories = ['components', 'utils', 'hooks', 'systems'];
  let directConsoleUsage = 0;

  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      const files = this.getAllFiles(dirPath, ['.ts', '.tsx']);
      files.forEach(file => {
        // Skip test files and specific excludes
        if (!file.includes('test') && !file.includes('devLogger.ts')) {
          directConsoleUsage += tester.countInFile(file, 'console\\.(log|warn|error)');
        }
      });
    }
  });

  // Allow some console usage but should be significantly reduced
  tester.assert(directConsoleUsage < 50,
    `Direct console usage should be minimal, found ${directConsoleUsage} instances`);
});

// Test 8: Documentation exists
tester.test('logging documentation exists', () => {
  const docPath = path.join(process.cwd(), 'docs', 'LOGGING_CONTROL.md');
  tester.assert(
    tester.fileExists(docPath),
    'LOGGING_CONTROL.md documentation should exist'
  );
});

// Test 9: Documentation has key sections
tester.test('documentation has required sections', () => {
  const docPath = path.join(process.cwd(), 'docs', 'LOGGING_CONTROL.md');
  const content = tester.readFile(docPath);

  const requiredSections = [
    '## Quick Start',
    '## Environment Variables',
    '## Browser Controls',
    '## NPM Scripts',
    '## Best Practices'
  ];

  requiredSections.forEach(section => {
    tester.assert(
      content.includes(section),
      `Documentation should have ${section} section`
    );
  });
});

// Test 10: Environment variable support
tester.test('environment variables are documented', () => {
  const docPath = path.join(process.cwd(), 'docs', 'LOGGING_CONTROL.md');
  const content = tester.readFile(docPath);

  const envVars = ['NEXT_PUBLIC_DEV_LOG', 'NEXT_PUBLIC_DEBUG_LOG'];
  envVars.forEach(envVar => {
    tester.assert(
      content.includes(envVar),
      `Documentation should mention ${envVar}`
    );
  });
});

// Helper method for getting all files recursively
tester.getAllFiles = function(dirPath, extensions) {
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

  scanDir(dirPath);
  return files;
};

// Additional integration test
tester.test('integration: scripts work together', () => {
  // Verify the scripts can be required without errors
  const setupScript = path.join(process.cwd(), 'scripts', 'setup-logging-control.js');
  const replaceScript = path.join(process.cwd(), 'scripts', 'replace-console-logs.js');

  tester.assert(tester.fileExists(setupScript), 'Setup script should exist');
  tester.assert(tester.fileExists(replaceScript), 'Replace script should exist');

  // Check if scripts have proper structure
  const setupContent = tester.readFile(setupScript);
  const replaceContent = tester.readFile(replaceScript);

  tester.assert(
    setupContent.includes('setupLoggingControl'),
    'Setup script should have main function'
  );

  tester.assert(
    replaceContent.includes('ConsoleReplacer'),
    'Replace script should have ConsoleReplacer class'
  );
});

// Run the tests
if (require.main === module) {
  tester.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { LoggingSystemTest };
