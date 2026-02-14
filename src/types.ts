/**
 * Variable type for validation and parsing.
 */
export type VariableType = 'string' | 'number' | 'boolean' | 'json';

/**
 * Schema definition for a single environment variable.
 */
export interface VariableSchema {
  /**
   * Type of the variable. Parsed and validated accordingly.
   * @default 'string'
   */
  type?: VariableType;

  /**
   * Whether this variable is required.
   * @default true
   */
  required?: boolean;

  /**
   * Default value if the variable is not set (and not required).
   */
  default?: string;

  /**
   * Custom validator function. Return true if valid, or an error message string if invalid.
   */
  validator?: (value: string) => boolean | string;

  /**
   * Description of the variable (for error messages).
   */
  description?: string;
}

/**
 * Options for validateEnv function.
 */
export interface ValidateEnvOptions {
  /**
   * Schema defining required/optional vars, types, defaults, and validators.
   */
  schema: Record<string, VariableSchema | VariableType>;

  /**
   * If true, throw a custom error instead of calling process.exit(1).
   * @default false
   */
  throwError?: boolean;

  /**
   * If true, don't print console messages.
   * @default false
   */
  silent?: boolean;
}

/**
 * Custom error thrown when validation fails (if throwError option is true).
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly missing: string[] = [],
    public readonly invalid: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}
