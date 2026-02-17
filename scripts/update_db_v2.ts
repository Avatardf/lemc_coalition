import mysql from 'mysql2/promise';
import 'dotenv/config';

async function update() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);

    console.log('--- DB Update v2 Starting ---');

    try {
        // 1. Add targetAgentId to nierequests
        console.log('Updating table: nierequests...');
        const [cols]: any = await connection.execute('DESCRIBE nierequests');
        const existingFields = cols.map((c: any) => c.Field);

        if (!existingFields.includes('targetAgentId')) {
            await connection.execute('ALTER TABLE nierequests ADD COLUMN targetAgentId INT');
            console.log('Added targetAgentId to nierequests');
        }

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await connection.end();
        console.log('--- DB Update v2 Finished ---');
    }
}

update();
