import eslint from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: [
            "coverage/**",
            "dev-dist/**",
            "dist/**",
            "node_modules/**",
            "playwright-report/**",
            "test-results/**",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    {
        files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
        languageOptions: {
            globals: globals.browser,
        },
        rules: {
            // `const { id, ...rest } = record` is how a stored key is dropped.
            "@typescript-eslint/no-unused-vars": [
                "error",
                { ignoreRestSiblings: true },
            ],
        },
    },
    {
        files: ["scripts/**/*.mjs", "*.config.ts", "e2e/**/*.ts"],
        languageOptions: {
            globals: globals.node,
        },
    },
];
