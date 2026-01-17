import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import boundaries from "eslint-plugin-boundaries";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      ".agent",
      "**/*.test.ts",
      "src/graphql/generated.ts",
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      // ...tseslint.configs.stylisticTypeChecked, // <-- DISABLE THIS temporarily. It causes more noise than value.
    ],
    files: ["**/*.{ts,tsx}"],
    plugins: {
      boundaries,
    },
    languageOptions: {
      ecmaVersion: 2026,
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "boundaries/elements": [
        {
          type: "app",
          pattern: "src/app/**/*",
        },
        {
          type: "module",
          pattern: "src/modules/*",
          capture: ["moduleName"],
        },
        {
          type: "infra",
          pattern: "src/infra/*",
        },
        {
          type: "service",
          pattern: "src/services/*",
        },
        {
          type: "shared",
          pattern: "src/shared/*",
        },
      ],
    },
    rules: {
      // ✅ CORE SANITY
      "@typescript-eslint/no-explicit-any": "warn", // Warns are better than Errors during dev
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }], // Allow 'info' for server startup logs

      // ✅ ASYNC SAFETY (Keep these, they catch real bugs)
      "@typescript-eslint/no-floating-promises": "error", // Catches un-awaited DB calls
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false }, // FIX: Allows passing async functions to Hono/Express handlers
      ],

      // ✅ TEMPLATE SAFETY (Relaxed)
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true, allowAny: false }, // Allows `ID: ${id}` where id is number
      ],

      // 🛑 THE "NOISE MAKERS" (Turned OFF or WARN)
      // These rules flag "viral any" issues. If a 3rd party lib has bad types,
      // these rules make it impossible to use without ugly casts.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      // ✅ LOGIC SAFETY
      "@typescript-eslint/switch-exhaustiveness-check": "warn", // Helpful, but annoying as an Error during prototyping

      // 🛡️ ARCHITECTURAL BOUNDARIES
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: "app",
              allow: ["module", "infra", "service", "shared"],
            },
            {
              from: "module",
              allow: ["shared", "module"],
            },
            {
              from: "infra",
              allow: ["shared"],
            },
            {
              from: "service",
              allow: ["shared"],
            },
            {
              from: "shared",
              allow: [],
            },
          ],
        },
      ],
      "boundaries/entry-point": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              target: "module",
              allow: "index.ts",
            },
          ],
        },
      ],
    },
  },
  prettier
);
