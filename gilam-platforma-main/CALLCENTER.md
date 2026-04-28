# Qo'ng'iroq Markazi (Call Center) - Arxitektura va Qo'llanma

## Umumiy Ko'rinish

```
Mijoz qo'ng'iroq qiladi
        ↓
Asterisk/FreeSWITCH (SIP server)
        ↓
POST /api/calls/webhook/incoming (callerPhone, calledPhone)
        ↓
Backend kampaniyani topadi (calledPhone bo'yicha)
        ↓
WebSocket orqali operator(lar)ga xabar yuboradi
        ↓
Operator browserda qo'ng'iroqni qabul qiladi yoki rad etadi
        ↓
Operator mijoz ma'lumotlarini to'ldiradi + haydovchi tayinlaydi
        ↓
Tizim buyurtma yaratadi va haydovchiga yuboradi
```

## Yangi Modullar (Backend)

### 1. Campaigns Module (`/api/campaigns`)
Kampaniya - bu alohida virtual telefon raqam va unga biriktirilgan operatorlar to'plami.

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | /campaigns | Barcha kampaniyalar (OPERATOR uchun - o'ziniki) |
| GET | /campaigns/:id | Bitta kampaniya |
| POST | /campaigns | Yangi kampaniya yaratish |
| PUT | /campaigns/:id | Kampaniyani tahrirlash |
| DELETE | /campaigns/:id | Kampaniyani o'chirish |

### 2. Calls Module (`/api/calls`)

| Metod | Endpoint | Tavsif | Auth |
|-------|----------|--------|------|
| POST | /calls/webhook/incoming | Asterisk webhookidan kiruvchi qo'ng'iroq | Yo'q (IP filter) |
| GET | /calls | Qo'ng'iroqlar ro'yxati | OPERATOR+ |
| GET | /calls/stats | Statistika | OPERATOR+ |
| POST | /calls/outgoing | Chiquvchi qo'ng'iroq yaratish | OPERATOR |
| PUT | /calls/:id/answer | Qo'ng'iroqqa javob berish | OPERATOR |
| PUT | /calls/:id/complete | Yakunlash (mijoz + haydovchi) | OPERATOR |
| PUT | /calls/:id/miss | Javobsiz deb belgilash | OPERATOR |

### 3. WebSocket Gateway (`/calls` namespace)

```javascript
// Operator ulanganda
socket.emit('operator:join', { operatorId, companyId })

// Kiruvchi qo'ng'iroq eventi
socket.on('call:incoming', (data) => {
  // { call, customer, campaign }
})

// Qo'ng'iroq yangilash eventi
socket.on('call:updated', (data) => {
  // { callId, status, operatorId?, driverId?, orderId? }
})
```

## Asterisk Konfiguratsiyasi

`extensions.conf` ga qo'shing:
```ini
[from-trunk]
; Kampaniya 1: +998712345678 raqamiga qo'ng'iroqlar
exten => +998712345678,1,NoOp(Incoming call to campaign 1)
 same => n,AGI(webhook.agi,+998712345678)  ; yoki curl webhook

; Webhook yuborish (curl orqali)
exten => _+998XXXXXXXXX,1,System(curl -X POST http://your-server/api/calls/webhook/incoming \
  -H "Content-Type: application/json" \
  -d '{"callerPhone":"${CALLERID(num)}","calledPhone":"${EXTEN}","sipCallId":"${UNIQUEID}"}')
```

## Ishga Tushirish

```bash
# 1. PostgreSQL ishga tushirish (Docker)
cd "D:/Gilam uchun/backend"
docker compose up -d

# 2. Backend ishga tushirish
npm run start:dev
# Backend: http://localhost:3000/api
# WebSocket: ws://localhost:3000/calls

# 3. Frontend ishga tushirish
cd "D:/Gilam uchun/frontend-app"
npm run dev
# Frontend: http://localhost:3001

# 4. Test qilish
cd "D:/Gilam uchun/backend"
node test-callcenter.js
```

## Foydalanuvchi Oqimi

### Company Admin:
1. `/company/campaigns` - kampaniyalar yaratish
2. Har bir kampaniyaga telefon raqam (DID) kiritish
3. Operatorlarni kampaniyaga biriktirish

### Operator:
1. `/operator/calls` - qo'ng'iroqlar markazi
2. WebSocket orqali real-time kiruvchi qo'ng'iroqlarni ko'rish
3. Qo'ng'iroqqa javob berish/rad etish
4. Qo'ng'iroq davomida:
   - Mijoz ma'lumotlarini to'ldirish (yangi mijoz bo'lsa)
   - Izohlar yozish
   - Haydovchi tayinlash
5. "Yakunlash va buyurtma yuborish" - tizim avtomatik buyurtma yaratadi

### Haydovchi:
- WebSocket orqali yangi buyurtma haqida xabar oladi
- `/driver` panelida buyurtma ko'rinadi

## Ma'lumotlar Modeli

```
Campaign:
  - id, companyId, name, phoneNumber, description, status
  - operators: User[] (ManyToMany)

Call:
  - id, companyId, campaignId, operatorId
  - customerId, orderId (qo'ng'iroq tugagandan so'ng to'ldiriladi)
  - callerPhone, calledPhone, direction, status
  - sipCallId (Asterisk unique ID)
  - notes, durationSeconds, recordingUrl
  - startedAt, answeredAt, endedAt
```
