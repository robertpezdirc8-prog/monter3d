// eslint.config.js — FAZA 8 (P1)
// Osnovno statično preverjanje: TypeScript pravila + pravila React hookov.
// Cilj je ujesti resnične napake (npr. napačne odvisnosti v useEffect/useCallback),
// ne pa prepovedati praktične kode (npr. `any` je opozorilo, ne napaka).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'public', '*.config.js', '*.config.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // `any` je v tem projektu zgolj opozorilo (prej je bil uporabljen pogosto).
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // UI komponente uporabljajo `any` za props v nekaterih primerih.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/tests/**/*.ts', 'test-runner.mjs', 'test-homography.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  }
);
