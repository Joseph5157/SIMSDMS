import { useState } from 'react';
import { Users, AlignLeft, MessageSquare } from 'lucide-react';
import BottomDrawer, { DrawerSpinner, cancelBtnStyle, primaryBtnStyle } from './ui/BottomDrawer';
import { useSendMessage } from '../hooks/useMessages';
import { useUsers } from '../hooks/useUsers';
import { useToast } from './ui/Toast';

function FieldLabel({ label, icon: Icon }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 6,
    }}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {label}
    </label>
  );
}

const inputStyle = {
  width: '100%', height: 44,
  padding: '0 14px', borderRadius: 'var(--radius-lg)',
  border: '1.5px solid var(--border)',
  backgroundColor: 'var(--surface-page)',
  fontSize: 'var(--text-body)', color: 'var(--text-primary)', outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, background-color 0.15s',
  fontFamily: 'inherit',
};

const selectStyle = {
  ...inputStyle,
  padding: '0 36px 0 14px',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
};

const textareaStyle = {
  ...inputStyle,
  height: 'auto',
  padding: '12px 14px',
  lineHeight: 1.5,
  resize: 'none',
};

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
    <BottomDrawer
      open={open}
      onClose={onClose}
      title="New message"
      subtitle="Send an internal message"
      footer={
        <>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            disabled={send.isPending || !canSend}
            onClick={handleSubmit}
            data-primary=""
            style={primaryBtnStyle(send.isPending || !canSend)}
          >
            {send.isPending && <DrawerSpinner />}
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <FieldLabel label="To" icon={Users} />
          <select value={form.to_user_id} onChange={set('to_user_id')} style={selectStyle}>
            <option value="">Select recipient…</option>
            {usersData?.data?.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel label="Subject" icon={AlignLeft} />
          <input
            placeholder="Re: Duty schedule"
            value={form.subject}
            onChange={set('subject')}
            style={inputStyle}
          />
        </div>

        <div>
          <FieldLabel label="Message" icon={MessageSquare} />
          <textarea
            rows={5}
            value={form.body}
            onChange={set('body')}
            style={textareaStyle}
          />
        </div>

      </form>
    </BottomDrawer>
  );
}
