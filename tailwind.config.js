export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3fc',
          100: '#ebe7f9',
          200: '#d7cff3',
          300: '#b8a8e9',
          400: '#9580dc',
          500: '#614BC3',
          600: '#5540af',
          700: '#473592',
          800: '#3a2d77',
          900: '#2e2460',
        },
        secondary: {
          50: '#f0fafb',
          100: '#d9f3f5',
          200: '#b3e7eb',
          300: '#7dd6dd',
          400: '#33BBC5',
          500: '#2da6af',
          600: '#278892',
          700: '#226d76',
          800: '#1d5860',
          900: '#18464d',
        },
        accent: {
          50: '#f0fdf9',
          100: '#C8FFE0',
          200: '#85E6C5',
          300: '#5dddb0',
          400: '#35d49b',
          500: '#2ab57f',
          600: '#229166',
          700: '#1d7454',
          800: '#185c44',
          900: '#144b38',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
