// `npm run db:migrate`: applies the pending migrations with the administrator role from
// MIGRATION_DATABASE_URL.

import dotenv from "dotenv";
import { Client } from "pg";
import { loadMigrations, migrate } from "./migrate.js";

async function main(): Promise<void> {
  dotenv.config({ quiet: true });

  const connectionString = process.env.MIGRATION_DATABASE_URL;
  if (!connectionString) {
    throw new Error("MIGRATION_DATABASE_URL is not set (see backend/.env.example)");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const applied = await migrate(client, loadMigrations());
    console.log(applied.length === 0 ? "The database is up to date." : `Applied migrations: ${applied.join(", ")}`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
