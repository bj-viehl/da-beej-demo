module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'import/no-cycle': 0, // Allow modules to use each other
  },
  overrides: [
    {
      // Playwright/axe specs and config: devDependencies are fine,
      // sequential awaits are intentional
      files: ['test/**/*.js', 'playwright.config.js'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-restricted-syntax': 0,
        'no-await-in-loop': 0,
      },
    },
  ],
};
