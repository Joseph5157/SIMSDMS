import { useState } from 'react';
import { Drawer } from 'vaul';
import { X, User, Mail, Briefcase, Phone, Shield } from 'lucide-react';

/* ── tiny helpers ── */
function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, color: '#64748b',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {Icon && <Icon size={11} strokeWidth={2.5} />}
        {label}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>
      )}
    </div>
  );
}

function TextInput({ placeholder, value, onChange, type = 'text', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        height: 44,
        padding: '0 14px',
        borderRadius: 12,
        border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
        backgroundColor: focused ? '#fff' : '#f8fafc',
        fontSize: 14,
        color: '#0f172a',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s, background-color 0.15s',
        boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
      }}
      {...props}
    />
  );
}

function RoleButton({ label, subtitle, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 8px',
        borderRadius: 12,
        border: `1.5px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
        backgroundColor: selected ? '#eff6ff' : '#f8fafc',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s',
      }}
    >
      <p style={{
        fontSize: 13, fontWeight: 700,
        color: selected ? '#2563eb' : '#475569',
        marginBottom: 1,
      }}>{label}</p>
      <p style={{ fontSize: 10, color: selected ? '#60a5fa' : '#94a3b8' }}>
        {subtitle}
      </p>
    </button>
  );
}

/* ── main component ── */
export default function CreateUserDrawer({ open, onClose, onSubmit, loading, actorRole }) {
  const [form, setForm] = useState({
    name: '', email: '', role: 'faculty',
    department: '', designation: '', phone: '',
  });
  const [inviteLink, setInviteLink] = useState(null);
  const [invitedName, setInvitedName] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setRole = (r) => setForm(f => ({ ...f, role: r }));

  function handleSubmit(e) {
    e.preventDefault();
    // Pass a callback to handle the response
    onSubmit(form, (response) => {
      if (response.invite_link) {
        // Always show invite panel after creating invite
        setInviteLink(response.invite_link);
        setInvitedName(response.invite?.name || form.name);
      } else {
        // Shouldn't happen now, but reset anyway
        resetAndClose();
      }
    });
  }

  function resetAndClose() {
    setForm({ name: '', email: '', role: 'faculty', department: '', designation: '', phone: '' });
    setInviteLink(null);
    setInvitedName('');
    onClose();
  }

  function shareOnWhatsApp() {
    const message = `Hi ${invitedName}, tap this link to activate your SIMS account: ${inviteLink}`;
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  }

  // Extract invite token from the deep link
  function extractInviteToken() {
    const match = inviteLink?.match(/[?&]start=([^&]+)/);
    return match ? match[1] : '';
  }

  function copyCommand() {
    const token = extractInviteToken();
    const command = `/start ${token}`;
    navigator.clipboard.writeText(command);
  }

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()} shouldScaleBackground>
      <Drawer.Portal>
        {/* Backdrop */}
        <Drawer.Overlay style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 39,
        }} />

        {/* Sheet */}
        <Drawer.Content style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 40,
          backgroundColor: '#fff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}>

          {/* Drag handle */}
          <div style={{
            width: 36, height: 4,
            backgroundColor: '#e2e8f0',
            borderRadius: 2,
            margin: '12px auto 0',
            flexShrink: 0,
          }} />

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px 12px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
          }}>
            <div>
              <Drawer.Title style={{
                fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0,
              }}>
                Invite user
              </Drawer.Title>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                An invite link will be sent to their Telegram
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b',
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable body — form or invite panel */}
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {inviteLink ? (
              // ── INVITE LINK PANEL ──
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                    ✅ Invite created
                  </p>
                  <p style={{ fontSize: 12, color: '#64748b' }}>
                    Share instructions with {invitedName}
                  </p>
                </div>

                {/* Step-by-step instructions */}
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 12,
                  color: '#1e40af',
                  lineHeight: 1.6,
                }}>
                  <p style={{ fontWeight: 700, marginBottom: 8 }}>📋 Instructions:</p>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Open Telegram and search for <strong>@SimsPharmacybot</strong></li>
                    <li>Tap "Start" when you open the bot</li>
                    <li>Copy and send this exact message:</li>
                  </ol>
                </div>

                {/* Bot username highlight */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 10,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px 0' }}>Bot Username</p>
                  <p style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    fontFamily: 'monospace',
                    margin: 0,
                  }}>
                    @SimsPharmacybot
                  </p>
                </div>

                {/* Activation command */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 12,
                  wordBreak: 'break-word',
                  fontSize: 12,
                  color: '#0f172a',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}>
                  /start {extractInviteToken()}
                </div>

                {/* Copy command and quick link buttons */}
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <button
                    onClick={copyCommand}
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 10,
                      border: '1.5px solid #3b82f6',
                      backgroundColor: '#eff6ff',
                      fontSize: 13, fontWeight: 700, color: '#2563eb',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    📋 Copy command
                  </button>
                  <a
                    href={inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 44,
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: '#0088cc',
                      fontSize: 13, fontWeight: 700, color: '#fff',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    🔗 Open Telegram
                  </a>
                  <button
                    onClick={shareOnWhatsApp}
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: '#25d366',
                      fontSize: 13, fontWeight: 700, color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    💬 Share WhatsApp
                  </button>
                </div>

                {/* Info text */}
                <p style={{ fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                  Link expires in 7 days.<br />
                  If issues with deep links, use the command method above.
                </p>
              </div>
            ) : (
              // ── FORM ──
              <form onSubmit={handleSubmit} style={{ padding: '16px 20px 8px' }}>

                {/* ── Section: Identity ── */}
                <p style={{
                  fontSize: 10, fontWeight: 800, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  marginBottom: 10,
                }}>
                  Identity
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <Field label="Full name" icon={User}>
                    <TextInput
                      placeholder="Dr. Priya Sharma"
                      value={form.name}
                      onChange={set('name')}
                      required
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" icon={Mail}>
                    <TextInput
                      type="email"
                      placeholder="priya@sims.edu.in"
                      value={form.email}
                      onChange={set('email')}
                      required
                      autoComplete="email"
                    />
                  </Field>
                </div>

                {/* ── Section: Role ── */}
                <p style={{
                  fontSize: 10, fontWeight: 800, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  marginBottom: 10,
                }}>
                  Role
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <RoleButton
                    label="Faculty"
                    subtitle="Records violations"
                    selected={form.role === 'faculty'}
                    onClick={() => setRole('faculty')}
                  />
                  {actorRole === 'super_admin' && (
                    <RoleButton
                      label="Admin"
                      subtitle="Manages system"
                      selected={form.role === 'admin'}
                      onClick={() => setRole('admin')}
                    />
                  )}
                </div>

                {/* ── Section: Department ── */}
                <p style={{
                  fontSize: 10, fontWeight: 800, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  marginBottom: 10,
                }}>
                  Department
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <Field label="Department" icon={Briefcase}>
                    <TextInput
                      placeholder="Pharmacology"
                      value={form.department}
                      onChange={set('department')}
                    />
                  </Field>
                  <Field label="Designation" icon={Shield}>
                    <TextInput
                      placeholder="Assistant Professor"
                      value={form.designation}
                      onChange={set('designation')}
                    />
                  </Field>
                </div>

                {/* ── Section: Contact ── */}
                <p style={{
                  fontSize: 10, fontWeight: 800, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  marginBottom: 10,
                }}>
                  Contact
                </p>
                <div style={{ marginBottom: 24 }}>
                  <Field label="Phone" icon={Phone}>
                    <TextInput
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={set('phone')}
                      autoComplete="tel"
                    />
                  </Field>
                </div>

              </form>
            )}
          </div>

          {/* Sticky footer */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            backgroundColor: '#fff',
            justifyContent: inviteLink ? 'center' : 'flex-start',
          }}>
            {inviteLink ? (
              // ── INVITE PANEL BUTTONS ──
              <button
                onClick={resetAndClose}
                style={{
                  flex: 1,
                  maxWidth: 200,
                  height: 48,
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                  transition: 'all 0.15s',
                }}
              >
                Done
              </button>
            ) : (
              // ── FORM BUTTONS ──
              <>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    border: '1.5px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    fontSize: 14, fontWeight: 700, color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.name.trim() || !form.email.trim()}
                  onClick={handleSubmit}
                  style={{
                    flex: 2,
                    height: 48,
                    borderRadius: 14,
                    border: 'none',
                    background: loading || !form.name.trim() || !form.email.trim()
                      ? '#93c5fd'
                      : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {loading ? '🔄 Sending...' : 'Send Invite'}
                </button>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
