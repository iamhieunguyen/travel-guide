/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        fadeOut: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-10px)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeOut: "fadeOut 0.9s ease-out forwards",
        fadeIn: "fadeIn 0.9s ease-out forwards",
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant("registerMode", "&.registerMode *");
    },
  ],
};
