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
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div
        className="hidden md:flex flex-1 flex-col justify-center px-16 relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, #1e3a5f 0%, #0f172a 65%)',
        }}
      >
        {/* Subtle glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-sm">
          <p className="text-blue-400 text-[11px] font-semibold tracking-[.12em] uppercase mb-6">
            SIMS College of Pharmacy
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Discipline<br />Management<br />System
          </h1>
          <p className="text-slate-400 text-[15px] leading-relaxed">
            Digital duty scheduling, student violations, and live attendance — all in one place.
          </p>
        </div>

        <p className="absolute bottom-6 left-16 text-slate-600 text-[11px]">
          SIMS DMS · Version 1.0
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full md:w-[400px] bg-white flex flex-col justify-center px-10 py-12 shrink-0">
        {/* Mobile brand */}
        <div className="md:hidden text-center mb-8">
          <p className="text-slate-900 font-bold text-lg">SIMS DMS</p>
          <p className="text-slate-500 text-sm">SIMS College of Pharmacy</p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
            <div>
              <h2 className="text-[22px] font-semibold text-slate-900">Sign in</h2>
              <p className="text-slate-500 text-[13px] mt-1">
                Enter your Telegram ID to receive your OTP
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-slate-600">
                Telegram ID
              </label>
              <input
                type="text"
                placeholder="@username or numeric ID"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                required
                autoFocus
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] text-slate-900
                  placeholder:text-slate-400 outline-none focus:border-blue-500
                  focus:ring-[3px] focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-[12px] text-blue-700">
              Your OTP will be sent to you via the{' '}
              <span className="font-semibold">@SIMSDMSBOT</span> Telegram bot.
              Make sure you have started the bot before signing in.
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={requestOtp.isPending || !telegramId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                text-white text-[13px] font-semibold rounded-lg py-2.5 transition-colors"
            >
              {requestOtp.isPending ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
            <div>
              <h2 className="text-[22px] font-semibold text-slate-900">Enter OTP</h2>
              <p className="text-slate-500 text-[13px] mt-1">
                Check your Telegram for a 6-digit code
              </p>
            </div>

            {/* Locked error — full alert */}
            {errorType === 'locked' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[12px] text-red-700">
                <p className="font-semibold mb-0.5">Account locked</p>
                <p>{error} Contact your Admin to reset your session.</p>
              </div>
            )}

            {/* Expired warning */}
            {(errorType === 'expired' || expired) && errorType !== 'locked' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-[12px] text-amber-700">
                OTP has expired.{' '}
                <button type="button" onClick={handleResend}
                  className="font-semibold underline underline-offset-2">
                  Send a new one
                </button>
              </div>
            )}

            {/* Wrong OTP error */}
            {errorType === 'wrong' && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <OtpInput
              value={otp}
              onChange={setOtp}
              hasError={errorType === 'wrong'}
            />

            {/* Timer + resend */}
            {!expired && errorType !== 'locked' && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-400">
                  Expires in <Countdown key={timerKey} startAt={300} onExpire={() => setExpired(true)} />
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={requestOtp.isPending}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                >
                  {requestOtp.isPending ? 'Sending…' : 'Resend OTP'}
                </button>
              </div>
            )}

            {errorType !== 'locked' && (
              <button
                type="submit"
                disabled={verifyOtp.isPending || otp.length < 6 || expired}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                  text-white text-[13px] font-semibold rounded-lg py-2.5 transition-colors"
              >
                {verifyOtp.isPending ? 'Verifying…' : 'Verify & Sign in'}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setStep('request'); setError(''); setErrorType(''); setOtp(''); setExpired(false); }}
              className="text-[12px] text-slate-400 hover:text-slate-600 text-center transition-colors"
            >
              ← Use a different Telegram ID
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
