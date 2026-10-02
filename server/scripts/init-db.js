import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  console.log('🔄 [QLESS] Starting MySQL Database Initialization Script...');
  console.log(`Connecting to ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306} as ${process.env.DB_USER || 'root'}...`);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL Server!');

    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const seedPath = path.join(__dirname, '../../database/seed.sql');

    if (fs.existsSync(schemaPath)) {
      console.log('📄 Executing database/schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log('✅ Schema tables and views created successfully!');
    }

    if (fs.existsSync(seedPath)) {
      console.log('🌱 Executing database/seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await connection.query(seedSql);
      console.log('✅ Seed data across 6 industries populated successfully!');
    }

    await connection.end();
    console.log('\n🎉 [QLESS] Database setup complete! You can also view it in MySQL Workbench.');
  } catch (err) {
    console.error('\n⚠️ [QLESS] Could not automatically initialize MySQL via script:', err.message);
    console.log('👉 To initialize via MySQL Workbench:');
    console.log('   1. Open MySQL Workbench.');
    console.log('   2. Open database/schema.sql and click Execute (⚡).');
    console.log('   3. Open database/seed.sql and click Execute (⚡).');
    console.log('   The app will automatically work with both direct MySQL and in-memory cache!\n');
  }
}

initDatabase();
