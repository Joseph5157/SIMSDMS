import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestOtp, useVerifyOtp } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep]   = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp]     = useState('');
  const [error, setError] = useState('');

  const requestOtp = useRequestOtp();
  const verifyOtp  = useVerifyOtp();

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    try {
      await requestOtp.mutateAsync(email);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to send OTP. Please try again.');
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await verifyOtp.mutateAsync({ email, otp });
      const user = res.data;
      if (user.role === 'faculty') navigate('/faculty/dashboard', { replace: true });
      else navigate('/admin/users', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid OTP. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900">SIMS College of Pharmacy</h1>
          <p className="text-gray-500 text-sm mt-1">Discipline Management System</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={requestOtp.isPending} className="w-full justify-center">
              Send OTP via Telegram
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 bg-blue-50 rounded-lg px-4 py-3">
              OTP sent to your Telegram. Enter it below.
            </p>
            <Input
              label="6-digit OTP"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={verifyOtp.isPending} className="w-full justify-center">
              Verify OTP
            </Button>
            <button type="button" onClick={() => { setStep('email'); setError(''); setOtp(''); }}
              className="text-sm text-blue-600 hover:underline text-center">
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
