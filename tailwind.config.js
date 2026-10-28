/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          light: '#2d6a4f',
          DEFAULT: '#1b4332',
          dark: '#081c15',
        },
      },
      screens: {
        land: { raw: '(orientation: landscape) and (max-height: 560px)' },
        desk: { raw: '(min-width: 640px) and (min-height: 561px)' },
      },
    },
  },
  plugins: [],
}
