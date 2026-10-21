import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.POSTGRES_URL;
console.log("Testing connection to:", url.replace(/:[^:@]+@/, ':***@'));

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10000,
});

async function test() {
  try {
    const res = await pool.query('SELECT NOW() as time');
    console.log("Connection successful! DB Time:", res.rows[0].time);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await pool.end();
  }
}

test();
