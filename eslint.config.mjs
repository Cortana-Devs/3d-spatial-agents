import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "debug/**",
      "src/debug/**",
      "examples/**",
    ],
  },
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: [
      "examples/**/*.{ts,tsx,js,jsx}",
      "debug/**/*.{ts,tsx,js,jsx}",
      "components/debug/**/*.{ts,tsx,js,jsx}",
    ],
    rules: {
      "no-console": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  {
    files: [
      "**/__tests__/**/*.{ts,tsx,js,jsx}",
      "**/*.{test,spec}.{ts,tsx,js,jsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": "off",
      "no-console": "off",
    },
    languageOptions: {
      globals: {
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  },
];

export default eslintConfig;
