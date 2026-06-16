import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const res = await login.mutateAsync({
        email: email.trim(),
        password,
      });

      // Extract data from axios response
      const userData = res.data || res;

      console.log('=== LOGIN DEBUG ===');
      console.log('Full response:', res);
      console.log('User data:', userData);
      console.log('Response role field:', userData.role);
      console.log('ROLES.FACULTY value:', ROLES.FACULTY);

      if (userData.must_change_password) {
        console.log('→ Redirecting to change password');
        navigate('/change-password', { replace: true });
      } else if (!userData.role) {
        console.error('No role field in response!', userData);
        setError('Login failed: No role information received.');
      } else {
        const role = userData.role?.toLowerCase() || '';
        const isFaculty = role === ROLES.FACULTY;
        console.log('Role check:', { raw: userData.role, normalized: role, expected: ROLES.FACULTY, isFaculty });

        if (isFaculty) {
          console.log('→ Redirecting to /faculty/dashboard');
          navigate('/faculty/dashboard', { replace: true });
        } else {
          console.log('→ Redirecting to /admin/dashboard (role is not faculty)');
          navigate('/admin/dashboard', { replace: true });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    }
  };

  const isDisabled = login.isPending || !email.trim() || !password.trim();

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--surface-sidebar)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Background glow circles ── */}
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

      {/* ── Top branding area ── */}
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
        {/* Brand mark */}
        <div style={{
          width: 72, height: 72,
          borderRadius: 'var(--radius-3xl)',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 20,
          boxShadow: 'var(--shadow-brand)',
        }}>
          🎓
        </div>

        <p style={{
          fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)',
          color: 'var(--color-blue-500)',
          textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', marginBottom: 8,
        }}>
          SIMS College of Pharmacy
        </p>

        <h1 style={{
          fontSize: 'var(--text-display)', fontWeight: 'var(--weight-extra)',
          color: 'var(--text-on-dark)',
          lineHeight: 'var(--leading-tight)', marginBottom: 10,
        }}>
          Discipline<br />Management System
        </h1>

        <p style={{
          fontSize: 'var(--text-body)', color: 'var(--color-slate-500)',
          lineHeight: 'var(--leading-normal)', maxWidth: 280,
        }}>
          Faculty duty scheduling and student violation tracking
        </p>
      </div>

      {/* ── Form sheet ── */}
      <div style={{
        flex: 1,
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-sheet) var(--radius-sheet) 0 0',
        padding: '32px 24px 48px',
        boxShadow: 'var(--shadow-sheet)',
      }}>
        {/* Pull handle */}
        <div style={{
          width: 40, height: 4, backgroundColor: 'var(--border)',
          borderRadius: 2, margin: '0 auto 28px',
        }} />

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h2 style={{
              fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-extra)',
              color: 'var(--text-primary)', marginBottom: 4,
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)' }}>
              Enter your email and password to access SIMS DMS
            </p>
          </div>

          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
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
              disabled={login.isPending}
              style={{
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '14px 16px',
                fontSize: 'var(--text-card-lg)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'var(--surface-page)',
                transition: `border-color var(--dur-fast)`,
                opacity: login.isPending ? 0.6 : 1,
                cursor: login.isPending ? 'not-allowed' : 'auto',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
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
              disabled={login.isPending}
              style={{
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '14px 16px',
                fontSize: 'var(--text-card-lg)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'var(--surface-page)',
                transition: `border-color var(--dur-fast)`,
                opacity: login.isPending ? 0.6 : 1,
                cursor: login.isPending ? 'not-allowed' : 'auto',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              backgroundColor: 'var(--color-red-bg)',
              border: '1px solid var(--color-red-border)',
              borderLeft: '3px solid var(--color-red-solid)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
              fontSize: 'var(--text-card)',
              color: 'var(--color-red-text)',
            }}>
              {error}
            </div>
          )}

          {/* Sign in CTA */}
          <button
            type="submit"
            disabled={isDisabled}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 'var(--radius-xl)',
              border: 'none',
              background: isDisabled
                ? 'var(--color-blue-300)'
                : 'var(--brand-gradient-deep)',
              color: 'var(--text-on-brand)',
              fontSize: 'var(--text-card-lg)',
              fontWeight: 'var(--weight-bold)',
              fontFamily: 'var(--font-sans)',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              boxShadow: isDisabled ? 'none' : 'var(--shadow-brand)',
              transition: `all var(--dur-fast)`,
            }}
          >
            {login.isPending ? '⏳ Signing in…' : 'Sign in →'}
          </button>

          {/* Password reset helper */}
          <div style={{
            backgroundColor: 'var(--color-blue-50)',
            border: '1px solid var(--color-blue-100)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔑</span>
            <p style={{ fontSize: 'var(--text-card)', color: 'var(--color-blue-700)', lineHeight: 'var(--leading-snug)' }}>
              Forgot your password? Send <strong>/resetpassword</strong> to{' '}
              <strong>@SimsPharmacybot</strong> on Telegram to receive a new temporary password.
            </p>
          </div>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: 'var(--text-micro)',
          color: 'var(--text-muted)', marginTop: 32,
        }}>
          SIMS DMS · Version 1.0
        </p>
      </div>
    </div>
  );
}
