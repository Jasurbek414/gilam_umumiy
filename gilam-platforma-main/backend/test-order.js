/**
 * Test: Operator zakaz beradi → Driver bildirishnoma oladi
 */
const http = require('http');
const { Client } = require('pg');

const PORT = 4000;

function httpReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const r = http.request({ hostname: 'localhost', port: PORT, path, method, headers }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

(async () => {
  const db = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'gilam_saas' });
  await db.connect();

  // 1. Operator login
  console.log('\n1. Operator login...');
  const loginRes = await httpReq('POST', '/api/auth/login', { phone: '+998901234567', password: '123456' });
  if (!loginRes.body.access_token) { console.log('Login fail:', loginRes.body); await db.end(); return; }
  const token = loginRes.body.access_token;
  console.log('   OK! User:', loginRes.body.user?.fullName);

  // 2. Ma'lumotlar
  const customerRow = (await db.query("SELECT id, full_name FROM customers LIMIT 1")).rows[0];
  const driverRow = (await db.query("SELECT id, full_name, expo_push_token FROM users WHERE role='DRIVER' LIMIT 1")).rows[0];
  const serviceRow = (await db.query("SELECT id, name FROM services LIMIT 1")).rows[0];
  const companyId = '71f1b86d-79c1-4db3-9477-625f1b700b41';

  console.log('\n2. Ma\'lumotlar:');
  console.log('   Driver:', driverRow?.full_name, '| FCM:', driverRow?.expo_push_token?.substring(0, 15) + '...');
  console.log('   Mijoz:', customerRow?.full_name);
  console.log('   Xizmat:', serviceRow?.name);

  // 3. Zakaz yaratamiz (to'g'ri DTO bilan)
  console.log('\n3. Zakaz yaratamiz...');
  const orderRes = await httpReq('POST', '/api/orders', {
    customerId: customerRow.id,
    companyId: companyId,
    notes: 'Test zakaz — bildirishnoma tekshiruvi',
    items: [{ serviceId: serviceRow.id, quantity: 1 }],
  }, token);

  console.log('   Status:', orderRes.status);
  if (orderRes.status !== 201 && orderRes.status !== 200) {
    console.log('   Xato:', JSON.stringify(orderRes.body).substring(0, 200));
    await db.end();
    return;
  }
  const orderId = orderRes.body.id;
  console.log('   Zakaz ID:', orderId?.substring(0, 8), '✓');

  // 4. Haydovchiga tayinlaymiz
  console.log('\n4. Haydovchiga tayinlaymiz...');
  const assignRes = await httpReq('PATCH', `/api/orders/${orderId}/status`, {
    status: 'DRIVER_ASSIGNED',
    driverId: driverRow.id,
  }, token);

  console.log('   Status:', assignRes.status);
  if (assignRes.status !== 200) {
    console.log('   Xato:', JSON.stringify(assignRes.body).substring(0, 200));
  } else {
    console.log('   Tayinlash OK! ✓');
  }

  // 5. PM2 log tekshiramiz
  await new Promise(r => setTimeout(r, 3000));
  console.log('\n5. Backend push loglari...');
  const { execSync } = require('child_process');
  const logs = execSync('pm2 logs gilam-backend --out --lines 30 --nostream 2>&1', { encoding: 'utf8' });
  const rows = logs.split('\n').filter(l => l.includes('Push') || l.includes('push') || l.includes('FCM') || l.includes('Notification') || l.includes('notification') || l.includes('send'));
  if (rows.length) {
    console.log('   Loglar:');
    rows.forEach(r => console.log('  ', r.trim()));
  } else {
    console.log('   Push log topilmadi!');
    console.log('   (Backend log oxiri:)');
    logs.split('\n').slice(-5).forEach(l => console.log('  ', l));
  }

  await db.end();
  console.log('\nDone!');
})().catch(e => console.error('Error:', e.message));
