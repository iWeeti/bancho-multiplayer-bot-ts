const defaultTheme = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./data/banner.html"
  ],
  theme: {
    extend: {
      // fontFamily: {
      //   sans: ['Geist', ...defaultTheme.fontFamily.sans]
      // }
    },
  },
  plugins: [],
}

