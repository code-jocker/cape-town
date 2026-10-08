import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        io: 'readonly',
        AudioContext: 'readonly',
        webkitAudioContext: 'readonly',
        Notification: 'readonly',
        customElements: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        self: 'readonly',
        importScripts: 'readonly',
        AbortController: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        Element: 'readonly',
        speechSynthesis: 'readonly',
        performance: 'readonly',
        CSS: 'readonly',
        CustomEvent: 'readonly',
        DOMException: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|next', caughtErrors: 'none' }],
      'no-prototype-builtins': 'off',
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    ignores: ['node_modules/**', 'public/uploads/**', 'coverage/**', '.kilo/**']
  },
  {
    files: ['server/**/*.js', '*.cjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    }
  }
];
