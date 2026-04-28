/**
 * Backend ichidagi bcrypt bilan AYNAN bir xil hash yaratamiz
 */
const path = require('path');
// Backend's own bcrypt
const bcrypt = require('./node_modules/bcrypt');
const { Client } = require('./node_modules/pg');

(async () => {
  const client = new Client({
    host: 'localhost', port: 5432,
    user: 'postgres', password: 'postgres', database: 'gilam_saas'
  });
  await client.connect();

  // Backend bcrypt bilan hash yarat
  const newHash = await bcrypt.hash('123456', 10);
  console.log('Backend bcrypt hash:', newHash.substring(0, 20) + '...');
  
  const verify = await bcrypt.compare('123456', newHash);
  console.log('Verify:', verify);

  // Barcha userlarni yangilaymiz
  const r = await client.query('UPDATE users SET password_hash=$1 RETURNING full_name, phone', [newHash]);
  console.log('Yangilandi:', r.rows.map(u => u.full_name).join(', '));
  
  // DB dan qayta tekshiramiz
  const r2 = await client.query("SELECT password_hash FROM users WHERE phone='+998900504202'");
  const dbHash = r2.rows[0].password_hash;
  const ok = await bcrypt.compare('123456', dbHash);
  console.log('DB dan verify:', ok);

  await client.end();
  console.log('Done! PM2 restart kerak emas (DB yangilandi)');
})().catch(e => console.error(e.message));
