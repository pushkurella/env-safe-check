import { VariableTypes } from "env-safe-check";

export const envSchema = {
  DATABASE_URL: {
    type: VariableTypes.URL,
    description: "PostgreSQL connection URL",
  },
  PORT: {
    type: VariableTypes.PORT,
    default: "3000",
  },
  NODE_ENV: {
    type: VariableTypes.STRING,
    oneOf: ["development", "production", "test"],
    default: "development",
  },
};
