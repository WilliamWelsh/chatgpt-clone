import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#10a37f",
      },
    },
  },
  plugins: [],
} satisfies Config;
