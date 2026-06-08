import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useInbox, useSent, useMessage, useSendMessage, useDeleteMessage } from '../../hooks/useMessages';
import { useUsers } from '../../hooks/useUsers';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── Compose modal ─────────────────────────────────────────────────────────────
function ComposeModal({ open, onClose }) {
  const toast = useToast();
  const send  = useSendMessage();
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

  return (
    <Modal open={open} onClose={onClose} title="New Message">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-slate-600">To</label>
          <select value={form.to_user_id} onChange={set('to_user_id')} required
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100">
            <option value="">Select recipient…</option>
            {usersData?.data?.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>
            ))}
          </select>
        </div>
        <Input label="Subject" value={form.subject} onChange={set('subject')} required />
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-slate-600">Message</label>
          <textarea value={form.body} onChange={set('body')} required rows={5}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100 resize-none" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={send.isPending}>Send</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Thread panel ──────────────────────────────────────────────────────────────
function ThreadPanel({ messageId, currentUser, tab, onClose }) {
  const { data }    = useMessage(messageId);
  const deleteMsg   = useDeleteMessage();
  const toast       = useToast();

  if (!data) return (
    <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">
      Loading…
    </div>
  );

  const isSent = data.sender?.id === currentUser?.id;

  async function handleDelete() {
    if (!confirm('Delete this message?')) return;
    try {
      await deleteMsg.mutateAsync(messageId);
      toast({ message: 'Message deleted.' });
      onClose();
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed.', type: 'error' });
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 border-l border-slate-200">
      {/* Thread header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-slate-900">{data.subject}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isSent ? `To: ${data.receiver?.name}` : `From: ${data.sender?.name}`}
            {' · '}{fmtDate(data.created_at)}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-[18px] leading-none">✕</button>
      </div>

      {/* Message bubble */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
            isSent
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
          }`}>
            <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{data.body}</p>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
        <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteMsg.isPending}>
          Delete
        </Button>
      </div>
    </div>
  );
}

// ── Message list item ─────────────────────────────────────────────────────────
function MessageItem({ msg, isActive, tab, onClick }) {
  const unread = !msg.is_read && tab === 'inbox';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 transition-colors ${
        isActive
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : 'hover:bg-slate-50 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[13px] truncate ${unread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
          {tab === 'inbox' ? msg.sender?.name : msg.receiver?.name}
        </p>
        <span className="text-[11px] text-slate-400 shrink-0">
          {new Date(msg.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </span>
      </div>
      <p className="text-[12px] text-slate-500 truncate mt-0.5">{msg.subject}</p>
      {unread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MessagesPage({ user }) {
  const [tab,     setTab]     = useState('inbox');
  const [page,    setPage]    = useState(1);
  const [compose, setCompose] = useState(false);
  const [viewing, setViewing] = useState(null);

  const inbox = useInbox({ page, limit: 20 });
  const sent  = useSent({ page, limit: 20 });

  const { data, isLoading } = tab === 'inbox' ? inbox : sent;

  function handleTabSwitch(t) { setTab(t); setPage(1); setViewing(null); }

  return (
    <Layout user={user}>
      <PageHeader
        title="Messages"
        action={<Button onClick={() => setCompose(true)}>+ Compose</Button>}
      />

      <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden flex-1" style={{ minHeight: 400 }}>
        {/* ── Left panel — list (220px) ── */}
        <div className="w-[260px] shrink-0 flex flex-col border-r border-slate-200">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200">
            {['inbox', 'sent'].map((t) => (
              <button
                key={t}
                onClick={() => handleTabSwitch(t)}
                className={`flex-1 py-3 text-[13px] font-medium capitalize transition-colors ${
                  tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <p className="text-[13px] text-slate-400 text-center py-8">Loading…</p>
            )}
            {!isLoading && !data?.data?.length && (
              <p className="text-[13px] text-slate-400 text-center py-8">No messages.</p>
            )}
            {data?.data?.map((m) => (
              <MessageItem
                key={m.id}
                msg={m}
                tab={tab}
                isActive={viewing === m.id}
                onClick={() => setViewing(m.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="border-t border-slate-100 p-2">
              <Pagination meta={data.meta} page={page} onPage={setPage} />
            </div>
          )}
        </div>

        {/* ── Right panel — thread / empty state ── */}
        {viewing ? (
          <ThreadPanel
            messageId={viewing}
            currentUser={user}
            tab={tab}
            onClose={() => setViewing(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <p className="text-[28px]">✉️</p>
            <p className="text-[13px]">Select a message to read it</p>
          </div>
        )}
      </div>

      <ComposeModal open={compose} onClose={() => setCompose(false)} />
    </Layout>
  );
}
