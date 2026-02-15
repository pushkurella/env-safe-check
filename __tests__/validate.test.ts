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
      throwError: true,
      silent: true,
    });

    expect(env).toEqual({
      PORT: 3001,
      DEBUG: true,
      APP_CONFIG: { feature: true },
      NODE_ENV: "development",
    });
  });

  it("throws EnvValidationError when required variables are missing", () => {
    expect(() =>
      validateEnv({
        schema: {
          DATABASE_URL: { type: "string", description: "Database connection string" },
        },
        throwError: true,
        silent: true,
      })
    ).toThrow(EnvValidationError);

    try {
      validateEnv({
        schema: { DATABASE_URL: "string" },
        throwError: true,
        silent: true,
      });
    } catch (error) {
      const err = error as EnvValidationError;
      expect(err.missing).toEqual(["DATABASE_URL"]);
      expect(err.invalid).toEqual({});
    }
  });

  it("throws EnvValidationError for invalid typed values", () => {
    process.env.PORT = "not-a-number";

    try {
      validateEnv({
        schema: { PORT: "number" },
        throwError: true,
        silent: true,
      });
      throw new Error("Expected validateEnv to throw");
    } catch (error) {
      const err = error as EnvValidationError;
      expect(err.missing).toEqual([]);
      expect(err.invalid.PORT).toContain("Invalid number");
    }
  });

  it("uses custom validator messages for invalid values", () => {
    process.env.NODE_ENV = "qa";

    try {
      validateEnv({
        schema: {
          NODE_ENV: {
            type: "string",
            validator: (value) =>
              ["development", "production", "test"].includes(value)
                ? true
                : "Must be one of: development, production, test",
          },
        },
        throwError: true,
        silent: true,
      });
      throw new Error("Expected validateEnv to throw");
    } catch (error) {
      const err = error as EnvValidationError;
      expect(err.invalid.NODE_ENV).toBe("Must be one of: development, production, test");
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
});
