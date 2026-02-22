import type {
  VariableSchema,
  VariableType,
  ValidateEnvOptions,
} from "./types";
import { EnvValidationError, VariableTypes } from "./types";

const {
  STRING: TYPE_STRING,
  NUMBER: TYPE_NUMBER,
  BOOLEAN: TYPE_BOOLEAN,
  JSON: TYPE_JSON,
  INT: TYPE_INT,
  FLOAT: TYPE_FLOAT,
  PORT: TYPE_PORT,
  URL: TYPE_URL,
  ARRAY: TYPE_ARRAY,
} = VariableTypes;

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Parse a string value according to the specified type.
 */
function parseValue(value: string, type: VariableType): any {
  switch (type) {
    case TYPE_NUMBER:
      const num = Number(value);
      if (isNaN(num)) throw new Error("Invalid number");
      return num;
    case TYPE_INT:
      const intNum = Number(value);
      if (!Number.isInteger(intNum)) throw new Error("Invalid int");
      return intNum;
    case TYPE_FLOAT:
      const floatNum = Number(value);
      if (Number.isNaN(floatNum) || !Number.isFinite(floatNum)) {
        throw new Error("Invalid float");
      }
      return floatNum;
    case TYPE_PORT:
      const portNum = Number(value);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error("Invalid port (expected integer between 1 and 65535)");
      }
      return portNum;
    case TYPE_URL:
      try {
        return new URL(value).toString();
      } catch {
        throw new Error("Invalid url");
      }
    case TYPE_ARRAY:
      return value.split(",").map((entry) => entry.trim());
    case TYPE_BOOLEAN:
      if (value.toLowerCase() === "true" || value === "1") return true;
      if (value.toLowerCase() === "false" || value === "0") return false;
      throw new Error("Invalid boolean (expected 'true', 'false', '1', or '0')");
    case TYPE_JSON:
      return JSON.parse(value);
    case TYPE_STRING:
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
  const { schema, silent = false } = config;

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
    const type = varSchema.type || TYPE_STRING;
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

    const oneOfValues = varSchema.oneOf ?? varSchema.enum;
    if (oneOfValues && oneOfValues.length > 0 && !oneOfValues.includes(value)) {
      invalid[key] = `Must be one of: ${oneOfValues.join(", ")}`;
    }
  }

  // If there are errors, report and handle
  const hasErrors = missing.length > 0 || Object.keys(invalid).length > 0;
  if (hasErrors) {
    const errorMsg = buildErrorMessage(missing, invalid, schema);
    if (silent) {
      return parsed;
    }

    console.error(errorMsg);
    throw new EnvValidationError("Environment validation failed", {
      missing,
      invalid,
    });
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
      const expected = getExpectedInputHint(key, schema);
      msg += `  ${colors.yellow}${key}${colors.reset}`;
      if (desc) {
        msg += ` - ${colors.gray}${desc}${colors.reset}`;
      }
      if (expected) {
        msg += `\n    ${colors.gray}Expected:${colors.reset} ${expected}`;
      }
      msg += "\n";
    });
  }

  if (Object.keys(invalid).length > 0) {
    msg += `\n${colors.bold}Invalid variables:${colors.reset}\n`;
    for (const [key, error] of Object.entries(invalid)) {
      const desc = getSchemaDescription(key, schema);
      const expected = getExpectedInputHint(key, schema);
      const providedValue = process.env[key];
      const displayedValue =
        providedValue === undefined ? "<not set>" : `'${providedValue}'`;
      msg += `  ${colors.yellow}${key}${colors.reset}: ${error}`;
      msg += `\n    ${colors.gray}Provided:${colors.reset} ${colors.magenta}${displayedValue}${colors.reset}`;
      if (desc) {
        msg += `\n    ${colors.gray}${desc}${colors.reset}`;
      }
      if (expected) {
        msg += `\n    ${colors.gray}Expected:${colors.reset} ${expected}`;
      }
      msg += "\n";
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

/**
 * Build a concise expected input hint from schema configuration.
 */
function getExpectedInputHint(
  key: string,
  schema: Record<string, VariableSchema | VariableType>
): string {
  const def = schema[key];
  if (!def) return "";

  const normalized: VariableSchema =
    typeof def === "string" ? { type: def as VariableType } : def;

  const type = normalized.type || TYPE_STRING;
  const required = normalized.required !== false ? "required" : "optional";
  const typeHint = getTypeHint(type);

  let hint = `${required} ${type} (${typeHint})`;

  if (normalized.default !== undefined) {
    hint += `, default='${normalized.default}'`;
  }

  if (normalized.validatorHint && normalized.validatorHint.trim() !== "") {
    hint += `, ${normalized.validatorHint.trim()}`;
  } else if (normalized.validator) {
    hint += ", must satisfy custom validator";
  }

  const oneOfValues = normalized.oneOf ?? normalized.enum;
  if (oneOfValues && oneOfValues.length > 0) {
    hint += `, one of: ${oneOfValues.join(" | ")}`;
  }

  return hint;
}

/**
 * Human-friendly guidance for each supported type.
 */
function getTypeHint(type: VariableType): string {
  switch (type) {
    case TYPE_NUMBER:
      return "numeric value (e.g. 3000)";
    case TYPE_INT:
      return "integer (e.g. 42)";
    case TYPE_FLOAT:
      return "floating-point number (e.g. 3.14)";
    case TYPE_PORT:
      return "integer between 1 and 65535";
    case TYPE_URL:
      return "valid URL (e.g. https://example.com)";
    case TYPE_ARRAY:
      return "comma-separated values (trimmed)";
    case TYPE_BOOLEAN:
      return "true/false or 1/0";
    case TYPE_JSON:
      return "valid JSON string";
    case TYPE_STRING:
    default:
      return "plain text";
  }
}
