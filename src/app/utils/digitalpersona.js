'use client';

// Fingerprint bridge — connects to fingerprint-service/server.js on ws://localhost:15896
// Uses Windows Biometric Framework via WinBioIdentify / WinBioVerify.
//
// Each user's fingerprint_template field stores their Windows SID (hex string).
// Users must be enrolled in Windows Hello before mapping in Settings.

const DP_SERVICE_URL = 'ws://localhost:15896';
const REQUEST_TIMEOUT = 20000;

export class DigitalPersonaReader {
  constructor() {
    this.ws = null;
    this.deviceId = null;
    this.isReady = false;
    this.callbacks = {};
    this.requestId = 1;
    this.pendingRequests = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Browser environment required'));

      try {
        this.ws = new WebSocket(DP_SERVICE_URL);

        const connectTimeout = setTimeout(() => {
          if (!this.isReady) {
            this.ws?.close();
            reject(new Error(
              'DigitalPersona WebAPI service not found at ' + DP_SERVICE_URL + '.\n' +
              'Please run fingerprint-service\\start.bat and keep it open.',
            ));
          }
        }, 5000);

        this.ws.onopen = async () => {
          clearTimeout(connectTimeout);
          this.isReady = true;
          try { await this.getDevices(); } catch { /* no device yet */ }
          resolve(true);
        };

        this.ws.onerror = () => {
          clearTimeout(connectTimeout);
          reject(new Error(
            'DigitalPersona WebAPI service not found at ' + DP_SERVICE_URL + '.\n' +
            'Please run fingerprint-service\\start.bat and keep it open.',
          ));
        };

        this.ws.onclose = () => {
          this.isReady = false;
          this.deviceId = null;
          this.callbacks.onServiceDisconnected?.();
        };

        this.ws.onmessage = (event) => {
          try { this.handleMessage(JSON.parse(event.data)); } catch { /* ignore */ }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
        return reject(new Error('Not connected to fingerprint service'));

      const id = this.requestId++;
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request '${method}' timed out`));
        }
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject:  (e) => { clearTimeout(timeout); reject(e);  },
      });

      this.ws.send(JSON.stringify({ jsonrpc: '2.0', method, id, params }));
    });
  }

  handleMessage(msg) {
    // JSON-RPC response
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || 'Fingerprint service error'));
      else resolve(msg.result);
      return;
    }

    // Events
    const eventName = msg.Event || msg.event || msg.method;
    const params    = msg.Params || msg.params || msg;

    switch (eventName) {
      case 'DeviceConnected':
        this.deviceId = params.DeviceId || params.deviceId;
        this.callbacks.onDeviceConnected?.();
        break;
      case 'DeviceDisconnected':
        this.deviceId = null;
        this.callbacks.onDeviceDisconnected?.();
        break;

      case 'IdentifyResult':
        this.callbacks.onIdentifyResult?.(params);
        break;

      case 'VerifyResult':
        this.callbacks.onVerifyResult?.(params);
        break;

      case 'SampleAcquired':
      case 'SamplesAcquired': {
        const sample = params.Sample || params.sample || params.samples?.[0];
        this.callbacks.onSample?.(sample);
        break;
      }

      case 'QualityReported':
        this.callbacks.onQuality?.(params.Quality ?? params.quality ?? 'Place finger');
        break;

      case 'ErrorOccurred':
        this.callbacks.onError?.(`${params.Error || params.error || 'Scanner error'}`);
        break;
    }
  }

  async getDevices() {
    const devices = await this.send('GetDevices');
    const list = Array.isArray(devices) ? devices : (devices?.Devices || []);
    if (list.length > 0) {
      this.deviceId = list[0];
      this.callbacks.onDeviceConnected?.();
    }
    return list;
  }

  // ── Identify: place finger → returns { matched, identity (sidHex), subFactor }
  identify() {
    return new Promise((resolve, reject) => {
      this.callbacks.onIdentifyResult = (result) => {
        this.callbacks.onIdentifyResult = null;
        this.callbacks.onError = null;
        resolve(result); // { Matched, Identity, SubFactor }
      };
      this.callbacks.onError = (err) => {
        this.callbacks.onIdentifyResult = null;
        this.callbacks.onError = null;
        reject(new Error(err));
      };
      this.send('Identify').catch(reject);
    });
  }

  // ── VerifyIdentity: place finger → check it matches the given SID
  verifyIdentity(sidHex) {
    return new Promise((resolve, reject) => {
      this.callbacks.onVerifyResult = (result) => {
        this.callbacks.onVerifyResult = null;
        this.callbacks.onError = null;
        resolve({ matched: result.Matched === true });
      };
      this.callbacks.onError = (err) => {
        this.callbacks.onVerifyResult = null;
        this.callbacks.onError = null;
        reject(new Error(err));
      };
      this.send('Verify', { identity: sidHex }).catch(reject);
    });
  }

  // Legacy stub kept for any remaining callers
  async startCapture(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    return this.send('StartCapture', {});
  }

  async stopCapture() {
    try { await this.send('StopCapture'); } catch { /* ignore */ }
  }

  // Legacy stub — superseded by verifyIdentity
  async verify(/* reference, probe */) {
    return { matched: false, score: 0 };
  }

  disconnect() {
    this.stopCapture().catch(() => {});
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.isReady = false;
    this.deviceId = null;
  }

  isDeviceAvailable() {
    return this.isReady && this.deviceId !== null;
  }
}

let _readerInstance = null;

export function getReader() {
  if (typeof window === 'undefined') return null;
  if (!_readerInstance) _readerInstance = new DigitalPersonaReader();
  return _readerInstance;
}
