const { defineConfig } = require('eslint/config')
const dxTeamTypeChecked = require('@fingerprintjs/eslint-config-dx-team/type-checked')

module.exports = defineConfig([
  { ignores: ['*.js', '*.mjs'] },
  ...dxTeamTypeChecked,
  {
    rules: {
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowNullableString: true,
        },
      ],
    },
  },
])
