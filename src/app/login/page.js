'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const SCANNER_STATES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  READY: 'ready',
  SCANNING: 'scanning',
  SUCCESS: 'success',
  ERROR: 'error',
  NO_DEVICE: 'no_device',
};

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('fingerprint'); // 'fingerprint' | 'pin'

  // Fingerprint state
  const [scanState, setScanState] = useState(SCANNER_STATES.IDLE);
  const [scanMessage, setScanMessage] = useState('Initializing scanner...');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [fpError, setFpError] = useState('');
  const readerRef = useRef(null);

  // PIN state
  const [pinUserId, setPinUserId] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const u = JSON.parse(userData);
        if (u?.user_id) { router.push('/dashboard'); return; }
      } catch { /* ignore */ }
    }
    fetchUsers();
  }, [router]);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/auth/user-list');
      const data = await res.json();
      if (Array.isArray(data.users)) {
        setUsers(data.users);
        if (data.users.length > 0) {
          setSelectedUserId(String(data.users[0].user_id));
          setPinUserId(String(data.users[0].user_id));
        }
      }
    } catch {
      // ignore
    }
  }

  // ─── Fingerprint logic ────────────────────────────────────────────────────

  const initScanner = useCallback(async () => {
    setScanState(SCANNER_STATES.CONNECTING);
    setScanMessage('Connecting to scanner...');
    setFpError('');

    try {
      const { getReader } = await import('../utils/digitalpersona');
      const reader = getReader();
      readerRef.current = reader;

      await reader.connect();
      setScanState(SCANNER_STATES.READY);
      setScanMessage('Scanner ready. Select your name and place finger.');

      reader.callbacks.onDeviceConnected = () => {
        setScanState(SCANNER_STATES.READY);
        setScanMessage('Device connected. Place finger when ready.');
      };
      reader.callbacks.onDeviceDisconnected = () => {
        setScanState(SCANNER_STATES.NO_DEVICE);
        setScanMessage('Scanner disconnected. Reconnect device.');
      };
      reader.callbacks.onServiceDisconnected = () => {
        setScanState(SCANNER_STATES.ERROR);
        setScanMessage('Service disconnected.');
      };
    } catch (err) {
      setScanState(SCANNER_STATES.NO_DEVICE);
      setScanMessage('');
      setFpError(err.message);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'fingerprint') {
      initScanner();
    }
    return () => {
      readerRef.current?.stopCapture().catch(() => {});
    };
  }, [activeTab, initScanner]);

  async function handleStartScan() {
    const reader = readerRef.current;
    if (!reader) {
      setFpError('Scanner not initialized. Click "Retry".');
      return;
    }

    setFpError('');
    setScanState(SCANNER_STATES.SCANNING);
    setScanMessage('Place your finger on the scanner...');

    try {
      // WinBioIdentify — auto-detects whose finger it is via Windows Hello SID
      const result = await reader.identify();

      if (!result?.Matched || !result?.Identity) {
        setScanState(SCANNER_STATES.ERROR);
        setFpError('Fingerprint not recognized. Make sure your finger is enrolled in Windows Hello, then mapped in Settings → Biometric Settings.');
        return;
      }

      setScanMessage('Identified! Logging in...');
      await completeLogin('/api/auth/fingerprint-login', { sid: result.Identity });
    } catch (err) {
      setScanState(SCANNER_STATES.ERROR);
      setScanMessage('');
      setFpError(err.message);
    }
  }

  // ─── PIN logic ────────────────────────────────────────────────────────────

  function handlePinDigit(digit) {
    if (pin.length < 6) setPin(p => p + digit);
  }

  function handlePinBackspace() {
    setPin(p => p.slice(0, -1));
  }

  async function handlePinSubmit() {
    if (pin.length !== 6) {
      setPinError('Enter all 6 digits.');
      return;
    }
    if (!pinUserId) {
      setPinError('Select your name first.');
      return;
    }

    setPinLoading(true);
    setPinError('');

    try {
      await completeLogin('/api/auth/pin-login', {
        userId: parseInt(pinUserId),
        pin,
      });
    } catch (err) {
      setPinError(err.message || 'Invalid PIN');
      setPin('');
    }

    setPinLoading(false);
  }

  // ─── Shared login finisher ────────────────────────────────────────────────

  async function completeLogin(endpoint, body) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } else {
      throw new Error(data.error || 'Login failed');
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const enrolledUsers = users.filter(u => u.fingerprint_enrolled);
  const scannerIcon = () => {
    if (scanState === SCANNER_STATES.SCANNING) return '👆';
    if (scanState === SCANNER_STATES.SUCCESS) return '✅';
    if (scanState === SCANNER_STATES.ERROR) return '❌';
    if (scanState === SCANNER_STATES.NO_DEVICE) return '🔌';
    return '👆';
  };

  const scannerColor = () => {
    if (scanState === SCANNER_STATES.SCANNING) return '#3b82f6';
    if (scanState === SCANNER_STATES.SUCCESS) return '#22c55e';
    if (scanState === SCANNER_STATES.ERROR) return '#ef4444';
    if (scanState === SCANNER_STATES.NO_DEVICE) return '#f59e0b';
    return '#94a3b8';
  };

  const isPulse = scanState === SCANNER_STATES.SCANNING;
  const isConnecting = scanState === SCANNER_STATES.CONNECTING;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Left panel — branding */}
      <div style={{
        flex: '1 1 50%',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 30%, #1565c0 65%, #0288d1 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{
          width: '96px', height: '96px', borderRadius: '24px',
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '32px', border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>

        <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: '800', textAlign: 'center', marginBottom: '8px', lineHeight: 1.2 }}>
          Itefaq Iron &amp;<br />Cement Store
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.25rem', fontWeight: '600', textAlign: 'center', marginBottom: '24px', direction: 'rtl' }}>
          اتفاق آئرن اینڈ سیمنٹ سٹور
        </p>
        <div style={{ width: '48px', height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px', marginBottom: '24px' }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1.6, maxWidth: '320px' }}>
          گجرات سرگودھا روڈ، پاہڑیانوالی
        </p>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', textAlign: 'center', marginTop: '8px' }}>
          0346-7560306 &nbsp;|&nbsp; 0300-7560306
        </p>

        {/* Biometric badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginTop: '48px',
          padding: '16px 24px', borderRadius: '16px',
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/>
          </svg>
          <div>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>Biometric Security</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Digital Persona U.are.U 4500</div>
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{
        flex: '1 1 50%', background: '#f8fafc',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
              Secure Login
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Use fingerprint scanner or 6-digit PIN
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: '#e2e8f0', borderRadius: '12px',
            padding: '4px', marginBottom: '28px',
          }}>
            {[
              { id: 'fingerprint', label: 'Fingerprint', icon: '🖐️' },
              { id: 'pin', label: 'PIN Code', icon: '🔢' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: '10px 16px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '600', fontSize: '0.875rem',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#1d4ed8' : '#64748b',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.2s',
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── FINGERPRINT TAB ── */}
          {activeTab === 'fingerprint' && (
            <div>
              {/* User selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Select Your Name
                </label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  disabled={scanState === SCANNER_STATES.SCANNING}
                  style={{
                    width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0',
                    borderRadius: '12px', fontSize: '0.9375rem', color: '#0f172a',
                    background: 'white', outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                  }}
                >
                  {users.length === 0 && <option value="">Loading users...</option>}
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.role}) {!u.fingerprint_enrolled ? '— not enrolled' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scanner visual */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '32px 20px', background: 'white', borderRadius: '16px',
                border: `2px solid ${scannerColor()}`,
                transition: 'border-color 0.3s',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  background: `${scannerColor()}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '3rem', marginBottom: '16px',
                  animation: isPulse ? 'pulse 1.2s ease-in-out infinite' : 'none',
                  border: `3px solid ${scannerColor()}40`,
                }}>
                  {isConnecting ? (
                    <svg style={{ animation: 'spin 1s linear infinite' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={scannerColor()} strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  ) : scannerIcon()}
                </div>

                <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>
                  {scanMessage}
                </p>
              </div>

              {fpError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                  <p style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: '500', margin: 0, whiteSpace: 'pre-line' }}>{fpError}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleStartScan}
                  disabled={scanState === SCANNER_STATES.CONNECTING || scanState === SCANNER_STATES.SCANNING || scanState === SCANNER_STATES.SUCCESS}
                  style={{
                    flex: 1, padding: '13px',
                    background: (scanState === SCANNER_STATES.SCANNING || scanState === SCANNER_STATES.SUCCESS)
                      ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                    color: 'white', border: 'none', borderRadius: '12px',
                    fontSize: '0.95rem', fontWeight: '700',
                    cursor: (scanState === SCANNER_STATES.SCANNING || scanState === SCANNER_STATES.SUCCESS) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(29,78,216,0.35)',
                  }}
                >
                  {scanState === SCANNER_STATES.SCANNING ? 'Scanning...' : '🖐️ Scan Fingerprint'}
                </button>

                {(scanState === SCANNER_STATES.ERROR || scanState === SCANNER_STATES.NO_DEVICE) && (
                  <button
                    onClick={initScanner}
                    style={{
                      padding: '13px 18px', background: '#f1f5f9',
                      color: '#374151', border: '2px solid #e2e8f0', borderRadius: '12px',
                      fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>

              {enrolledUsers.length === 0 && users.length > 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: '12px' }}>
                  No users enrolled yet. Ask admin to enroll fingerprints in Settings.
                </p>
              )}
            </div>
          )}

          {/* ── PIN TAB ── */}
          {activeTab === 'pin' && (
            <div>
              {/* User selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Select Your Name
                </label>
                <select
                  value={pinUserId}
                  onChange={e => { setPinUserId(e.target.value); setPin(''); setPinError(''); }}
                  style={{
                    width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0',
                    borderRadius: '12px', fontSize: '0.9375rem', color: '#0f172a',
                    background: 'white', outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                  }}
                >
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* PIN dots display */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                  6-Digit PIN
                </label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      width: '48px', height: '56px', borderRadius: '12px',
                      border: `2px solid ${i < pin.length ? '#1d4ed8' : '#e2e8f0'}`,
                      background: i < pin.length ? '#eff6ff' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.5rem', color: '#1d4ed8',
                      transition: 'all 0.15s',
                    }}>
                      {i < pin.length ? '●' : ''}
                    </div>
                  ))}
                </div>

                {/* Number pad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} onClick={() => handlePinDigit(String(n))} style={{
                      padding: '16px', fontSize: '1.25rem', fontWeight: '700',
                      background: 'white', border: '2px solid #e2e8f0', borderRadius: '12px',
                      cursor: 'pointer', color: '#0f172a',
                      transition: 'all 0.1s',
                    }}
                    onMouseDown={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseUp={e => e.currentTarget.style.background = 'white'}
                    >
                      {n}
                    </button>
                  ))}
                  <button onClick={handlePinBackspace} style={{
                    padding: '16px', fontSize: '1rem', fontWeight: '600',
                    background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '12px',
                    cursor: 'pointer', color: '#dc2626',
                  }}>
                    ⌫
                  </button>
                  <button onClick={() => handlePinDigit('0')} style={{
                    padding: '16px', fontSize: '1.25rem', fontWeight: '700',
                    background: 'white', border: '2px solid #e2e8f0', borderRadius: '12px',
                    cursor: 'pointer', color: '#0f172a',
                  }}>
                    0
                  </button>
                  <button onClick={() => setPin('')} style={{
                    padding: '16px', fontSize: '0.75rem', fontWeight: '600',
                    background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px',
                    cursor: 'pointer', color: '#64748b',
                  }}>
                    CLR
                  </button>
                </div>
              </div>

              {pinError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                }}>
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>
                    ⚠️ {pinError}
                  </p>
                </div>
              )}

              <button
                onClick={handlePinSubmit}
                disabled={pinLoading || pin.length !== 6}
                style={{
                  width: '100%', padding: '14px',
                  background: (pinLoading || pin.length !== 6) ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '1rem', fontWeight: '700',
                  cursor: (pinLoading || pin.length !== 6) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(29,78,216,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}
              >
                {pinLoading ? (
                  <>
                    <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Verifying...
                  </>
                ) : '🔓 Login with PIN'}
              </button>
            </div>
          )}

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', marginTop: '32px' }}>
            &copy; 2025 Itefaq Iron &amp; Cement Store
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.8; } }
      `}</style>
    </div>
  );
}
