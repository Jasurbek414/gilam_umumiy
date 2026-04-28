const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function fix() {
  const client = new Client({
    host: 'localhost', port: 5432,
    user: 'postgres', password: 'postgres',
    database: 'gilam_saas'
  });
  await client.connect();

  const users = [
    { phone: '+998901234567', password: 'admin123' },
    { phone: '+998901111111', password: 'operator123' },
    { phone: '+998902222222', password: 'company123' },
    { phone: '+998903333333', password: 'driver123' },
    { phone: '+998904444444', password: 'washer123' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE phone = $2',
      [hash, u.phone]
    );
    console.log(`Updated: ${u.phone} / ${u.password}`);
  }

  await client.end();
  console.log('Barcha parollar yangilandi!');
}

fix().catch(console.error);
