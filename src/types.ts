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
   * Human-readable hint for validator constraints (e.g. "one of: development, staging, production").
   * Shown in error output to help users provide valid values.
   */
  validatorHint?: string;

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
export interface EnvValidationDetails {
  missing: string[];
  invalid: Record<string, string>;
}

export class EnvValidationError extends Error {
  public readonly code = "ENV_VALIDATION_ERROR";
  public readonly details: EnvValidationDetails;

  constructor(
    message: string,
    details: EnvValidationDetails = { missing: [], invalid: {} },
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'EnvValidationError';
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get missing(): string[] {
    return this.details.missing;
  }

  get invalid(): Record<string, string> {
    return this.details.invalid;
  }

  toJSON(): {
    name: string;
    code: string;
    message: string;
    missing: string[];
    invalid: Record<string, string>;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      missing: this.missing,
      invalid: this.invalid,
    };
  }
}
