import { pool } from './src/database/mysql';

async function check() {
  try {
    const tables = ['product_variants', 'product_category_assignments', 'product_custom_field_values'];
    for (const table of tables) {
        const [rows] = await pool.query(`DESCRIBE ${table}`);
        console.log(`Table: ${table}`);
        console.table(rows);
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

check();
