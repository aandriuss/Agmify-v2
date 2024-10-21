const speckleTheme = require('@speckle/tailwind-theme')
const formsPlugin = require('@tailwindcss/forms')
const typographyPlugin = require('@tailwindcss/typography')

/** @type {import('tailwindcss').Config} */
module.exports = {
  // prefix: 'tw-', // Adding prefix to avoid conflicts
  darkMode: 'class', // Enable dark mode support if needed

  // Content paths for purging unused styles
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './stories/**/*.{js,ts,vue,mdx}',
    './app.vue',
    './lib/**/composables/*.{js,ts}',
    './assets/**/*.css',
    './node_modules/@speckle/ui-components/src/**/*.{vue,js,ts}'
  ],

  theme: {
    extend: {
      appearance: ['none']
    } // Extend theme if necessary
  },

  plugins: [formsPlugin, typographyPlugin, speckleTheme.default],

  corePlugins: {
    preflight: false, // Disable Tailwind’s reset if unnecessary
    appearance: true, // Enable appearance plugin explicitly
    borderWidth: true, // Ensure borderWidth is enabled
    borderColor: true // Ensure borderColor is enabled
  }
}
