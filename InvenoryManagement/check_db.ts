import { pool } from './src/database/mysql';

async function check() {
  try {
    const [rows] = await pool.query('DESCRIBE products');
    console.log('Products Table Columns:');
    console.table(rows);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

check();
