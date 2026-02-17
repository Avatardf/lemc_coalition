
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);

    console.log("Adding admissionDate column to motoClubs table...");

    try {
        await connection.execute(`
      ALTER TABLE motoClubs
      ADD COLUMN admissionDate TIMESTAMP NULL AFTER foundingDate;
    `);
        console.log("Successfully added admissionDate column.");
    } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("Column admissionDate already exists.");
        } else {
            console.error("Error adding column:", error);
        }
    }

    await connection.end();
}

run();
