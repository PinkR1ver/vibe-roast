const js = require("@eslint/js");
const globals = require("globals");
const react = require("eslint-plugin-react");

const recommendedRules = js.configs.recommended.rules;

module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "dashboard/dist/**",
      "media/**",
      "assests/**",
      ".agents/**",
    ],
  },
  {
    files: ["bin/**/*.js", "src/**/*.js", "test/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: recommendedRules,
  },
  {
    files: ["scripts/quality/**/*.mjs", "dashboard/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: recommendedRules,
  },
  {
    files: ["dashboard/src/**/*.{js,jsx}"],
    plugins: { react },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    rules: {
      ...recommendedRules,
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: ["worker/src/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    rules: recommendedRules,
  },
];
