// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-*/*', '.expo/*', 'supabase/functions/*', 'node_modules/*'],
  },
  {
    rules: {
      // Testi in italiano con apostrofi: l'escape (&apos;) renderebbe il codice illeggibile.
      'react/no-unescaped-entities': 'off',
      // Pattern legittimo: sincronizzare lo stato di un form da dati caricati (e codice del template).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
