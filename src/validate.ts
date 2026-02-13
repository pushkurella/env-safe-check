export function validateEnv(required: string[]): void {
  const missing = required.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === "";
  });

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:\n");

    missing.forEach((key) => {
      console.error(`- ${key}`);
    });

    console.error(
      "\nPlease define them in your .env file or environment config."
    );

    process.exit(1);
  }
}
