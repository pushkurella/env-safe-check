# env-safe-check

Reliable, minimal utility to validate required environment variables at runtime.

This tiny library helps Node and TypeScript projects fail fast with a clear
error message when required environment variables are missing or empty.

**Highlights**

- Zero runtime dependencies
- Two APIs: simple (legacy array) or powerful (schema-based)
- Type-safe parsing for `string`, `number`, `boolean`, and `json`
- Custom validators and human-readable validator hints
- Defaults & optional vars with clear error output
- Colorful CLI-friendly validation messages
- Works in TypeScript and JavaScript projects (ESM)
- CI-safe by default (exits with non-zero code on validation errors)

## Installation

Install from npm (devs using this repo can also build locally):

```bash
npm install env-safe-check
```

For local development (this repository):

```bash
npm install
npm run build
```

## Quick usage

### Simple mode (legacy)

Validate a list of required environment variables:

```ts
import { validateEnv } from 'env-safe-check';

// Exits with code 1 if any are missing
validateEnv(['DATABASE_URL', 'API_KEY']);
```

### Schema mode (recommended)

Validate with types, defaults, custom validators, and descriptions:

```ts
import { validateEnv } from 'env-safe-check';

const env = validateEnv({
  schema: {
    DATABASE_URL: { type: 'string', description: 'PostgreSQL connection URL' },
    PORT: { type: 'number', default: '3000' },
    DEBUG: { type: 'boolean', default: 'false', required: false },
    NODE_ENV: {
      type: 'string',
      validator: (value) =>
        ['development', 'production', 'test'].includes(value)
          ? true
          : 'Must be one of: development, production, test',
      validatorHint: 'one of: development | production | test',
    },
    FEATURE_CONFIG: { type: 'json', required: false },
  },
  silent: false, // default: prints colorful output and exits on error
});

console.log(env.PORT); // 3000 (or parsed value from process.env.PORT)
```

## API

### `validateEnv(required: string[]): void` (legacy)

- **required** — array of environment variable names to verify
- **Returns** — void; exits process (code `1`) if any are missing or empty
- **Console output** — colorful error/success messages

### `validateEnv(config: ValidateEnvOptions): Record<string, any>` (recommended)

- **config.schema** — Record of variable names to schema definitions
  - Each value can be:
    - Type shorthand: `'string' | 'number' | 'boolean' | 'json'`
    - Full `VariableSchema` object
- **config.silent** (default: `false`) — if `true`, suppress output and throw `EnvValidationError`; if `false`, print output and exit with code `1` on validation failure
- **Returns** — object with parsed env values
- **Throws** — `EnvValidationError` if `silent: true` and validation fails

### `VariableSchema`

```ts
interface VariableSchema {
  // Type of the variable. Parsed and validated accordingly.
  type?: 'string' | 'number' | 'boolean' | 'json';

  // Whether this variable is required (default: true)
  required?: boolean;

  // Default value used when variable is missing and required is false
  default?: string;

  // Custom validation. Return true if valid, or an error string if invalid.
  validator?: (value: string) => boolean | string;

  // Human-readable validator expectation shown in error output.
  validatorHint?: string;

  // Description shown in error output.
  description?: string;
}
```

### `EnvValidationError`

```ts
import { EnvValidationError, validateEnv } from 'env-safe-check';

try {
  validateEnv({ schema: { DB_URL: 'string' }, silent: true });
} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error('Missing:', err.missing);
    console.error('Invalid:', err.invalid);
  }
}
```

## Best practices to make this library more helpful in your app

- Validate **once at startup** and fail fast.
- Add a `description` for each variable so error output helps teammates quickly.
- Use `validatorHint` whenever you use a custom `validator`.
- Use `silent: true` in tests and scripts where you need custom handling.
- Keep optional variables explicit (`required: false`) and document defaults.

## Examples

### Custom validators with hints

```ts
const env = validateEnv({
  schema: {
    WORKER_THREADS: {
      type: 'number',
      validator: (val) => {
        const num = Number(val);
        return num >= 1 && num <= 32 ? true : 'Must be between 1 and 32';
      },
      validatorHint: 'integer in range 1..32',
      description: 'Worker pool size',
    },
  },
});
```

### Throw errors instead of exiting

```ts
import { EnvValidationError, validateEnv } from 'env-safe-check';

try {
  validateEnv({
    schema: { DB_URL: 'string' },
    silent: true,
  });
} catch (err) {
  if (err instanceof EnvValidationError) {
    // Handle in your own error flow (tests, scripts, startup wrappers)
  }
}
```

## Troubleshooting

- **Boolean parsing fails**: only `true` / `false` / `1` / `0` are accepted.
- **Number parsing fails**: make sure the value is numeric (`3000`, not `three-thousand`).
- **JSON parsing fails**: provide valid JSON (`{"enabled": true}`), not JS-like syntax.
- **Default not applied**: defaults are used when `required: false` and the variable is missing.

## Project specifics (for contributors)

- Source files are TypeScript in `src/`.
- Build emits ESM JavaScript into `dist/`.

Commands:

```bash
npm run build
npm run typecheck
npm test
```

## Publishing

1. Bump package version in `package.json`.
2. Run `npm run build`.
3. Verify `main`/`types` entries.
4. `npm publish --access public`

## Contributing

Contributions are welcome. Open issues for bugs or feature requests.

Please run type checks/tests before submitting a PR.

## License

MIT
