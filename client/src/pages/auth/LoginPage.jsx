import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestOtp, useVerifyOtp } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import api from '../../utils/api';

// ── 6-box OTP input ─────────────────────────────────────────────────────────
function OtpInput({ value, onChange, hasError }) {
  const inputs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  function handleKey(e, idx) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = value.slice(0, idx) + value.slice(idx + 1);
      onChange(next);
      if (idx > 0) inputs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) { inputs.current[idx - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && idx < 5) { inputs.current[idx + 1]?.focus(); return; }
  }

  function handleChange(e, idx) {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    const arr = digits.slice();
    arr[idx] = char;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, 5);
      inputs.current[focusIdx]?.focus();
    }
  }

  const borderCls = hasError
    ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-200'
    : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-100';

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={d}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-12 text-center text-[18px] font-mono font-semibold border rounded-lg outline-none
            focus:ring-[3px] transition-all ${borderCls}`}
        />
      ))}
    </div>
  );
}

// ── Countdown timer ──────────────────────────────────────────────────────────
function Countdown({ startAt, onExpire }) {
  const [secs, setSecs] = useState(startAt);

  useEffect(() => {
    setSecs(startAt);
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { clearInterval(id); onExpire(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [startAt]); // eslint-disable-line

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const urgent = secs <= 60;

  return (
    <span className={`font-mono text-sm ${urgent ? 'text-red-600' : 'text-slate-500'}`}>
      {mm}:{ss}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep]           = useState('request'); // 'request' | 'verify'
  const [email, setEmail] = useState('');
  const [otp, setOtp]             = useState('');
  const [error, setError]         = useState('');
  const [errorType, setErrorType] = useState(''); // 'wrong' | 'expired' | 'locked' | ''
  const [timerKey, setTimerKey]   = useState(0);
  const [expired, setExpired]     = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const requestOtp = useRequestOtp();
  const verifyOtp  = useVerifyOtp();

  // Process Telegram auth hash on component mount
  useEffect(() => {
    const processAuthHash = async () => {
      const hash = window.location.hash;
      if (!hash.includes('tgAuthResult=')) return;

      try {
        setTelegramLoading(true);

        // Extract and decode tgAuthResult from hash
        const match = hash.match(/tgAuthResult=([^&]*)/);
        if (!match || !match[1]) return;

        const encoded = match[1];
        // Replace URL-safe base64 chars and pad
        const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padding = (4 - (padded.length % 4)) % 4;
        const base64 = padded + '='.repeat(padding);

        // Decode and parse
        const decoded = atob(base64);
        const user = JSON.parse(decoded);

        // Clear hash from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // POST decoded user to backend
        const res = await api.post('/auth/telegram-callback', user);
        const userData = res.data;
        if (userData.role === 'faculty') navigate('/faculty/dashboard', { replace: true });
        else navigate('/admin/dashboard', { replace: true });
      } catch (err) {
        setTelegramLoading(false);
        // Clear hash on error
        window.history.replaceState({}, document.title, window.location.pathname);

        const code = err.response?.data?.code;
        const msg = err.response?.data?.message ?? 'Telegram login failed. Please try again.';

        if (code === 'TELEGRAM_NOT_LINKED') {
          toast({ message: 'Account not linked. Please use your invite link from Telegram first.', type: 'error' });
        } else {
          toast({ message: msg, type: 'error' });
        }
      }
    };

    processAuthHash();
  }, [navigate, toast]);

  // Inject Telegram widget script with data-auth-url (avoids eval required by data-onauth)
  useEffect(() => {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
    const container = document.getElementById('telegram-login-widget');

    // Inject Telegram widget script with data attributes into the container
    if (container && botUsername) {
      // Create script tag with data attributes — the widget library's getAllWidgets()
      // scans for script[data-telegram-login] and replaces it with an iframe in-place
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '10');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-auth-url', window.location.origin + '/login');
      script.setAttribute('data-userpic', 'false');

      // Append script into the container — widget self-initializes on script execution
      container.appendChild(script);

      // Cleanup: remove the injected script and any generated iframe on unmount
      return () => {
        // Remove the script tag we injected
        if (script.parentNode === container) {
          container.removeChild(script);
        }
        // Remove any generated iframe (id starts with "telegram-login-")
        const iframe = container.querySelector('iframe[id^="telegram-login-"]');
        if (iframe) {
          container.removeChild(iframe);
        }
      };
    }
  }, []);

  const handleRequestOtp = useCallback(async (e) => {
    e?.preventDefault();
    setError('');
    setErrorType('');
    setOtp('');
    setExpired(false);
    try {
      await requestOtp.mutateAsync(email.trim());
      setStep('verify');
      setTimerKey((k) => k + 1);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Could not send OTP. Please try again.';
      setError(msg);
    }
  }, [requestOtp]);

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp.length < 6) return;
    setError('');
    setErrorType('');
    try {
      const res = await verifyOtp.mutateAsync({ email: email.trim(), otp });
      const user = res.data;
      if (user.role === 'faculty') navigate('/faculty/dashboard', { replace: true });
      else navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.message ?? 'Verification failed. Please try again.';
      if (code === 'OTP_EXPIRED')  { setErrorType('expired'); setError('OTP has expired.'); }
      else if (code === 'ACCOUNT_LOCKED') { setErrorType('locked'); setError(msg); }
      else { setErrorType('wrong'); setError(msg); }
      setOtp('');
    }
  }

  function handleResend() {
    handleRequestOtp();
  }

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

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} style={{
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div>
              <h2 style={{
                fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4,
              }}>
                Sign in
              </h2>
              <p style={{ fontSize: 14, color: '#94a3b8' }}>
                Enter your email address to receive your OTP
              </p>
            </div>

            {/* ── Telegram Login Section ── */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe',
              borderRadius: 12, padding: '16px',
            }}>
              <p style={{
                fontSize: 12, fontWeight: 700, color: '#0369a1',
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
              }}>
                Quick Login
              </p>
              <div id="telegram-login-widget" style={{ textAlign: 'center' }} />
              {telegramLoading && (
                <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: 0 }}>
                  ⏳ Verifying with Telegram…
                </p>
              )}
            </div>

            {/* ── Divider ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginTop: 4, marginBottom: 4,
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            </div>

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
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>✈️</span>
              <p style={{ fontSize: 13, color: '#1d4ed8', lineHeight: 1.5 }}>
                OTP sent via <strong>@SimsPharmacybot</strong> Telegram bot.
                Make sure you have started the bot.
              </p>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 12, padding: '12px 14px',
                fontSize: 13, color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={requestOtp.isPending || !email.trim()}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 14,
                border: 'none',
                background: requestOtp.isPending || !email.trim()
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: requestOtp.isPending || !email.trim()
                  ? 'not-allowed' : 'pointer',
                boxShadow: requestOtp.isPending || !email.trim()
                  ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
                transition: 'all 0.15s',
              }}
            >
              {requestOtp.isPending ? '⏳ Sending…' : 'Send OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div>
              <h2 style={{
                fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4,
              }}>
                Enter OTP
              </h2>
              <p style={{ fontSize: 14, color: '#94a3b8' }}>
                Check your Telegram for a 6-digit code
              </p>
            </div>

            {errorType === 'locked' && (
              <div style={{
                backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626',
              }}>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>Account locked</p>
                <p>{error} Contact your Admin to reset.</p>
              </div>
            )}

            {(errorType === 'expired' || expired) && errorType !== 'locked' && (
              <div style={{
                backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#92400e',
              }}>
                OTP expired.{' '}
                <button type="button" onClick={handleResend}
                  style={{ fontWeight: 700, textDecoration: 'underline',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#92400e', fontSize: 13 }}>
                  Send a new one
                </button>
              </div>
            )}

            {errorType === 'wrong' && (
              <div style={{
                backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            <OtpInput value={otp} onChange={setOtp} hasError={errorType === 'wrong'} />

            {!expired && errorType !== 'locked' && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', fontSize: 13,
              }}>
                <span style={{ color: '#94a3b8' }}>
                  Expires in{' '}
                  <Countdown key={timerKey} startAt={300}
                    onExpire={() => setExpired(true)} />
                </span>
                <button type="button" onClick={handleResend}
                  disabled={requestOtp.isPending}
                  style={{ color: '#2563eb', background: 'none', border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {requestOtp.isPending ? 'Sending…' : 'Resend OTP'}
                </button>
              </div>
            )}

            {errorType !== 'locked' && (
              <button
                type="submit"
                disabled={verifyOtp.isPending || otp.length < 6 || expired}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  background: verifyOtp.isPending || otp.length < 6 || expired
                    ? '#93c5fd'
                    : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: verifyOtp.isPending || otp.length < 6 || expired
                    ? 'not-allowed' : 'pointer',
                  boxShadow: verifyOtp.isPending || otp.length < 6 || expired
                    ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
                }}
              >
                {verifyOtp.isPending ? '⏳ Verifying…' : 'Verify & Sign in →'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setStep('request'); setError(''); setErrorType('');
                setOtp(''); setExpired(false);
              }}
              style={{
                fontSize: 13, color: '#94a3b8', background: 'none',
                border: 'none', cursor: 'pointer', textAlign: 'center',
              }}
            >
              ← Use a different email
            </button>
          </form>
        )}

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
