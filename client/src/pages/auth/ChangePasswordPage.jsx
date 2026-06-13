import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../../hooks/useAuth';
import api from '../../utils/api';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if this is a mandatory password change
  const isMandatory = currentUser?.must_change_password ?? false;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      // Update React Query cache to reflect password change
      const updatedUser = { ...currentUser, must_change_password: false };
      queryClient.setQueryData(['currentUser'], updatedUser);

      // Show success and redirect
      if (currentUser?.role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      setIsLoading(false);
      const code = err.response?.data?.code;
      if (code === 'INVALID_CURRENT_PASSWORD') {
        setError('Current password is incorrect.');
      } else {
        setError(err.response?.data?.message ?? 'Failed to change password. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    // Go back or to dashboard if voluntary change
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (currentUser?.role === 'faculty') {
      navigate('/faculty/dashboard');
    } else {
      navigate('/admin/dashboard');
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
        {/* App icon */}
        <div style={{
          width: 72, height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 20,
          boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
        }}>
          🔐
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
          Change Password
        </h1>

        <p style={{
          fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 280,
        }}>
          Secure your account with a new password
        </p>
      </div>

      {/* ── Bottom white form card ── */}
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

        {/* Mandatory change banner */}
        {isMandatory && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 20,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
              You must set a new password before continuing to access the system.
            </p>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <h2 style={{
              fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4,
            }}>
              Update your password
            </h2>
            <p style={{ fontSize: 14, color: '#94a3b8' }}>
              Enter your current password and choose a new one
            </p>
          </div>

          {/* Current password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Current Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
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

          {/* New password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Enter a new password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
                Password must be at least 8 characters
              </p>
            )}
          </div>

          {/* Confirm password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Confirm New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
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
            {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>
                Passwords do not match
              </p>
            )}
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

          {/* Buttons */}
          <div style={{
            display: 'flex', gap: 12, flexDirection: 'column',
          }}>
            <button
              type="submit"
              disabled={isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim() || newPassword.length < 8 || newPassword !== confirmNewPassword}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 14,
                border: 'none',
                background: isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim() || newPassword.length < 8 || newPassword !== confirmNewPassword
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim() || newPassword.length < 8 || newPassword !== confirmNewPassword
                  ? 'not-allowed' : 'pointer',
                boxShadow: isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim() || newPassword.length < 8 || newPassword !== confirmNewPassword
                  ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
                transition: 'all 0.15s',
              }}
            >
              {isLoading ? '⏳ Updating…' : 'Update Password →'}
            </button>

            {/* Cancel button (only for voluntary changes) */}
            {!isMandatory && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                style={{
                  fontSize: 13, color: '#94a3b8', background: 'none',
                  border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'center', opacity: isLoading ? 0.6 : 1,
                }}
              >
                ← Cancel
              </button>
            )}
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
