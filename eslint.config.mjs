import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat"; // Use /flat for better compatibility
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", ".agent", "**/*.test.ts"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked, // Upgrading from 'recommended'
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2026,
      globals: globals.node,
      parserOptions: {
        projectService: true, // Enables high-performance typed linting
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression > TSAsExpression",
          message:
            "Avoid double type assertions (e.g., 'as unknown as T'). Validate data at runtime (Zod) or fix upstream types.",
        },
      ],

      // -----------------------------------------------------------------------
      // 2026 Safety-First Rules
      // -----------------------------------------------------------------------
      "@typescript-eslint/no-floating-promises": "error", // Async Safety
      "@typescript-eslint/no-misused-promises": "error", // Promise Safety
      "@typescript-eslint/switch-exhaustiveness-check": "error", // Logic Safety
      "@typescript-eslint/restrict-template-expressions": "error", // String Safety
      "@typescript-eslint/no-unsafe-assignment": "error", // Type Leakage
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
    },
  },
  prettier
);
