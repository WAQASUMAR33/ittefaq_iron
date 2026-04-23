'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SampleFormat } from '@digitalpersona/devices';
import FingerprintScanner from '@/components/FingerprintScanner';
import DashboardLayout from '../components/dashboard-layout';

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pinUserId, setPinUserId] = useState(null);
  const [pinDigits, setPinDigits] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState('enter');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const [fpUserId, setFpUserId] = useState(null);
  const [fpSamples, setFpSamples] = useState([]);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

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
      const list = Array.isArray(data) ? data : data.users || [];
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
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
      if (pinDigits.length !== 6) {
        setPinError('Enter all 6 digits.');
        return;
      }
      setPinError('');
      setPinConfirm('');
      setPinStep('confirm');
      return;
    }

    if (pinConfirm.length !== 6) {
      setPinError('Confirm all 6 digits.');
      return;
    }

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

  function startFingerprintSetup(userId) {
    setFpUserId(userId);
    setFpSamples([]);
    setFpError('');
    setFpSuccess('');
  }

  function cancelFingerprintSetup() {
    setFpUserId(null);
    setFpSamples([]);
    setFpError('');
    setFpSuccess('');
    setFpLoading(false);
  }

  async function submitFingerprintEnrollment() {
    if (fpSamples.length < 2) {
      setFpError('Need at least 2 good scans. Keep fingers dry/clean and try again.');
      return;
    }
    if (!fpUserId) return;

    setFpLoading(true);
    setFpError('');
    setFpSuccess('');
    try {
      const res = await fetch('/api/fingerprint/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: fpUserId,
          finger: 'right-index',
          format: 'PngImage',
          templates: fpSamples.map((s) => s.template),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');
      setFpSuccess('Fingerprint enrolled successfully!');
      await fetchUsers();

      // Keep local `user` object in sync for step-up auth dialogs
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u && u.user_id === fpUserId) {
            u.fingerprint_enrolled = true;
            localStorage.setItem('user', JSON.stringify(u));
          }
        }
      } catch {
        // ignore
      }

      setTimeout(cancelFingerprintSetup, 900);
    } catch (error) {
      setFpError(error.message || 'Enrollment failed');
    } finally {
      setFpLoading(false);
    }
  }

  async function removeFingerprint(userId) {
    if (!confirm('Remove fingerprint templates for this user?')) return;
    try {
      const res = await fetch('/api/fingerprint/enroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove fingerprint');
      await fetchUsers();

      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u && u.user_id === userId) {
            u.fingerprint_enrolled = false;
            localStorage.setItem('user', JSON.stringify(u));
          }
        }
      } catch {
        // ignore
      }
    } catch (error) {
      alert(error.message || 'Failed to remove fingerprint');
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
        <p style={{ color: '#64748b', marginBottom: '18px' }}>PIN + fingerprint management for user authentication.</p>

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
                <button onClick={() => (pinStep === 'enter' ? setPinDigits('') : setPinConfirm(''))} style={{ padding: 14, borderRadius: 10, border: '2px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>CLR</button>
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

        {fpUserId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: 24, width: 520, maxWidth: '95vw' }}>
              <h3 style={{ margin: 0, marginBottom: 6 }}>Enroll Fingerprint</h3>
              <p style={{ marginTop: 0, color: '#64748b' }}>{users.find((u) => u.user_id === fpUserId)?.full_name}</p>
              <FingerprintScanner
                format={SampleFormat.PngImage}
                autoStart
                onSample={(s) => {
                  setFpSamples((prev) => {
                    if (prev.length >= 4) return prev;
                    return [...prev, s];
                  });
                }}
                hint={`Captured ${fpSamples.length}/4 (minimum 2).`}
              />
              {fpError && <div style={{ color: '#dc2626', marginTop: 10, fontSize: 13 }}>⚠️ {fpError}</div>}
              {fpSuccess && <div style={{ color: '#16a34a', marginTop: 10, fontSize: 13 }}>✅ {fpSuccess}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  onClick={submitFingerprintEnrollment}
                  disabled={fpLoading || fpSamples.length < 2}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: 'none',
                    borderRadius: 10,
                    background: fpSamples.length < 2 || fpLoading ? '#93c5fd' : '#1d4ed8',
                    color: 'white',
                    fontWeight: 800,
                    cursor: fpSamples.length < 2 || fpLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {fpLoading ? 'Saving...' : 'Save fingerprint'}
                </button>
                <button
                  onClick={cancelFingerprintSetup}
                  style={{ padding: '12px 16px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#f1f5f9', fontWeight: 800, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['User', 'Role', 'PIN', 'Fingerprint', 'Actions'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>{h}</th>)}
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
                  <td style={{ padding: '12px 14px' }}>{u.fingerprint_enrolled ? '✅ Enrolled' : 'Not enrolled'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => startPinSetup(u.user_id)} style={{ marginRight: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontWeight: 700 }}>
                      {u.pin_code ? 'Change PIN' : 'Set PIN'}
                    </button>
                    {u.pin_code && (
                      <button onClick={() => removePin(u.user_id)} style={{ marginRight: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>
                        Remove PIN
                      </button>
                    )}

                    <button
                      onClick={() => startFingerprintSetup(u.user_id)}
                      style={{ marginRight: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3', cursor: 'pointer', fontWeight: 800 }}
                    >
                      {u.fingerprint_enrolled ? 'Re-enroll' : 'Enroll'}
                    </button>
                    {u.fingerprint_enrolled && (
                      <button onClick={() => removeFingerprint(u.user_id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}>
                        Remove FP
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
