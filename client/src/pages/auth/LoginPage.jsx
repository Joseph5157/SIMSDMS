import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const userData = res.data;
      // Update React Query cache so ProtectedRoute recognizes auth immediately
      queryClient.setQueryData(['currentUser'], userData);

      // If user must change password, redirect to change-password page
      if (userData.must_change_password) {
        navigate('/change-password', { replace: true });
      } else {
        // Otherwise redirect to role-based dashboard
        if (userData.role === 'faculty') {
          navigate('/faculty/dashboard', { replace: true });
        } else {
          navigate('/admin/dashboard', { replace: true });
        }
      }
    } catch {
      setIsLoading(false);
      // Always show generic error message for security
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0f172a',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Background decorative circles ── */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 200, left: -60,
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Top branding area (40% of screen) ── */}
      <div style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 72,
        paddingBottom: 40,
        paddingLeft: 24,
        paddingRight: 24,
        textAlign: 'center',
      }}>
        {/* App icon */}
        <div style={{
          width: 72, height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 20,
          boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
        }}>
          🎓
        </div>

        <p style={{
          fontSize: 12, fontWeight: 700, color: '#3b82f6',
          textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8,
        }}>
          SIMS College of Pharmacy
        </p>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#f8fafc',
          lineHeight: 1.2, marginBottom: 10,
        }}>
          Discipline<br />Management System
        </h1>

        <p style={{
          fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 280,
        }}>
          Faculty duty scheduling and student violation tracking
        </p>
      </div>

      {/* ── Bottom white form card (slides up) ── */}
      <div style={{
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: '28px 28px 0 0',
        padding: '32px 24px 48px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
      }}>
        {/* Pull handle */}
        <div style={{
          width: 40, height: 4, backgroundColor: '#e2e8f0',
          borderRadius: 2, margin: '0 auto 28px',
        }} />

        <form onSubmit={handleLogin} style={{
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <h2 style={{
              fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4,
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: 14, color: '#94a3b8' }}>
              Enter your email and password to access SIMS DMS
            </p>
          </div>

          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Email Address
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="your.email@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={isLoading}
              style={{
                border: '2px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px 16px',
                fontSize: 15,
                color: '#0f172a',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#f8fafc',
                transition: 'border-color 0.15s',
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'auto',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              style={{
                border: '2px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px 16px',
                fontSize: 15,
                color: '#0f172a',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#f8fafc',
                transition: 'border-color 0.15s',
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'auto',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 12, padding: '12px 14px',
              fontSize: 13, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              border: 'none',
              background: isLoading || !email.trim() || !password.trim()
                ? '#93c5fd'
                : 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: isLoading || !email.trim() || !password.trim()
                ? 'not-allowed' : 'pointer',
              boxShadow: isLoading || !email.trim() || !password.trim()
                ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
              transition: 'all 0.15s',
            }}
          >
            {isLoading ? '⏳ Signing in…' : 'Sign in →'}
          </button>

          {/* Password reset helper text */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔑</span>
            <p style={{ fontSize: 13, color: '#1d4ed8', lineHeight: 1.5 }}>
              Forgot your password? Send <strong>/resetpassword</strong> to{' '}
              <strong>@SimsPharmacybot</strong> on Telegram to receive a new temporary password.
            </p>
          </div>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 32,
        }}>
          SIMS DMS · Version 1.0
        </p>
      </div>
    </div>
  );
}
