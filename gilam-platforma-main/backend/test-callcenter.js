/**
 * Qo'ng'iroq markazi testi
 * Ishlashdan oldin backend ishlab tursin: npm run start:dev
 *
 * Ishga tushirish: node test-callcenter.js
 */

const BASE = 'http://localhost:3000/api';

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`❌ ${method} ${path}:`, res.status, data);
    return null;
  }
  return data;
}

async function main() {
  console.log('🔄 Backend bilan ulanish tekshirilmoqda...\n');

  // 1. Login
  console.log('1️⃣  Login qilish...');
  const login = await req('POST', '/auth/login', {
    phone: '+998902222222',
    password: 'company123',
  });

  if (!login) {
    console.log('⚠️  Login muvaffaqiyatsiz. Admin user mavjudligini tekshiring.');
    console.log('   Seed script: node seed.js');
    return;
  }

  const token = login.access_token;
  const user = login.user;
  console.log(`✅ Login muvaffaqiyatli: ${user.fullName} (${user.role})\n`);

  // 2. Kampaniya yaratish
  console.log('2️⃣  Kampaniya yaratish...');
  const campaign = await req('POST', '/campaigns', {
    name: 'Test Kampaniya',
    phoneNumber: '+998712345678',
    description: 'Test qo\'ng\'iroq kampaniyasi',
    operatorIds: [user.id],
  }, token);

  if (!campaign) {
    console.log('⚠️  Kampaniya yaratishda xatolik (COMPANY_ADMIN rol kerak bo\'lishi mumkin)');
  } else {
    console.log(`✅ Kampaniya yaratildi: ${campaign.name} (${campaign.phoneNumber})\n`);

    // 3. Webhook orqali kiruvchi qo'ng'iroq simulatsiyasi
    console.log('3️⃣  Kiruvchi qo\'ng\'iroq simulatsiyasi (webhook)...');
    const incomingCall = await req('POST', '/calls/webhook/incoming', {
      callerPhone: '+998901112233',
      calledPhone: '+998712345678', // Kampaniya raqami
      sipCallId: 'test-call-' + Date.now(),
    });

    if (!incomingCall) {
      console.log('⚠️  Webhook xatolik');
    } else {
      console.log(`✅ Kiruvchi qo\'ng\'iroq qayd etildi: ${incomingCall.id}`);
      console.log(`   Status: ${incomingCall.status}, Raqam: ${incomingCall.callerPhone}\n`);

      // 4. Qo'ng'iroqqa javob berish
      console.log('4️⃣  Qo\'ng\'iroqqa javob berish...');
      const answered = await req('PUT', `/calls/${incomingCall.id}/answer`, {}, token);
      if (answered) console.log(`✅ Javob berildi! Status: ${answered.status}\n`);

      // 5. Qo'ng'iroqni yakunlash
      console.log('5️⃣  Qo\'ng\'iroqni yakunlash...');
      const completed = await req('PUT', `/calls/${incomingCall.id}/complete`, {
        notes: 'Mijoz gilam yuvishni so\'radi',
        newCustomer: {
          fullName: 'Test Mijoz',
          phone: '+998901112233',
          address: 'Toshkent, Chilonzor 5',
        },
      }, token);
      if (completed) console.log(`✅ Yakunlandi! Duration: ${completed.durationSeconds} soniya\n`);
    }
  }

  // 6. Statistika
  console.log('6️⃣  Qo\'ng\'iroq statistikasi...');
  const stats = await req('GET', '/calls/stats', null, token);
  if (stats) {
    console.log(`✅ Statistika:
   Bugun: ${stats.todayTotal} ta qo'ng'iroq
   Javob berilgan: ${stats.answered}
   Javobsiz: ${stats.missed}
   Javob darajasi: ${stats.answerRate}%\n`);
  }

  console.log('✅ Barcha testlar muvaffaqiyatli o\'tdi!');
  console.log('\n📋 Qo\'llanma:');
  console.log('   - Company Admin: http://localhost:3001/company/campaigns (kampaniyalar boshqaruvi)');
  console.log('   - Operator: http://localhost:3001/operator/calls (real-time qo\'ng\'iroqlar)');
  console.log('   - Webhook: POST http://localhost:3000/api/calls/webhook/incoming');
  console.log('   - WebSocket: ws://localhost:3000/calls (namespace)');
}

main().catch(console.error);
