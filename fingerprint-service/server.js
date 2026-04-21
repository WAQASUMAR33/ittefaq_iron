'use strict';
/**
 * Fingerprint bridge — uses Windows Biometric Framework (winbio.dll)
 * Replaces dpfpdd.dll approach; works with any WBF-compatible fingerprint driver.
 *
 * Prerequisites:
 *   - Windows Biometric Service (WbioSrvc) running
 *   - Fingerprint driver installed (WBF/HID compatible)
 *   - Each app user must have their fingerprint enrolled in Windows Hello
 *     (Settings → Accounts → Sign-in options → Windows Hello Fingerprint)
 *
 * Run: node server.js
 */

const WebSocket = require('ws');
const koffi = require('koffi');

const PORT = 15896;

// ─── WinBio constants ─────────────────────────────────────────────────────────
const WINBIO_TYPE_FINGERPRINT = 8;
const WINBIO_POOL_SYSTEM      = 1;
const WINBIO_FLAG_DEFAULT     = 0;
const WINBIO_SUBTYPE_ANY      = 0xFF;
const WINBIO_ID_TYPE_SID      = 3;
const S_OK                    = 0;

// Common int32 values from winbio.h
const WINBIO_E_NO_MATCH        = 0x80098007;
const WINBIO_E_UNKNOWN_ID      = 0x80098010;
const WINBIO_E_BAD_CAPTURE     = 0x80098009;
const WINBIO_E_CANCELED        = 0x80098015;

// ─── Koffi setup ──────────────────────────────────────────────────────────────
// WINBIO_IDENTITY: Type (4 bytes) + Value union (max 72 bytes: 4-byte size + 68-byte SID data)
const WinbioIdentity = koffi.struct('WINBIO_IDENTITY', {
  Type:  'uint32',
  Value: koffi.array('uint8', 72),
});

let winbio;
let fnOpenSession, fnIdentify, fnVerify, fnCloseSession, fnCancel;
let sessionHandle = 0;
let busy = false;
let busyTimeout = null;
let callGeneration = 0;

function setBusy() {
  busy = true;
  if (busyTimeout) clearTimeout(busyTimeout);
  busyTimeout = setTimeout(() => {
    if (busy) {
      console.log('  [!] Scan timeout — resetting busy flag');
      busy = false;
      callGeneration++;
    }
  }, 30000);
}

function clearBusy() {
  busy = false;
  if (busyTimeout) { clearTimeout(busyTimeout); busyTimeout = null; }
}

function hrStr(hr) {
  return '0x' + (hr >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function loadAndInit() {
  winbio = koffi.load('winbio.dll');

  fnOpenSession = winbio.func(
    'int32 WinBioOpenSession(' +
    '  uint32 Factor, uint32 PoolType, uint32 Flags,' +
    '  void *UnitArray, size_t UnitCount, void *DatabaseId,' +
    '  _Out_ size_t *SessionHandle)',
  );

  fnIdentify = winbio.func(
    'int32 WinBioIdentify(' +
    '  size_t SessionHandle,' +
    '  _Out_ uint32 *UnitId,' +
    '  _Out_ WINBIO_IDENTITY *Identity,' +
    '  _Out_ uint8  *SubFactor,' +
    '  _Out_ uint32 *RejectDetail)',
  );

  fnVerify = winbio.func(
    'int32 WinBioVerify(' +
    '  size_t SessionHandle,' +
    '  WINBIO_IDENTITY *Identity,' +
    '  uint8 SubFactor,' +
    '  _Out_ uint32 *UnitId,' +
    '  _Out_ int32  *Match,' +
    '  _Out_ uint32 *RejectDetail)',
  );

  fnCloseSession = winbio.func('int32 WinBioCloseSession(size_t SessionHandle)');
  fnCancel       = winbio.func('int32 WinBioCancel(size_t SessionHandle)');

  const sessionOut = [0];
  const hr = fnOpenSession(
    WINBIO_TYPE_FINGERPRINT,
    WINBIO_POOL_SYSTEM,
    WINBIO_FLAG_DEFAULT,
    null, 0, null,
    sessionOut,
  );

  if (hr !== S_OK) {
    throw new Error(
      `WinBioOpenSession failed: ${hrStr(hr)}\n` +
      'Check that Windows Biometric Service is running and device is connected.',
    );
  }

  sessionHandle = sessionOut[0];
  console.log('✓ winbio.dll loaded');
  console.log('✓ WinBio session opened (handle: ' + sessionHandle + ')');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sidHexFromIdentity(identity) {
  if (identity.Type !== WINBIO_ID_TYPE_SID) return null;
  const v = identity.Value;
  const size = v[0] | (v[1] << 8) | (v[2] << 16) | (v[3] << 24);
  if (size <= 0 || size > 68) return null;
  return Buffer.from(v.slice(4, 4 + size)).toString('hex');
}

function buildSIDIdentity(sidHex) {
  const sidBytes = Buffer.from(sidHex, 'hex');
  const value = new Array(72).fill(0);
  value[0] = sidBytes.length & 0xFF;
  value[1] = (sidBytes.length >> 8) & 0xFF;
  value[2] = (sidBytes.length >> 16) & 0xFF;
  value[3] = (sidBytes.length >> 24) & 0xFF;
  for (let i = 0; i < sidBytes.length && i < 68; i++) value[4 + i] = sidBytes[i];
  return { Type: WINBIO_ID_TYPE_SID, Value: value };
}

// ─── WebSocket server ─────────────────────────────────────────────────────────
function startServer() {
  loadAndInit();

  const wss = new WebSocket.Server({ port: PORT });
  console.log(`\n✓ Fingerprint service running on ws://localhost:${PORT}`);
  console.log('  Keep this window open while using the app.\n');

  wss.on('connection', (ws) => {
    console.log('  [+] App connected');

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      const { id, method, params = {} } = msg;

      try {
        // ── GetDevices ────────────────────────────────────────────────────────
        if (method === 'GetDevices') {
          send(ws, id, ['fingerprint-sensor-0']);
          sendEvent(ws, { Event: 'DeviceConnected', DeviceId: 'fingerprint-sensor-0' });

        // ── StopCapture: cancel any in-progress WinBio operation ─────────────
        } else if (method === 'StopCapture' || method === 'StartCapture') {
          if (method === 'StopCapture' && busy) {
            callGeneration++; // invalidate any pending callback
            try { fnCancel(sessionHandle); } catch { /* ignore */ }
            clearBusy();
            console.log('  [*] Capture cancelled by client');
          }
          send(ws, id, {});

        // ── Identify: scan → auto-detect who it is by Windows SID ─────────────
        } else if (method === 'Identify') {
          if (busy) {
            callGeneration++; // invalidate stale callback before cancelling
            try { fnCancel(sessionHandle); } catch { /* ignore */ }
            clearBusy();
          }
          const myGen = ++callGeneration;
          setBusy();
          send(ws, id, {}); // immediate ack

          const unitId       = [0];
          const identity     = { Type: 0, Value: new Array(72).fill(0) };
          const subFactor    = [0];
          const rejectDetail = [0];

          fnIdentify.async(sessionHandle, unitId, identity, subFactor, rejectDetail, (err, hr) => {
            if (callGeneration !== myGen) return; // stale callback — discard
            clearBusy();
            if (err) {
              sendEvent(ws, { Event: 'ErrorOccurred', Error: err.message });
              return;
            }

            const hru = hr >>> 0;
            if (hru === WINBIO_E_UNKNOWN_ID || hru === WINBIO_E_NO_MATCH) {
              sendEvent(ws, { Event: 'IdentifyResult', Matched: false, Identity: null });
              return;
            }
            if (hru === WINBIO_E_CANCELED) {
              sendEvent(ws, { Event: 'IdentifyResult', Matched: false, Identity: null, Canceled: true });
              return;
            }
            if (hr !== S_OK) {
              sendEvent(ws, { Event: 'ErrorOccurred', Error: `WinBioIdentify: ${hrStr(hr)}` });
              return;
            }

            const sidHex = sidHexFromIdentity(identity);
            if (!sidHex) {
              sendEvent(ws, { Event: 'IdentifyResult', Matched: false, Identity: null });
              return;
            }

            console.log(`  [*] Identified SID: ${sidHex.slice(0, 16)}... SubFactor: ${subFactor[0]}`);
            sendEvent(ws, { Event: 'IdentifyResult', Matched: true, Identity: sidHex, SubFactor: subFactor[0] });
          });
          return;

        // ── Verify: scan → check if it matches a specific user's SID ──────────
        } else if (method === 'Verify') {
          const { identity: sidHex } = params;
          if (!sidHex) throw new Error('identity (SID hex) required');
          if (busy) {
            callGeneration++;
            try { fnCancel(sessionHandle); } catch { /* ignore */ }
            clearBusy();
          }
          const myGen = ++callGeneration;
          setBusy();
          send(ws, id, {}); // immediate ack

          const identityStruct = buildSIDIdentity(sidHex);
          const unitId       = [0];
          const match        = [0];
          const rejectDetail = [0];

          fnVerify.async(
            sessionHandle, identityStruct, WINBIO_SUBTYPE_ANY,
            unitId, match, rejectDetail,
            (err, hr) => {
              if (callGeneration !== myGen) return; // stale callback — discard
              clearBusy();
              if (err) {
                sendEvent(ws, { Event: 'VerifyResult', Matched: false, Error: err.message });
                return;
              }
              const hru = hr >>> 0;
              if (hr === S_OK) {
                sendEvent(ws, { Event: 'VerifyResult', Matched: match[0] !== 0 });
              } else if (hru === WINBIO_E_BAD_CAPTURE || hru === WINBIO_E_NO_MATCH || hru === WINBIO_E_CANCELED) {
                sendEvent(ws, { Event: 'VerifyResult', Matched: false });
              } else {
                sendEvent(ws, { Event: 'ErrorOccurred', Error: `WinBioVerify: ${hrStr(hr)}` });
              }
            },
          );
          return;

        } else {
          throw new Error(`Unknown method: ${method}`);
        }
      } catch (err) {
        console.error('  [!]', err.message);
        if (id !== undefined) {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: err.message } }));
        }
      }
    });

    ws.on('close', () => { console.log('  [-] App disconnected'); });
    ws.on('error', () => {});
  });

  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);

  function shutdown() {
    console.log('\nShutting down...');
    try { fnCloseSession(sessionHandle); } catch { /* ignore */ }
    process.exit(0);
  }
}

function send(ws, id, result) {
  if (ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify({ jsonrpc: '2.0', id, result }));
}

function sendEvent(ws, payload) {
  if (ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify(payload));
}

// ─── Start ────────────────────────────────────────────────────────────────────
try {
  startServer();
} catch (err) {
  console.error('\n✗ Failed to start fingerprint service:');
  console.error(err.message);
  process.exit(1);
}
