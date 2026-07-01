import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import simsLogo from '../../assets/sims-logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      if (userData.must_change_password) {
        navigate('/change-password', { replace: true });
      } else if (!userData.role) {
        setError('Login failed: No role information received.');
      } else {
        const role = userData.role?.toLowerCase() || '';
        if (role === ROLES.FACULTY) {
          navigate('/faculty/dashboard', { replace: true });
        } else {
          navigate('/admin/dashboard', { replace: true });
        }
      }
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
  };

  const isDisabled = login.isPending || !email.trim() || !password.trim();

  const inputClasses = [
    'border-2 border-[var(--border)] rounded-[var(--radius-xl)] px-5 h-14',
    'text-[var(--text-primary)]',
    'outline-none w-full bg-[var(--surface-page)]',
    'transition-[border-color] duration-[var(--dur-fast)]',
    'focus:border-[var(--brand)]',
    login.isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-auto',
  ].join(' ');

  return (
    <div className="min-h-dvh w-full flex flex-col items-center bg-[var(--surface-sidebar)] relative overflow-hidden">

      {/* ── Background glow circles ── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: -80, right: -80, width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: 200, left: -60, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
        }}
      />

      {/* ── Centered container (max-width for desktop) ── */}
      <div className="w-full max-w-[440px] flex flex-col flex-1">

        {/* ── Top branding area ── */}
        <div className="flex-none flex flex-col items-center justify-center pt-12 sm:pt-16 pb-8 px-6 text-center">
          <img
            src={simsLogo}
            alt="SIMS College of Pharmacy"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-4"
          />

          <p className="text-[length:var(--text-small)] font-[var(--weight-bold)] text-[var(--color-blue-500)] uppercase tracking-[var(--tracking-caps)] mb-2">
            SIMS College of Pharmacy
          </p>

          <h1 className="text-[length:var(--text-display)] font-[var(--weight-extra)] text-[var(--text-on-dark)] leading-[var(--leading-tight)] mb-2">
            Discipline<br />Management System
          </h1>

          <p className="text-[length:var(--text-body)] text-[var(--text-secondary)] leading-[var(--leading-normal)] max-w-[280px]">
            Faculty duty scheduling and student violation tracking
          </p>
        </div>

        {/* ── Form card ── */}
        <div
          className="flex-1 sm:flex-none bg-[var(--surface-card)] rounded-t-[var(--radius-sheet)] sm:rounded-[var(--radius-sheet)] px-6 pt-8 pb-10 sm:mb-8"
          style={{ boxShadow: 'var(--shadow-sheet)' }}
        >
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="mb-1">
              <h2 className="text-[length:var(--text-h2)] font-[var(--weight-extra)] text-[var(--text-primary)] mb-1">
                Sign in
              </h2>
              <p className="text-[length:var(--text-body)] text-[var(--text-secondary)]">
                Enter your credentials to continue
              </p>
            </div>

            {/* Email field */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-email"
                className="text-[length:var(--text-small)] font-[var(--weight-bold)] text-[var(--text-secondary)] uppercase tracking-[var(--tracking-label)] pl-5"
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="your.email@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={login.isPending}
                style={{ fontSize: 16 }}
                className={inputClasses}
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-password"
                className="text-[length:var(--text-small)] font-[var(--weight-bold)] text-[var(--text-secondary)] uppercase tracking-[var(--tracking-label)] pl-5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={login.isPending}
                  style={{ fontSize: 16 }}
                  className={inputClasses + ' pr-14'}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-[var(--radius-lg)] px-3.5 py-3 text-[length:var(--text-card)] text-[var(--color-red-text)]"
                style={{
                  backgroundColor: 'var(--color-red-bg)',
                  border: '1px solid var(--color-red-border)',
                  borderLeft: '3px solid var(--color-red-solid)',
                }}
              >
                {error}
              </div>
            )}

            {/* Sign in CTA */}
            <button
              type="submit"
              disabled={isDisabled}
              className={[
                'w-full h-14 rounded-[var(--radius-xl)] border-none',
                'text-[length:var(--text-card-lg)] font-[var(--weight-bold)] font-[var(--font-sans)]',
                'text-[var(--text-on-brand)]',
                'transition-all duration-[var(--dur-fast)]',
                isDisabled ? 'bg-[var(--color-blue-300)] cursor-not-allowed shadow-none' : 'cursor-pointer active:scale-[0.97] active:opacity-90',
              ].join(' ')}
              style={
                isDisabled
                  ? undefined
                  : {
                      background: 'var(--brand-gradient-deep)',
                      boxShadow: 'var(--shadow-brand)',
                    }
              }
            >
              {login.isPending ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Password reset helper */}
            <div
              className="rounded-[var(--radius-lg)] px-3.5 py-3 flex gap-2.5 items-start"
              style={{
                backgroundColor: 'var(--color-blue-50)',
                border: '1px solid var(--color-blue-100)',
              }}
            >
              <span className="text-base shrink-0">🔑</span>
              <p className="text-[length:var(--text-card)] text-[var(--color-blue-700)] leading-[var(--leading-snug)]">
                Forgot your password? Send <strong>/resetpassword</strong> to{' '}
                <strong>@SimsPharmacybot</strong> on Telegram to receive a new temporary password.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
