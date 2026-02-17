
import * as dbLib from "../server/db";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Running migration: add_birth_date_to_users...");

    const db = await dbLib.getDb();
    if (!db) {
        console.error("Failed to connect to database");
        process.exit(1);
    }

    try {
        // @ts-ignore
        await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN birthDate DATE NULL;
    `);
        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    }

    process.exit(0);
}

main();
