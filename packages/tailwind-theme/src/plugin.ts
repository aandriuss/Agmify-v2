import plugin from 'tailwindcss/plugin.js'
import preset from './preset.js'

export const lightThemeVariables = {
  /* used only as the page background */
  '--foundation-page': '#FAFAFA',
  /* used as the background for any elements that sit on the page */
  '--foundation': '#FFFFFF',
  '--foundation-2': '#F5F5F5',
  '--foundation-3': '#fcfcfc',
  '--foundation-4': '#fcfcfc',
  '--foundation-5': '#fcfcfc',
  /* for hover/focus states */
  '--foundation-focus': '#dbeafe',
  /* for disabled backgrounds */
  '--foundation-disabled': '#e5e5e5',

  /* default foreground color */
  '--foreground': '#1A1A1A',
  /* dimmer foreground color, e.g. caption text */
  '--foreground-2': '#626263',
  '--foreground-3': '#7C7C7D',
  /* foreground color when put on top of a primary colored background */
  '--foreground-on-primary': '#fff',
  '--foreground-disabled': '#1A1A1A50',

  /* primary color */
  '--primary': '#36405a',
  /* focused primary color */
  '--primary-focus': '#0057E5',
  /* muted primary color */
  '--primary-muted': '#EDEDED',

  /* outline variations */
  '--outline-1': '#8472bb',
  '--outline-2': '#DFDFDF',
  '--outline-3': '#E2E8F0',
  '--outline-4': '#4B40C9',
  '--outline-5': '#C4C4C4',

  /* highlight variations */
  '--highlight-1': '#F4F4F4',
  '--highlight-2': '#F2F2F2',
  '--highlight-3': '#EDEDED',

  /* success variations */
  '--success': '#34D399',
  '--success-lighter': '#53EDB5',
  '--success-darker': '#1CBA80',

  /* warning variations */
  '--warning': '#FBBF24',
  '--warning-lighter': '#FFD770',
  '--warning-darker': '#E0AB20',

  /* info variations */
  '--info': '#B9B8CC',
  '--info-lighter': '#D2D1E5',
  '--info-darker': '#6D6B99',

  /* danger variations */
  '--danger': '#C45959',
  '--danger-lighter': '#F78888',
  '--danger-darker': '#913333'
}

export const darkThemeVariables = {
  /* used only as the page background */
  '--foundation-page': '#101012',
  /* used as the background for any elements that sit on the page */
  '--foundation': '#15161C',
  '--foundation-2': '#191A22',
  '--foundation-3': '#52525b',
  '--foundation-4': '#71717a',
  '--foundation-5': '#a1a1aa',
  /* for hover/focus states */
  '--foundation-focus': '#52525b',
  /* for disabled backgrounds */
  '--foundation-disabled': '#3c3c3d',

  /* default foreground color */
  '--foreground': '#FFFFFF',
  /* dimmer foreground color, e.g. caption text */
  '--foreground-2': '#B0B1B5',
  '--foreground-3': '#7E7F82',
  '--foreground-on-primary': '#FFFFFF',
  '--foreground-disabled': '#FFFFFF50',

  /* primary color */
  '--primary': '#36405a',
  /* focused primary color */
  '--primary-focus': '#5d4c8b',
  /* muted primary color */
  '--primary-muted': '#292B39',

  /* outline variations */
  '--outline-1': '#5d4c8b',
  '--outline-2': '#2E313F',
  '--outline-3': '#282833',
  '--outline-4': '#4B40C9',
  '--outline-5': '#434559',

  /* highlight variations */
  '--highlight-1': '#22242E',
  '--highlight-2': '#292B39',
  '--highlight-3': '#323445',

  /* success variations */
  '--success': '#34D399',
  '--success-lighter': '#53EDB5',
  '--success-darker': '#1CBA80',

  /* warning variations */
  '--warning': '#FBBF24',
  '--warning-lighter': '#FFD770',
  '--warning-darker': '#E0AB20',

  /* info variations */
  '--info': '#B9B8CC',
  '--info-lighter': '#D2D1E5',
  '--info-darker': '#6D6B99',

  /* danger variations */
  '--danger': '#F87171',
  '--danger-lighter': '#FF8F8F',
  '--danger-darker': '#AB3E3E'
}

export default plugin(function ({ addComponents, addBase }) {
  addBase({
    '@font-face': {
      fontFamily: 'Montserrat',
      fontStyle: 'normal',
      fontWeight: '100 900',
      fontDisplay: 'swap',
      src: "url('@speckle/tailwind-theme/fonts/montserrat-v26-latin-regular.woff2') format('woff2')",
      unicodeRange:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
    }
  })

  addBase({
    "[type='checkbox']:focus, [type='radio']:focus": {
      '@apply ring-offset-foundation': {}
    },
    "input[type='range']": {
      '@apply appearance-none bg-transparent': {}
    },
    "input[type='range']::-webkit-slider-runnable-track": {
      '@apply bg-black/25 rounded-full': {}
    },
    "input[type='range']::-moz-range-track": {
      '@apply bg-black/25 rounded-full': {}
    },
    "input[type='range']::-ms-track": {
      '@apply bg-black/25 rounded-full': {}
    },
    body: {
      '@apply font-sans': {}
    },
    html: {
      '--simple-scrollbar-width': '4px',
      ...lightThemeVariables,
      '&.dark': {
        ...darkThemeVariables
      }
    },
    // weird hack cause for some reason tailwind sometimes omits this if I use `.dark` selector instead (tailwind bug?)
    [`html[class*="dark"]`]: {
      ...darkThemeVariables
    }
  })

  addComponents({
    // Fancy gradient text
    '.text-fancy-gradient': {
      '@apply font-semibold bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 text-transparent bg-clip-text':
        {}
    },
    // New heading styles
    '.text-heading-2xl, .h1': {
      '@apply font-medium text-3xl leading-10 tracking-[-0.63px]': {}
    },
    '.text-heading-xl, .h2': {
      '@apply font-medium text-2xl leading-8 tracking-[-0.456px]': {}
    },
    '.text-heading-lg, .h3': {
      '@apply font-medium text-lg leading-6 tracking-[-0.252px]': {}
    },
    '.text-heading, .h4': {
      '@apply font-medium text-base leading-6 tracking-[-0.176px]': {}
    },
    '.text-heading-sm, .h5, .h6': {
      '@apply font-medium text-sm leading-6 tracking-[-0.084px]': {}
    },

    // New body styles
    '.text-body': {
      '@apply text-base leading-6 tracking-[-0.176px]': {}
    },
    '.text-body-sm': {
      '@apply text-sm leading-6 tracking-[-0.084px]': {}
    },
    '.text-body-xs': {
      '@apply text-[13px] leading-6 tracking-[-0.032px]': {}
    },
    '.text-body-2xs': {
      '@apply text-xs leading-4': {}
    },
    '.text-body-3xs': {
      '@apply text-[11px] leading-4 tracking-[0.055px]': {}
    },

    '.label': {
      '@apply text-[13px] font-medium leading-5': {}
    },
    '.label--light': {
      '@apply font-normal': {}
    },
    '.label-light': {
      '@apply label label--light': {}
    },
    '.normal': {
      '@apply text-base font-normal': {}
    },
    '.caption': {
      '@apply text-xs': {}
    },
    '.text-tiny': {
      'font-size': '0.6rem',
      'line-height': '1rem'
    },
    // Grid/layout container that limits max width to expected sizes that we use in our designs
    '.layout-container': {
      '@apply mx-auto': {},
      /* base/mobile - fluid, no max width, just padding */
      '@apply px-4': {},
      /* sm+ - also fluid, increased padding */
      "@media (min-width: theme('screens.sm'))": {
        '@apply px-8': {}
      },
      /* lg+ (from this point on, no padding just limited max width) */
      "@media (min-width: theme('screens.lg'))": {
        '@apply px-6 max-w-full': {}
      },
      /* xl+ */
      "@media (min-width: theme('screens.xl'))": {
        '@apply max-w-[1216px]': {}
      },
      /* 2xl+ */
      "@media (min-width: theme('screens.2xl'))": {
        '@apply max-w-[1312px]': {}
      }
    },
    // Simple scrollbar (OSX-like) to use instead of the ugly browser one
    '.simple-scrollbar': {
      'scrollbar-width': 'var(--simple-scrollbar-width)',
      'scrollbar-color': 'var(--outline-5)',
      '&::-webkit-scrollbar': {
        width: 'var(--simple-scrollbar-width)',
        height: '6px'
      },
      '&::-webkit-scrollbar-track': {
        'border-radius': '15px',
        background: 'var(--foundation-disabled)'
      },
      '&::-webkit-scrollbar-thumb': {
        'border-radius': '15px',
        background: 'var(--outline-5)'
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: 'var(--outline-5)'
      },
      '&::-webkit-scrollbar-thumb:active': {
        background: 'rgba(90 90 90 10100%)'
      }
    },
    // Auto-growing textarea for editable fields
    // more info: https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/
    '.grow-textarea': {
      display: 'grid',
      '&::after': {
        content: "attr(data-replicated-value) ' '",
        visibility: 'hidden',
        'white-space': 'pre-wrap'
      },
      '& > textarea': {
        resize: 'none',
        overflow: 'hidden'
      },
      '& > textarea, &::after': {
        'grid-area': '1 / 1 / 2 / 2'
      }
    }
  })
}, preset)
