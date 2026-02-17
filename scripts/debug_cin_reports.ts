import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import * as relations from '../drizzle/relations';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Connecting to DB...");
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection, { schema: { ...schema, ...relations }, mode: 'default' });

    console.log("Testing getReports simplified query (like getUnreadCounts)...");
    const reports1 = await db.query.nieIntelligenceReports.findMany({
        where: eq(schema.nieIntelligenceReports.status, 'active')
    });
    console.log(`Results (simplified): ${reports1.length}`);

    console.log("Testing getReports full query (callback style + with)...");
    const reports2 = await db.query.nieIntelligenceReports.findMany({
        where: (reports, { and, eq }) => and(
            eq(reports.status, 'active')
        ),
        with: {
            author: true
        }
    });
    console.log(`Results (full): ${reports2.length}`);
    if (reports2.length > 0) {
        console.log("Sample report author:", reports2[0].author);
    }

    await connection.end();
}

main().catch(console.error);
