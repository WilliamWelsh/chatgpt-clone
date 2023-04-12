import type { Config } from "drizzle-kit";
import "dotenv/config";
import { env } from "./src/env.mjs";

export default {
  schema: "./src/db/schema.ts",
  connectionString: env.CONNECTION_STRING,
} satisfies Config;
