export const envSchema =     {
  DATABASE_URL: {
    type: "url",
    description: "PostgreSQL connection URL",
  },
  PORT: {
    type: "number",
    default: 3000,
  },
  Node_ENV: {
    type: "enum",
    validator: (v) =>
    ["development", "production", "test"].includes(v),
    default: "development",
  },
};