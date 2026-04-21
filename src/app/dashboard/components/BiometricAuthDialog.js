'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const SCAN = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  READY: 'ready',
  SCANNING: 'scanning',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function BiometricAuthDialog({ open, onSuccess, onClose }) {
  const [tab, setTab] = useState('pin');

  // Fingerprint state
  const [scanState, setScanState] = useState(SCAN.IDLE);
  const [scanMsg, setScanMsg] = useState('');
  const [fpError, setFpError] = useState('');
  const readerRef = useRef(null);
  const activeRef = useRef(false);

  // PIN state
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Get current logged-in user from localStorage
  const getCurrentUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  };

  // Reset state whenever dialog opens
  useEffect(() => {
    if (open) {
      setTab('pin'); // default to PIN; fingerprint only connects if user switches to it
      setScanState(SCAN.IDLE);
      setScanMsg('');
      setFpError('');
      setPin('');
      setPinError('');
      activeRef.current = true;
    } else {
      activeRef.current = false;
      readerRef.current?.stopCapture().catch(() => {});
    }
  }, [open]);

  // Auto-init scanner when fingerprint tab is active and dialog is open
  const initScanner = useCallback(async () => {
    if (!activeRef.current) return;
    setScanState(SCAN.CONNECTING);
    setScanMsg('Connecting to scanner...');
    setFpError('');

    try {
      const { getReader } = await import('../../utils/digitalpersona');
      const reader = getReader();
      readerRef.current = reader;

      if (!reader.isReady) await reader.connect();

      if (!activeRef.current) return;
      setScanState(SCAN.READY);
      setScanMsg('Place your finger on the scanner.');

      reader.callbacks.onDeviceConnected = () => {
        if (!activeRef.current) return;
        setScanState(SCAN.READY);
        setScanMsg('Device connected. Place finger.');
      };
      reader.callbacks.onDeviceDisconnected = () => {
        if (!activeRef.current) return;
        setScanState(SCAN.ERROR);
        setFpError('Scanner disconnected. Reconnect and retry.');
      };
    } catch (err) {
      if (!activeRef.current) return;
      setScanState(SCAN.ERROR);
      setFpError(err.message);
    }
  }, []);

  useEffect(() => {
    if (open && tab === 'fingerprint') {
      initScanner();
    }
  }, [open, tab, initScanner]);

  async function handleScan() {
    const user = getCurrentUser();
    if (!user) { setFpError('Session expired. Please log in again.'); return; }

    const reader = readerRef.current;
    if (!reader) { setFpError('Scanner not ready. Click Retry.'); return; }

    setFpError('');
    setScanState(SCAN.SCANNING);
    setScanMsg('Place finger on scanner...');

    try {
      // Fetch stored SID for this user
      const templateRes = await fetch(`/api/auth/user-template?userId=${user.user_id}`);
      const templateData = await templateRes.json();

      if (!templateData.enrolled || !templateData.template) {
        setScanState(SCAN.ERROR);
        setFpError('No fingerprint enrolled for your account. Use PIN instead, or ask admin to map your fingerprint in Settings → Biometric Settings.');
        return;
      }

      if (!activeRef.current) return;

      // Verify finger against the stored Windows SID
      const { matched } = await reader.verifyIdentity(templateData.template);

      if (!activeRef.current) return;

      if (matched) {
        setScanState(SCAN.SUCCESS);
        setScanMsg('Verified!');
        setTimeout(() => { if (activeRef.current) onSuccess(); }, 600);
      } else {
        setScanState(SCAN.ERROR);
        setFpError('Fingerprint not recognized. Try again or use PIN.');
      }
    } catch (err) {
      if (!activeRef.current) return;
      setScanState(SCAN.ERROR);
      setFpError('Verification error: ' + err.message);
    }
  }

  // PIN handlers
  function addDigit(d) { if (pin.length < 6) setPin(p => p + d); }
  function backspace() { setPin(p => p.slice(0, -1)); }

  async function submitPin() {
    if (pin.length !== 6) { setPinError('Enter all 6 digits.'); return; }
    const user = getCurrentUser();
    if (!user) { setPinError('Session expired.'); return; }

    setPinLoading(true);
    setPinError('');

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.user_id, pin }),
      });
      const data = await res.json();

      if (data.valid) {
        onSuccess();
      } else {
        setPinError(data.error || 'Incorrect PIN. Try again.');
        setPin('');
      }
    } catch {
      setPinError('Network error. Try again.');
      setPin('');
    }

    setPinLoading(false);
  }

  if (!open) return null;

  const scanColor = {
    [SCAN.IDLE]: '#94a3b8',
    [SCAN.CONNECTING]: '#f59e0b',
    [SCAN.READY]: '#3b82f6',
    [SCAN.SCANNING]: '#3b82f6',
    [SCAN.SUCCESS]: '#22c55e',
    [SCAN.ERROR]: '#ef4444',
  }[scanState] || '#94a3b8';

  const isPulsing = scanState === SCAN.SCANNING;
  const isConnecting = scanState === SCAN.CONNECTING;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '28px',
        width: '380px', maxWidth: '95vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Confirm Identity
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Authentication required to save
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer',
            fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
          {[{ id: 'fingerprint', label: '🖐️ Fingerprint' }, { id: 'pin', label: '🔢 PIN' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setFpError(''); setPinError(''); setPin(''); }} style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '600', fontSize: '0.8rem',
              background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? '#1d4ed8' : '#64748b',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── FINGERPRINT TAB ── */}
        {tab === 'fingerprint' && (
          <div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '24px 16px', background: '#f8fafc', borderRadius: '14px',
              border: `2px solid ${scanColor}`, marginBottom: '14px', transition: 'border-color 0.3s',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: `${scanColor}18`,
                border: `2px solid ${scanColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.4rem', marginBottom: '12px',
                animation: isPulsing ? 'dpPulse 1.2s ease-in-out infinite' : 'none',
              }}>
                {isConnecting ? (
                  <svg style={{ animation: 'dpSpin 1s linear infinite' }} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={scanColor} strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                ) : scanState === SCAN.SUCCESS ? '✅' : scanState === SCAN.ERROR ? '❌' : '👆'}
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontWeight: '500', textAlign: 'center' }}>
                {scanMsg || 'Initializing scanner...'}
              </p>
            </div>

            {fpError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                padding: '10px 14px', marginBottom: '14px', fontSize: '0.82rem', color: '#dc2626',
                whiteSpace: 'pre-line',
              }}>⚠️ {fpError}</div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleScan}
                disabled={scanState === SCAN.CONNECTING || scanState === SCAN.SCANNING || scanState === SCAN.SUCCESS}
                style={{
                  flex: 1, padding: '11px',
                  background: [SCAN.CONNECTING, SCAN.SCANNING, SCAN.SUCCESS].includes(scanState)
                    ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontWeight: '700', fontSize: '0.875rem',
                  cursor: [SCAN.CONNECTING, SCAN.SCANNING, SCAN.SUCCESS].includes(scanState) ? 'not-allowed' : 'pointer',
                }}
              >
                {scanState === SCAN.SCANNING ? 'Scanning...' : scanState === SCAN.SUCCESS ? 'Verified ✓' : '🖐️ Scan Finger'}
              </button>
              {scanState === SCAN.ERROR && (
                <button onClick={initScanner} style={{
                  padding: '11px 14px', background: '#f8fafc', border: '2px solid #e2e8f0',
                  borderRadius: '10px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', color: '#374151',
                }}>Retry</button>
              )}
            </div>
          </div>
        )}

        {/* ── PIN TAB ── */}
        {tab === 'pin' && (
          <div>
            {/* PIN dots */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{
                  width: '42px', height: '48px', borderRadius: '10px',
                  border: `2px solid ${i < pin.length ? '#1d4ed8' : '#e2e8f0'}`,
                  background: i < pin.length ? '#eff6ff' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', color: '#1d4ed8', transition: 'all 0.15s',
                }}>
                  {i < pin.length ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Numpad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => addDigit(String(n))} style={{
                  padding: '13px', fontSize: '1.15rem', fontWeight: '700',
                  background: 'white', border: '2px solid #e2e8f0', borderRadius: '10px',
                  cursor: 'pointer', color: '#0f172a',
                }}>{n}</button>
              ))}
              <button onClick={backspace} style={{
                padding: '13px', fontSize: '1rem', background: '#fef2f2',
                border: '2px solid #fecaca', borderRadius: '10px', cursor: 'pointer', color: '#dc2626', fontWeight: '700',
              }}>⌫</button>
              <button onClick={() => addDigit('0')} style={{
                padding: '13px', fontSize: '1.15rem', fontWeight: '700',
                background: 'white', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#0f172a',
              }}>0</button>
              <button onClick={() => setPin('')} style={{
                padding: '13px', fontSize: '0.7rem', fontWeight: '600',
                background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#64748b',
              }}>CLR</button>
            </div>

            {pinError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                padding: '10px 14px', marginBottom: '12px', fontSize: '0.82rem', color: '#dc2626',
              }}>⚠️ {pinError}</div>
            )}

            <button
              onClick={submitPin}
              disabled={pinLoading || pin.length !== 6}
              style={{
                width: '100%', padding: '12px',
                background: pin.length !== 6 || pinLoading ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontWeight: '700', fontSize: '0.875rem',
                cursor: pin.length !== 6 || pinLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {pinLoading ? (
                <><svg style={{ animation: 'dpSpin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Verifying...</>
              ) : '🔓 Confirm with PIN'}
            </button>
          </div>
        )}

        <style>{`
          @keyframes dpPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.8} }
          @keyframes dpSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </div>
  );
}
