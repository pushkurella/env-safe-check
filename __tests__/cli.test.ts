import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { runCli } from "../src/cli";

describe("runCli", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it("returns 0 for help", async () => {
    await expect(runCli(["--help"])).resolves.toBe(0);
  });

  it("returns 1 for unknown command", async () => {
    await expect(runCli(["nope"])).resolves.toBe(1);
  });

  it("returns 1 when schema option is missing", async () => {
    await expect(runCli(["validate"])).resolves.toBe(1);
  });

  it("returns 1 when schema path is TypeScript", async () => {
    await expect(runCli(["validate", "--schema", "./env.schema.ts"])).resolves.toBe(1);
  });

  it("returns 1 when env file path is missing", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-safe-check-cli-"));
    const schemaPath = path.join(tmpDir, "env.schema.cjs");
    fs.writeFileSync(schemaPath, `module.exports = { API_KEY: "string" };`, "utf8");

    await expect(
      runCli(["validate", "--schema", schemaPath, "--env-file", "./does-not-exist.env"])
    ).resolves.toBe(1);
  });

  it("returns 0 when validation passes", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-safe-check-cli-"));
    const schemaPath = path.join(tmpDir, "env.schema.cjs");

    fs.writeFileSync(
      schemaPath,
      `module.exports = { API_KEY: { type: "string" }, PORT: { type: "number", default: "3000", required: false } };`,
      "utf8"
    );

    process.env.API_KEY = "secret";

    await expect(runCli(["validate", "--schema", schemaPath, "--silent"])).resolves.toBe(0);
  });

  it("loads required vars from env file", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-safe-check-cli-"));
    const schemaPath = path.join(tmpDir, "env.schema.cjs");
    const envFilePath = path.join(tmpDir, ".env");

    fs.writeFileSync(schemaPath, `module.exports = { API_KEY: "string" };`, "utf8");
    fs.writeFileSync(envFilePath, `API_KEY=from-env-file`, "utf8");

    delete process.env.API_KEY;

    await expect(
      runCli(["validate", "--schema", schemaPath, "--env-file", envFilePath, "--silent"])
    ).resolves.toBe(0);
  });

  it("returns 1 when validation fails", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-safe-check-cli-"));
    const schemaPath = path.join(tmpDir, "env.schema.cjs");

    fs.writeFileSync(schemaPath, `module.exports = { API_KEY: "string" };`, "utf8");

    delete process.env.API_KEY;

    await expect(runCli(["validate", "--schema", schemaPath])).resolves.toBe(1);
  });
});
