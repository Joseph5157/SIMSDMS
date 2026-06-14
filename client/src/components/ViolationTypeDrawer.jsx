import { useState } from 'react';
import { Drawer } from 'vaul';
import { X, Tag, IndianRupee } from 'lucide-react';
import { useCreateViolationType, useUpdateViolationType } from '../hooks/useViolationTypes';
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

function FineInput({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: 14, fontWeight: 600, pointerEvents: 'none',
        color: focused ? '#3b82f6' : '#64748b',
        transition: 'color 0.15s',
      }}>₹</span>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', height: 44,
          paddingLeft: 28, paddingRight: 14, borderRadius: 12,
          border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
          backgroundColor: focused ? '#fff' : '#f8fafc',
          fontSize: 14, color: '#0f172a', outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s, background-color 0.15s',
          boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
        }}
      />
    </div>
  );
}

export default function ViolationTypeDrawer({ open, editing, onClose }) {
  const toast = useToast();
  const create = useCreateViolationType();
  const update = useUpdateViolationType();
  const [form, setForm] = useState({ name: editing?.name ?? '', default_fine: editing?.default_fine ?? '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { name: form.name, default_fine: parseFloat(form.default_fine) };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast({ message: 'Updated.' });
      } else {
        await create.mutateAsync(payload);
        toast({ message: 'Violation type created.' });
      }
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  const isPending = create.isPending || update.isPending;
  const canSubmit = form.name.trim() && form.default_fine !== '';

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
                {editing ? 'Edit violation type' : 'New violation type'}
              </Drawer.Title>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                {editing ? 'Update name or fine amount' : 'Define a new disciplinary category'}
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
              }}>Details</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <Field label="Name" icon={Tag}>
                  <TextInput
                    placeholder="Late arrival"
                    value={form.name}
                    onChange={set('name')}
                    required
                  />
                </Field>
                <Field label="Default fine (₹)" icon={IndianRupee}>
                  <FineInput value={form.default_fine} onChange={set('default_fine')} />
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
              disabled={isPending || !canSubmit}
              onClick={handleSubmit}
              style={{
                flex: 2, height: 48, borderRadius: 14, border: 'none',
                background: (isPending || !canSubmit)
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                transition: 'all 0.15s',
              }}
            >
              {isPending && (
                <span style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              )}
              {isPending ? 'Saving…' : editing ? 'Save' : 'Create'}
            </button>
          </div>

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
