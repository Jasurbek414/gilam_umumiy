/**
 * SEED SCRIPT — Boshlang'ich ma'lumotlar
 * 
 * Algoritm:
 * 1. Super Admin yaratish
 * 2. Demo kompaniya yaratish
 * 3. Kompaniya xodimlari (operator, haydovchi, yuvuvchi)
 * 4. Xizmat turlari yaratish (aniq narxlar bilan)
 * 5. Test mijozlar qo'shish
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'gilam_saas',
  });

  await client.connect();
  console.log('✅ Bazaga ulandi');

  try {
    // ===== 1. KOMPANIYA YARATISH =====
    const companyId = uuidv4();
    await client.query(`
      INSERT INTO companies (id, name, phone_number, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [companyId, '"Pokiza" MChJ', '+998 71 200 00 01']);
    console.log('✅ Kompaniya yaratildi: "Pokiza" MChJ');

    const company2Id = uuidv4();
    await client.query(`
      INSERT INTO companies (id, name, phone_number, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [company2Id, 'Yulduz Gilam', '+998 71 200 00 02']);
    console.log('✅ Kompaniya yaratildi: Yulduz Gilam');

    // ===== 2. FOYDALANUVCHILAR YARATISH =====
    const salt = await bcrypt.genSalt(10);

    // Super Admin
    const adminId = uuidv4();
    const adminHash = await bcrypt.hash('admin123', salt);
    await client.query(`
      INSERT INTO users (id, role, full_name, phone, password_hash, status, created_at, updated_at)
      VALUES ($1, 'SUPER_ADMIN', $2, $3, $4, 'ACTIVE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [adminId, 'Super Admin', '+998901234567', adminHash]);
    console.log('✅ Super Admin yaratildi — tel: +998901234567 / parol: admin123');

    // Operator (Pokiza)
    const operatorId = uuidv4();
    const operatorHash = await bcrypt.hash('operator123', salt);
    await client.query(`
      INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at)
      VALUES ($1, $2, 'OPERATOR', $3, $4, $5, 'ACTIVE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [operatorId, companyId, 'Zilola Operatova', '+998901111111', operatorHash]);
    console.log('✅ Operator yaratildi — tel: +998901111111 / parol: operator123');

    // Company Admin (Pokiza)
    const compAdminId = uuidv4();
    const compAdminHash = await bcrypt.hash('company123', salt);
    await client.query(`
      INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at)
      VALUES ($1, $2, 'COMPANY_ADMIN', $3, $4, $5, 'ACTIVE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [compAdminId, companyId, 'Sardor Kompaniyev', '+998902222222', compAdminHash]);
    console.log('✅ Kompaniya Admin yaratildi — tel: +998902222222 / parol: company123');

    // Haydovchi (Pokiza)
    const driverId = uuidv4();
    const driverHash = await bcrypt.hash('driver123', salt);
    await client.query(`
      INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at)
      VALUES ($1, $2, 'DRIVER', $3, $4, $5, 'ACTIVE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [driverId, companyId, 'Botir Haydovchiev', '+998903333333', driverHash]);
    console.log('✅ Haydovchi yaratildi — tel: +998903333333 / parol: driver123');

    // Yuvuvchi (Pokiza)
    const washerId = uuidv4();
    const washerHash = await bcrypt.hash('washer123', salt);
    await client.query(`
      INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at)
      VALUES ($1, $2, 'WASHER', $3, $4, $5, 'ACTIVE', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [washerId, companyId, 'Anvar Yuvuvchiev', '+998904444444', washerHash]);
    console.log('✅ Yuvuvchi yaratildi — tel: +998904444444 / parol: washer123');

    // ===== 3. XIZMAT TURLARI (narxlar bilan) =====
    const services = [
      { name: 'Oddiy gilam', unit: 'SQM', price: 12000 },
      { name: 'Qubbali gilam', unit: 'SQM', price: 14000 },
      { name: 'Rayhon gilam', unit: 'SQM', price: 15000 },
      { name: 'Hukmdor / Sheyx / Troya', unit: 'SQM', price: 16000 },
      { name: 'Shaggi / Makaron gilam', unit: 'SQM', price: 17000 },
      { name: 'Xitoy / Turkiya nozik', unit: 'SQM', price: 18000 },
      { name: 'Polos / Daroshka', unit: 'METER', price: 10000 },
      { name: "Ko'rpacha yuvish", unit: 'PIECE', price: 25000 },
      { name: 'Odeyal yuvish', unit: 'PIECE', price: 50000 },
      { name: "Ko'rpa yuvish", unit: 'PIECE', price: 40000 },
      { name: 'Parda yuvish', unit: 'KG', price: 25000 },
      { name: 'Yumshoq mebel yuvish', unit: 'PIECE', price: 50000 },
      { name: 'Matras yuvish', unit: 'PIECE', price: 80000 },
      { name: 'Dazmollash', unit: 'METER', price: 5000 },
    ];

    for (const svc of services) {
      await client.query(`
        INSERT INTO services (id, company_id, name, measurement_unit, price, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [uuidv4(), companyId, svc.name, svc.unit, svc.price]);
    }
    console.log(`✅ ${services.length} ta xizmat turi yaratildi (Pokiza uchun)`);

    // Yulduz Gilam uchun ham xizmatlar
    for (const svc of services.slice(0, 6)) {
      await client.query(`
        INSERT INTO services (id, company_id, name, measurement_unit, price, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [uuidv4(), company2Id, svc.name, svc.unit, svc.price + 1000]);
    }
    console.log('✅ 6 ta xizmat turi yaratildi (Yulduz Gilam uchun)');

    // ===== 3b. KAMPANIYALAR YARATISH =====
    // Pokiza uchun asosiy kampaniya
    const campaignId = uuidv4();
    await client.query(`
      INSERT INTO campaigns (id, company_id, name, phone_number, extra_numbers, description, status, driver_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'ACTIVE', $7, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [campaignId, companyId, 'Asosiy qo\'ng\'iroq liniyasi', '+998712345678', '[]', 'Toshkent shahri bo\'yicha asosiy kampaniya', driverId]);
    console.log('✅ Kampaniya yaratildi: "Asosiy qo\'ng\'iroq liniyasi"');

    // Pokiza uchun 2-kampaniya
    const campaign2Id = uuidv4();
    await client.query(`
      INSERT INTO campaigns (id, company_id, name, phone_number, extra_numbers, description, status, driver_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'ACTIVE', $7, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [campaign2Id, companyId, 'Chilonzor filiali', '+998711112233', '[]', 'Chilonzor tumani uchun kampaniya', driverId]);
    console.log('✅ Kampaniya yaratildi: "Chilonzor filiali"');

    // Kampaniyaga operator ulash
    await client.query(`
      INSERT INTO campaign_operators (campaign_id, operator_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [campaignId, operatorId]);
    await client.query(`
      INSERT INTO campaign_operators (campaign_id, operator_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [campaign2Id, operatorId]);
    console.log('✅ Operatorlar kampaniyalarga ulandi');

    // ===== 4. TEST MIJOZLAR =====
    const customers = [
      { name: 'Aliyev Vali', phone1: '+998901112233', address: 'Toshkent sh., Chilonzor tumani, 7-kvartal, 15-uy' },
      { name: 'Rahimova Nilufar', phone1: '+998933334455', address: 'Toshkent sh., Yunusobod tumani, 4-kvartal, 8-uy' },
      { name: 'Karimov Sardor', phone1: '+998945556677', address: 'Toshkent sh., Sergeli tumani, 3-kvartal, 22-uy' },
      { name: 'Ergasheva Madina', phone1: '+998977778899', address: 'Toshkent sh., Yakkasaroy tumani, Bobur ko\'chasi, 5-uy' },
      { name: 'Botir Usmonov', phone1: '+998909990011', address: 'Toshkent sh., Mirzo Ulug\'bek tumani, Buyuk Ipak Yoli, 44' },
    ];

    for (const cust of customers) {
      await client.query(`
        INSERT INTO customers (id, company_id, full_name, phone_1, address, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [uuidv4(), companyId, cust.name, cust.phone1, cust.address]);
    }
    console.log(`✅ ${customers.length} ta test mijoz yaratildi`);

    console.log('\n========================================');
    console.log('  SEED MUVAFFAQIYATLI YAKUNLANDI!');
    console.log('========================================');
    console.log('\n📋 LOGIN MA\'LUMOTLARI:');
    console.log('┌──────────────────┬─────────────────┬──────────────┐');
    console.log('│ ROLE             │ TELEFON         │ PAROL        │');
    console.log('├──────────────────┼─────────────────┼──────────────┤');
    console.log('│ SUPER_ADMIN      │ +998901234567   │ admin123     │');
    console.log('│ OPERATOR         │ +998901111111   │ operator123  │');
    console.log('│ COMPANY_ADMIN    │ +998902222222   │ company123   │');
    console.log('│ DRIVER           │ +998903333333   │ driver123    │');
    console.log('│ WASHER           │ +998904444444   │ washer123    │');
    console.log('└──────────────────┴─────────────────┴──────────────┘');

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  } finally {
    await client.end();
  }
}

seed();
