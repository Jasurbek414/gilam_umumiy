/**
 * ═══════════════════════════════════════════════════════════════════════════
 * sip-client.js — Production-grade JsSIP WebRTC Softphone Engine
 * 
 * X-Lite / MicroSIP darajasidagi haqiqiy SIP client.
 * JsSIP kutubxonasi orqali Asterisk/FreePBX WebSocket bilan ishlaydi.
 * 
 * Xususiyatlar:
 *   - Real SIP REGISTER / INVITE / BYE
 *   - WebRTC Audio (mikrofon + karnay)
 *   - DTMF yuborish (RFC 2833)
 *   - Hold / Unhold
 *   - Mute / Unmute
 *   - Bir nechta SIP akkaunt (Multi-line)
 *   - Avtomatik qayta ulanish (Reconnect)
 *   - Kiruvchi qo'ng'iroqlarni qabul qilish / rad etish
 * ═══════════════════════════════════════════════════════════════════════════
 */

const JsSIP = require('jssip');

// Debug loglarni yoqish (konsolda ko'rish uchun)
// JsSIP.debug.enable('JsSIP:*');
JsSIP.debug.disable('JsSIP:*');

const SipClient = {
  // --- State ---
  activeSipLines: {},        // { [accId]: { phone, isRegistered, acc } }
  sipAccounts: [],           // localStorage dan yuklanadigan akkauntlar
  currentSession: null,      // Hozirgi aktiv session (Inviter yoki Invitation)
  isMuted: false,
  isOnHold: false,
  isRecording: false,
  mediaRecorder: null,
  recordedChunks: [],
  audioContext: null,
  localStream: null,         // Mikrofon stream (unused in UDP mode)
  remoteAudio: null,         // <audio> element
  callRecordings: JSON.parse(localStorage.getItem('call_recordings') || '[]'),
  _cleanupInProgress: false, // Guard against double cleanup

  // ═══ INIT ═══════════════════════════════════════════════════════════════
  init() {
    this.sipAccounts = JSON.parse(localStorage.getItem('sip_accounts') || '[]');
    
    // Remote audio element yaratish
    this.remoteAudio = document.getElementById('sipRemoteAudio');
    if (!this.remoteAudio) {
      this.remoteAudio = document.createElement('audio');
      this.remoteAudio.id = 'sipRemoteAudio';
      this.remoteAudio.autoplay = true;
      document.body.appendChild(this.remoteAudio);
    }
    
    this.renderAccounts();
    this._bindMuteHoldButtons();
    console.log('[SIP] Initialized. Accounts:', this.sipAccounts.length);
    this._startWatchdog();
  },

  _startWatchdog() {
    setInterval(() => {
      // Tarmoq bo'lmasa qidirib ovora bo'lmaydi
      if (!navigator.onLine) return; 
      
      this.sipAccounts.forEach(acc => {
        if (!acc.autoConnect) return;
        
        const line = this.activeSipLines[acc.id];
        // Agar umuman engine yaratilmagan yoki engine tushib qolgan bo'lsa
        if (!line || (!line.isRegistered && !this.currentSession)) {
           const now = Date.now();
           // Har safar 15 sekundda birdan ortiq spam urinish qilmaslik uchun
           if (!acc._lastReconnectAttempt || now - acc._lastReconnectAttempt > 15000) {
             acc._lastReconnectAttempt = now;
             console.log(`[SIP Watchdog] 🔄 Tarmoq stabilizatsiyasi: Reconnecting ${acc.extension}...`);
             this.connect(acc);
           }
        }
      });
    }, 5000);
  },

  // ═══ WEBSOCKET URL BUILDER ══════════════════════════════════════════════
  // Asterisk/FreePBX standart WebSocket portlari:
  //   ws://IP:8088/ws   (HTTP)
  //   wss://IP:8089/ws  (HTTPS)
  _buildWsUrl(acc) {
    const domain = acc.domain.trim();
    const transport = acc.transport || 'ws';
    
    // Agar foydalanuvchi to'liq URL bergan bo'lsa
    if (domain.startsWith('ws://') || domain.startsWith('wss://')) {
      return domain;
    }
    
    // IP:PORT formatida (masalan 10.100.100.1:8088)
    if (domain.includes(':')) {
      const parts = domain.split(':');
      const ip = parts[0];
      const port = parts[1];
      // Agar /ws path bo'lmasa, qo'shamiz
      if (domain.includes('/')) {
        return `${transport}://${domain}`;
      }
      return `${transport}://${ip}:${port}/ws`;
    }
    
    // Faqat IP (masalan 10.100.100.1)
    const defaultPort = transport === 'wss' ? 8089 : 8088;
    return `${transport}://${domain}:${defaultPort}/ws`;
  },

  // Realm (SIP domain) ni ajratib olish
  _extractRealm(domain) {
    return domain.replace(/^(wss?:\/\/)/, '').split(':')[0].split('/')[0];
  },

  // ═══ CONNECT (REGISTER) ═════════════════════════════════════════════════
  async connect(acc) {
    // Agar allaqachon ulangan bo'lsa, avval uzamiz
    if (this.activeSipLines[acc.id] && this.activeSipLines[acc.id].phone) {
      try { this.activeSipLines[acc.id].phone.disconnect(); } catch(e) {}
      delete this.activeSipLines[acc.id];
    }

    const SipUdpEngine = require('./sip-udp-engine');
    const engine = new SipUdpEngine();

    console.log(`[SIP] Connecting via UDP: ${acc.name}`);
    console.log(`[SIP]   Server: ${acc.domain}:5060`);
    console.log(`[SIP]   Extension: ${acc.extension}`);

    Utils.showToast(`${acc.name} — ulanilmoqda...`, 'info');

    // ─── Event Handlers ───────────────────────────────────────────
    engine.on('registered', () => {
      console.log(`[SIP] ✅ Registered: ${acc.name} (${acc.extension})`);
      Utils.showToast(`✅ ${acc.name} — PBX ga muvaffaqiyatli ulandi!`, 'success');
      this.activeSipLines[acc.id] = {
        phone: engine,
        isRegistered: true,
        acc
      };
      this.renderAccounts();
    });

    engine.on('unregistered', () => {
      console.log(`[SIP] Unregistered: ${acc.name}`);
      if (this.activeSipLines[acc.id]) {
        this.activeSipLines[acc.id].isRegistered = false;
        this.renderAccounts();
      }
    });

    engine.on('disconnected', () => {
      console.log(`[SIP] Disconnected: ${acc.name}`);
      if (this.activeSipLines[acc.id]) {
        this.activeSipLines[acc.id].isRegistered = false;
        this.renderAccounts();
      }
    });

    engine.on('registrationFailed', (data) => {
      console.error(`[SIP] ❌ Registration failed: ${acc.name}`, data);
      const cause = data.cause || 'Noma\'lum xatolik';
      Utils.showToast(`❌ ${acc.name} — Registratsiya rad etildi: ${cause}`, 'error');
      this.activeSipLines[acc.id] = {
        phone: engine,
        isRegistered: false,
        acc
      };
      this.renderAccounts();
    });

    engine.on('error', (err) => {
      console.error(`[SIP] Error: ${err.message}`);
    });

    // ─── Kiruvchi qo'ng'iroq (Incoming Call) ──────────────────────
    engine.on('incomingCall', (data) => {
      console.log(`[SIP] 📞 Incoming call from: ${data.callerNumber}`);
      
      // Agar boshqa qo'ng'iroq aktiv bo'lsa, band (busy)
      if (this.currentSession) {
        console.log('[SIP] Already in call, sending busy');
        engine.rejectCall();
        return;
      }
      
      this.currentSession = engine;
      
      window.UI.showIncomingCallUI({
        callerNumber: data.callerNumber,
        callerName: data.callerName || '',
        campaignName: acc.name,
      });

      // CRM panelni avtomatik ochish
      if (window.CRM) window.CRM.onCallStarted(data.callerNumber, acc.name);
    });

    engine.on('callAnswered', (data) => {
      console.log(`[SIP] Call connected: ${data.target}`);
      window.UI.showActiveCall(data.target, 'Suhbat ketyapti');
      window.UI.startCallTimer();
      
      // Backend API: Qo'ng'iroqqa javob berildi
      if (window.CRM && window.CRM.activeCallId && window.Api?.config?.token) {
        window.Api.request(`/calls/${window.CRM.activeCallId}/answer`, { method: 'PUT' }).catch(console.warn);
      }

      // Yozib olishni boshlash
      setTimeout(() => this._startRecording(), 1000);
    });

    engine.on('callEnded', (data) => {
      console.log(`[SIP] Call ended event received:`, {
        reason: data.reason,
        target: data.target,
        direction: data.direction,
        currentSession: !!this.currentSession
      });
      
      const type = data.direction === 'incoming' ? 'INCOMING' : 'OUTGOING';
      const dur = window.UI && window.UI.activeCallSeconds ? window.UI.activeCallSeconds : 0;
      if (data.target && window.UI && window.UI.addCallToHistory) {
        window.UI.addCallToHistory(data.target, type, dur);
      }

      // Backend API: Qo'ng'iroq yakunlandi va notelar yozildi
      if (window.CRM && window.CRM.activeCallId && window.Api?.config?.token) {
        const crmNote = Utils.$('quick-crm-note')?.value || '';
        const callNote = Utils.$('active-call-note')?.value || '';
        const notes = callNote ? (crmNote ? `${callNote}\n${crmNote}` : callNote) : crmNote;
        
        window.Api.request(`/calls/${window.CRM.activeCallId}/complete`, { 
          method: 'PUT',
          body: JSON.stringify({ notes })
        }).then(() => {
          // Clear notes inputs after successful completion
          const cn = Utils.$('active-call-note');
          const qn = Utils.$('quick-crm-note');
          if (cn) cn.value = '';
          if (qn) qn.value = '';
        }).catch(console.warn);
        
        window.CRM.activeCallId = null;
      }
      
      this._cleanupCall();
    });

    engine.on('ringing', (data) => {
      console.log(`[SIP] Ringing: ${data.target}`);
      const label = Utils.$('call-status-label');
      if (label) {
        if (data.hasEarlyMedia) {
          label.textContent = 'Tarmoq xabari...';
        } else {
          label.textContent = 'Jiringlayapti...';
        }
      }
      if (data.hasEarlyMedia && window.UI) {
        window.UI.stopRingbackTone();
      }
    });

    engine.on('callFailed', (data) => {
      console.log(`[SIP] Call failed event received:`, {
        code: data.code,
        reason: data.reason,
        target: data.target,
        direction: data.direction,
        currentSession: !!this.currentSession
      });
      
      const type = data.direction === 'incoming' ? 'MISSED' : 'OUTGOING';
      if (data.target && window.UI && window.UI.addCallToHistory) {
        window.UI.addCallToHistory(data.target, type, 0); // missed calls have 0 duration
      }

      // Backend API: Qo'ng'iroq javobsiz qoldi / rad etildi
      if (data.direction === 'incoming' && window.CRM && window.CRM.activeCallId && window.Api?.config?.token) {
        window.Api.request(`/calls/${window.CRM.activeCallId}/miss`, { method: 'PUT' }).catch(console.warn);
        window.CRM.activeCallId = null;
      }
      
      this._cleanupCall();
      Utils.showToast(`❌ Qo'ng'iroq rad etildi: ${data.reason}`, 'error');
    });

    // ─── Start UDP connection ─────────────────────────────────────
    try {
      let decodedPassword = acc.password;
      try {
        const { ipcRenderer } = require('electron');
        decodedPassword = await ipcRenderer.invoke('decrypt-password', acc.password);
      } catch(e) {
        // Fallback for older profiles or non-electron test env
        try {
          decodedPassword = atob(acc.password);
        } catch(err) {}
      }

      engine.connect({
        domain: acc.domain,
        sipPort: 5060,
        extension: acc.extension,
        username: acc.username,
        password: decodedPassword,
        name: acc.name || acc.extension,
      });

      // Saqlaymiz (hali register bo'lmagan, lekin connecting)
      this.activeSipLines[acc.id] = {
        phone: engine,
        isRegistered: false,
        acc
      };
      this.renderAccounts();

    } catch (err) {
      console.error('[SIP] Failed to connect:', err);
      Utils.showToast(`❌ ${acc.name} — xatolik: ${err.message}`, 'error');
    }
  },

  // ═══ SESSION EVENTS (ikkala yo'nalish uchun) ═════════════════════════════
  _attachSessionEvents(session) {
    session.on('progress', () => {
      console.log('[SIP] Call in progress (ringing)');
      const label = Utils.$('call-status-label');
      if (label) label.textContent = 'Jiringlayapti...';
    });

    session.on('accepted', () => {
      console.log('[SIP] Call accepted / established', {
        session: !!session,
        direction: session.direction,
        target: session.currentCall?.targetExt
      });

      // Backend API: Qo'ng'iroqqa javob berildi
      if (window.CRM && window.CRM.activeCallId && window.Api?.config?.token) {
        window.Api.request(`/calls/${window.CRM.activeCallId}/answer`, { method: 'PUT' }).catch(console.warn);
      }

      const label = Utils.$('call-status-label');
      if (label) label.textContent = 'Suhbat';
      window.UI.startCallTimer();
      // Avtomatik yozib olishni boshlash
      setTimeout(() => this._startRecording(), 1000);
    });

    session.on('confirmed', () => {
      console.log('[SIP] Call confirmed (media established)');
    });

    session.on('ended', (data) => {
      console.log('[SIP] Call ended event:', {
        cause: data.cause,
        direction: session.direction,
        target: session.currentCall?.targetExt,
        callId: session.currentCall?.callId
      });
      
      // Backend API: Qo'ng'iroq yakunlandi
      if (window.CRM && window.CRM.activeCallId && window.Api?.config?.token) {
        // Aslida order qilingan bo'lsa, order_id ni ham yuborish kerak.
        // Bu joyda faqat callni yopamiz.
        const crmNote = Utils.$('quick-crm-note')?.value || '';
        const callNote = Utils.$('active-call-note')?.value || '';
        const notes = callNote ? (crmNote ? `${callNote}\n${crmNote}` : callNote) : crmNote;
        
        window.Api.request(`/calls/${window.CRM.activeCallId}/complete`, { 
          method: 'PUT',
          body: JSON.stringify({ notes })
        }).catch(console.warn);
        
        // Qo'ng'iroq tugadi, ID ni tozalaymiz
        window.CRM.activeCallId = null;
      }

      this._cleanupCall();
      if (window.CRM) window.CRM.onCallEnded();
      Utils.showToast("Qo'ng'iroq tugadi", 'info');
    });

    session.on('failed', (data) => {
      console.log('[SIP] Call failed event:', {
        cause: data.cause,
        direction: session.direction,
        target: session.currentCall?.targetExt,
        callId: session.currentCall?.callId
      });

      // Backend API: Qo'ng'iroq javobsiz / xato bilan tugadi
      if (session.direction === 'incoming' && window.CRM && window.CRM.activeCallId && window.Api?.config?.token) {
        window.Api.request(`/calls/${window.CRM.activeCallId}/miss`, { method: 'PUT' }).catch(console.warn);
        window.CRM.activeCallId = null;
      }

      this._cleanupCall();
      Utils.showToast(`Qo'ng'iroq xatosi: ${data.cause || 'Noma\'lum'}`, 'error');
    });

    // ─── WebRTC Media ───────────────────────────────────────────────
    session.on('peerconnection', (data) => {
      const pc = data.peerconnection;
      console.log('[SIP] PeerConnection created');

      pc.ontrack = (event) => {
        console.log('[SIP] Remote track received:', event.track.kind);
        if (event.track.kind === 'audio') {
          const remoteStream = new MediaStream();
          remoteStream.addTrack(event.track);
          this.remoteAudio.srcObject = remoteStream;
          this.remoteAudio.play().catch(e => console.error('[SIP] Audio play error:', e));
        }
      };

      // ICE candidate loglar
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[SIP] ICE candidate:', event.candidate.type);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[SIP] ICE state:', pc.iceConnectionState);
      };
    });
  },

  // ═══ MAKE CALL (Chiquvchi qo'ng'iroq) ═══════════════════════════════════
  makeCall(target) {
    // Birinchi ulangan SIP liniyani topish
    const activeKey = Object.keys(this.activeSipLines).find(
      id => this.activeSipLines[id].isRegistered && this.activeSipLines[id].phone
    );

    if (!activeKey) {
      Utils.showToast('SIP profil ulanmagan! Avval Sozlamalar > SIP bo\'limida raqam ulang.', 'error');
      return;
    }

    if (this.currentSession) {
      Utils.showToast('Allaqachon aktiv qo\'ng\'iroq bor. Avval uni tugatib oling.', 'warning');
      return;
    }

    const line = this.activeSipLines[activeKey];

    console.log(`[SIP] Making call to: ${target}`);

    try {
      line.phone.makeCall(target);
      this.currentSession = line.phone;
      this.isMuted = false;
      this.isOnHold = false;
      this._updateMuteHoldUI();

      // UI: qo'ng'iroq overlay ko'rsatish
      window.UI.showActiveCall(target, 'Chaqirilmoqda...');

      // CRM panelni ochish
      const lineName = line.acc?.name || '';
      if (window.CRM) window.CRM.onCallStarted(target, lineName);

    } catch (err) {
      console.error('[SIP] Call error:', err);
      Utils.showToast(`Qo'ng'iroqda xatolik: ${err.message}`, 'error');
    }
  },

  // ═══ ANSWER (Kiruvchi qo'ng'iroqni qabul qilish) ════════════════════════
  answer() {
    if (!this.currentSession) return;
    
    console.log('[SIP] Answering incoming call...');
    
    this.currentSession.answerCall();

    this.isMuted = false;
    this.isOnHold = false;
    this._updateMuteHoldUI();

    window.UI.hideIncomingCall();
    window.UI.showActiveCall(this.currentSession.currentCall?.targetExt || '', 'Kiruvchi suhbat');
  },

  // ═══ REJECT (Kiruvchi qo'ng'iroqni rad etish) ═══════════════════════════
  reject() {
    if (this.currentSession) {
      console.log('[SIP] Rejecting incoming call');
      try {
        this.currentSession.rejectCall();
      } catch (e) {
        console.error('[SIP] Reject error:', e);
        this._cleanupCall();
      }
      // NOTE: Don't nullify currentSession here - let the 'callEnded' event handler do it
      // to ensure proper cleanup sequencing and avoid race conditions.
    }
    window.UI.hideIncomingCall();
  },

  // ═══ HANGUP (Qo'ng'iroqni tugatish) ═════════════════════════════════════
  hangup() {
    try {
      console.log('[SIP] Hangup button executed');
      if (this.currentSession) {
        console.log('[SIP] Hanging up call (sending BYE/CANCEL)');
        try {
          this.currentSession.hangup();
        } catch (e) {
          console.error('[SIP] Hangup error:', e);
        }
      } else {
        console.warn('[SIP] Hangup called but no active session');
      }
      
      // Always cleanup UI immediately to prevent getting stuck, even if SIP engine fails
      this._cleanupCall();
    } catch (e) {
      alert("Hangup click error: " + e.message);
    }
  },

  // ═══ MUTE / UNMUTE ══════════════════════════════════════════════════════
  toggleMute() {
    if (!this.currentSession) return;
    
    this.isMuted = !this.isMuted;
    if (this.currentSession.mediaEngine) {
      this.currentSession.mediaEngine.setMute(this.isMuted);
    }
    Utils.showToast(this.isMuted ? "🔇 Mikrofon o'chirildi" : "🎤 Mikrofon yoqildi", 'info');
    this._updateMuteHoldUI();
  },

  // ═══ HOLD / UNHOLD ══════════════════════════════════════════════════════
  toggleHold() {
    if (!this.currentSession) return;
    
    this.isOnHold = !this.isOnHold;
    if (this.currentSession.mediaEngine) {
      this.currentSession.mediaEngine.setHold(this.isOnHold);
    }
    Utils.showToast(this.isOnHold ? "⏸️ Kutish rejimida" : "▶️ Suhbat davom ettirildi", 'info');
    this._updateMuteHoldUI();
  },

  // ═══ DTMF (Raqam yuborish suhbat vaqtida) ══════════════════════════════
  sendDTMF(tone) {
    if (!this.currentSession) return;
    try {
      this.currentSession.sendDTMF(tone, {
        duration: 100,
        interToneGap: 70
      });
      console.log(`[SIP] DTMF sent: ${tone}`);
    } catch(e) {
      console.error('[SIP] DTMF error:', e);
    }
  },

  // ═══ TRANSFER (Qo'ng'iroqni boshqa raqamga o'tkazish) ══════════════════
  transfer(target) {
    if (!this.currentSession) {
      Utils.showToast('Aktiv qo\'ng\'iroq yo\'q', 'warning');
      return;
    }
    
    try {
      this.currentSession.refer(target);
      Utils.showToast(`📲 Qo'ng'iroq ${target} ga o'tkazilmoqda...`, 'info');
    } catch(e) {
      Utils.showToast(`Transfer xatosi: ${e.message}`, 'error');
    }
  },

  // ═══ CLEANUP ════════════════════════════════════════════════════════════
  _cleanupCall() {
    console.log('[SIP] _cleanupCall() - forcing UI cleanup');
    try {
      // Reset all state
      this.currentSession = null;
      this.isMuted = false;
      this.isOnHold = false;
      this.isRecording = false;

      // Stop recording if active
      try { this._stopRecording(); } catch(e) {}

      // Update button states
      try { this._updateMuteHoldUI(); } catch(e) {}
      try { this._updateRecordUI(); } catch(e) {}

      // FORCE hide both overlays
      const activeOverlay = document.getElementById('active-call-overlay');
      const incomingOverlay = document.getElementById('incoming-call-overlay');
      if (activeOverlay) activeOverlay.style.display = 'none';
      if (incomingOverlay) incomingOverlay.style.display = 'none';

      // Also call UI methods as backup
      try { window.UI.hideActiveCall(); } catch(e) {}
      try { window.UI.hideIncomingCall(); } catch(e) {}
      try { window.UI.stopCallTimer(); } catch(e) {}
      try { window.UI.stopRingbackTone(); } catch(e) {}

      // Stop ringtone audio element
      try {
        const ringtone = document.getElementById('ringtone');
        if (ringtone) { ringtone.pause(); ringtone.currentTime = 0; }
      } catch(e) {}

      if (this.remoteAudio) {
        try {
          this.remoteAudio.pause();
          this.remoteAudio.srcObject = null;
          this.remoteAudio.load();
        } catch (e) {}
      }

      // Notify CRM
      try { if (window.CRM) window.CRM.onCallEnded(); } catch(e) {}

      console.log('[SIP] _cleanupCall() done');
    } catch (e) {
      console.error('[SIP] FATAL ERROR IN CLEANUP:', e);
      alert('Dasturda xatolik: ' + e.message);
      // Emergency hide
      document.getElementById('active-call-overlay').style.display = 'none';
      document.getElementById('incoming-call-overlay').style.display = 'none';
    }
  },

  // ═══ MUTE/HOLD UI UPDATE ════════════════════════════════════════════════
  _updateMuteHoldUI() {
    const muteBtns = [Utils.$('btn-mute'), Utils.$('dq-mute')];
    const holdBtns = [Utils.$('btn-hold'), Utils.$('dq-hold')];
    
    muteBtns.forEach((btn) => {
      if (btn) {
        const icon = btn.querySelector('.material-icons-round');
        if (icon) icon.textContent = this.isMuted ? 'mic_off' : 'mic';
        btn.classList.toggle('active', this.isMuted);
      }
    });

    holdBtns.forEach((btn) => {
      if (btn) {
        const icon = btn.querySelector('.material-icons-round');
        if (icon) icon.textContent = this.isOnHold ? 'play_arrow' : 'pause';
        btn.classList.toggle('active', this.isOnHold);
      }
    });
  },

  _bindMuteHoldButtons() {
    document.addEventListener('click', (e) => {
      // MUTE
      if (e.target.closest('#btn-mute') || e.target.closest('#dq-mute')) {
        this.toggleMute();
      }
      // HOLD
      if (e.target.closest('#btn-hold') || e.target.closest('#dq-hold')) {
        this.toggleHold();
      }
      // TRANSFER
      if (e.target.closest('#btn-transfer') || e.target.closest('#dq-transfer')) {
        const target = prompt("Yo'naltirish uchun raqamni yoki ichki raqamni kiriting:");
        if (target) this.transfer(target);
      }
      // RECORD
      if (e.target.closest('#btn-record')) {
        this.toggleRecord();
      }
    });

    // Volume slider can't be well delegated via click, wait for it or just delegate input
    document.addEventListener('input', (e) => {
      if (e.target.id === 'volume-slider') {
        this.setVolume(parseFloat(e.target.value));
      }
    });
  },

  // ═══ CALL RECORDING ════════════════════════════════════════════════════
  _startRecording() {
    if (!this.currentSession || this.isRecording) return;
    try {
      if (!this.currentSession.mediaEngine) return;

      const mixedStream = this.currentSession.mediaEngine.getMixedStream();
      if (!mixedStream) return;

      this.recordedChunks = [];
      let mimeType = 'audio/webm;codecs=opus';
      if (!window.MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      this.mediaRecorder = new window.MediaRecorder(mixedStream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this._saveRecording(blob);
      };

      this.mediaRecorder.start(1000); // har 1 soniyada data
      this.isRecording = true;
      this._updateRecordUI();
      console.log('[SIP] Recording started via RTP stream');
    } catch(e) {
      console.error('[SIP] Recording start error:', e);
    }
  },

  _stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch(e) {}
      console.log('[SIP] Recording stopped');
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch(e) {}
      this.audioContext = null;
    }
  },

  _saveRecording(blob) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const record = {
        id: 'rec_' + Date.now(),
        date: new Date().toISOString(),
        target: Utils.$('call-target-display')?.textContent || 'Noma\'lum',
        duration: window.UI.activeCallSeconds || 0,
        size: blob.size,
        data: reader.result // base64
      };
      this.callRecordings.unshift(record);
      // Faqat so'nggi 50 ta yozuvni saqlash
      if (this.callRecordings.length > 50) this.callRecordings = this.callRecordings.slice(0, 50);
      localStorage.setItem('call_recordings', JSON.stringify(this.callRecordings));
      Utils.showToast('Suhbat yozib olindi!', 'success');
    };
    reader.readAsDataURL(blob);
  },

  toggleRecord() {
    if (this.isRecording) {
      this._stopRecording();
      this.isRecording = false;
    } else {
      this._startRecording();
    }
    this._updateRecordUI();
  },

  _updateRecordUI() {
    const btn = Utils.$('btn-record');
    const indicator = Utils.$('recording-indicator');
    if (btn) {
      const icon = btn.querySelector('.material-icons-round');
      const label = btn.querySelector('.action-label');
      if (icon) icon.textContent = this.isRecording ? 'stop_circle' : 'fiber_manual_record';
      if (label) label.textContent = this.isRecording ? 'Stop' : 'Yozish';
      btn.classList.toggle('recording', this.isRecording);
      btn.style.color = this.isRecording ? 'var(--red)' : '';
    }
    if (indicator) indicator.style.display = this.isRecording ? 'block' : 'none';
  },

  // ═══ VOLUME CONTROL ════════════════════════════════════════════════════
  setVolume(val) {
    if (this.remoteAudio) {
      this.remoteAudio.volume = Math.max(0, Math.min(1, val));
    }
  },


  // ═══ ACCOUNT MANAGEMENT ═════════════════════════════════════════════════
  async saveAccount() {
    const campaignName = document.getElementById('sip-campaign')?.value?.trim() || 'Umumiy Kampaniya';
    const name = document.getElementById('sip-name')?.value?.trim() || `Liniya ${this.sipAccounts.length + 1}`;
    const domain = document.getElementById('sip-domain')?.value?.trim();
    const extension = document.getElementById('sip-extension')?.value?.trim();
    const username = document.getElementById('sip-username')?.value?.trim() || extension;
    const password = document.getElementById('sip-password')?.value?.trim();
    const transport = document.getElementById('sip-transport')?.value || 'ws';
    const autoConnect = document.getElementById('sip-autoconnect')?.checked ?? true;

    if (!domain || !extension || !password) {
      Utils.showToast('PBX Server, Raqam va Parolni to\'ldirish shart!', 'error');
      return;
    }

    let encryptedPassword = btoa(password);
    try {
      const { ipcRenderer } = require('electron');
      encryptedPassword = await ipcRenderer.invoke('encrypt-password', password);
    } catch (e) {
      console.warn('[SIP] Encryption helper failed, falling back to base64:', e);
    }

    const newAccount = {
      id: 'sip_' + Date.now(),
      campaignName,
      name,
      domain,
      extension,
      username,
      password: encryptedPassword,
      transport,
      autoConnect
    };

    this.sipAccounts.push(newAccount);
    localStorage.setItem('sip_accounts', JSON.stringify(this.sipAccounts));

    // Modalni yopish va formani tozalash
    Utils.hideModal('modal-add-sip');
    
    ['sip-campaign', 'sip-name', 'sip-domain', 'sip-extension', 'sip-username', 'sip-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    Utils.showToast(`✅ ${name} — SIP liniya qo'shildi!`, 'success');
    this.renderAccounts();

    if (autoConnect) {
      setTimeout(() => this.connect(newAccount), 500);
    }
  },

  deleteAccount(id) {
    if (!confirm("Bu SIP raqamni o'chirmoqchimisiz?")) return;

    // Avval disconnect
    if (this.activeSipLines[id]) {
      try { this.activeSipLines[id].phone.disconnect(); } catch(e) {}
      delete this.activeSipLines[id];
    }

    this.sipAccounts = this.sipAccounts.filter(a => a.id !== id);
    localStorage.setItem('sip_accounts', JSON.stringify(this.sipAccounts));
    this.renderAccounts();
    Utils.showToast('SIP raqam o\'chirildi', 'info');
  },

  toggleAccount(id) {
    const acc = this.sipAccounts.find(a => a.id === id);
    if (!acc) return;

    if (this.activeSipLines[id] && this.activeSipLines[id].isRegistered) {
      // Disconnect
      try {
        this.activeSipLines[id].phone.disconnect();
      } catch(e) {}
      this.activeSipLines[id].isRegistered = false;
      this.renderAccounts();
      Utils.showToast(`${acc.name} — uzildi`, 'info');
    } else {
      this.connect(acc);
    }
  },


  // ═══ RENDER ACCOUNTS UI ═════════════════════════════════════════════════
  renderAccounts() {
    const container = document.getElementById('sip-accounts-list');
    if (!container) return;

    if (this.sipAccounts.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-gray-500 bg-[#0a0a14]/65 rounded-xl border border-dashed border-gray-800/80 text-center">
          <span class="material-icons-round text-4xl opacity-20 mb-2 text-brand">headset_off</span>
          <p class="text-xs font-semibold m-0 text-gray-300">SIP liniya topilmadi</p>
          <span class="text-[10px] text-gray-550 mt-1">Liniya yaratish uchun "Qo'shish" tugmasini bosing</span>
        </div>`;
      this._updateGlobalStatus(false);
      return;
    }

    container.innerHTML = this.sipAccounts.map(acc => {
      const line = this.activeSipLines[acc.id];
      const isOnline = line && line.isRegistered;
      const statusIcon = isOnline ? 'check_circle' : 'cancel';
      const statusText = isOnline ? 'Ulangan' : 'Ulanmagan';
      const statusColorClass = isOnline ? 'text-green-400' : 'text-red-400';
      const statusBgClass = isOnline ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';
      const btnText = isOnline ? 'Uzish' : 'Ulanish';
      const btnClass = isOnline ? 'bg-[#1b1b36] hover:bg-[#252549] text-gray-300 border border-solid border-gray-750/80' : 'bg-brand hover:bg-brand-dark text-white shadow-brand/20';
      const wsUrl = this._buildWsUrl(acc);
      
      let activeExt = '';
      try {
        const activeObj = JSON.parse(localStorage.getItem('sip_account') || '{}');
        activeExt = activeObj.extension || activeObj.username || '';
      } catch(e) {}
      const isActiveLine = (acc.extension === activeExt);

      const borderClass = isActiveLine ? 'border-brand/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : (isOnline ? 'border-green-500/20 shadow-green-500/5' : 'border-gray-800/60');

      return `
        <div class="bg-gray-900/40 backdrop-blur-md p-5 rounded-2xl mb-4 border border-solid ${borderClass} transition-all duration-300 relative overflow-hidden group shadow-md hover:shadow-brand/5">
          ${isActiveLine ? '<div class="absolute top-0 left-0 w-1.5 h-full bg-brand"></div>' : ''}
          
          <div class="flex justify-between items-center mb-3">
            <div class="flex items-center gap-2.5">
              <span class="material-icons-round text-[20px] ${statusColorClass} animate-pulse">${statusIcon}</span>
              <strong class="text-sm text-white font-bold tracking-wide">${acc.name}</strong>
              ${isActiveLine ? '<span class="text-[9px] bg-brand text-white px-2 py-0.5 rounded-md ml-1.5 font-bold tracking-wider uppercase border border-solid border-brand/20">Asosiy</span>' : ''}
            </div>
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${statusColorClass} ${statusBgClass} uppercase tracking-wider">${statusText}</span>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-[11px] text-gray-400 mb-4 bg-[#0a0a14]/60 p-3 rounded-xl border border-solid border-gray-800/40 font-medium">
            <div><span class="text-gray-500 font-semibold">Server:</span> <span class="text-gray-300 font-bold">${acc.domain}</span></div>
            <div><span class="text-gray-500 font-semibold">Extension:</span> <span class="text-gray-300 font-bold">${acc.extension}</span></div>
            <div><span class="text-gray-550 font-semibold">Transport:</span> <span class="text-gray-300 font-bold">${acc.transport.toUpperCase()}</span></div>
            <div class="truncate" title="${wsUrl}"><span class="text-gray-550 font-semibold">WS URL:</span> <span class="text-gray-300 font-bold text-[10px]">${wsUrl.substring(0, 15)}...</span></div>
          </div>
          
          <div class="flex justify-end gap-2 items-center">
            <button onclick="window.SipClient.deleteAccount('${acc.id}')" 
              class="text-[11px] font-bold bg-red-950/10 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 border border-solid border-red-900/30 active:scale-95 cursor-pointer">
              <span class="material-icons-round text-[14px]">delete</span> O'chirish
            </button>
            
            ${!isActiveLine ? `
            <button onclick="window.UI.setActiveLine('${acc.extension}')" 
              class="text-[11px] font-bold bg-[#1b1b36] hover:bg-brand text-gray-300 hover:text-white px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 border border-solid border-gray-750/80 active:scale-95 cursor-pointer">
              <span class="material-icons-round text-[14px]">check_circle_outline</span> Asosiy qilish
            </button>` : ''}
            
            <button onclick="window.SipClient.toggleAccount('${acc.id}')" 
              class="text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1 active:scale-95 cursor-pointer ${btnClass}">
              <span class="material-icons-round text-[14px]">${isOnline ? 'link_off' : 'link'}</span> ${btnText}
            </button>
          </div>
        </div>
      `;
    }).join('');

    const anyOnline = this.sipAccounts.some(acc => 
      this.activeSipLines[acc.id] && this.activeSipLines[acc.id].isRegistered
    );
    this._updateGlobalStatus(anyOnline);
  },

    _updateGlobalStatus(online) {
    const ind = document.getElementById('sip-indicator');
    const dot = document.getElementById('sip-status-dot');
    const txt = document.getElementById('sip-status-text');
    const ext = document.getElementById('sip-extension-text');

    const cls = online ? 'online' : 'offline';
    if (ind) ind.className = 'sip-dot ' + cls;
    if (dot) dot.className = 'status-dot ' + cls;
    if (txt) txt.textContent = online ? 'SIP Ulangan' : 'SIP Ulanmagan';
    
    if (ext) {
      const firstOnline = this.sipAccounts.find(acc => 
        this.activeSipLines[acc.id] && this.activeSipLines[acc.id].isRegistered
      );
      ext.textContent = firstOnline ? `Ext: ${firstOnline.extension}` : '—';
    }
  },

  // ═══ AUTO-CONNECT ═══════════════════════════════════════════════════════
  autoConnectAll() {
    // Refresh accounts from localStorage (login paytida yangi account qo'shilgan bo'lishi mumkin)
    this.sipAccounts = JSON.parse(localStorage.getItem('sip_accounts') || '[]');
    this.renderAccounts();
    
    console.log('[SIP] Auto-connecting', this.sipAccounts.filter(a => a.autoConnect).length, 'accounts...');
    this.sipAccounts.filter(a => a.autoConnect).forEach((acc, i) => {
      setTimeout(() => this.connect(acc), 500 + i * 1000);
    });
  }
};

window.SipClient = SipClient;
window.showAddSipModal = function() {
  window.Utils.showModal('modal-add-sip');
};
