import { useState } from 'react';
import { Drawer } from 'vaul';
import { X, User, Mail, Briefcase, Phone, Shield } from 'lucide-react';

/* ── tiny helpers ── */
function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 tracking-[0.08em] mb-1.5">
        {Icon && <Icon size={11} strokeWidth={2.5} />}
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-500 mt-1">{error}</p>
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
      className="w-full h-11 px-3.5 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
      style={{
        border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
        backgroundColor: focused ? '#fff' : '#f8fafc',
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
      className="flex-1 px-2 py-2.5 rounded-xl text-center transition-all duration-150 cursor-pointer"
      style={{
        border: `1.5px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
        backgroundColor: selected ? '#eff6ff' : '#f8fafc',
      }}
    >
      <p className="text-sm font-bold mb-0.5" style={{ color: selected ? '#2563eb' : '#475569' }}>
        {label}
      </p>
      <p className="text-[10px]" style={{ color: selected ? '#60a5fa' : '#94a3b8' }}>
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
          <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-0 flex-shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
            <div>
              <Drawer.Title className="text-base font-black text-slate-900 m-0">
                Invite user
              </Drawer.Title>
              <p className="text-xs text-slate-400 mt-0.5">
                An invite link will be sent to their Telegram
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable body — form or invite panel */}
          <div className="overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {inviteLink ? (
              // ── INVITE LINK PANEL ──
              <div className="p-5 flex flex-col gap-3.5">
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 mb-1">
                    ✅ Invite created
                  </p>
                  <p className="text-xs text-slate-500">
                    Share instructions with {invitedName}
                  </p>
                </div>

                {/* Step-by-step instructions */}
                <div className="bg-blue-50 border-[1.5px] border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                  <p className="font-bold mb-2">📋 Instructions:</p>
                  <ol className="m-0" style={{ paddingLeft: '18px' }}>
                    <li>Open Telegram and search for <strong>@SimsPharmacybot</strong></li>
                    <li>Tap "Start" when you open the bot</li>
                    <li>Copy and send this exact message:</li>
                  </ol>
                </div>

                {/* Bot username highlight */}
                <div className="bg-slate-50 rounded-lg p-2.5 text-center" style={{ borderWidth: '1.5px', borderColor: '#cbd5e1' }}>
                  <p className="text-[11px] text-slate-500 m-0 mb-1.5">Bot Username</p>
                  <p className="text-sm font-bold text-slate-900 m-0" style={{ fontFamily: 'monospace' }}>
                    @SimsPharmacybot
                  </p>
                </div>

                {/* Activation command */}
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-900 font-semibold" style={{ borderWidth: '1.5px', borderColor: '#e2e8f0', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                  /start {extractInviteToken()}
                </div>

                {/* Copy command and quick link buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={copyCommand}
                    className="w-full h-11 rounded-lg font-bold text-sm text-blue-600 cursor-pointer transition-all duration-150 hover:bg-blue-100"
                    style={{ borderWidth: '1.5px', borderColor: '#3b82f6', backgroundColor: '#eff6ff' }}
                  >
                    📋 Copy command
                  </button>
                  <a
                    href={inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-11 rounded-lg border-0 bg-cyan-500 text-xs font-bold text-white cursor-pointer no-underline transition-all duration-150 hover:bg-cyan-600"
                  >
                    🔗 Open Telegram
                  </a>
                  <button
                    onClick={shareOnWhatsApp}
                    className="w-full h-11 rounded-lg border-0 bg-green-500 text-xs font-bold text-white cursor-pointer transition-all duration-150 hover:bg-green-600"
                  >
                    💬 Share WhatsApp
                  </button>
                </div>

                {/* Info text */}
                <p className="text-[11px] text-slate-500 text-center leading-relaxed m-0">
                  Link expires in 7 days.<br />
                  If issues with deep links, use the command method above.
                </p>
              </div>
            ) : (
              // ── FORM ──
              <form onSubmit={handleSubmit} className="px-5 py-4 pb-2">

                {/* ── Section: Identity ── */}
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-2.5">
                  Identity
                </p>
                <div className="flex flex-col gap-3 mb-5">
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-2.5">
                  Role
                </p>
                <div className="flex gap-2 mb-5">
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-2.5">
                  Department
                </p>
                <div className="flex flex-col gap-3 mb-5">
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-2.5">
                  Contact
                </p>
                <div className="mb-6">
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
          <div className="px-5 py-3 border-t border-slate-100 flex gap-2.5 flex-shrink-0 bg-white" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', justifyContent: inviteLink ? 'center' : 'flex-start' }}>
            {inviteLink ? (
              // ── INVITE PANEL BUTTONS ──
              <button
                onClick={resetAndClose}
                className="flex-1 h-12 rounded-xl border-0 text-sm font-bold text-white cursor-pointer transition-all duration-150 hover:opacity-90"
                style={{ maxWidth: '200px', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
              >
                Done
              </button>
            ) : (
              // ── FORM BUTTONS ──
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-all duration-150"
                  style={{ borderWidth: '1.5px', borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.name.trim() || !form.email.trim()}
                  onClick={handleSubmit}
                  className="flex-[2] h-12 rounded-xl border-0 text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-150 disabled:opacity-60"
                  style={{
                    background: loading || !form.name.trim() || !form.email.trim()
                      ? '#93c5fd'
                      : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
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
