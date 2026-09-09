import dgram from 'dgram';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db.js';

export interface TerminalEventPayload {
  type: 'SCAN' | 'HEARTBEAT' | 'DEV' | 'CARD' | 'STATUS_CHANGE';
  code?: string;
  rssi?: number;
  ts: string;
  remoteIp?: string;
  raw: string;
  isDuplicate?: boolean;
}

export class TerminalBridge {
  private udpSocket: dgram.Socket | null = null;
  private wss: WebSocketServer | null = null;
  private lastScanCode: string = '';
  private lastScanTimestamp: number = 0;
  private port: number = 5005;
  private isListeningUdp: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private packetLogs: any[] = [];

  constructor(port = 5005) {
    this.port = port;
  }

  public attachWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;

    // Periodically check terminal online/offline status (every 2s)
    if (!this.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => {
        void this.checkTerminalStatus();
      }, 2000);
    }
  }

  public startUdpServer(customPort?: number) {
    if (customPort) this.port = customPort;
    try {
      this.udpSocket = dgram.createSocket('udp4');

      this.udpSocket.on('error', (err) => {
        console.warn(`[TerminalBridge] UDP socket warning on port ${this.port}:`, err.message);
        this.isListeningUdp = false;
      });

      this.udpSocket.on('message', (msg, rinfo) => {
        void this.handleRawUdpBuffer(msg, rinfo.address);
      });

      this.udpSocket.on('listening', () => {
        const address = this.udpSocket?.address();
        this.isListeningUdp = true;
        console.log(`[TerminalBridge] UDP Bridge listening on port ${address?.port} for ESP32-S3 packets`);
      });

      this.udpSocket.bind(this.port, '0.0.0.0');
    } catch (err: any) {
      console.warn(`[TerminalBridge] Could not bind UDP port ${this.port}: ${err.message}. Simulator mode available.`);
      this.isListeningUdp = false;
    }
  }

  /**
   * Decode raw buffer supporting UTF-8 and fallback handling
   */
  private decodeBuffer(buffer: Buffer): string {
    try {
      // First try standard UTF-8
      const utf8 = buffer.toString('utf-8');
      // If no weird replacement characters, return utf8
      if (!utf8.includes('\uFFFD')) {
        return utf8;
      }
      // Fallback: Latin1/ASCII or raw string conversion
      return buffer.toString('latin1');
    } catch {
      return buffer.toString('utf-8');
    }
  }

  public async handleRawUdpBuffer(buffer: Buffer, remoteIp = '127.0.0.1'): Promise<TerminalEventPayload | null> {
    const rawText = this.decodeBuffer(buffer).trim();
    return this.processPacket(rawText, remoteIp);
  }

  public async processPacket(rawText: string, remoteIp = '127.0.0.1'): Promise<TerminalEventPayload | null> {
    const now = Date.now();
    const settings = await db.getSettings();

    let event: TerminalEventPayload;

    if (rawText.startsWith('HEARTBEAT:')) {
      const rssiStr = rawText.substring('HEARTBEAT:'.length).trim();
      const rssi = parseInt(rssiStr, 10) || -60;
      await db.recordTerminalHeartbeat(rssi, remoteIp);

      event = {
        type: 'HEARTBEAT',
        rssi,
        ts: new Date().toISOString(),
        remoteIp,
        raw: rawText
      };
    } else if (rawText.startsWith('DEV:')) {
      const code = rawText.trim();
      if (this.isDuplicateScan(code, now, settings.duplicateWindowMs)) {
        console.log(`[TerminalBridge] Ignored duplicate DEV scan: ${code}`);
        return null;
      }
      event = {
        type: 'DEV',
        code,
        ts: new Date().toISOString(),
        remoteIp,
        raw: rawText
      };
    } else if (rawText.startsWith('CARD:')) {
      const code = rawText.trim();
      if (this.isDuplicateScan(code, now, settings.duplicateWindowMs)) {
        console.log(`[TerminalBridge] Ignored duplicate CARD scan: ${code}`);
        return null;
      }
      event = {
        type: 'CARD',
        code,
        ts: new Date().toISOString(),
        remoteIp,
        raw: rawText
      };
    } else if (rawText.startsWith('SCAN:')) {
      const content = rawText.substring('SCAN:'.length).trim();
      const code = content;

      if (this.isDuplicateScan(code, now, settings.duplicateWindowMs)) {
        console.log(`[TerminalBridge] Ignored duplicate SCAN: ${code}`);
        return null;
      }

      // Check prefixes to auto-categorize if configured
      let type: 'SCAN' | 'DEV' | 'CARD' = 'SCAN';
      if (code.startsWith('DEV:') || code.startsWith('SI-') || code.startsWith('ИНВ-')) {
        type = 'DEV';
      } else if (code.startsWith('CARD:') || code.startsWith('PASS-')) {
        type = 'CARD';
      }

      event = {
        type,
        code,
        ts: new Date().toISOString(),
        remoteIp,
        raw: rawText
      };
    } else {
      // Raw code without prefix
      const code = rawText.trim();
      if (this.isDuplicateScan(code, now, settings.duplicateWindowMs)) {
        return null;
      }
      event = {
        type: 'SCAN',
        code,
        ts: new Date().toISOString(),
        remoteIp,
        raw: rawText
      };
    }

    // Store packet log
    const logEntry = {
      id: 'pkt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type: event.type,
      raw: rawText,
      code: event.code,
      decoded: event.code || rawText,
      rssi: event.rssi,
      timestamp: event.ts,
      remoteIp
    };
    this.packetLogs.unshift(logEntry);
    if (this.packetLogs.length > 100) this.packetLogs.pop();

    // Broadcast to WebSocket clients
    this.broadcast(event);
    return event;
  }

  public getPacketLogs() {
    return this.packetLogs;
  }

  private isDuplicateScan(code: string, timestamp: number, windowMs: number): boolean {
    if (this.lastScanCode === code && (timestamp - this.lastScanTimestamp) < windowMs) {
      return true;
    }
    this.lastScanCode = code;
    this.lastScanTimestamp = timestamp;
    return false;
  }

  public broadcast(event: any) {
    if (!this.wss) return;
    const data = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private async checkTerminalStatus() {
    const terminals = await db.getTerminals();
    const primary = terminals[0];
    if (primary) {
      this.broadcast({
        type: 'STATUS_CHANGE',
        status: primary.status,
        rssi: primary.rssi,
        lastHeartbeat: primary.lastHeartbeat,
        ts: new Date().toISOString()
      });
    }
  }

  public async getStatus() {
    return {
      isListeningUdp: this.isListeningUdp,
      port: this.port,
      activeWsClients: this.wss ? this.wss.clients.size : 0,
      terminals: await db.getTerminals()
    };
  }

  public stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.udpSocket) {
      try {
        this.udpSocket.close();
      } catch {}
    }
  }
}

export const terminalBridge = new TerminalBridge();
