const http = require('http');
const PORT = 4000;
const DRIVER_ID = 'c39f49a3-01e2-48ec-b63e-c9eb637d7cf1';
const COMPANY_ID = '71f1b86d-79c1-4db3-9477-625f1b700b41';

function req(method, path, body, ct, cb) {
  const r = http.request({
    hostname: 'localhost', port: PORT, path, method,
    headers: body ? { 'Content-Type': ct || 'text/plain', 'Content-Length': Buffer.byteLength(body) } : {}
  }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => cb && cb(d)); });
  r.on('error', e => console.error('err:', e.message));
  if (body) r.write(body);
  r.end();
}

// 1. Login
req('POST', '/api/auth/login', JSON.stringify({ phone: '+998900504202', password: '123456' }), 'application/json', (resp) => {
  const j = JSON.parse(resp);
  if (!j.access_token) { console.log('Login xato:', resp.substring(0, 100)); return; }
  console.log('LOGIN OK! User:', j.user && j.user.fullName);
  testChat(j.access_token);
});

function testChat(token) {
  // 2. Socket.IO session
  req('GET', '/socket.io/chat/?EIO=4&transport=polling&token=' + token, null, null, (d) => {
    const m = /"sid":"([^"]+)"/.exec(d);
    if (!m) { console.log('SID topilmadi:', d.substring(0, 80)); return; }
    const sid = m[1];
    console.log('Socket OK, SID:', sid.substring(0, 10) + '...');
    const p = '/socket.io/chat/?EIO=4&transport=polling&sid=' + sid;

    // 3. Namespace connect
    req('POST', p, '40', 'text/plain', () => {
      setTimeout(() => {
        req('GET', p, null, null, () => {
          // 4. Xabar yuborish
          const msg = '42' + JSON.stringify(['sendMessage', {
            recipientId: DRIVER_ID,
            text: 'Operator test xabari',
            companyId: COMPANY_ID
          }]);
          req('POST', p, msg, 'text/plain', () => {
            console.log('Chat xabar yuborildi!');
            setTimeout(() => {
              req('GET', p, null, null, (r) => {
                console.log('Javob:', r.substring(0, 200));
                console.log('📱 Sardor telefoni offline bolsa bildirishnoma kelishi kerak!');
              });
            }, 2000);
          });
        });
      }, 500);
    });
  });
}
