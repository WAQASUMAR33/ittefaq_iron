'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/dashboard-layout';
import { createReader, captureSample } from '../../utils/digitalpersona';

const ENROLL_STEPS = 3; // number of fingerprint scans required for enrollment

const SCAN_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  READY: 'ready',
  SCANNING: 'scanning',
  DONE: 'done',
  ERROR: 'error',
};

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('fingerprint'); // 'fingerprint' | 'pin'

  // Fingerprint enrollment state
  const [enrollingUserId, setEnrollingUserId] = useState(null);
  const [scanState, setScanState] = useState(SCAN_STATE.IDLE);
  const [scanMessage, setScanMessage] = useState('');
  const [samplesCollected, setSamplesCollected] = useState([]);
  const [fpError, setFpError] = useState('');
  const readerRef = useRef(null);
  const connectTimeoutRef = useRef(null);

  // PIN state
  const [pinUserId, setPinUserId] = useState(null);
  const [pinDigits, setPinDigits] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState('enter'); // 'enter' | 'confirm'
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return; }
    try {
      const u = JSON.parse(userData);
      if (u.role !== 'SUPER_ADMIN' && u.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(u);
    } catch {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (currentUser) fetchUsers();
  }, [currentUser]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.users || []);
      setUsers(list);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }

  // ─── Fingerprint enrollment (DigitalPersona 4500 official SDK) ───────────

  async function startEnrollment(userId) {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    setEnrollingUserId(userId);
    setSamplesCollected([]);
    setFpError('');
    setScanState(SCAN_STATE.CONNECTING);
    setScanMessage('Connecting to DigitalPersona scanner...');

    try {
      const { reader, SampleFormat } = await createReader();
      readerRef.current = { reader, SampleFormat };

      reader.on('DeviceConnected', () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setFpError('');
        setScanState(SCAN_STATE.READY);
        setScanMessage('Scanner ready — click "Scan Now" to enroll finger.');
      });

      reader.on('DeviceDisconnected', () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setScanState(SCAN_STATE.ERROR);
        setFpError('Scanner disconnected. Reconnect the DigitalPersona reader.');
      });

      reader.on('CommunicationFailed', () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setScanState(SCAN_STATE.ERROR);
        setFpError('Could not communicate with DigitalPersona service. Start Lite Client and reconnect scanner.');
      });

      reader.on('QualityReported', (e) => {
        if (e.quality) setScanMessage(`Quality: ${e.quality} — keep finger steady`);
      });

      // Give device time to connect; if no DeviceConnected fires, show ready anyway
      connectTimeoutRef.current = setTimeout(() => {
        setScanState((prev) => {
          if (prev !== SCAN_STATE.CONNECTING) return prev;
          setFpError('Scanner connection is slow. If scan fails, verify Lite Client is running and reader is plugged in.');
          setScanMessage('Scanner ready — click "Scan Now" to enroll finger.');
          return SCAN_STATE.READY;
        });
        connectTimeoutRef.current = null;
      }, 3000);
    } catch (err) {
      setScanState(SCAN_STATE.ERROR);
      setFpError(
        err.message ||
        'Could not load fingerprint SDK.\nMake sure DigitalPersona Lite Client is installed.'
      );
    }
  }

  async function captureEnrollSample() {
    if (!readerRef.current) return;
    const { reader, SampleFormat } = readerRef.current;

    setFpError('');
    setScanState(SCAN_STATE.SCANNING);
    setScanMessage('Place your finger firmly on the scanner...');

    try {
      const sample = await captureSample(reader, SampleFormat);

      const newSamples = [...samplesCollected, sample];
      setSamplesCollected(newSamples);

      const SAMPLES_NEEDED = 3;
      if (newSamples.length < SAMPLES_NEEDED) {
        setScanState(SCAN_STATE.READY);
        setScanMessage(`Sample ${newSamples.length}/${SAMPLES_NEEDED} captured. Lift and place finger again.`);
        return;
      }

      // All samples collected — save to DB as JSON array
      setScanMessage('Saving fingerprint...');
      const res = await fetch('/api/settings/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: enrollingUserId, template: JSON.stringify(newSamples) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save fingerprint');

      setScanState(SCAN_STATE.DONE);
      setScanMessage('Fingerprint enrolled successfully!');
      await fetchUsers();
      setTimeout(cancelEnrollment, 1500);
    } catch (err) {
      setScanState(SCAN_STATE.ERROR);
      setFpError(err.message || 'Scan failed. Try again.');
    }
  }

  async function removeFingerprint(userId) {
    if (!confirm('Remove fingerprint for this user?')) return;
    try {
      await fetch('/api/settings/fingerprint', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      await fetchUsers();
    } catch {
      // ignore
    }
  }

  function cancelEnrollment() {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    try { readerRef.current?.reader?.stopAcquisition?.(); } catch { /* ignore */ }
    readerRef.current = null;
    setEnrollingUserId(null);
    setSamplesCollected([]);
    setScanState(SCAN_STATE.IDLE);
    setScanMessage('');
    setFpError('');
  }

  // ─── PIN management ───────────────────────────────────────────────────────

  function startPinSetup(userId) {
    setPinUserId(userId);
    setPinDigits('');
    setPinConfirm('');
    setPinStep('enter');
    setPinError('');
    setPinSuccess('');
  }

  function handlePinDigit(d) {
    if (pinStep === 'enter' && pinDigits.length < 6) {
      setPinDigits(p => p + d);
    } else if (pinStep === 'confirm' && pinConfirm.length < 6) {
      setPinConfirm(p => p + d);
    }
  }

  function handlePinBack() {
    if (pinStep === 'enter') setPinDigits(p => p.slice(0, -1));
    else setPinConfirm(p => p.slice(0, -1));
  }

  async function handlePinNext() {
    if (pinStep === 'enter') {
      if (pinDigits.length !== 6) { setPinError('Enter all 6 digits.'); return; }
      setPinError('');
      setPinConfirm('');
      setPinStep('confirm');
    } else {
      if (pinConfirm.length !== 6) { setPinError('Confirm all 6 digits.'); return; }
      if (pinDigits !== pinConfirm) {
        setPinError('PINs do not match. Try again.');
        setPinDigits('');
        setPinConfirm('');
        setPinStep('enter');
        return;
      }

      setPinLoading(true);
      setPinError('');
      try {
        const res = await fetch('/api/settings/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: pinUserId, pin: pinDigits }),
        });
        const data = await res.json();
        if (res.ok) {
          setPinSuccess('PIN set successfully!');
          await fetchUsers();
          setTimeout(cancelPinSetup, 1500);
        } else {
          setPinError(data.error || 'Failed to set PIN');
        }
      } catch {
        setPinError('Network error');
      }
      setPinLoading(false);
    }
  }

  async function removePin(userId) {
    if (!confirm('Remove PIN for this user?')) return;
    try {
      await fetch('/api/settings/pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      await fetchUsers();
    } catch {
      // ignore
    }
  }

  function cancelPinSetup() {
    setPinUserId(null);
    setPinDigits('');
    setPinConfirm('');
    setPinError('');
    setPinSuccess('');
    setPinStep('enter');
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const scannerColor = () => {
    if (scanState === SCAN_STATE.SCANNING) return '#3b82f6';
    if (scanState === SCAN_STATE.DONE) return '#22c55e';
    if (scanState === SCAN_STATE.ERROR) return '#ef4444';
    if (scanState === SCAN_STATE.READY) return '#f59e0b';
    return '#94a3b8';
  };

  const activePinStr = pinStep === 'enter' ? pinDigits : pinConfirm;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div style={{ padding: '24px', maxWidth: '900px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
          Biometric Settings
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Manage fingerprint enrollment and PIN codes for all users
        </p>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'fingerprint', label: '🖐️ Fingerprint Enrollment' },
          { id: 'pin', label: '🔢 PIN Management' },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            padding: '10px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontWeight: '600', fontSize: '0.875rem',
            background: activeSection === s.id ? '#1d4ed8' : '#f1f5f9',
            color: activeSection === s.id ? 'white' : '#475569',
            transition: 'all 0.2s',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── FINGERPRINT SECTION ── */}
      {activeSection === 'fingerprint' && (
        <div>
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
            fontSize: '0.85rem', color: '#1e40af',
          }}>
            <strong>How it works:</strong> Uses the <strong>DigitalPersona 4500</strong> fingerprint reader.
            The fingerprint service must be running on this machine. Click <strong>Enroll</strong> then place the user&apos;s finger on the scanner.
          </div>

          {/* Enrollment modal */}
          {enrollingUserId && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}>
              <div style={{
                background: 'white', borderRadius: '20px', padding: '32px',
                width: '400px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                  Enroll Fingerprint
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>
                  {users.find(u => u.user_id === enrollingUserId)?.full_name}
                  {' — '}Place finger on scanner to map
                </p>

                {/* Scanner circle */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '28px', background: '#f8fafc', borderRadius: '16px',
                  border: `2px solid ${scannerColor()}`,
                  marginBottom: '20px',
                }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: `${scannerColor()}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem', marginBottom: '12px',
                    animation: scanState === SCAN_STATE.SCANNING ? 'pulse 1.2s ease-in-out infinite' : 'none',
                  }}>
                    {scanState === SCAN_STATE.DONE ? '✅' : scanState === SCAN_STATE.ERROR ? '❌' : '👆'}
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.875rem', fontWeight: '500', textAlign: 'center', margin: 0 }}>
                    {scanMessage}
                  </p>
                </div>

                {fpError && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                    padding: '10px 14px', marginBottom: '16px',
                    color: '#dc2626', fontSize: '0.85rem',
                  }}>
                    ⚠️ {fpError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  {(scanState === SCAN_STATE.READY || scanState === SCAN_STATE.ERROR) && (
                    <button onClick={captureEnrollSample} style={{
                      flex: 1, padding: '12px',
                      background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
                    }}>
                      {scanState === SCAN_STATE.ERROR ? '🔄 Retry Scan' : `🖐️ Scan Now (${samplesCollected.length}/3)`}
                    </button>
                  )}
                  {scanState === SCAN_STATE.CONNECTING && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                      Connecting...
                    </div>
                  )}
                  {scanState === SCAN_STATE.SCANNING && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '12px', color: '#3b82f6', fontWeight: '600', fontSize: '0.875rem' }}>
                      Scanning...
                    </div>
                  )}
                  <button onClick={cancelEnrollment} style={{
                    padding: '12px 18px', background: '#f1f5f9',
                    color: '#374151', border: '2px solid #e2e8f0',
                    borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem',
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['User', 'Role', 'Status', 'Fingerprint', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem',
                      fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.user_id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>{u.full_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                        background: u.role === 'SUPER_ADMIN' ? '#fef3c7' : u.role === 'ADMIN' ? '#dbeafe' : '#f0fdf4',
                        color: u.role === 'SUPER_ADMIN' ? '#92400e' : u.role === 'ADMIN' ? '#1e40af' : '#166534',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                        background: u.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: u.status === 'ACTIVE' ? '#166534' : '#991b1b',
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.fingerprint_enrolled ? (
                        <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '0.875rem' }}>✅ Enrolled</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Not enrolled</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => startEnrollment(u.user_id)}
                          style={{
                            padding: '7px 14px', background: '#eff6ff', color: '#1d4ed8',
                            border: '1px solid #bfdbfe', borderRadius: '8px',
                            fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                          }}
                        >
                          {u.fingerprint_enrolled ? '🔄 Re-enroll' : '+ Enroll'}
                        </button>
                        {u.fingerprint_enrolled && (
                          <button
                            onClick={() => removeFingerprint(u.user_id)}
                            style={{
                              padding: '7px 12px', background: '#fef2f2', color: '#dc2626',
                              border: '1px solid #fecaca', borderRadius: '8px',
                              fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PIN SECTION ── */}
      {activeSection === 'pin' && (
        <div>
          {/* PIN setup modal */}
          {pinUserId && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}>
              <div style={{
                background: 'white', borderRadius: '20px', padding: '32px',
                width: '380px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                  Set PIN Code
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '20px' }}>
                  {users.find(u => u.user_id === pinUserId)?.full_name}
                  {' — '}{pinStep === 'enter' ? 'Enter new 6-digit PIN' : 'Confirm your PIN'}
                </p>

                {/* PIN dots */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      width: '44px', height: '52px', borderRadius: '10px',
                      border: `2px solid ${i < activePinStr.length ? '#1d4ed8' : '#e2e8f0'}`,
                      background: i < activePinStr.length ? '#eff6ff' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', color: '#1d4ed8',
                    }}>
                      {i < activePinStr.length ? '●' : ''}
                    </div>
                  ))}
                </div>

                {/* Numpad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} onClick={() => handlePinDigit(String(n))} style={{
                      padding: '14px', fontSize: '1.2rem', fontWeight: '700',
                      background: 'white', border: '2px solid #e2e8f0', borderRadius: '10px',
                      cursor: 'pointer', color: '#0f172a',
                    }}>
                      {n}
                    </button>
                  ))}
                  <button onClick={handlePinBack} style={{
                    padding: '14px', fontSize: '1rem', background: '#fef2f2',
                    border: '2px solid #fecaca', borderRadius: '10px', cursor: 'pointer', color: '#dc2626', fontWeight: '700',
                  }}>⌫</button>
                  <button onClick={() => handlePinDigit('0')} style={{
                    padding: '14px', fontSize: '1.2rem', fontWeight: '700',
                    background: 'white', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#0f172a',
                  }}>0</button>
                  <button onClick={() => pinStep === 'enter' ? setPinDigits('') : setPinConfirm('')} style={{
                    padding: '14px', fontSize: '0.75rem', fontWeight: '600',
                    background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#64748b',
                  }}>CLR</button>
                </div>

                {pinError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px', marginBottom: '12px', color: '#dc2626', fontSize: '0.85rem' }}>
                    ⚠️ {pinError}
                  </div>
                )}
                {pinSuccess && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px', marginBottom: '12px', color: '#166534', fontSize: '0.85rem' }}>
                    ✅ {pinSuccess}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handlePinNext}
                    disabled={pinLoading || activePinStr.length !== 6}
                    style={{
                      flex: 1, padding: '12px',
                      background: activePinStr.length !== 6 ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      fontWeight: '700', cursor: activePinStr.length !== 6 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {pinLoading ? 'Saving...' : pinStep === 'enter' ? 'Next →' : '✅ Confirm PIN'}
                  </button>
                  <button onClick={cancelPinSetup} style={{
                    padding: '12px 18px', background: '#f1f5f9', color: '#374151',
                    border: '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer',
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['User', 'Role', 'PIN Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem',
                      fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.user_id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>{u.full_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                        background: u.role === 'SUPER_ADMIN' ? '#fef3c7' : u.role === 'ADMIN' ? '#dbeafe' : '#f0fdf4',
                        color: u.role === 'SUPER_ADMIN' ? '#92400e' : u.role === 'ADMIN' ? '#1e40af' : '#166534',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.pin_code ? (
                        <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '0.875rem' }}>✅ PIN Set</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No PIN</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => startPinSetup(u.user_id)}
                          style={{
                            padding: '7px 14px', background: '#eff6ff', color: '#1d4ed8',
                            border: '1px solid #bfdbfe', borderRadius: '8px',
                            fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                          }}
                        >
                          {u.pin_code ? '🔄 Change PIN' : '+ Set PIN'}
                        </button>
                        {u.pin_code && (
                          <button
                            onClick={() => removePin(u.user_id)}
                            style={{
                              padding: '7px 12px', background: '#fef2f2', color: '#dc2626',
                              border: '1px solid #fecaca', borderRadius: '8px',
                              fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      `}</style>
    </div>
    </DashboardLayout>
  );
}
