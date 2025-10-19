/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}","./components/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [require("tailwindcss-animate")], // shadcn için
}
