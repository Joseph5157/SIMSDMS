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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50">
      {/* ================= LEFT SIDE (Branding) ================= */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-center p-12 xl:p-20 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900/80 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_20%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_30%)] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        {/* Centered Content Container */}
        <div className="relative z-10 max-w-2xl mx-auto w-full space-y-12">
          {/* Logo - Top */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '0.05em' }}>SIMS DMS</p>
            <p style={{ color: '#93c5fd', fontSize: 13, marginTop: 4 }}>SIMS College of Pharmacy</p>
          </div>

          {/* Title & Description - Middle */}
          <div className="text-center space-y-6">
            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight">
              Discipline <br /> Management <br /> System
            </h1>
            <p className="text-blue-200 text-xl leading-relaxed">
              Digital duty scheduling, student violations, and live attendance — all in one place.
            </p>
          </div>

          {/* Version - Bottom */}
          <div className="text-center text-slate-400 text-sm font-medium">
            SIMS DMS · Version 1.0
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE (Login Form) ================= */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center min-h-screen lg:min-h-0 p-5 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="w-full max-w-sm lg:max-w-md">
          
          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sign in</h2>
            <p className="mt-2 text-gray-600">
              Enter your Telegram ID to receive your OTP
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {step === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div>
                  <label htmlFor="telegram-id" className="block text-sm font-semibold text-gray-700 mb-2">
                    Telegram ID
                  </label>
                  <input
                    id="telegram-id"
                    type="text"
                    required
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder="@username or numeric ID"
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    Your OTP will be sent via the <span className="font-semibold">@SIMSDMSBOT</span> Telegram bot.
                  </p>
                </div>

                {error && (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={requestOtp.isPending || !telegramId.trim()}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-200 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {requestOtp.isPending ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Enter OTP</h2>
                  <p className="mt-3 text-lg text-gray-500 leading-relaxed">
                    Check your Telegram for a 6-digit code.
                  </p>
                </div>

                {errorType === 'locked' && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p className="font-semibold mb-1">Account locked</p>
                    <p>{error} Contact your Admin to reset your session.</p>
                  </div>
                )}

                {(errorType === 'expired' || expired) && errorType !== 'locked' && (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    OTP has expired.{' '}
                    <button type="button" onClick={handleResend} className="font-semibold underline">
                      Send a new one
                    </button>
                  </div>
                )}

                {errorType === 'wrong' && (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <OtpInput value={otp} onChange={setOtp} hasError={errorType === 'wrong'} />

                {!expired && errorType !== 'locked' && (
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>
                      Expires in <Countdown key={timerKey} startAt={300} onExpire={() => setExpired(true)} />
                    </span>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={requestOtp.isPending}
                      className="text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed"
                    >
                      {requestOtp.isPending ? 'Sending…' : 'Resend OTP'}
                    </button>
                  </div>
                )}

                {errorType !== 'locked' && (
                  <button
                    type="submit"
                    disabled={verifyOtp.isPending || otp.length < 6 || expired}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-sky-200 disabled:text-slate-500"
                  >
                    {verifyOtp.isPending ? 'Verifying…' : 'Verify & Sign in'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setStep('request'); setError(''); setErrorType(''); setOtp(''); setExpired(false); }}
                  className="w-full rounded-lg bg-slate-50 py-3.5 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  ← Use a different Telegram ID
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
