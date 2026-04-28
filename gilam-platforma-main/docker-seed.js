const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const client = new Client({
    host: 'db',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'gilam_saas',
  });

  await client.connect();
  console.log('Bazaga ulandi');

  try {
    const companyId = uuidv4();
    await client.query(
      `INSERT INTO companies (id, name, phone_number, status, created_at, updated_at) VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [companyId, 'Pokiza MChJ', '+998712000001']
    );
    console.log('Kompaniya: Pokiza MChJ');

    const company2Id = uuidv4();
    await client.query(
      `INSERT INTO companies (id, name, phone_number, status, created_at, updated_at) VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [company2Id, 'Yulduz Gilam', '+998712000002']
    );
    console.log('Kompaniya: Yulduz Gilam');

    const salt = await bcrypt.genSalt(10);

    const adminHash = await bcrypt.hash('admin123', salt);
    const adminId = uuidv4();
    await client.query(
      `INSERT INTO users (id, role, full_name, phone, password_hash, status, created_at, updated_at) VALUES ($1, 'SUPER_ADMIN', $2, $3, $4, 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [adminId, 'Super Admin', '+998901234567', adminHash]
    );
    console.log('SUPER_ADMIN: +998901234567 / admin123');

    const operatorHash = await bcrypt.hash('operator123', salt);
    const operatorId = uuidv4();
    await client.query(
      `INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at) VALUES ($1, $2, 'OPERATOR', $3, $4, $5, 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [operatorId, companyId, 'Zilola Operatova', '+998901111111', operatorHash]
    );
    console.log('OPERATOR: +998901111111 / operator123');

    const compAdminHash = await bcrypt.hash('company123', salt);
    const compAdminId = uuidv4();
    await client.query(
      `INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at) VALUES ($1, $2, 'COMPANY_ADMIN', $3, $4, $5, 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [compAdminId, companyId, 'Sardor Kompaniyev', '+998902222222', compAdminHash]
    );
    console.log('COMPANY_ADMIN: +998902222222 / company123');

    const driverHash = await bcrypt.hash('driver123', salt);
    const driverId = uuidv4();
    await client.query(
      `INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at) VALUES ($1, $2, 'DRIVER', $3, $4, $5, 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [driverId, companyId, 'Botir Haydovchiev', '+998903333333', driverHash]
    );
    console.log('DRIVER: +998903333333 / driver123');

    const washerHash = await bcrypt.hash('washer123', salt);
    const washerId = uuidv4();
    await client.query(
      `INSERT INTO users (id, company_id, role, full_name, phone, password_hash, status, created_at, updated_at) VALUES ($1, $2, 'WASHER', $3, $4, $5, 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [washerId, companyId, 'Anvar Yuvuvchiev', '+998904444444', washerHash]
    );
    console.log('WASHER: +998904444444 / washer123');

    // Services
    const services = [
      { name: 'Oddiy gilam', unit: 'SQM', price: 12000 },
      { name: 'Qubbali gilam', unit: 'SQM', price: 14000 },
      { name: 'Shaggi gilam', unit: 'SQM', price: 17000 },
      { name: 'Korpacha yuvish', unit: 'PIECE', price: 25000 },
      { name: 'Parda yuvish', unit: 'KG', price: 25000 },
    ];
    for (const svc of services) {
      await client.query(
        `INSERT INTO services (id, company_id, name, measurement_unit, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [uuidv4(), companyId, svc.name, svc.unit, svc.price]
      );
    }
    console.log(services.length + ' ta xizmat yaratildi');

    // Campaign
    const campaignId = uuidv4();
    await client.query(
      `INSERT INTO campaigns (id, company_id, name, phone_number, extra_numbers, description, status, driver_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'ACTIVE', $7, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [campaignId, companyId, 'Asosiy liniya', '+998712345678', '[]', 'Toshkent boyicha', driverId]
    );
    console.log('Kampaniya yaratildi');

    await client.query(
      `INSERT INTO campaign_operators (campaign_id, operator_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [campaignId, operatorId]
    );
    console.log('Operator kampaniyaga ulandi');

    // Customers
    const customers = [
      { name: 'Aliyev Vali', phone1: '+998901112233', address: 'Chilonzor 7-kvartal' },
      { name: 'Rahimova Nilufar', phone1: '+998933334455', address: 'Yunusobod 4-kvartal' },
      { name: 'Karimov Sardor', phone1: '+998945556677', address: 'Sergeli 3-kvartal' },
    ];
    for (const cust of customers) {
      await client.query(
        `INSERT INTO customers (id, company_id, full_name, phone_1, address, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [uuidv4(), companyId, cust.name, cust.phone1, cust.address]
      );
    }
    console.log(customers.length + ' ta mijoz yaratildi');

    console.log('SEED MUVAFFAQIYATLI YAKUNLANDI!');
  } catch (error) {
    console.error('Xatolik:', error.message);
  } finally {
    await client.end();
  }
}
seed();
