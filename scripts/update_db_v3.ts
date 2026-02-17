import mysql from 'mysql2/promise';
import 'dotenv/config';

async function update() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);

    console.log('--- DB Update v3 Starting ---');

    try {
        // 1. Add status and isArchived to nieintelligencereports
        console.log('Updating table: nieintelligencereports...');
        const [cols]: any = await connection.execute('DESCRIBE nieintelligencereports');
        const existingFields = cols.map((c: any) => c.Field);

        if (!existingFields.includes('status')) {
            await connection.execute("ALTER TABLE nieintelligencereports ADD COLUMN status ENUM('active', 'archived', 'deleted') DEFAULT 'active'");
            console.log('Added status to nieintelligencereports');
        }

        // 2. Create nie_report_reads table
        console.log('Creating table: nie_report_reads...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS nie_report_reads (
        userId INT NOT NULL,
        reportId VARCHAR(36) NOT NULL,
        readAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, reportId)
      )
    `);
        console.log('Table nie_report_reads ensured');

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await connection.end();
        console.log('--- DB Update v3 Finished ---');
    }
}

update();
