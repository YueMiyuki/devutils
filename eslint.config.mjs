import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // enable all recommended rules from better-tailwindcss
    extends: [eslintPluginBetterTailwindcss.configs.recommended],
    rules: {
      // Fix custom css class in globals.css not detected
      "better-tailwindcss/no-unknown-classes": "off",
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
    },
    settings: {
      "better-tailwindcss": {
        // tailwindcss 4: path to the entry file for the css-based tailwind config
        entryPoint: "app/globals.css",
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src-tauri/**",
    ".swc/**",
  ]),
]);
