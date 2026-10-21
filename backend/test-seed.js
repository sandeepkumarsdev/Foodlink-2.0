import { seedPostgresData } from './server/db.js';

async function run() {
  try {
    console.log("Running seedPostgresData...");
    await seedPostgresData();
    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

run();
