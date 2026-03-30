export default {
  "*.{ts,tsx,js}": "oxlint --quiet",
  "*": "oxfmt --no-error-on-unmatched-pattern",
};
