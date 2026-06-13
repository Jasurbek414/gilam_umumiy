const dgram = require('dgram');

/**
 * G.711 PCMU (µ-law) Codec lookup tables
 */
function createUlawTables() {
  const CLIP = 32635;
  const BIAS = 0x84;

  const linearToUlaw = (sample) => {
    let sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample = sample + BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
    let mantissa = (sample >> (exponent + 3)) & 0x0F;
    let ulawByte = ~(sign | (exponent << 4) | mantissa);
    return ulawByte & 0xFF;
  };

  const ulawToLinear = (ulawByte) => {
    ulawByte = ~ulawByte;
    let sign = (ulawByte & 0x80);
    let exponent = (ulawByte >> 4) & 0x07;
    let mantissa = ulawByte & 0x0F;
    let sample = ((mantissa << 3) + 132) << exponent;
    sample -= 132;
    return sign !== 0 ? -sample : sample;
  };

  const encodeTable = new Uint8Array(65536);
  for (let i = -32768; i <= 32767; i++) {
    encodeTable[new Int16Array([i])[0] & 0xFFFF] = linearToUlaw(i);
  }

  const decodeTable = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    decodeTable[i] = ulawToLinear(i) / 32768.0;
  }

  return { encodeTable, decodeTable };
}

/**
 * G.711 PCMA (A-law) Codec lookup tables
 */
function createAlawTables() {
  const alawToLinear = (alawByte) => {
    alawByte ^= 0x55;
    let sign = (alawByte & 0x80);
    let exponent = (alawByte & 0x70) >> 4;
    let mantissa = alawByte & 0x0f;
    let sample = (mantissa << 4) + 8;
    if (exponent !== 0) {
      sample += 0x100;
      sample <<= (exponent - 1);
    }
    return sign === 0 ? sample : -sample;
  };

  const decodeTable = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    decodeTable[i] = alawToLinear(i) / 32768.0;
  }
  return { decodeTable };
}

const { encodeTable: ulawEncode, decodeTable: ulawDecode } = createUlawTables();
const { decodeTable: alawDecode } = createAlawTables();

class RtpMediaEngine {
  constructor() {
    this.rtpSocket = null;
    this.audioCtx = null;
    this.audioStream = null;
    this.scriptProcessor = null;
    this.sourceNode = null;
    this.localPort = 0;
    
    this.remoteIp = null;
    this.remotePort = 0;

    this.seq = Math.floor(Math.random() * 65536);
    this.ts = Math.floor(Math.random() * 0xFFFFFFFF);
    this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF);

    this.jitterBuffer = []; // stores decoded Float32 chunks
  }

  start(localPort, remoteIp, remotePort) {
    if (this.rtpSocket && this.remoteIp === remoteIp && this.remotePort === remotePort) {
      console.log(`[RTP] Already running for ${remoteIp}:${remotePort}, ignoring restart.`);
      return;
    }
    this.stop();
    this.localPort = localPort;
    this.remoteIp = remoteIp;
    this.remotePort = remotePort;

    console.log(`[RTP] Starting media engine. Local port: ${localPort}, Remote: ${remoteIp}:${remotePort}`);

    // Create UDP socket for RTP
    this.rtpSocket = dgram.createSocket('udp4');
    this.rtpSocket.on('error', (err) => console.error('[RTP] UDP Error:', err));
    
    this.rtpSocket.on('message', (msg, rinfo) => {
      // Decode incoming RTP packets
      if (msg.length <= 12) return;
      const pt = msg[1] & 0x7F;
      // PCMU (0) and PCMA (8) support
      if (pt === 0 || pt === 8) {
        const payload = msg.slice(12);
        const pcmFloat = new Float32Array(payload.length);
        const decoder = (pt === 0) ? ulawDecode : alawDecode;
        
        for (let i = 0; i < payload.length; i++) {
          pcmFloat[i] = decoder[payload[i]];
        }
        
        this.jitterBuffer.push(pcmFloat);
        // Dynamic jitter buffer sizing (10 ~ 200ms at 20ms chunks)
        if (this.jitterBuffer.length > 15) {
          this.jitterBuffer.shift();
        }
      }
    });

    this.rtpSocket.on('error', (err) => {
      console.error('[RTP] Socket error:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.warn(`[RTP] Port ${this.localPort} in use. Trying another random port...`);
        this.localPort = this.localPort + Math.floor(Math.random() * 10) + 1;
        try { this.rtpSocket.close(); } catch(e) {}
        this.isRunning = false; // Reset so start() works
        this.start(this.localPort, this.remoteIp, this.remotePort, this.codec);
      }
    });

    this.rtpSocket.bind(this.localPort, () => {
      console.log(`[RTP] Bound to local port ${this.localPort}`);
      this._startAudioContext();
    });
  }

  async _startAudioContext() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });
    // Use smaller buffer for lower latency
    this.scriptProcessor = this.audioCtx.createScriptProcessor(512, 1, 1);

    let micInputAvailable = false;
    this.sendBuffer = []; // Outgoing microphone buffer
    this.sendInterval = null;

    try {
      if (!navigator.mediaDevices) {
        throw new Error("MediaDevices API bu kompyuterda ishlamaydi.");
      }
      const constraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
      
      // Mikrofonni sozlamalardan o'qish (agar tanlangan bo'lsa)
      if (window.Settings && typeof window.Settings.get === 'function') {
        const savedMicId = window.Settings.get('audio-input');
        if (savedMicId && savedMicId !== 'default') {
          constraints.audio.deviceId = { exact: savedMicId };
        }
      }

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.audioStream);
      this.sourceNode.connect(this.scriptProcessor);
      micInputAvailable = true;
      console.log('[RTP] Audio capture started successfully.');
    } catch (err) {
      console.error('[RTP] Audio capture failed:', err);
      // Fallback
    }

    this.scriptProcessor.onaudioprocess = (e) => {
      // 1. Playback
      const outputBuffer = e.outputBuffer.getChannelData(0);
      let outIdx = 0;
      
      while (outIdx < outputBuffer.length && this.jitterBuffer.length > 0) {
        let chunk = this.jitterBuffer[0];
        let space = outputBuffer.length - outIdx;
        if (chunk.length <= space) {
          if (!this.isHold) outputBuffer.set(chunk, outIdx);
          outIdx += chunk.length;
          this.jitterBuffer.shift();
        } else {
          if (!this.isHold) outputBuffer.set(chunk.slice(0, space), outIdx);
          this.jitterBuffer[0] = chunk.slice(space);
          outIdx += space;
        }
      }
      while (outIdx < outputBuffer.length) {
        outputBuffer[outIdx++] = 0;
      }

      // 2. Microphone Capture
      if (micInputAvailable) {
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          this.sendBuffer.push(inputData[i]);
        }
        
        let delay = 0;
        while (this.sendBuffer.length >= 160) {
          let chunk = new Float32Array(160);
          for (let i = 0; i < 160; i++) {
            chunk[i] = this.sendBuffer.shift();
          }
          setTimeout(() => {
            if (this.rtpSocket) this._sendRtpPacket(chunk);
          }, delay);
          delay += 20;
        }
      }
    };

    // Faqat decoded RTP (remote audio) ni speaker'ga ulash, mikrofon EMAS!
    // scriptProcessor ham kiruvchi (mic) ham chiquvchi (rtp) ni qayta ishlaydi,
    // lekin speaker'ga faqat decoded RTP (outputBuffer) yetkaziladi.
    const outDest = this.audioCtx.createMediaStreamDestination();
    
    // Alohida AudioBuffer source orqali speaker'ga output qilamiz
    // Bu mikrofon echo muammosini bartaraf etadi.
    this.scriptProcessor.connect(this.audioCtx.destination);
    // NOTE: this.audioCtx.destination - bu kompyuter karnayiga to'g'ridan-to'g'ri ulanadi

    this.speakerAudio = null; // Artiq kerak emas, to'g'ridan-to'g'ri destination ishlatiladi
    console.log('[RTP] Audio context started. Output -> system speaker (no echo).');
  }
  
  _sendRtpPacket(chunk) {
    if (!this.rtpSocket) return;
    
    const rtpPacket = Buffer.alloc(12 + 160);
    // RTP Header
    rtpPacket[0] = 0x80;
    rtpPacket[1] = 0x00; // Payload type 0 (PCMU)
    rtpPacket.writeUInt16BE(this.seq, 2);
    rtpPacket.writeUInt32BE(this.ts, 4);
    rtpPacket.writeUInt32BE(this.ssrc, 8);
    
    let encodedPayload = Buffer.alloc(160);
    for (let i = 0; i < 160; i++) {
      let sample = chunk[i] * 32768;
      if (sample > 32767) sample = 32767;
      if (sample < -32768) sample = -32768;
      encodedPayload[i] = ulawEncode[sample & 0xFFFF];
    }
    
    if (this.isMuted || this.isHold) encodedPayload.fill(0xFF);
    encodedPayload.copy(rtpPacket, 12);
    
    try {
      this.rtpSocket.send(rtpPacket, 0, rtpPacket.length, this.remotePort, this.remoteIp);
      this.seq = (this.seq + 1) % 65536;
      this.ts = (this.ts + 160) % 4294967296;
    } catch (e) {
      console.warn('[RTP] Send error:', e);
    }
  }

  setMute(isMuted) {
    this.isMuted = isMuted;
  }

  setHold(isHold) {
    this.isHold = isHold;
  }

  getMixedStream() {
    if (!this.audioCtx) return null;
    const dest = this.audioCtx.createMediaStreamDestination();
    // scriptProcessor'ning ulanishi "remote audio" ni yozib oladi
    if (this.scriptProcessor) {
      this.scriptProcessor.connect(dest);
    }
    // sourceNode'ning ulanishi "mikrofon (local audio)" ni yozib oladi
    if (this.sourceNode) {
      this.sourceNode.connect(dest);
    }
    return dest.stream;
  }

  stop() {
    console.log('[RTP] Stopping media engine.');
    this.isRunning = false;
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    this.sendBuffer = [];
    if (this.speakerAudio) {
      try {
        this.speakerAudio.pause();
        this.speakerAudio.srcObject = null;
        if (this.speakerAudio.parentNode) {
          this.speakerAudio.parentNode.removeChild(this.speakerAudio);
        }
      } catch(e) {}
      this.speakerAudio = null;
    }
    if (this.scriptProcessor) {
      try { this.scriptProcessor.disconnect(); } catch(e) {}
      this.scriptProcessor = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch(e) {}
      this.sourceNode = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(t => t.stop());
      this.audioStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(()=>{});
      this.audioCtx = null;
    }
    if (this.rtpSocket) {
      try { this.rtpSocket.close(); } catch(e) {}
      this.rtpSocket = null;
    }
    this.jitterBuffer = [];
  }
}

module.exports = RtpMediaEngine;
