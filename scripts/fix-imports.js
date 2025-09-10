#!/usr/bin/env node

/**
 * Import Fixer Script
 *
 * Fixes malformed imports that were created during the automated
 * console statement replacement process.
 */

const fs = require("fs");
const path = require("path");

class ImportFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalFixes = 0;
    this.errors = [];
  }

  /**
   * Main entry point
   */
  run(options = {}) {
    const dryRun = options.dryRun || false;

    console.log("🔧 Fixing malformed imports...\n");

    const directories = ["components", "utils", "hooks", "systems", "store"];

    directories.forEach((dir) => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        this.processDirectory(dirPath, dryRun);
      }
    });

    this.printSummary(dryRun);
  }

  /**
   * Process directory recursively
   */
  processDirectory(dirPath, dryRun) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          this.processDirectory(fullPath, dryRun);
        } else if (entry.isFile() && this.isProcessableFile(entry.name)) {
          this.processFile(fullPath, dryRun);
        }
      }
    } catch (error) {
      this.errors.push(
        `Error processing directory ${dirPath}: ${error.message}`,
      );
    }
  }

  /**
   * Check if file should be processed
   */
  isProcessableFile(filename) {
    return (
      /\.(ts|tsx|js|jsx)$/.test(filename) &&
      !filename.includes("test") &&
      !filename.includes("spec")
    );
  }

  /**
   * Process individual file
   */
  processFile(filePath, dryRun) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const result = this.fixImports(content);

      if (result.modified) {
        if (!dryRun) {
          fs.writeFileSync(filePath, result.content);
        }

        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`✅ ${relativePath}: ${result.fixes} fixes`);

        this.fixedFiles++;
        this.totalFixes += result.fixes;
      }
    } catch (error) {
      this.errors.push(`Error processing ${filePath}: ${error.message}`);
    }
  }

  /**
   * Fix various import issues in content
   */
  fixImports(content) {
    let modified = false;
    let fixes = 0;
    let newContent = content;

    // Fix 1: Malformed double imports like "import {\nimport {"
    const doubleImportPattern =
      /import\s*\{\s*\n\s*import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']\s*;?\s*\n/g;
    if (doubleImportPattern.test(newContent)) {
      newContent = newContent.replace(
        doubleImportPattern,
        (match, imports, fromPath) => {
          modified = true;
          fixes++;
          return `import { ${imports.trim()} } from "${fromPath}";\n`;
        },
      );
    }

    // Fix 2: Import statement split across lines incorrectly
    const splitImportPattern = /import\s*\{\s*\n\s*([^}]*)\n\s*\}\s*from/g;
    if (splitImportPattern.test(newContent)) {
      newContent = newContent.replace(splitImportPattern, (match, imports) => {
        modified = true;
        fixes++;
        return `import {\n  ${imports.trim()}\n} from`;
      });
    }

    // Fix 3: Import with devLogger inserted in wrong place
    const malformedDevLoggerPattern =
      /import\s*\{\s*import\s*\{\s*([^}]*devLog[^}]*)\}\s*from\s*["']@\/utils\/devLogger["']\s*;?\s*\n([^}]*)\}/g;
    if (malformedDevLoggerPattern.test(newContent)) {
      newContent = newContent.replace(
        malformedDevLoggerPattern,
        (match, devLoggerImports, otherImports) => {
          modified = true;
          fixes++;
          return `import { ${devLoggerImports.trim()} } from "@/utils/devLogger";\nimport {\n  ${otherImports.trim()}\n}`;
        },
      );
    }

    // Fix 4: Missing semicolons on import statements
    const missingSemicolonPattern = /^(import\s+.*from\s+["'][^"']+["'])\s*$/gm;
    newContent = newContent.replace(
      missingSemicolonPattern,
      (match, importStatement) => {
        if (!importStatement.endsWith(";")) {
          modified = true;
          fixes++;
          return importStatement + ";";
        }
        return match;
      },
    );

    // Fix 5: Deduplicate devLogger imports
    const devLoggerImports = [];
    const devLoggerPattern =
      /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']@\/utils\/devLogger["']\s*;/g;

    let match;
    while ((match = devLoggerPattern.exec(newContent)) !== null) {
      devLoggerImports.push(match[1].trim());
    }

    if (devLoggerImports.length > 1) {
      // Remove all devLogger imports
      newContent = newContent.replace(devLoggerPattern, "");

      // Combine and deduplicate
      const allImports = devLoggerImports
        .join(", ")
        .split(",")
        .map((imp) => imp.trim())
        .filter((imp) => imp && imp.length > 0)
        .filter((imp, index, arr) => arr.indexOf(imp) === index);

      // Find the best place to insert the combined import
      const lines = newContent.split("\n");
      let insertIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("import ") && !line.includes("devLogger")) {
          insertIndex = i + 1;
        } else if (
          line.startsWith('"use client"') ||
          line.startsWith("'use client'")
        ) {
          insertIndex = i + 1;
        }
      }

      const combinedImport = `import { ${allImports.join(", ")} } from "@/utils/devLogger";`;
      lines.splice(insertIndex, 0, combinedImport);

      newContent = lines.join("\n");
      modified = true;
      fixes++;
    }

    // Fix 6: Clean up extra empty lines caused by fixes
    newContent = newContent.replace(/\n\n\n+/g, "\n\n");

    // Fix 7: Ensure proper spacing around imports
    newContent = newContent.replace(
      /^(import\s+.*;\s*)([^import\n])/gm,
      "$1\n$2",
    );

    return {
      content: newContent,
      modified,
      fixes,
    };
  }

  /**
   * Print summary of fixes
   */
  printSummary(dryRun) {
    console.log("\n📊 Import Fix Summary:");
    console.log(`   Files fixed: ${this.fixedFiles}`);
    console.log(`   Total fixes: ${this.totalFixes}`);

    if (dryRun) {
      console.log(
        "\n💡 This was a dry run. Use --apply to make actual changes.",
      );
    }

    if (this.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      this.errors.forEach((error) => console.log(`   ${error}`));
    }

    if (this.fixedFiles > 0 && !dryRun) {
      console.log("\n✅ Import fixes completed!");
      console.log("🔄 You may need to restart your dev server.");
    } else if (this.fixedFiles === 0) {
      console.log("\n🎉 No import issues found!");
    }
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes("--apply"),
  };

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
📋 Import Fixer Script

Usage:
  node scripts/fix-imports.js [options]

Options:
  --apply     Apply changes (default is dry run)
  --help, -h  Show this help message

Examples:
  node scripts/fix-imports.js           # Preview fixes
  node scripts/fix-imports.js --apply   # Apply fixes

This script fixes common import issues:
  • Double import statements
  • Split import statements
  • Missing semicolons
  • Duplicate devLogger imports
  • Import spacing issues
`);
    return;
  }

  const fixer = new ImportFixer();
  fixer.run(options);
}

if (require.main === module) {
  main();
}

module.exports = { ImportFixer };
