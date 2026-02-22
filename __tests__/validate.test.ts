import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { validateEnv } from "../src/validate";
import { EnvValidationError, VariableTypes } from "../src/types";

describe("validateEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it("parses schema values and applies defaults for optional variables", () => {
    process.env.PORT = "3001";
    process.env.DEBUG = "true";
    process.env.APP_CONFIG = '{"feature":true}';
    delete process.env.NODE_ENV;

    const env = validateEnv({
      schema: {
        PORT: "number",
        DEBUG: "boolean",
        APP_CONFIG: "json",
        NODE_ENV: { type: "string", required: false, default: "development" },
      },
      silent: true,
    });

    expect(env).toEqual({
      PORT: 3001,
      DEBUG: true,
      APP_CONFIG: { feature: true },
      NODE_ENV: "development",
    });
  });

  it("suppresses missing variable errors when silent is true", () => {
    const env = validateEnv({
      schema: {
        DATABASE_URL: { type: "string", description: "Database connection string" },
      },
      silent: true,
    });

    expect(env).toEqual({});
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("suppresses invalid typed value errors when silent is true", () => {
    process.env.PORT = "not-a-number";

    const env = validateEnv({
      schema: { PORT: "number" },
      silent: true,
    });

    expect(env).toEqual({});
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("suppresses custom validator errors when silent is true", () => {
    process.env.NODE_ENV = "qa";

    const env = validateEnv({
      schema: {
        NODE_ENV: {
          type: "string",
          validator: (value) =>
            ["development", "production", "test"].includes(value)
              ? true
              : "Must be one of: development, production, test",
        },
      },
      silent: true,
    });

    expect(env).toEqual({ NODE_ENV: "qa" });
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("logs color output and throws generic EnvValidationError when silent is false", () => {
    expect(() =>
      validateEnv({
        schema: { DATABASE_URL: "string" },
      })
    ).toThrow(EnvValidationError);

    try {
      validateEnv({
        schema: { DATABASE_URL: "string" },
      });
    } catch (error) {
      const err = error as EnvValidationError;
      expect(err.message).toBe("Environment validation failed");
      expect(err.missing).toEqual(["DATABASE_URL"]);
      expect(err.invalid).toEqual({});
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(process.exit).not.toHaveBeenCalled();
    }
  });

  it("legacy mode exits when required variables are missing", () => {
    const exitSpy = process.exit as jest.MockedFunction<typeof process.exit>;
    exitSpy.mockImplementation(((code?: string | number | null) => {
        throw new Error(`exit:${code}`);
      }) as never);

    expect(() => validateEnv(["API_KEY"])).toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("legacy mode passes when required variables exist", () => {
    process.env.API_KEY = "secret";
    validateEnv(["API_KEY"]);

    expect(process.exit).not.toHaveBeenCalled();
  });

  it("EnvValidationError supports cause and details metadata", () => {
    const cause = new Error("root cause");
    const err = new EnvValidationError(
      "Validation failed",
      { missing: ["A"], invalid: { B: "bad value" } },
      { cause }
    );

    expect(err.cause).toBe(cause);
    expect(err.code).toBe("ENV_VALIDATION_ERROR");
    expect(err.details).toEqual({ missing: ["A"], invalid: { B: "bad value" } });
    expect(err.missing).toEqual(["A"]);
    expect(err.invalid).toEqual({ B: "bad value" });
  });

  it("parses int, float, port, url, and array types", () => {
    process.env.WORKERS = "4";
    process.env.THRESHOLD = "3.14";
    process.env.PORT = "8080";
    process.env.WEBHOOK_URL = "https://example.com/hook";
    process.env.FEATURES = "alpha, beta ,gamma ";

    const env = validateEnv({
      schema: {
        WORKERS: "int",
        THRESHOLD: "float",
        PORT: "port",
        WEBHOOK_URL: "url",
        FEATURES: "array",
      },
      silent: true,
    });

    expect(env).toEqual({
      WORKERS: 4,
      THRESHOLD: 3.14,
      PORT: 8080,
      WEBHOOK_URL: "https://example.com/hook",
      FEATURES: ["alpha", "beta", "gamma"],
    });
  });

  it("marks invalid int, port, and url values as invalid in silent mode", () => {
    process.env.WORKERS = "4.2";
    process.env.PORT = "70000";
    process.env.WEBHOOK_URL = "not-a-url";

    const env = validateEnv({
      schema: {
        WORKERS: "int",
        PORT: "port",
        WEBHOOK_URL: "url",
      },
      silent: true,
    });

    expect(env).toEqual({});
  });

  it("supports oneOf and enum constraints", () => {
    process.env.NODE_ENV = "production";
    process.env.REGION = "us-east-1";

    const env = validateEnv({
      schema: {
        NODE_ENV: {
          type: "string",
          oneOf: ["development", "test", "production"],
        },
        REGION: {
          type: "string",
          enum: ["us-east-1", "eu-west-1"],
        },
      },
      silent: true,
    });

    expect(env).toEqual({
      NODE_ENV: "production",
      REGION: "us-east-1",
    });
  });

  it("rejects oneOf violations", () => {
    process.env.NODE_ENV = "qa";

    const env = validateEnv({
      schema: {
        NODE_ENV: {
          type: "string",
          oneOf: ["development", "test", "production"],
        },
      },
      silent: true,
    });

    expect(env).toEqual({ NODE_ENV: "qa" });

    expect(() =>
      validateEnv({
        schema: {
          NODE_ENV: {
            type: "string",
            oneOf: ["development", "test", "production"],
          },
        },
      })
    ).toThrow(EnvValidationError);
  });

  it("supports VariableTypes constants in schema type fields", () => {
    process.env.PORT = "3000";
    process.env.DEBUG = "1";

    const env = validateEnv({
      schema: {
        PORT: { type: VariableTypes.PORT },
        DEBUG: { type: VariableTypes.BOOLEAN },
      },
      silent: true,
    });

    expect(env).toEqual({
      PORT: 3000,
      DEBUG: true,
    });
  });
});
