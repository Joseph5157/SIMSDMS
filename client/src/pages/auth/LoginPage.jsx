import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestOtp, useVerifyOtp } from '../../hooks/useAuth';

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
  const [step, setStep]           = useState('request'); // 'request' | 'verify'
  const [telegramId, setTelegramId] = useState('');
  const [otp, setOtp]             = useState('');
  const [error, setError]         = useState('');
  const [errorType, setErrorType] = useState(''); // 'wrong' | 'expired' | 'locked' | ''
  const [timerKey, setTimerKey]   = useState(0);
  const [expired, setExpired]     = useState(false);

  const requestOtp = useRequestOtp();
  const verifyOtp  = useVerifyOtp();

  const handleRequestOtp = useCallback(async (e) => {
    e?.preventDefault();
    setError('');
    setErrorType('');
    setOtp('');
    setExpired(false);
    try {
      await requestOtp.mutateAsync(telegramId.trim());
      setStep('verify');
      setTimerKey((k) => k + 1);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Could not send OTP. Check your Telegram ID.';
      setError(msg);
    }
  }, [telegramId, requestOtp]);

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp.length < 6) return;
    setError('');
    setErrorType('');
    try {
      const res = await verifyOtp.mutateAsync({ telegram_id: telegramId.trim(), otp });
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
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
    }}>
      {/* Left dark panel */}
      <div style={{
        flex: 1,
        background: 'radial-gradient(ellipse at 30% 50%, #1e3a5f 0%, #0f172a 65%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '33%',
          left: '25%',
          width: 384,
          height: 384,
          background: 'rgba(37,99,235,0.1)',
          borderRadius: '50%',
          filter: 'blur(64px)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 10 }}>
          <p style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>
            SIMS College of Pharmacy
          </p>
          <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1.25, marginBottom: 16 }}>
            Discipline<br />Management<br />System
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.625 }}>
            Digital duty scheduling, student violations, and live attendance — all in one place.
          </p>
        </div>
        <p style={{ position: 'absolute', bottom: 24, left: 64, color: '#475569', fontSize: 11 }}>
          SIMS DMS · Version 1.0
        </p>
      </div>

      {/* Right white panel */}
      <div style={{
        width: 420,
        minWidth: 420,
        maxWidth: 420,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 40px',
        boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
        overflowY: 'auto',
      }}>
        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: '#0f172a' }}>Sign in</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                Enter your Telegram ID to receive your OTP
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Telegram ID</label>
              <input
                type="text"
                placeholder="@username or numeric ID"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                required
                autoFocus
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#1d4ed8' }}>
              Your OTP will be sent to you via the{' '}
              <span style={{ fontWeight: 600 }}>@SIMSDMSBOT</span> Telegram bot.
              Make sure you have started the bot before signing in.
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={requestOtp.isPending || !telegramId.trim()}
              style={{
                width: '100%',
                background: requestOtp.isPending || !telegramId.trim() ? '#93c5fd' : '#2563eb',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                padding: '10px 0',
                border: 'none',
                cursor: requestOtp.isPending || !telegramId.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {requestOtp.isPending ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: '#0f172a' }}>Enter OTP</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                Check your Telegram for a 6-digit code
              </p>
            </div>

            {errorType === 'locked' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#b91c1c' }}>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>Account locked</p>
                <p>{error} Contact your Admin to reset your session.</p>
              </div>
            )}

            {(errorType === 'expired' || expired) && errorType !== 'locked' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#92400e' }}>
                OTP has expired.{' '}
                <button type="button" onClick={handleResend} style={{ fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}>
                  Send a new one
                </button>
              </div>
            )}

            {errorType === 'wrong' && (
              <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </p>
            )}

            <OtpInput value={otp} onChange={setOtp} hasError={errorType === 'wrong'} />

            {!expired && errorType !== 'locked' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#94a3b8' }}>
                  Expires in <Countdown key={timerKey} startAt={300} onExpire={() => setExpired(true)} />
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={requestOtp.isPending}
                  style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                >
                  {requestOtp.isPending ? 'Sending…' : 'Resend OTP'}
                </button>
              </div>
            )}

            {errorType !== 'locked' && (
              <button
                type="submit"
                disabled={verifyOtp.isPending || otp.length < 6 || expired}
                style={{
                  width: '100%',
                  background: verifyOtp.isPending || otp.length < 6 || expired ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  padding: '10px 0',
                  border: 'none',
                  cursor: verifyOtp.isPending || otp.length < 6 || expired ? 'not-allowed' : 'pointer',
                }}
              >
                {verifyOtp.isPending ? 'Verifying…' : 'Verify & Sign in'}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setStep('request'); setError(''); setErrorType(''); setOtp(''); setExpired(false); }}
              style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              ← Use a different Telegram ID
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
