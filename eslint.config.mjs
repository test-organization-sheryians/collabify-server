import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat"; // Use /flat for better compatibility
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", ".agent"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2026, // Correct for latest 2026 syntax support
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  prettier
);
