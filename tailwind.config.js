const colors = require('tailwindcss/colors');

module.exports = {
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      white: colors.white,
      black: colors.black,
      pink: {
        light: '#ff8df8',
        dark: '#c86bef'
      },
      night: {
        100: '#171923',
        200: '#13151D',
        300: '#0a0b10'
      }
    },
    fontFamily: {
      sans: ['Rubik']
    }
  },
  variants: {
    extend: {},
  },
  plugins: [],
};