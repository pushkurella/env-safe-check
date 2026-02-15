import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { validateEnv } from "../src/validate";
import { EnvValidationError } from "../src/types";

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
});
