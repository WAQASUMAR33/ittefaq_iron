'use client';

const DEFAULT_BRIDGE_URLS = ['ws://localhost:15897', 'ws://localhost:15896'];

function isOpen(ws) {
  return ws && ws.readyState === WebSocket.OPEN;
}

export function createFingerprintBridge(url = DEFAULT_BRIDGE_URLS) {
  let ws = null;
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  const recentEvents = [];
  let lastEventName = null;
  let lastEventAt = 0;

  function emitEvent(event) {
    for (const fn of listeners) {
      try { fn(event); } catch { /* ignore */ }
    }
  }

  function failAllPending(error) {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  }

  function normalizeUrls(input) {
    if (Array.isArray(input)) return input;
    return [input];
  }

  async function connect(timeoutMs = 6000) {
    if (isOpen(ws)) return Promise.resolve();
    let lastError = null;
    for (const candidateUrl of normalizeUrls(url)) {
      try {
        await new Promise((resolve, reject) => {
          const socket = new WebSocket(candidateUrl);
          let done = false;
          const timer = setTimeout(() => {
            if (done) return;
            done = true;
            try { socket.close(); } catch { /* ignore */ }
            reject(new Error(`Could not connect to fingerprint service at ${candidateUrl}`));
          }, timeoutMs);

          socket.onopen = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            ws = socket;
            resolve();
          };

          socket.onerror = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            reject(new Error(`Could not connect to fingerprint service at ${candidateUrl}`));
          };

          socket.onmessage = (evt) => {
            let msg;
            try { msg = JSON.parse(evt.data); } catch { return; }

            if (msg && msg.id !== undefined && pending.has(msg.id)) {
              const { resolve: r, reject: j, timer: t } = pending.get(msg.id);
              clearTimeout(t);
              pending.delete(msg.id);
              if (msg.error) j(new Error(msg.error.message || 'Fingerprint service RPC error'));
              else r(msg.result);
              return;
            }

            if (msg?.Event) {
              lastEventName = msg.Event;
              lastEventAt = Date.now();
              recentEvents.push(msg);
              if (recentEvents.length > 40) recentEvents.shift();
              emitEvent(msg);
            }
          };

          socket.onclose = () => {
            ws = null;
            failAllPending(new Error('Fingerprint service connection closed'));
          };
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Could not connect to fingerprint service.');
  }

  async function call(method, params = {}, timeoutMs = 12000) {
    await connect();
    if (!isOpen(ws)) throw new Error('Fingerprint service is not connected');

    const id = nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} request timed out`));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
      ws.send(payload);
    });
  }

  function waitForEvent(eventNames, timeoutMs = 30000, predicate = () => true) {
    return new Promise((resolve, reject) => {
      const wanted = new Set(eventNames);
      // Handle races: consume a matching event that arrived just before subscription.
      const idx = recentEvents.findIndex((event) => wanted.has(event?.Event) && predicate(event));
      if (idx >= 0) {
        const [event] = recentEvents.splice(idx, 1);
        resolve(event);
        return;
      }

      const handler = (event) => {
        if (!wanted.has(event?.Event)) return;
        if (!predicate(event)) return;
        cleanup();
        resolve(event);
      };

      const timer = setTimeout(() => {
        cleanup();
        const wanted = Array.from(eventNames).join(' or ');
        const last = lastEventName
          ? `${lastEventName} (${Math.round((Date.now() - lastEventAt) / 1000)}s ago)`
          : 'none';
        reject(new Error(`Timed out waiting for ${wanted}. Last bridge event: ${last}.`));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        listeners.delete(handler);
      }

      listeners.add(handler);
    });
  }

  async function getDevices() {
    const result = await call('GetDevices', {}, 8000);
    return Array.isArray(result) ? result : [];
  }

  async function getCurrentIdentity() {
    const result = await call('GetCurrentIdentity', {}, 8000);
    const sidHex = result?.Identity;
    if (!sidHex || typeof sidHex !== 'string') {
      throw new Error('Fingerprint service did not return current Windows identity');
    }
    return sidHex;
  }

  async function identify(timeoutMs = 60000) {
    const wait = waitForEvent(['IdentifyResult', 'ErrorOccurred'], timeoutMs);
    await call('Identify', {}, 8000);
    const event = await wait;
    if (event.Event === 'ErrorOccurred') throw new Error(event.Error || 'Fingerprint identify failed');
    return {
      matched: !!event.Matched,
      identity: event.Identity || null,
      canceled: !!event.Canceled,
    };
  }

  async function verify(identity, timeoutMs = 60000) {
    const wait = waitForEvent(['VerifyResult', 'ErrorOccurred'], timeoutMs);
    await call('Verify', { identity }, 8000);
    const event = await wait;
    if (event.Event === 'ErrorOccurred') throw new Error(event.Error || 'Fingerprint verify failed');
    return { matched: !!event.Matched };
  }

  async function stopCapture() {
    try { await call('StopCapture', {}, 5000); } catch { /* ignore */ }
  }

  function close() {
    failAllPending(new Error('Fingerprint bridge closed'));
    if (ws) {
      try { ws.close(); } catch { /* ignore */ }
      ws = null;
    }
  }

  return { connect, getDevices, getCurrentIdentity, identify, verify, stopCapture, close };
}
