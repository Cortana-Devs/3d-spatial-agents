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
    },
  },
];

export default eslintConfig;
