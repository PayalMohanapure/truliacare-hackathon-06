export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      keyframes: {
        "breach-pulse": {
          "0%, 100%": { backgroundColor: "rgb(254 242 242)", boxShadow: "inset 4px 0 0 rgb(220 38 38)" },
          "50%":       { backgroundColor: "rgb(254 226 226)", boxShadow: "inset 6px 0 0 rgb(153 27 27)" },
        },
        "siren": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.35" },
        },
      },
      animation: {
        "breach-pulse": "breach-pulse 1.6s ease-in-out infinite",
        "siren": "siren 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
