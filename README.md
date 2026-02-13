# env-safe-check

Reliable, minimal utility to validate required environment variables at runtime.

This tiny library helps Node and TypeScript projects fail fast with a clear
error message when required environment variables are missing or empty.

**Highlights**

- Zero runtime dependencies
- Tiny API: a single `validateEnv()` function
- Works in TypeScript and JavaScript projects (ESM)
- Safe defaults for CI and production (exits with non-zero code on missing vars)

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

TypeScript (recommended):

```ts
import { validateEnv } from 'env-safe-check';

// throw and exit if any required env var is missing or empty
validateEnv(['DATABASE_URL', 'API_KEY']);
```

JavaScript (ESM):

```js
import { validateEnv } from 'env-safe-check';

validateEnv(['DATABASE_URL', 'API_KEY']);
```

When any required variable is missing the library prints a friendly list
and exits the process with code `1`.

## API

- `validateEnv(required: string[]): void`
  - `required` — array of environment variable names to verify.
  - Throws/terminates the process (with a console error) when any are
    missing or empty.

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

Please run the tests (if added) and ensure linting/type-checks pass before
submitting a PR.

## License

MIT
