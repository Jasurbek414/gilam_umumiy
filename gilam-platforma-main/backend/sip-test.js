// Quick SIP REGISTER test — run with: node sip-test.js
const dgram = require('dgram');
const crypto = require('crypto');
const os = require('os');

const SIP_SERVER = '10.100.100.1';
const SIP_PORT = 5060;
const LOCAL_PORT = 55061; // Different port to avoid conflict
const EXTENSION = '101';
const PASSWORD = 'a1234567a';

// Find WireGuard IP
function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] || []) {
      if (!addr.internal && addr.family === 'IPv4' && addr.address.startsWith('10.100.100.'))
        return addr.address;
    }
  }
  return '10.100.100.70';
}

const LOCAL_IP = getLocalIp();
console.log(`Local IP: ${LOCAL_IP}`);
console.log(`SIP Server: ${SIP_SERVER}:${SIP_PORT}`);
console.log(`Extension: ${EXTENSION}`);

const socket = dgram.createSocket('udp4');
const callId = Math.random().toString(36).substring(5) + '@test';
const fromTag = Math.random().toString(36).substring(5);
const branch = 'z9hG4bK-' + Math.random().toString(36).substring(5);

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function buildRegister(withAuth, challengeMsg) {
  const lines = [
    `REGISTER sip:${SIP_SERVER} SIP/2.0`,
    `Via: SIP/2.0/UDP ${LOCAL_IP}:${LOCAL_PORT};branch=${branch};rport`,
    `From: <sip:${EXTENSION}@${SIP_SERVER}>;tag=${fromTag}`,
    `To: <sip:${EXTENSION}@${SIP_SERVER}>`,
    `Call-ID: ${callId}`,
    `CSeq: 1 REGISTER`,
    `Contact: <sip:${EXTENSION}@${LOCAL_IP}:${LOCAL_PORT}>`,
    'Max-Forwards: 70',
    'Expires: 3600',
    'Allow: INVITE, ACK, CANCEL, OPTIONS, BYE',
    'User-Agent: SipTest/1.0',
    'Content-Length: 0',
  ];

  if (withAuth && challengeMsg) {
    const realm = challengeMsg.match(/realm="([^"]+)"/)?.[1] || SIP_SERVER;
    const nonce = challengeMsg.match(/nonce="([^"]+)"/)?.[1] || '';
    const ha1 = md5(`${EXTENSION}:${realm}:${PASSWORD}`);
    const ha2 = md5(`REGISTER:sip:${SIP_SERVER}`);
    const resp = md5(`${ha1}:${nonce}:${ha2}`);
    lines.push(`Authorization: Digest username="${EXTENSION}", realm="${realm}", nonce="${nonce}", uri="sip:${SIP_SERVER}", response="${resp}", algorithm=MD5`);
  }

  lines.push('', '');
  return lines.join('\r\n');
}

socket.on('message', (msg) => {
  const text = msg.toString('utf8');
  const firstLine = text.split('\n')[0].trim();
  console.log('\n=== SIP RESPONSE ===');
  console.log('First line:', firstLine);
  
  if (text.includes('SIP/2.0 200 OK')) {
    console.log('✅ REGISTER SUCCESS! SIP is working!');
    process.exit(0);
  }
  
  if (text.includes('SIP/2.0 401') || text.includes('SIP/2.0 407')) {
    console.log('🔑 Auth required — sending credentials...');
    const authMsg = buildRegister(true, text);
    const buf = Buffer.from(authMsg);
    socket.send(buf, 0, buf.length, SIP_PORT, SIP_SERVER, (err) => {
      if (err) console.error('Send error:', err);
      else console.log('Auth REGISTER sent!');
    });
  }
});

socket.on('error', (err) => {
  console.error('UDP Error:', err.message);
});

socket.bind(LOCAL_PORT, '0.0.0.0', () => {
  console.log(`UDP bound on ${LOCAL_PORT}`);
  console.log('Sending REGISTER...');
  
  const msg = buildRegister(false, '');
  const buf = Buffer.from(msg);
  socket.send(buf, 0, buf.length, SIP_PORT, SIP_SERVER, (err) => {
    if (err) console.error('Send error:', err);
    else console.log('REGISTER sent! Waiting for response...');
  });
});

// Timeout after 10s
setTimeout(() => {
  console.log('\n❌ No response from SIP server after 10s');
  console.log('Possible reasons:');
  console.log('  1. Windows Firewall blocking inbound UDP on this port');
  console.log('  2. Asterisk not listening on 5060 UDP');
  console.log('  3. WireGuard tunnel not routing properly');
  console.log('  4. SIP extension 101 not configured on Asterisk');
  process.exit(1);
}, 10000);
