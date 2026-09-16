import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Explicit even though ESLint has no parser for these anyway — makes the
    // scope obvious instead of relying on that implicit behavior.
    ignores: ["dist/", "node_modules/", "**/*.md", "**/*.tf", "**/*.json"],
  },
  {
    files: ["**/*.ts"],
    rules: {
      // Express error handlers require 4 args even when some go unused —
      // prefixing with "_" is the standard way to signal that intentionally.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  }
);
