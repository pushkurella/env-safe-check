# env-safe-check

Reliable, minimal utility to validate required environment variables at runtime.

This tiny library helps Node and TypeScript projects fail fast with a clear
error message when required environment variables are missing or empty.

**Highlights**

- Zero runtime dependencies
- Two APIs: simple (legacy array) or powerful (schema-based)
- Type-safe: automatic parsing for `string`, `number`, `boolean`, `json`
- Custom validators: add your own validation logic
- Defaults & optional vars: sensible config for each variable
- Colorful error messages with variable descriptions
- Works in TypeScript and JavaScript projects (ESM)
- Safe defaults for CI and production (exits with non-zero code on errors)

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

### Simple mode (Legacy)

Validate a list of required environment variables:

```ts
import { validateEnv } from 'env-safe-check';

// Exits with code 1 if any are missing
validateEnv(['DATABASE_URL', 'API_KEY']);
```

### Schema mode (Recommended)

Validate with types, defaults, custom validators, and descriptions:

```ts
import { validateEnv, type VariableSchema } from 'env-safe-check';

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
    },
    FEATURE_CONFIG: { type: 'json', required: false },
  },
  throwError: false, // default: exits process on error
  silent: false,     // default: prints colorful output
});

// Returns parsed and validated env object:
// { DATABASE_URL: string, PORT: number, DEBUG: boolean, NODE_ENV: string, FEATURE_CONFIG?: any }
console.log(env.PORT); // 3000 (or parsed value from process.env.PORT)
```

## API

### `validateEnv(required: string[]): void` (Legacy)

- **required** — array of environment variable names to verify
- **Returns** — void; exits process (code 1) if any are missing or empty
- **Console output** — colorful error/success messages

### `validateEnv(config: ValidateEnvOptions): Record<string, any>` (Recommended)

- **config.schema** — Record of variable names to schema definitions
  - Each value can be:
    - A type string shorthand: `'string' | 'number' | 'boolean' | 'json'`
    - A full `VariableSchema` object (see below)
- **config.throwError** (default: `false`) — throw `EnvValidationError` instead of exiting process
- **config.silent** (default: `false`) — suppress console output
- **Returns** — `Record<string, any>` with parsed env variables
- **Throws** — `EnvValidationError` if `throwError: true` and validation fails

### `VariableSchema`

```ts
interface VariableSchema {
  // Type of the variable. Parsed and validated accordingly.
  // 'string' | 'number' | 'boolean' | 'json'
  type?: 'string' | 'number' | 'boolean' | 'json';

  // Whether this variable is required (default: true)
  required?: boolean;

  // Default value if not set and not required
  default?: string;

  // Custom validation function
  // Return true if valid, or an error string if invalid
  validator?: (value: string) => boolean | string;

  // Description for error messages
  description?: string;
}
```

### `EnvValidationError`

Thrown when validation fails with `throwError: true`:

```ts
try {
  const env = validateEnv({ schema: { /* ... */ }, throwError: true });
} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error('Missing:', err.missing); // string[]
    console.error('Invalid:', err.invalid); // Record<string, string>
  }
}
```

## Examples

### Type parsing with defaults

```ts
const env = validateEnv({
  schema: {
    PORT: { type: 'number', default: '3000' },
    TIMEOUT: { type: 'number', required: false },
    ENABLE_CACHE: { type: 'boolean', default: 'true' },
  },
});

// PORT is always a number (parsed from env or default)
// TIMEOUT is optional; undefined if not set
// ENABLE_CACHE is always a boolean
```

### Custom validators

```ts
const env = validateEnv({
  schema: {
    WORKER_THREADS: {
      type: 'number',
      validator: (val) => {
        const num = Number(val);
        if (num < 1 || num > 32) {
          return 'Must be between 1 and 32';
        }
        return true;
      },
    },
  },
});
```

### Throw errors instead of exiting

```ts
try {
  const env = validateEnv({
    schema: { DB_URL: 'string' },
    throwError: true,
  });
} catch (err) {
  if (err instanceof EnvValidationError) {
    // Handle custom error; code continues (doesn't exit)
  }
}
```

## Project specifics (for contributors / package authors)

- Source files are TypeScript in `src/`.
- Build emits ESM JavaScript into `dist/`.
- Source imports are written without `.js` extensions for ergonomics in
  TypeScript; the build process rewrites emitted imports to include `.js`
  so the output is runnable under Node ESM (`node >= 12` with ESM support).

Commands:

```bash
# Build and patch emitted imports
npm run build

# Run TypeScript type-check only
npx tsc --noEmit
```

## Publishing

1. Bump the package version in `package.json`.
2. Run `npm run build` to produce `dist/`.
3. Verify the `main`/`exports` fields point to built files (if applicable).
4. `npm publish --access public`

## Contributing

Contributions are welcome. Open issues for bugs or small feature requests.

Please run the tests (if added) and ensure linting/type-checks pass before submitting a PR.

### Conventional Commits

This project uses [semantic-release](https://semantic-release.gitbook.io/) to automate versioning and publishing based on commit messages. Please follow the [Conventional Commits](https://www.conventionalcommits.org/) format:


```
type(scope): subject

body

footer
```

**Types:**
- `feat:` A new feature (bumps minor version)
- `fix:` A bug fix (bumps patch version)
- `docs:` Documentation changes
- `style:` Code style changes (no logic changes)
- `refactor:` Refactor code without changing behavior
- `perf:` Performance improvements
- `test:` Adding/updating tests
- `ci:` CI/CD changes
- `chore:` Build, dependencies, etc.

**Breaking Changes:**
- Add `BREAKING CHANGE: description` in the footer to bump major version
- Or use `feat!:` in the type to indicate a breaking change

**Examples:**
```bash
npm run cz                  # Interactive prompt (recommended)
git commit -m "feat: add JSON type validation"
git commit -m "fix: correct boolean parsing"
git commit -m "feat!: change API to return parsed object"
```

## License

MIT
