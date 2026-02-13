/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ACL Brand Colors
        'acl-yellow': {
          50: '#FFFDF0',
          100: '#FFF9CC',
          200: '#FFF3A3',
          300: '#FFEC7A',
          400: '#FFE452',
          500: '#F5B800', // Primary
          600: '#CC9900',
          700: '#A37A00',
          800: '#7A5C00',
          900: '#523D00',
        },
        'acl-dark': {
          50: '#F5F5F5',
          100: '#E0E0E0',
          200: '#BDBDBD',
          300: '#9E9E9E',
          400: '#757575',
          500: '#616161',
          600: '#424242',
          700: '#303030',
          800: '#212121',
          900: '#1A1A1A', // Primary dark
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
