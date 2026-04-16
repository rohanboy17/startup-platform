import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Keep web lint focused on web app; mobile app has its own lint config.
    "freeearnhub-app/**",
  ]),
  {
    rules: {
      // These are React Compiler-focused rules that currently generate noisy false positives
      // (and are not required for correctness in this codebase).
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
