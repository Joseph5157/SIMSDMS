import { useState } from 'react';
import { Drawer } from 'vaul';
import { X, Users, AlignLeft, MessageSquare } from 'lucide-react';
import { useSendMessage } from '../hooks/useMessages';
import { useUsers } from '../hooks/useUsers';
import { useToast } from './ui/Toast';

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {Icon && <Icon size={11} strokeWidth={2.5} />}
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ placeholder, value, onChange, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', height: 44,
        padding: '0 14px', borderRadius: 12,
        border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
        backgroundColor: focused ? '#fff' : '#f8fafc',
        fontSize: 14, color: '#0f172a', outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s, background-color 0.15s',
        boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
      }}
      {...props}
    />
  );
}

function FocusSelect({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', height: 44,
        padding: '0 36px 0 14px', borderRadius: 12,
        border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
        backgroundColor: focused ? '#fff' : '#f8fafc',
        fontSize: 14, color: value ? '#0f172a' : '#94a3b8',
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s, background-color 0.15s',
        boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
      }}
    >
      {children}
    </select>
  );
}

function FocusTextarea({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      rows={5}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '12px 14px', borderRadius: 12,
        border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
        backgroundColor: focused ? '#fff' : '#f8fafc',
        fontSize: 14, color: '#0f172a', outline: 'none',
        boxSizing: 'border-box', lineHeight: 1.5,
        transition: 'border-color 0.15s, background-color 0.15s',
        boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
        resize: 'none',
      }}
    />
  );
}

export default function ComposeDrawer({ open, onClose }) {
  const toast = useToast();
  const send = useSendMessage();
  const { data: usersData } = useUsers({ limit: 100 });
  const [form, setForm] = useState({ to_user_id: '', subject: '', body: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await send.mutateAsync(form);
      toast({ message: 'Message sent.' });
      onClose();
      setForm({ to_user_id: '', subject: '', body: '' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const canSend = form.to_user_id && form.body.trim();

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 39,
        }} />
        <Drawer.Content style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 40,
          backgroundColor: '#fff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          outline: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}>
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4,
            backgroundColor: '#e2e8f0', borderRadius: 2,
            margin: '12px auto 0', flexShrink: 0,
          }} />

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px 12px',
            borderBottom: '1px solid #f1f5f9', flexShrink: 0,
          }}>
            <div>
              <Drawer.Title style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                New message
              </Drawer.Title>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                Send an internal message
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 10,
              border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748b',
            }}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            <form onSubmit={handleSubmit} style={{ padding: '16px 20px 8px' }}>

              <p style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              }}>Recipient</p>
              <div style={{ marginBottom: 20 }}>
                <Field label="To" icon={Users}>
                  <FocusSelect value={form.to_user_id} onChange={set('to_user_id')}>
                    <option value="">Select recipient…</option>
                    {usersData?.data?.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>
                    ))}
                  </FocusSelect>
                </Field>
              </div>

              <p style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              }}>Subject</p>
              <div style={{ marginBottom: 20 }}>
                <Field label="Subject" icon={AlignLeft}>
                  <TextInput
                    placeholder="Re: Duty schedule"
                    value={form.subject}
                    onChange={set('subject')}
                  />
                </Field>
              </div>

              <p style={{
                fontSize: 10, fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10,
              }}>Message</p>
              <div style={{ marginBottom: 24 }}>
                <Field label="Body" icon={MessageSquare}>
                  <FocusTextarea value={form.body} onChange={set('body')} />
                </Field>
              </div>

            </form>
          </div>

          {/* Sticky footer */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex', gap: 10,
            flexShrink: 0,
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            backgroundColor: '#fff',
          }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, height: 48, borderRadius: 14,
              border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc',
              fontSize: 14, fontWeight: 700, color: '#475569', cursor: 'pointer',
            }}>Cancel</button>
            <button
              disabled={send.isPending || !canSend}
              onClick={handleSubmit}
              style={{
                flex: 2, height: 48, borderRadius: 14, border: 'none',
                background: (send.isPending || !canSend)
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: send.isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                transition: 'all 0.15s',
              }}
            >
              {send.isPending && (
                <span style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              )}
              {send.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
