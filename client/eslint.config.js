import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import tailwind from 'eslint-plugin-tailwindcss'

export default [
  {
    ignores: ['**/node_modules', '**/dist'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig, // Disable conflicting rules
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier: prettier,
      tailwindcss: tailwind,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Prettier formatting
      'prettier/prettier': 'error',

      // Tailwind rules
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',
    },
    settings: {
      tailwindcss: {
        callees: ['classnames', 'clsx', 'ctl'], // functions where Tailwind classes might appear
        config: 'tailwind.config.js',
      },
    },
  },
]
