import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './index';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const migrationsDir = join(__dirname, 'migrations');
  
  // Read migration files in order
  const migrations = [
    '001_initial_schema.sql',
    '002_insert_categories.sql',
    '003_performance_indexes.sql',
    '004_security_improvements.sql',
    '005_notifications_ratings.sql',
  ];

  for (const migration of migrations) {
    const filePath = join(migrationsDir, migration);
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`Running migration: ${migration}`);
    await db.query(sql);
    console.log(`Completed migration: ${migration}`);
  }
  
  console.log('All migrations completed');
  await db.close();
}

runMigrations().catch(console.error);
