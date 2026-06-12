const { Client } = require('pg');

async function dump() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'logistmate',
  });

  await client.connect();

  try {
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('--- TABLES ---');
    console.table(tablesRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

dump();
