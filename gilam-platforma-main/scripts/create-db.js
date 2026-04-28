const { Client } = require('pg');

async function createDb() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    await client.query('CREATE DATABASE gilam_saas');
    console.log('Database "gilam_saas" created successfully');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database "gilam_saas" already exists');
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    await client.end();
  }
}

createDb();
