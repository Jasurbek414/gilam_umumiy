const net = require('net');
const s = new net.Socket();
s.setTimeout(2500);
s.on('connect', () => { console.log('✅ TCP 5060 OPEN'); process.exit(0); });
s.on('error', (e) => { console.log('❌ TCP 5060 CLOSED: ' + e.message); process.exit(1); });
s.on('timeout', () => { console.log('❌ TCP 5060 TIMEOUT'); process.exit(1); });
s.connect(5060, '10.100.100.1');
