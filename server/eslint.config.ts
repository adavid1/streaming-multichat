import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"
import stylistic from "@stylistic/eslint-plugin"

export default defineConfig([
  globalIgnores(["dist/"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { 
      js,
      "@stylistic": stylistic
    },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      "@stylistic/semi": ["error", "never"]
    }
  },
  tseslint.configs.recommended
])
