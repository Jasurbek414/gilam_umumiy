// Test multiple SIP ports
const dgram = require('dgram');
const os = require('os');

const SIP_SERVER = '10.100.100.1';
const PORTS_TO_TEST = [5060, 5061, 5160, 5161, 5068, 5080];

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
console.log(`Testing ports: ${PORTS_TO_TEST.join(', ')}\n`);

let localPort = 55100;
let responded = new Set();

PORTS_TO_TEST.forEach((port) => {
  const socket = dgram.createSocket('udp4');
  const lp = localPort++;
  
  const msg = [
    `OPTIONS sip:${SIP_SERVER}:${port} SIP/2.0`,
    `Via: SIP/2.0/UDP ${LOCAL_IP}:${lp};branch=z9hG4bK-test-${port};rport`,
    `From: <sip:test@${LOCAL_IP}>;tag=test${port}`,
    `To: <sip:${SIP_SERVER}:${port}>`,
    `Call-ID: test-${port}@${LOCAL_IP}`,
    `CSeq: 1 OPTIONS`,
    `Contact: <sip:test@${LOCAL_IP}:${lp}>`,
    'Max-Forwards: 70',
    'Content-Length: 0',
    '', ''
  ].join('\r\n');
  
  socket.on('message', (data) => {
    const firstLine = data.toString().split('\n')[0].trim();
    responded.add(port);
    console.log(`✅ Port ${port} RESPONDED: ${firstLine}`);
    socket.close();
  });
  
  socket.on('error', (err) => {
    console.log(`❌ Port ${port} error: ${err.message}`);
  });
  
  socket.bind(lp, '0.0.0.0', () => {
    const buf = Buffer.from(msg);
    socket.send(buf, 0, buf.length, port, SIP_SERVER, (err) => {
      if (err) console.log(`❌ Port ${port} send error: ${err.message}`);
      else console.log(`📡 Sent OPTIONS to ${SIP_SERVER}:${port}`);
    });
  });
});

setTimeout(() => {
  console.log(`\n=== RESULTS ===`);
  PORTS_TO_TEST.forEach(p => {
    if (responded.has(p)) console.log(`  ✅ ${p} — SIP active`);
    else console.log(`  ❌ ${p} — no response`);
  });
  
  if (responded.size === 0) {
    console.log('\n⚠️ No SIP ports responded!');
    console.log('The Asterisk server may not have SIP enabled on UDP,');
    console.log('or the WireGuard tunnel only allows specific ports.');
    console.log('\nTry checking on the Asterisk server:');
    console.log('  ss -ulnp | grep -E "5060|5061|5160"');
    console.log('  asterisk -rx "sip show settings" | head -20');
    console.log('  asterisk -rx "pjsip show transports"');
  }
  
  process.exit(0);
}, 8000);
