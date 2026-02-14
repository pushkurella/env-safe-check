import type {
  VariableSchema,
  VariableType,
  ValidateEnvOptions,
} from "./types";
import { EnvValidationError } from "./types";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Parse a string value according to the specified type.
 */
function parseValue(value: string, type: VariableType): any {
  switch (type) {
    case "number":
      const num = Number(value);
      if (isNaN(num)) throw new Error("Invalid number");
      return num;
    case "boolean":
      if (value.toLowerCase() === "true" || value === "1") return true;
      if (value.toLowerCase() === "false" || value === "0") return false;
      throw new Error("Invalid boolean (expected 'true', 'false', '1', or '0')");
    case "json":
      return JSON.parse(value);
    case "string":
    default:
      return value;
  }
}

/**
 * Validate environment variables against a schema with type checking, defaults, and custom validators.
 * 
 * @overload
 * function validateEnv(config: ValidateEnvOptions): Record<string, any>
 * 
 * @overload
 * function validateEnv(required: string[]): void
 */
export function validateEnv(
  configOrRequired: ValidateEnvOptions | string[]
): Record<string, any> | void {
  // Backward compatibility: detect if old API (array) or new API (options object)
  if (Array.isArray(configOrRequired)) {
    validateEnvLegacy(configOrRequired);
    return;
  }

  // New API with schema validation
  const config = configOrRequired as ValidateEnvOptions;
  const { schema, throwError = false, silent = false } = config;

  const missing: string[] = [];
  const invalid: Record<string, string> = {};
  const parsed: Record<string, any> = {};

  // Process each variable in the schema
  for (const [key, schemaDef] of Object.entries(schema)) {
    // Normalize schema (string type shorthand to object)
    const varSchema: VariableSchema =
      typeof schemaDef === "string"
        ? { type: schemaDef as VariableType }
        : schemaDef;

    const isRequired = varSchema.required !== false; // default: true
    const type = varSchema.type || "string";
    const value = process.env[key];

    // Check if variable is present and not empty
    if (value === undefined || value.trim() === "") {
      if (isRequired) {
        missing.push(key);
      } else if (varSchema.default !== undefined) {
        // Use default value
        try {
          parsed[key] = parseValue(varSchema.default, type);
        } catch (err) {
          invalid[key] = `Default value invalid: ${(err as Error).message}`;
        }
      }
      continue;
    }

    // Parse the value according to type
    try {
      parsed[key] = parseValue(value, type);
    } catch (err) {
      invalid[key] = `${(err as Error).message}`;
      continue;
    }

    // Run custom validator if provided
    if (varSchema.validator) {
      const validationResult = varSchema.validator(value);
      if (validationResult !== true) {
        const errorMsg =
          typeof validationResult === "string"
            ? validationResult
            : "Validation failed";
        invalid[key] = errorMsg;
      }
    }
  }

  // If there are errors, report and handle
  const hasErrors = missing.length > 0 || Object.keys(invalid).length > 0;
  if (hasErrors) {
    const errorMsg = buildErrorMessage(missing, invalid, schema);
    if (!silent) {
      console.error(errorMsg);
    }

    if (throwError) {
      throw new EnvValidationError(
        "Environment variable validation failed",
        missing,
        invalid
      );
    } else {
      process.exit(1);
    }
  }

  if (!silent) {
    console.log(`${colors.green}✅ All environment variables are valid.${colors.reset}`);
  }

  return parsed;
}

/**
 * Legacy validation (backward compatible): array of required var names.
 */
function validateEnvLegacy(required: string[]): void {
  const missing = required.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === "";
  });

  if (missing.length > 0) {
    console.error(
      `${colors.red}${colors.bold}❌ Missing required environment variables:${colors.reset}\n`
    );

    missing.forEach((key) => {
      console.error(`${colors.yellow}- ${key}${colors.reset}`);
    });

    console.error(
      `\n${colors.cyan}Tip:${colors.reset} define them in your .env file or environment config.`
    );

    process.exit(1);
  }

  console.log(
    `${colors.green}✅ All required environment variables are present.${colors.reset}`
  );
}

/**
 * Build a colorful error message for missing/invalid vars.
 */
function buildErrorMessage(
  missing: string[],
  invalid: Record<string, string>,
  schema: Record<string, VariableSchema | VariableType>
): string {
  let msg = `${colors.red}${colors.bold}❌ Environment validation failed${colors.reset}\n`;

  if (missing.length > 0) {
    msg += `\n${colors.bold}Missing required variables:${colors.reset}\n`;
    missing.forEach((key) => {
      const desc = getSchemaDescription(key, schema);
      msg += `  ${colors.yellow}${key}${colors.reset}${desc ? ` - ${colors.gray}${desc}${colors.reset}` : ""}\n`;
    });
  }

  if (Object.keys(invalid).length > 0) {
    msg += `\n${colors.bold}Invalid variables:${colors.reset}\n`;
    for (const [key, error] of Object.entries(invalid)) {
      msg += `  ${colors.yellow}${key}${colors.reset}: ${error}\n`;
    }
  }

  msg += `\n${colors.cyan}Tip:${colors.reset} define/fix them in your .env file or environment config.`;
  return msg;
}

/**
 * Get the description of a schema variable for error display.
 */
function getSchemaDescription(
  key: string,
  schema: Record<string, VariableSchema | VariableType>
): string {
  const def = schema[key];
  if (!def) return "";
  if (typeof def === "string") return "";
  return def.description || "";
}
