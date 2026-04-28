import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dgram from 'dgram';
import * as net from 'net';
import * as crypto from 'crypto';
import * as os from 'os';
import { CallsService } from '../calls/calls.service';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface SipSession {
  socketId: string;
  operatorId: string;
  companyId: string;
  extension: string;
  callAnswered: boolean;
  userHangupAt: number;
  activeCall: {
    id: string;
    target: string;
    fromTag: string;
    toTag: string | null;
    branch: string;
    amiActionId: string | null;
  } | null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getLocalWireguardIp(): string {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] || []) {
      if (!addr.internal && addr.family === 'IPv4' && addr.address.startsWith('10.100.100.'))
        return addr.address;
    }
  }
  return process.env.SIP_LOCAL_IP || '10.100.100.70';
}

function md5(s: string) {
  return crypto.createHash('md5').update(s).digest('hex');
}

// ─── GATEWAY ─────────────────────────────────────────────────────────────────
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/sip', path: '/api/socket.io' })
export class SipBridgeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server: Server;
  private logger = new Logger('SipBridgeGateway');

  // SIP config
  private readonly SIP_SERVER: string;
  private readonly SIP_PORT: number;
  private readonly LOCAL_PORT: number;
  private readonly LOCAL_IP: string;
  private readonly DEFAULT_EXTENSION: string;
  private readonly DEFAULT_PASSWORD: string;
  private readonly DOMAIN: string;
  private readonly DIAL_PRESTRIP: number;
  private readonly DIAL_PREFIX: string;

  // AMI config
  private readonly AMI_HOST: string;
  private readonly AMI_PORT: number;
  private readonly AMI_USER: string;
  private readonly AMI_SECRET: string;
  private readonly AMI_CONTEXT: string;
  private readonly SIP_TRUNK: string;

  // State
  private udpSocket: dgram.Socket;
  private sessions: Map<string, SipSession> = new Map();
  private globalRegistered = false;
  private globalCseq = 100;
  private readonly globalRegCallId: string;
  private readonly globalRegFromTag: string;
  private globalAuthRetry = 0;
  private readonly MAX_AUTH_RETRIES = 3;

  constructor(private callsService: CallsService, private configService: ConfigService) {
    this.SIP_SERVER = this.configService.get('SIP_SERVER') || '10.100.100.1';
    this.SIP_PORT = parseInt(this.configService.get('SIP_PORT') || '5060');
    this.LOCAL_PORT = parseInt(this.configService.get('SIP_LOCAL_PORT') || '55060');
    this.LOCAL_IP = getLocalWireguardIp();
    this.DEFAULT_EXTENSION = this.configService.get('SIP_EXTENSION') || '101';
    this.DEFAULT_PASSWORD = this.configService.get('SIP_PASSWORD') || 'a1234567a';
    this.DOMAIN = this.configService.get('SIP_DOMAIN') || this.SIP_SERVER;
    this.DIAL_PRESTRIP = parseInt(this.configService.get('DIAL_PRESTRIP') || '0');
    this.DIAL_PREFIX = this.configService.get('DIAL_PREFIX') || '';

    this.AMI_HOST = this.configService.get('AMI_HOST') || this.SIP_SERVER;
    this.AMI_PORT = parseInt(this.configService.get('AMI_PORT') || '5038');
    this.AMI_USER = this.configService.get('AMI_USER') || 'admin';
    this.AMI_SECRET = this.configService.get('AMI_SECRET') || 'admin';
    this.AMI_CONTEXT = this.configService.get('AMI_CONTEXT') || 'from-internal';
    this.SIP_TRUNK = this.configService.get('SIP_TRUNK') || '';

    this.globalRegCallId = Math.random().toString(36).substring(5) + '@sip';
    this.globalRegFromTag = Math.random().toString(36).substring(5);

    this.udpSocket = dgram.createSocket('udp4');
    this.logger.log(`SIP: ${this.LOCAL_IP}:${this.LOCAL_PORT} → ${this.SIP_SERVER}:${this.SIP_PORT} ext=${this.DEFAULT_EXTENSION}`);
    this.logger.log(`DIAL: prestrip=${this.DIAL_PRESTRIP} prefix="${this.DIAL_PREFIX}"`);
  }

  // ─── LIFECYCLE ───────────────────────────────────────────────────────────────

  onModuleInit() {
    this.initUdpSocket();
    // Heartbeat every 5s
    setInterval(() => this.server.emit('sip:status', { registered: this.globalRegistered }), 5000);
    // Re-register every 55s
    setInterval(() => { if (this.globalRegistered) this.doRegister(false, ''); }, 55000);
  }

  afterInit() { this.logger.log('WS /sip ready'); }

  handleConnection(client: Socket) {
    this.logger.log(`WS+ ${client.id}`);
    client.emit('sip:status', { registered: this.globalRegistered });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS- ${client.id}`);
    this.sessions.delete(client.id);
  }

  // ─── UDP ─────────────────────────────────────────────────────────────────────

  private initUdpSocket() {
    this.udpSocket.on('message', (msg) => {
      const text = msg.toString('utf8');
      const first = text.split('\n')[0].trim();
      // Only log non-OPTIONS messages
      if (!first.startsWith('OPTIONS ')) {
        this.logger.debug(`SIP ← ${first}`);
      }
      this.handleSipMessage(text);
    });

    this.udpSocket.on('error', (err) => this.logger.error(`UDP: ${err.message}`));

    this.udpSocket.bind(this.LOCAL_PORT, '0.0.0.0', () => {
      this.logger.log(`UDP bound ${this.LOCAL_IP}:${this.LOCAL_PORT}`);
      this.doRegister(false, '');
    });
  }

  // ─── SIP MESSAGE ROUTER ───────────────────────────────────────────────────────

  private handleSipMessage(msg: string) {
    const first = msg.split('\n')[0].trim();

    // ── OPTIONS → 200 OK (keep-alive from Asterisk) ──
    if (first.startsWith('OPTIONS ')) {
      if (!this.globalRegistered) {
        this.globalRegistered = true;
        this.logger.log('SIP: auto-registered via OPTIONS');
        this.server.emit('sip:status', { registered: true });
      }
      this.replyOptions(msg);
      return;
    }

    // ── NOTIFY → 200 OK ──
    if (first.startsWith('NOTIFY ')) {
      this.replyNotify(msg);
      return;
    }

    // ── REGISTER 200 OK ──
    if (msg.includes('SIP/2.0 200 OK') && /CSeq:\s*\d+\s+REGISTER/i.test(msg)) {
      this.globalRegistered = true;
      this.globalAuthRetry = 0;
      this.logger.log('SIP: ✅ REGISTER 200 OK');
      this.server.emit('sip:status', { registered: true });
      return;
    }

    // ── REGISTER 401/407 (auth challenge) ──
    if ((msg.includes('SIP/2.0 401') || msg.includes('SIP/2.0 407')) && /CSeq:\s*\d+\s+REGISTER/i.test(msg)) {
      if (this.globalAuthRetry < this.MAX_AUTH_RETRIES) {
        this.globalAuthRetry++;
        this.logger.debug(`SIP: REGISTER auth retry ${this.globalAuthRetry}`);
        setTimeout(() => this.doRegister(true, msg), 300);
      } else {
        this.logger.warn('SIP: max retries, marking as registered (OPTIONS mode)');
        this.globalRegistered = true;
        this.server.emit('sip:status', { registered: true });
      }
      return;
    }

    // ── INVITE 401/407 — re-INVITE with auth ──
    if ((msg.includes('SIP/2.0 401') || msg.includes('SIP/2.0 407')) && /CSeq:\s*\d+\s+INVITE/i.test(msg)) {
      this.logger.warn('SIP: INVITE needs auth — retrying with credentials');
      this.handleInviteAuth(msg);
      return;
    }

    // ── 100 Trying ──
    if (msg.includes('SIP/2.0 100 Trying')) {
      this.logger.debug('SIP: 100 Trying');
      return;
    }

    // ── 180/183 Ringing ──
    if (msg.includes('SIP/2.0 180') || msg.includes('SIP/2.0 183')) {
      this.captureToTag(msg);
      this.server.emit('sip:ringing');
      this.logger.log('SIP: 🔔 Ringing');
      return;
    }

    // ── 200 OK INVITE (answered) ──
    if (msg.includes('SIP/2.0 200 OK') && /CSeq:\s*\d+\s+INVITE/i.test(msg)) {
      this.captureToTag(msg);
      this.sendAck(msg);
      // Emit only once per call
      const alreadyAnswered = [...this.sessions.values()].some(s => s.callAnswered);
      if (!alreadyAnswered) {
        this.sessions.forEach(s => { s.callAnswered = true; });
        this.logger.log('SIP: ✅ Call answered');
        this.server.emit('sip:call_answered');
        this.saveCallLog();
      }
      return;
    }

    // ── INVITE error 4xx/5xx (not 401/407) ──
    const errMatch = msg.match(/SIP\/2\.0 ([4-9]\d\d) (.+)/);
    if (errMatch && /CSeq:\s*\d+\s+INVITE/i.test(msg) && !['401', '407'].includes(errMatch[1])) {
      const code = errMatch[1];
      const text = errMatch[2].trim();
      this.logger.warn(`SIP: INVITE error ${code} ${text}`);

      const isUserHangup = code === '487';
      const recentHangup = [...this.sessions.values()].some(s => s.userHangupAt && Date.now() - s.userHangupAt < 5000);

      if (isUserHangup || recentHangup) {
        this.server.emit('sip:call_ended');
      } else {
        const reasons: Record<string, string> = {
          '404': '404 — Raqam topilmadi',
          '480': '480 — Abonent javob bermayapti (offline)',
          '486': '486 — Band',
          '488': '488 — Codec mos emas',
          '403': '403 — Ruxsat berilmagan',
          '408': '408 — Vaqt tugadi',
          '500': '500 — Server xatosi',
          '503': '503 — Yo\'nalish yo\'q (Asterisk trunk sozlanmagan)',
          '606': '606 — Rad etildi',
        };
        this.server.emit('sip:call_failed', { reason: reasons[code] || `${code} ${text}`, code });
      }
      this.sessions.forEach(s => { s.activeCall = null; s.callAnswered = false; });
      return;
    }

    // ── BYE (remote hangup) ──
    if (/^BYE sip:/im.test(msg)) {
      this.logger.log('SIP: Remote BYE');
      this.server.emit('sip:call_ended');
      this.sessions.forEach(s => { s.activeCall = null; s.callAnswered = false; });
      return;
    }
  }

  // ─── REGISTER ────────────────────────────────────────────────────────────────

  private doRegister(withAuth: boolean, challengeMsg: string) {
    this.globalCseq++;
    const ext = this.DEFAULT_EXTENSION;
    const branch = 'z9hG4bK-' + Math.random().toString(36).substring(5);

    const lines = [
      `REGISTER sip:${this.DOMAIN} SIP/2.0`,
      `Via: SIP/2.0/UDP ${this.LOCAL_IP}:${this.LOCAL_PORT};branch=${branch};rport`,
      `From: <sip:${ext}@${this.DOMAIN}>;tag=${this.globalRegFromTag}`,
      `To: <sip:${ext}@${this.DOMAIN}>`,
      `Call-ID: ${this.globalRegCallId}`,
      `CSeq: ${this.globalCseq} REGISTER`,
      `Contact: <sip:${ext}@${this.LOCAL_IP}:${this.LOCAL_PORT}>`,
      'Max-Forwards: 70',
      'Expires: 3600',
      'Allow: INVITE, ACK, CANCEL, OPTIONS, BYE, NOTIFY, REFER',
      'User-Agent: MicroSIP/3.21.3',
      'Content-Length: 0',
    ];

    if (withAuth && challengeMsg) {
      const realm = challengeMsg.match(/realm="([^"]+)"/)?.[1] || this.DOMAIN;
      const nonce = challengeMsg.match(/nonce="([^"]+)"/)?.[1] || '';
      const qop = challengeMsg.match(/qop="([^"]+)"/)?.[1] || '';
      let authHeader: string;
      if (qop) {
        const nc = '00000001';
        const cnonce = Math.random().toString(36).substring(7);
        const ha1 = md5(`${ext}:${realm}:${this.DEFAULT_PASSWORD}`);
        const ha2 = md5(`REGISTER:sip:${this.DOMAIN}`);
        const resp = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
        authHeader = `Authorization: Digest username="${ext}", realm="${realm}", nonce="${nonce}", uri="sip:${this.DOMAIN}", response="${resp}", algorithm=MD5, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
      } else {
        const ha1 = md5(`${ext}:${realm}:${this.DEFAULT_PASSWORD}`);
        const ha2 = md5(`REGISTER:sip:${this.DOMAIN}`);
        const resp = md5(`${ha1}:${nonce}:${ha2}`);
        authHeader = `Authorization: Digest username="${ext}", realm="${realm}", nonce="${nonce}", uri="sip:${this.DOMAIN}", response="${resp}", algorithm=MD5`;
      }
      lines.push(authHeader);
    }

    lines.push('', '');
    this.udpSend(lines.join('\r\n'));
    this.logger.debug(`SIP → REGISTER ext=${ext}`);
  }

  // ─── INVITE WITH AUTH (eski SIP INVITE uchun — AMI rejimida ishlatilmaydi) ──

  private handleInviteAuth(_challengeMsg: string) {
    // AMI Originate ishlatilganda bu kerak emas — Asterisk o'zi auth boshqaradi
    this.logger.debug('SIP: INVITE auth skipped (AMI mode)');
  }

  // ─── PROCESS TARGET NUMBER ────────────────────────────────────────────────────

  private processTarget(raw: string): { dialNum: string; display: string } {
    // Remove non-numeric except + at start
    let num = raw.replace(/[^0-9+]/g, '');
    // Remove leading +
    if (num.startsWith('+')) num = num.slice(1);

    // Apply prestrip (MicroSIP equivalent)
    if (this.DIAL_PRESTRIP > 0 && num.length > this.DIAL_PRESTRIP) {
      const stripped = num.slice(this.DIAL_PRESTRIP);
      this.logger.log(`DIAL: prestrip(${this.DIAL_PRESTRIP}): ${num} → ${stripped}`);
      num = stripped;
    }

    // Apply prefix
    if (this.DIAL_PREFIX) {
      num = this.DIAL_PREFIX + num;
    }

    return { dialNum: num, display: raw };
  }

  // ─── HANDLE CALL (AMI Originate) ──────────────────────────────────────────────

  @SubscribeMessage('sip:call')
  async handleCall(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const rawTarget = (data?.target || '').toString().trim();

    if (!rawTarget) {
      client.emit('sip:error', { message: "Raqam kiriting" });
      return;
    }

    if (!this.globalRegistered) {
      client.emit('sip:error', { message: 'SIP ulanmagan. WireGuard VPN ishlamoqdami?' });
      return;
    }

    const { dialNum, display } = this.processTarget(rawTarget);

    if (!dialNum) {
      client.emit('sip:error', { message: "Noto'g'ri raqam" });
      return;
    }

    const ext = this.DEFAULT_EXTENSION;
    const session: SipSession = this.sessions.get(client.id) || {
      socketId: client.id,
      operatorId: data?.operatorId || 'unknown',
      companyId: data?.companyId || 'unknown',
      extension: ext,
      callAnswered: false,
      userHangupAt: 0,
      activeCall: null,
    };
    session.callAnswered = false;
    session.userHangupAt = 0;
    this.sessions.set(client.id, session);

    this.logger.log(`CALL: "${display}" → dial="${dialNum}" via Softphone`);

    // Frontend ga raqamni qaytaramiz — brauzer sip: URI orqali MicroSIP/X-Lite ni chaqiradi
    session.activeCall = {
      id: crypto.randomBytes(8).toString('hex'),
      target: dialNum,
      fromTag: '',
      toTag: null,
      branch: '',
      amiActionId: null,
    };

    client.emit('sip:dial_external', { target: dialNum, sipDomain: this.DOMAIN });
    client.emit('sip:calling', { target: dialNum, display, method: 'Softphone' });

    // Call log saqlash
    this.saveCallLog();
  }

  // ─── AMI ORIGINATE ──────────────────────────────────────────────────────────

  private amiOriginate(target: string, ext: string, session: SipSession, client: Socket) {
    const actionId = 'orig-' + crypto.randomBytes(4).toString('hex');
    session.activeCall = {
      id: actionId,
      target,
      fromTag: '',
      toTag: null,
      branch: '',
      amiActionId: actionId,
    };

    const c = new net.Socket();
    let buf = '';
    let loggedIn = false;
    let originated = false;
    let done = false;

    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        c.destroy();
        client.emit('sip:call_failed', { reason: 'AMI ulanish vaqti tugadi', code: '408' });
        this.logger.error('AMI: Originate timeout');
      }
    }, 15000);

    const cleanup = () => {
      if (!done) done = true;
      clearTimeout(timeout);
      try { c.destroy(); } catch {}
    };

    c.connect(this.AMI_PORT, this.AMI_HOST, () => {
      this.logger.log(`AMI: Connected to ${this.AMI_HOST}:${this.AMI_PORT}`);
    });

    c.on('data', (data) => {
      const chunk = data.toString();
      this.logger.debug(`AMI RAW: ${JSON.stringify(chunk.substring(0, 200))}`);
      buf += chunk;

      // Asterisk banner keladi: "Asterisk Call Manager/X.X.X\r\n" — u \r\n\r\n bilan tugamaydi
      if (!loggedIn && buf.includes('Asterisk Call Manager')) {
        loggedIn = true;
        this.logger.log('AMI: Banner detected, sending login...');
        c.write(`Action: Login\r\nUsername: ${this.AMI_USER}\r\nSecret: ${this.AMI_SECRET}\r\n\r\n`);
        buf = ''; // clear buffer after login
        return;
      }

      const msgs = buf.split('\r\n\r\n');
      buf = msgs.pop() || '';

      for (const m of msgs) {
        this.logger.debug(`AMI MSG: ${m.substring(0, 120)}`);

        // Login — fallback agar banner yuqorida tutilmagan bo'lsa
        if (m.includes('Asterisk Call Manager') && !loggedIn) {
          loggedIn = true;
          c.write(`Action: Login\r\nUsername: ${this.AMI_USER}\r\nSecret: ${this.AMI_SECRET}\r\n\r\n`);
          continue;
        }

        // Auth accepted → send Originate
        if (m.includes('Authentication accepted') && !originated) {
          originated = true;
          this.logger.log(`AMI: Logged in. Originating call to ${target}`);

          // Channel formatini aniqlash
          // Agar SIP_TRUNK bo'lsa: SIP/trunk/target, bo'lmasa: PJSIP/target
          let channel: string;
          if (this.SIP_TRUNK) {
            channel = `SIP/${this.SIP_TRUNK}/${target}`;
          } else {
            channel = `PJSIP/${target}@${this.DOMAIN}`;
          }

          const originate = [
            'Action: Originate',
            `ActionID: ${actionId}`,
            `Channel: ${channel}`,
            `Context: ${this.AMI_CONTEXT}`,
            `Exten: ${ext}`,
            'Priority: 1',
            `CallerID: ${ext}`,
            'Timeout: 30000',
            'Async: true',
            '',
            '',
          ].join('\r\n');

          c.write(originate);
          client.emit('sip:calling', { target, display: target, method: 'AMI' });
          continue;
        }

        // Auth failed
        if (m.includes('Authentication failed')) {
          this.logger.error('AMI: Authentication failed');
          client.emit('sip:call_failed', { reason: 'AMI login xato (parol noto\'g\'ri)', code: '401' });
          cleanup();
          continue;
        }

        // Originate response
        if (m.includes(`ActionID: ${actionId}`)) {
          if (m.includes('Response: Error')) {
            const errMsg = m.match(/Message: (.*)/)?.[1] || 'Noma\'lum AMI xato';
            this.logger.error(`AMI Originate error: ${errMsg}`);
            client.emit('sip:call_failed', { reason: errMsg, code: '500' });
            cleanup();
          } else if (m.includes('Response: Success')) {
            this.logger.log('AMI: Originate accepted');
          }
        }

        // Event: OriginateResponse
        if (m.includes('Event: OriginateResponse') && m.includes(`ActionID: ${actionId}`)) {
          const reasonMatch = m.match(/Reason: (\d+)/);
          const reason = reasonMatch ? parseInt(reasonMatch[1]) : 0;

          if (reason === 4) {
            // 4 = answered
            this.logger.log('AMI: Call answered!');
            session.callAnswered = true;
            client.emit('sip:call_answered');
            this.server.emit('sip:call_answered');
          } else {
            // 1=no answer, 5=busy, 8=congestion, etc.
            const reasonText = reason === 1 ? 'Javob bermadi' :
                               reason === 5 ? 'Band (busy)' :
                               reason === 8 ? 'Tarmoq xatosi' :
                               `Xato (code: ${reason})`;
            this.logger.log(`AMI: Call failed - ${reasonText}`);
            client.emit('sip:call_failed', { reason: reasonText, code: String(reason) });
          }
          // Logoff va cleanup
          c.write('Action: Logoff\r\n\r\n');
          setTimeout(() => cleanup(), 1000);
        }
      }
    });

    c.on('error', (err) => {
      this.logger.error(`AMI connection error: ${err.message}`);
      if (!done) {
        client.emit('sip:call_failed', { reason: `AMI ulanish xatosi: ${err.message}`, code: '503' });
      }
      cleanup();
    });

    c.on('close', () => {
      this.logger.debug('AMI: Connection closed');
    });
  }

  // ─── HANGUP ──────────────────────────────────────────────────────────────────

  @SubscribeMessage('sip:hangup')
  handleHangup(@ConnectedSocket() client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session?.activeCall) {
      this.logger.log('Hangup: no active call session');
      return;
    }

    const { target, id: callId, fromTag, toTag, branch } = session.activeCall;
    session.activeCall = null;
    session.callAnswered = false;
    session.userHangupAt = Date.now();

    const ext = session.extension;
    const method = toTag ? 'BYE' : 'CANCEL';
    this.globalCseq++;

    const req = [
      `${method} sip:${target}@${this.SIP_SERVER} SIP/2.0`,
      `Via: SIP/2.0/UDP ${this.LOCAL_IP}:${this.LOCAL_PORT};branch=${branch};rport`,
      `From: "${ext}" <sip:${ext}@${this.DOMAIN}>;tag=${fromTag}`,
      `To: <sip:${target}@${this.SIP_SERVER}>${toTag ? `;tag=${toTag}` : ''}`,
      `Call-ID: ${callId}`,
      `CSeq: ${this.globalCseq} ${method}`,
      'Max-Forwards: 70',
      'User-Agent: MicroSIP/3.21.3',
      'Content-Length: 0',
      '', '',
    ].join('\r\n');

    this.logger.log(`SIP → ${method} ${target}`);
    this.udpSend(req);
    client.emit('sip:call_ended');
    this.server.emit('sip:call_ended');
  }

  // ─── DIAGNOSTICS ─────────────────────────────────────────────────────────────

  @SubscribeMessage('sip:ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('sip:pong', {
      registered: this.globalRegistered,
      localIp: this.LOCAL_IP,
      localPort: this.LOCAL_PORT,
      sipServer: this.SIP_SERVER,
      extension: this.DEFAULT_EXTENSION,
      dialPrestrip: this.DIAL_PRESTRIP,
      dialPrefix: this.DIAL_PREFIX,
    });
  }

  // ─── AMI DIAGNOSTIC (for admin) ──────────────────────────────────────────────

  @SubscribeMessage('sip:ami_check')
  handleAmiCheck(@ConnectedSocket() client: Socket) {
    const c = new net.Socket();
    let buf = '';
    let done = false;
    let loggedIn = false;
    const to = setTimeout(() => { if (!done) { done = true; c.destroy(); client.emit('sip:ami_result', { ok: false, reason: 'timeout' }); } }, 5000);

    c.connect(this.AMI_PORT, this.AMI_HOST, () => {});
    c.on('data', (data) => {
      buf += data.toString();
      const msgs = buf.split('\r\n\r\n');
      buf = msgs.pop() || '';
      for (const m of msgs) {
        if (m.includes('Asterisk Call Manager') && !loggedIn) {
          loggedIn = true;
          c.write(`Action: Login\r\nUsername: ${this.AMI_USER}\r\nSecret: ${this.AMI_SECRET}\r\n\r\n`);
        }
        if (m.includes('Authentication accepted')) {
          done = true; clearTimeout(to);
          client.emit('sip:ami_result', { ok: true, user: this.AMI_USER });
          c.destroy();
        }
        if (m.includes('Authentication failed')) {
          done = true; clearTimeout(to);
          client.emit('sip:ami_result', { ok: false, reason: `Wrong credentials: ${this.AMI_USER}/${this.AMI_SECRET}` });
          c.destroy();
        }
      }
    });
    c.on('error', (e) => { if (!done) { done = true; clearTimeout(to); client.emit('sip:ami_result', { ok: false, reason: e.message }); } });
  }

  // ─── SIP REPLY HELPERS ────────────────────────────────────────────────────────

  private replyOptions(msg: string) {
    const via = msg.match(/Via: (.*)/)?.[1]?.trim() || '';
    const from = msg.match(/From: (.*)/)?.[1]?.trim() || '';
    const to = msg.match(/To: (.*)/)?.[1]?.trim() || '';
    const callId = msg.match(/Call-ID: (.*)/)?.[1]?.trim() || '';
    const cseq = msg.match(/CSeq: (.*)/)?.[1]?.trim() || '';
    this.udpSend(['SIP/2.0 200 OK', `Via: ${via}`, `From: ${from}`, `To: ${to}`, `Call-ID: ${callId}`, `CSeq: ${cseq}`, 'Content-Length: 0', '', ''].join('\r\n'));
  }

  private replyNotify(msg: string) {
    const via = msg.match(/Via: (.*)/)?.[1]?.trim() || '';
    const from = msg.match(/From: (.*)/)?.[1]?.trim() || '';
    const to = msg.match(/To: (.*)/)?.[1]?.trim() || '';
    const callId = msg.match(/Call-ID: (.*)/)?.[1]?.trim() || '';
    const cseq = msg.match(/CSeq: (.*)/)?.[1]?.trim() || '';
    this.udpSend(['SIP/2.0 200 OK', `Via: ${via}`, `From: ${from}`, `To: ${to}`, `Call-ID: ${callId}`, `CSeq: ${cseq}`, 'Content-Length: 0', '', ''].join('\r\n'));
  }

  private captureToTag(msg: string) {
    const tag = msg.match(/To:.*?;tag=([^\s;,\r\n]+)/)?.[1];
    if (tag) this.sessions.forEach(s => { if (s.activeCall && !s.activeCall.toTag) s.activeCall.toTag = tag; });
  }

  private sendAck(msg: string) {
    const to = msg.match(/To: (.*)/)?.[1]?.trim() || '';
    const callId = msg.match(/Call-ID: (.*)/)?.[1]?.trim() || '';
    this.sessions.forEach(s => {
      if (!s.activeCall || s.activeCall.amiActionId) return;
      this.globalCseq++;
      const ack = [
        `ACK sip:${s.activeCall.target}@${this.SIP_SERVER} SIP/2.0`,
        `Via: SIP/2.0/UDP ${this.LOCAL_IP}:${this.LOCAL_PORT};branch=${s.activeCall.branch};rport`,
        `From: "${s.extension}" <sip:${s.extension}@${this.DOMAIN}>;tag=${s.activeCall.fromTag}`,
        `To: ${to || `<sip:${s.activeCall.target}@${this.DOMAIN}>`}`,
        `Call-ID: ${callId || s.activeCall.id}`,
        `CSeq: ${this.globalCseq} ACK`,
        'Max-Forwards: 70',
        'User-Agent: MicroSIP/3.21.3',
        'Content-Length: 0',
        '', '',
      ].join('\r\n');
      this.udpSend(ack);
    });
  }

  private udpSend(msg: string) {
    const buf = Buffer.from(msg, 'utf8');
    this.udpSocket.send(buf, 0, buf.length, this.SIP_PORT, this.SIP_SERVER, (err) => {
      if (err) this.logger.error(`UDP send: ${err.message}`);
    });
  }

  private async saveCallLog() {
    for (const s of this.sessions.values()) {
      if (s.operatorId && s.operatorId !== 'unknown') {
        try {
          await this.callsService.createOutgoing(s.operatorId, s.companyId, { callerPhone: s.extension });
        } catch (e) {
          this.logger.error(`Save call: ${e}`);
        }
        break;
      }
    }
  }
}
