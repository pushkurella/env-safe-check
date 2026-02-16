import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { EnvValidationError, type ValidateEnvOptions } from "./types";
import { validateEnv } from "./validate";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

const requireFromCwd = createRequire(path.join(process.cwd(), "__env-safe-check__.js"));

function printHelp(): void {
  console.log(`env-safe-check CLI

Usage:
  env-safe-check validate --schema <path> [--env-file <path>] [--silent]
  env-safe-check --help

Options:
  --schema <path>  Path to schema module (.js/.mjs/.cjs)
  --env-file <path>  Load environment variables from file before validation
  --silent         Suppress non-error output
  --help           Show this help message
`);
}

function decodeQuotedValue(value: string, quote: '"' | "'"): string {
  if (quote === "'") {
    return value;
  }

  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\");
}

function loadEnvFile(envFilePath: string): void {
  const fileContent = fs.readFileSync(envFilePath, "utf8");
  const lines = fileContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    if (!key) {
      continue;
    }
    const rawValue = match[2] ?? "";

    let parsedValue: string;
    const isQuoted =
      (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));

    if (isQuoted) {
      const quote = rawValue[0] as '"' | "'";
      parsedValue = decodeQuotedValue(rawValue.slice(1, -1), quote);
    } else {
      parsedValue = rawValue.replace(/\s+#.*$/, "").trim();
    }

    // Keep existing process.env values, similar to dotenv default behavior.
    if (process.env[key] === undefined) {
      process.env[key] = parsedValue;
    }
  }
}

function getSchemaFromModule(
  moduleExports: Record<string, unknown>,
  schemaPath: string
): ValidateEnvOptions["schema"] {
  const schemaCandidate =
    moduleExports.default ?? moduleExports.schema ?? moduleExports.envSchema;
  const fallbackCandidate = schemaCandidate ?? moduleExports;
  const candidate = fallbackCandidate as unknown;

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error(
      `Schema module "${schemaPath}" must export an object as default export, "schema", or "envSchema".`
    );
  }

  return candidate as ValidateEnvOptions["schema"];
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return 0;
  }

  if (command !== "validate") {
    console.error(`${colors.red}Unknown command:${colors.reset} ${command}`);
    printHelp();
    return 1;
  }

  let schemaPath = "";
  let envFilePath = "";
  let silent = false;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];

    if (arg === "--silent") {
      silent = true;
      continue;
    }

    if (arg === "--schema") {
      schemaPath = rest[i + 1] ?? "";
      i += 1;
      continue;
    }

    if (arg === "--env-file") {
      envFilePath = rest[i + 1] ?? "";
      i += 1;
      continue;
    }
  }

  if (!schemaPath) {
    console.error(`${colors.red}${colors.bold}Missing required option:${colors.reset} --schema`);
    printHelp();
    return 1;
  }

  const ext = path.extname(schemaPath).toLowerCase();
  if (ext === ".ts" || ext === ".mts" || ext === ".cts") {
    console.error(
      `${colors.red}TypeScript schema files are not supported directly by the CLI on Node.js 20.${colors.reset}`
    );
    console.error(
      `${colors.cyan}Tip:${colors.reset} compile schema to .js/.mjs or run Node with a TypeScript loader.`
    );
    return 1;
  }

  const resolvedSchemaPath = path.resolve(process.cwd(), schemaPath);
  if (!fs.existsSync(resolvedSchemaPath)) {
    console.error(`${colors.red}Schema file not found:${colors.reset} ${resolvedSchemaPath}`);
    return 1;
  }

  if (envFilePath) {
    const resolvedEnvFilePath = path.resolve(process.cwd(), envFilePath);
    if (!fs.existsSync(resolvedEnvFilePath)) {
      console.error(`${colors.red}Env file not found:${colors.reset} ${resolvedEnvFilePath}`);
      return 1;
    }

    try {
      loadEnvFile(resolvedEnvFilePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${colors.red}${colors.bold}Failed to load env file:${colors.reset} ${message}`);
      return 1;
    }
  }

  try {
    let schemaModule: Record<string, unknown>;

    if (ext === ".cjs") {
      schemaModule = requireFromCwd(resolvedSchemaPath) as Record<string, unknown>;
    } else {
      const moduleUrl = pathToFileURL(resolvedSchemaPath).href;

      try {
        schemaModule = (await import(moduleUrl)) as Record<string, unknown>;
      } catch (importError) {
        if (ext === ".js") {
          schemaModule = requireFromCwd(resolvedSchemaPath) as Record<string, unknown>;
        } else {
          throw importError;
        }
      }
    }

    const schema = getSchemaFromModule(schemaModule, schemaPath);

    validateEnv({ schema, silent });
    return 0;
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`${colors.red}${colors.bold}Failed to validate environment:${colors.reset} ${message}`);
    return 1;
  }
}
