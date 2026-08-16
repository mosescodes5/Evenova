// Minimal flat config (ESLint 9+) — the project had eslint listed as a
// dependency and an `npm run lint` script, but no actual config file, so
// linting silently never ran. That's how a missing icon import (`Tag`
// referenced in AppNav.jsx without being imported) shipped to production
// and crashed the page for every user — `no-undef` below is exactly the
// rule that catches this class of bug before it ships.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly", document: "readonly", navigator: "readonly",
        console: "readonly", localStorage: "readonly", sessionStorage: "readonly",
        fetch: "readonly", FormData: "readonly", URLSearchParams: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly",
        Image: "readonly", crypto: "readonly", Blob: "readonly", URL: "readonly",
        FileReader: "readonly", File: "readonly", alert: "readonly", confirm: "readonly",
        import: "readonly", process: "readonly",
        requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
        CustomEvent: "readonly", Event: "readonly", MutationObserver: "readonly",
        IntersectionObserver: "readonly", ResizeObserver: "readonly",
        HTMLElement: "readonly", Node: "readonly", getComputedStyle: "readonly",
        history: "readonly", location: "readonly", requestIdleCallback: "readonly",
      },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      // This is the important one — catches exactly the "used a component
      // without importing it" mistake that broke production.
      "no-undef": "error",
      // Not-yet-imported/removed-but-still-imported icons etc. — worth
      // knowing about, but shouldn't fail a build the way no-undef should.
      "no-unused-vars": "warn",
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "public/**"],
  },
];
