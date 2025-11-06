module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { project: '../tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  settings: {
    'import/resolver': {
      node: { extensions: ['.ts', '.js'] }
    }
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': 'error',
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    'import/no-default-export': 'error',
    // Allow TS files to import with .js extension for ESM browser runtime; TS resolves to .ts at typecheck time
    'import/no-unresolved': ['error', { ignore: ['\\.js$'] }]
  },
  ignorePatterns: ['../web/assets/**']
};
