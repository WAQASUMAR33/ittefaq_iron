'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const u = JSON.parse(userData);
        if (u?.user_id) router.push('/dashboard');
      } catch { /* ignore */ }
    }
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid email or password.');
      }
    } catch {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  }

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
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: '1 1 50%', background: '#f8fafc',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
              Welcome back
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0',
                  borderRadius: '12px', fontSize: '0.9375rem', color: '#0f172a',
                  background: 'white', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', border: '2px solid #e2e8f0',
                    borderRadius: '12px', fontSize: '0.9375rem', color: '#0f172a',
                    background: 'white', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px',
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', padding: '12px 16px', marginBottom: '18px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '1rem', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(29,78,216,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', marginTop: '32px' }}>
            &copy; 2025 Itefaq Iron &amp; Cement Store
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
