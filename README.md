<div align="center">

# env-safe-check

> Zero-dependency, type-safe environment validation for Node.js & TypeScript

[![npm version](https://img.shields.io/npm/v/env-safe-check.svg)](https://www.npmjs.com/package/env-safe-check)
[![npm downloads](https://img.shields.io/npm/dw/env-safe-check.svg)](https://www.npmjs.com/package/env-safe-check)
[![license](https://img.shields.io/npm/l/env-safe-check.svg)](https://www.npmjs.com/package/env-safe-check)
[![node](https://img.shields.io/node/v/env-safe-check.svg)](https://www.npmjs.com/package/env-safe-check)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)]()

</div>

---

## ✨ What is env-safe-check?

`env-safe-check` is a lightweight, zero-dependency library that validates environment variables at application startup.

It ensures your app:

- 🚨 Fails fast when required variables are missing
- 🎯 Validates types (`string`, `number`, `boolean`, `json`)
- 🧠 Supports custom validators with helpful hints
- 🧩 Provides defaults for optional variables
- 🎨 Outputs clean, CLI-friendly error messages
- 🔒 Is CI-safe (non-zero exit on validation failure)

Stop debugging production issues caused by misconfigured environment variables.

---

## 🚀 Quick Start

### Install

```bash
npm install env-safe-check
# or
yarn add env-safe-check
# or
pnpm add env-safe-check
```

---

## ⚡ TL;DR (Recommended Schema Mode)

```ts
import { validateEnv } from 'env-safe-check';

export const env = validateEnv({
  schema: {
    DATABASE_URL: {
      type: 'string',
      description: 'PostgreSQL connection URL',
    },

    PORT: {
      type: 'number',
      default: '3000',
    },

    DEBUG: {
      type: 'boolean',
      required: false,
      default: 'false',
    },

    NODE_ENV: {
      type: 'string',
      validator: (value) =>
        ['development', 'production', 'test'].includes(value)
          ? true
          : 'Must be one of: development, production, test',
      validatorHint: 'development | production | test',
    },

    FEATURE_FLAGS: {
      type: 'json',
      required: false,
    },
  },
});

console.log(env.PORT); // number
```

---

## 🧩 Why env-safe-check?

Many apps rely on `process.env` directly.

That leads to:

- ❌ Missing variables discovered in production
- ❌ Silent failures
- ❌ Wrong data types (`"3000"` instead of `3000`)
- ❌ Unclear error messages
- ❌ Configuration drift across environments

`env-safe-check` solves this by validating everything at startup — clearly, strictly, and predictably.

---

## 🛠 API

### 1️⃣ Schema Mode (Recommended)

```ts
validateEnv(config: ValidateEnvOptions): Record<string, any>
```

#### Options

| Option          | Description |
|---------------|-------------|
| `schema`       | Object defining environment variables and their validation rules |
| `silent`       | Default: `false`. If `true`, suppresses output and does not throw |

#### Returns

Parsed and validated environment variables.

#### Throws

`EnvValidationError` (when `silent: false` and validation fails)

---

### 2️⃣ Simple Mode (Legacy)

```ts
validateEnv(required: string[]): void
```

Example:

```ts
validateEnv(['DATABASE_URL', 'API_KEY']);
```

- Exits process with code `1` if any are missing
- Prints colorful CLI messages

---

## 🧠 Variable Schema

```ts
interface VariableSchema {
  type?: 'string' | 'number' | 'boolean' | 'json';
  required?: boolean;        // default: true
  default?: string;
  validator?: (value: string) => boolean | string;
  validatorHint?: string;
  description?: string;
}
```

---

## 🎯 Advanced Examples

### Custom Validator with Hint

```ts
validateEnv({
  schema: {
    WORKER_THREADS: {
      type: 'number',
      validator: (value) => {
        const num = Number(value);
        return num >= 1 && num <= 32
          ? true
          : 'Must be between 1 and 32';
      },
      validatorHint: 'integer between 1 and 32',
      description: 'Worker pool size',
    },
  },
});
```

---

### Handling Errors Explicitly

```ts
import { validateEnv, EnvValidationError } from 'env-safe-check';

try {
  validateEnv({ schema: { DB_URL: 'string' } });
} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error('Missing:', err.missing);
    console.error('Invalid:', err.invalid);
  }
}
```

---

## 🧪 Best Practices

- ✅ Validate once at application startup
- ✅ Always include `description` for team clarity
- ✅ Provide `validatorHint` for custom validators
- ✅ Keep `silent: false` in production
- ✅ Explicitly mark optional variables with `required: false`

---

## ⚠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| Boolean parsing fails | Use `true`, `false`, `1`, or `0` |
| Number parsing fails | Ensure numeric string (e.g., `3000`) |
| JSON parsing fails | Provide valid JSON (`{"enabled": true}`) |
| Default not applied | Must set `required: false` |

---

## 🏗 Project Structure (For Contributors)

- Source: `src/` (TypeScript)
- Output: `dist/` (ESM)

### Scripts

```bash
npm run build
npm run typecheck
npm test
```

---

## 📦 Publishing

1. Bump version in `package.json`
2. `npm run build`
3. Verify `main` and `types`
4. `npm publish --access public`

---

## 🤝 Contributing

Issues and PRs are welcome.

Before submitting:
- Run type checks
- Ensure tests pass
- Keep changes focused and minimal

---

## 📄 License

MIT

---

## 🔍 Keywords

environment validation, env validator, node config validation, typescript env validation, runtime configuration safety, dotenv alternative

