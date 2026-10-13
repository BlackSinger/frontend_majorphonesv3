/** @type {import('tailwindcss').Config} */
// Default config on purpose: it matches the Play CDN (cdn.tailwindcss.com, v3.4.17) the app used to load at runtime.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {},
  },
  plugins: [],
};
