import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";

const runMigrations = async () => {
  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigrations();

