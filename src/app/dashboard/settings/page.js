'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/dashboard-layout';
import { createFingerprintBridge } from '../../utils/fingerprintBridge';

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
  const [activeSection, setActiveSection] = useState('fingerprint');

  // Fingerprint state
  const [enrollingUserId, setEnrollingUserId] = useState(null);
  const [scanState, setScanState] = useState(SCAN_STATE.IDLE);
  const [scanMessage, setScanMessage] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpNotice, setFpNotice] = useState('');
  const bridgeRef = useRef(null);
  const sidRef = useRef(null);

  // PIN state
  const [pinUserId, setPinUserId] = useState(null);
  const [pinDigits, setPinDigits] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState('enter');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(user);
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
    } finally {
      setLoading(false);
    }
  }

  function cleanupBridge() {
    try { bridgeRef.current?.stopCapture?.(); } catch { /* ignore */ }
    try { bridgeRef.current?.close?.(); } catch { /* ignore */ }
    bridgeRef.current = null;
    sidRef.current = null;
  }

  async function startEnrollment(userId) {
    cleanupBridge();
    setEnrollingUserId(userId);
    setFpError('');
    setFpNotice('');
    setScanState(SCAN_STATE.CONNECTING);
    setScanMessage('Connecting to fingerprint service...');

    try {
      // Force the modern bridge that supports GetCurrentIdentity.
      const bridge = createFingerprintBridge('ws://localhost:15897');
      bridgeRef.current = bridge;
      await bridge.connect();

      const devices = await bridge.getDevices();
      if (!devices.length) throw new Error('No fingerprint device detected.');

      const sidHex = await bridge.getCurrentIdentity();
      if (!sidHex) throw new Error('Could not resolve current Windows identity.');
      sidRef.current = sidHex;

      setScanState(SCAN_STATE.READY);
      setScanMessage('Scanner ready — touch finger to verify and map this user.');
      setFpNotice(`Connected (${devices.length} device detected).`);
    } catch (error) {
      setScanState(SCAN_STATE.ERROR);
      setFpError(error.message || 'Could not connect to fingerprint service.');
    }
  }

  async function captureEnrollSample() {
    if (!bridgeRef.current || !sidRef.current) return;
    setFpError('');
    setFpNotice('');
    setScanState(SCAN_STATE.SCANNING);
    setScanMessage('Place your finger firmly on the scanner...');

    try {
      // Reset any stale native capture operation before starting a new verification.
      await bridgeRef.current.stopCapture();
      const { matched } = await bridgeRef.current.verify(sidRef.current, 60000);
      if (!matched) {
        setScanState(SCAN_STATE.ERROR);
        setFpError('Fingerprint was not recognized for this Windows user.');
        return;
      }

      const res = await fetch('/api/settings/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: enrollingUserId, template: sidRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save fingerprint mapping.');

      setScanState(SCAN_STATE.DONE);
      setScanMessage('Fingerprint mapped successfully!');
      await fetchUsers();
      setTimeout(cancelEnrollment, 900);
    } catch (error) {
      setScanState(SCAN_STATE.ERROR);
      setFpError(error.message || 'Scan failed.');
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
    cleanupBridge();
    setEnrollingUserId(null);
    setScanState(SCAN_STATE.IDLE);
    setScanMessage('');
    setFpError('');
    setFpNotice('');
  }

  function startPinSetup(userId) {
    setPinUserId(userId);
    setPinDigits('');
    setPinConfirm('');
    setPinStep('enter');
    setPinError('');
    setPinSuccess('');
  }

  function cancelPinSetup() {
    setPinUserId(null);
    setPinDigits('');
    setPinConfirm('');
    setPinError('');
    setPinSuccess('');
    setPinStep('enter');
  }

  function handlePinDigit(digit) {
    if (pinStep === 'enter' && pinDigits.length < 6) setPinDigits((p) => p + digit);
    else if (pinStep === 'confirm' && pinConfirm.length < 6) setPinConfirm((p) => p + digit);
  }

  function handlePinBack() {
    if (pinStep === 'enter') setPinDigits((p) => p.slice(0, -1));
    else setPinConfirm((p) => p.slice(0, -1));
  }

  async function handlePinNext() {
    if (pinStep === 'enter') {
      if (pinDigits.length !== 6) return setPinError('Enter all 6 digits.');
      setPinError('');
      setPinConfirm('');
      setPinStep('confirm');
      return;
    }

    if (pinConfirm.length !== 6) return setPinError('Confirm all 6 digits.');
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
      if (!res.ok) throw new Error(data.error || 'Failed to set PIN');
      setPinSuccess('PIN set successfully!');
      await fetchUsers();
      setTimeout(cancelPinSetup, 900);
    } catch (error) {
      setPinError(error.message || 'Failed to set PIN');
    } finally {
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

  const activePin = pinStep === 'enter' ? pinDigits : pinConfirm;

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading settings...</div>;
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', maxWidth: '980px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '6px' }}>Security Settings</h1>
        <p style={{ color: '#64748b', marginBottom: '18px' }}>Register fingerprint and PIN for user authentication.</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setActiveSection('fingerprint')} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: activeSection === 'fingerprint' ? '#1d4ed8' : '#f1f5f9', color: activeSection === 'fingerprint' ? '#fff' : '#475569', fontWeight: 700, cursor: 'pointer' }}>🖐️ Fingerprint</button>
          <button onClick={() => setActiveSection('pin')} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: activeSection === 'pin' ? '#1d4ed8' : '#f1f5f9', color: activeSection === 'pin' ? '#fff' : '#475569', fontWeight: 700, cursor: 'pointer' }}>🔢 PIN</button>
        </div>

        {activeSection === 'fingerprint' && (
          <>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', marginBottom: 18, color: '#1e40af', fontSize: '0.85rem' }}>
              The user finger must be enrolled in Windows Hello on this machine. Enrollment verifies scanner input and maps this app user to Windows identity.
            </div>

            {enrollingUserId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ width: 420, maxWidth: '92vw', background: '#fff', borderRadius: 20, padding: 26 }}>
                  <h3 style={{ margin: 0, marginBottom: 8, fontSize: '1.25rem' }}>Enroll Fingerprint</h3>
                  <p style={{ marginTop: 0, color: '#64748b' }}>{users.find((u) => u.user_id === enrollingUserId)?.full_name}</p>
                  <div style={{ border: `2px solid ${scanState === SCAN_STATE.ERROR ? '#ef4444' : scanState === SCAN_STATE.DONE ? '#22c55e' : '#60a5fa'}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#334155', textAlign: 'center' }}>{scanMessage || 'Ready'}</p>
                  </div>
                  {fpNotice && !fpError && <div style={{ marginBottom: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 10, padding: '10px 12px', fontSize: '0.84rem' }}>ℹ️ {fpNotice}</div>}
                  {fpError && <div style={{ marginBottom: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '10px 12px', fontSize: '0.84rem' }}>⚠️ {fpError}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(scanState === SCAN_STATE.READY || scanState === SCAN_STATE.ERROR) && (
                      <button onClick={captureEnrollSample} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                        {scanState === SCAN_STATE.ERROR ? 'Retry Scan' : 'Scan Now'}
                      </button>
                    )}
                    {(scanState === SCAN_STATE.CONNECTING || scanState === SCAN_STATE.SCANNING) && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 700 }}>Scanning...</div>
                    )}
                    <button onClick={cancelEnrollment} style={{ padding: '12px 18px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['User', 'Role', 'Fingerprint', 'Actions'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.user_id} style={{ borderTop: i ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>{u.role}</td>
                      <td style={{ padding: '12px 14px' }}>{u.fingerprint_enrolled ? '✅ Enrolled' : 'Not enrolled'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <button onClick={() => startEnrollment(u.user_id)} style={{ marginRight: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 700 }}>
                          {u.fingerprint_enrolled ? 'Re-enroll' : 'Enroll'}
                        </button>
                        {u.fingerprint_enrolled && (
                          <button onClick={() => removeFingerprint(u.user_id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'pin' && (
          <>
            {pinUserId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'white', borderRadius: 20, padding: 32, width: 380, maxWidth: '90vw' }}>
                  <h3 style={{ margin: 0, marginBottom: 6 }}>Set PIN Code</h3>
                  <p style={{ marginTop: 0, color: '#64748b' }}>{users.find((u) => u.user_id === pinUserId)?.full_name}</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} style={{ width: 44, height: 52, borderRadius: 10, border: `2px solid ${i < activePin.length ? '#1d4ed8' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {i < activePin.length ? '●' : ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => handlePinDigit(String(n))} style={{ padding: 14, borderRadius: 10, border: '2px solid #e2e8f0', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>{n}</button>)}
                    <button onClick={handlePinBack} style={{ padding: 14, borderRadius: 10, border: '2px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>⌫</button>
                    <button onClick={() => handlePinDigit('0')} style={{ padding: 14, borderRadius: 10, border: '2px solid #e2e8f0', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>0</button>
                    <button onClick={() => pinStep === 'enter' ? setPinDigits('') : setPinConfirm('')} style={{ padding: 14, borderRadius: 10, border: '2px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>CLR</button>
                  </div>
                  {pinError && <div style={{ marginBottom: 10, color: '#dc2626' }}>⚠️ {pinError}</div>}
                  {pinSuccess && <div style={{ marginBottom: 10, color: '#16a34a' }}>✅ {pinSuccess}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handlePinNext} disabled={pinLoading || activePin.length !== 6} style={{ flex: 1, padding: 12, border: 'none', borderRadius: 10, background: activePin.length !== 6 ? '#93c5fd' : '#1d4ed8', color: '#fff', fontWeight: 700, cursor: activePin.length !== 6 ? 'not-allowed' : 'pointer' }}>
                      {pinLoading ? 'Saving...' : pinStep === 'enter' ? 'Next' : 'Confirm PIN'}
                    </button>
                    <button onClick={cancelPinSetup} style={{ padding: '12px 18px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['User', 'Role', 'PIN', 'Actions'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.user_id} style={{ borderTop: i ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>{u.role}</td>
                      <td style={{ padding: '12px 14px' }}>{u.pin_code ? '✅ PIN Set' : 'No PIN'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <button onClick={() => startPinSetup(u.user_id)} style={{ marginRight: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 700 }}>
                          {u.pin_code ? 'Change PIN' : 'Set PIN'}
                        </button>
                        {u.pin_code && (
                          <button onClick={() => removePin(u.user_id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
