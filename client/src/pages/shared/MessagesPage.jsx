import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import ComposeDrawer from '../../components/ComposeDrawer';
import { useInbox, useSent, useMessage, useDeleteMessage } from '../../hooks/useMessages';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── Thread panel ──────────────────────────────────────────────────────────────
function ThreadPanel({ messageId, currentUser, onClose }) {
  const { data }  = useMessage(messageId);
  const deleteMsg = useDeleteMessage();
  const toast     = useToast();

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

  if (!data) return (
    <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400 w-full">
      Loading…
    </div>
  );

  const isSent = data.sender?.id === currentUser?.id;

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full sm:border-l sm:border-slate-200">
      {/* Header — back button on mobile, close ✕ on desktop */}
      <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center gap-3">
        {/* Mobile back button */}
        <button
          onClick={onClose}
          className="sm:hidden flex items-center gap-1 text-[13px] text-blue-600 font-medium mr-1"
          aria-label="Back to messages"
        >
          ← Back
        </button>

        {/* Subject + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 truncate">{data.subject}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isSent ? `To: ${data.receiver?.name}` : `From: ${data.sender?.name}`}
            {' · '}{fmtDate(data.created_at)}
          </p>
        </div>

        {/* Desktop close */}
        <button onClick={onClose} className="hidden sm:block text-slate-400 hover:text-slate-600 text-[18px] leading-none flex-shrink-0">
          ✕
        </button>
      </div>

      {/* Message bubble */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5">
        <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
            isSent
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
          }`}>
            <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{data.body}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-200 flex justify-end">
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

      {/*
        Mobile:  show EITHER the list OR the thread (full-width), never both.
        Desktop: side-by-side panel layout.
      */}
      <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden flex-1" style={{ minHeight: 400 }}>

        {/* ── Left panel — list ── */}
        {/* On mobile: hidden when a message is open; full-width when no message selected.
            On sm+: always visible at fixed width. */}
        <div
          className={[
            'flex-col border-r border-slate-200',
            'w-full sm:w-[260px] sm:flex-shrink-0',
            viewing ? 'hidden sm:flex' : 'flex',
          ].join(' ')}
        >
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
          {data?.meta && data.meta.pages > 1 && (
            <div className="border-t border-slate-100 p-2">
              <Pagination meta={data.meta} page={page} onPage={setPage} />
            </div>
          )}
        </div>

        {/* ── Right panel — thread or empty state ── */}
        {viewing ? (
          <ThreadPanel
            messageId={viewing}
            currentUser={user}
            onClose={() => setViewing(null)}
          />
        ) : (
          // Empty state: hidden on mobile (list is shown instead), visible on desktop
          <div className="hidden sm:flex flex-1 flex-col items-center justify-center text-slate-400 gap-2">
            <p className="text-[28px]">✉️</p>
            <p className="text-[13px]">Select a message to read it</p>
          </div>
        )}
      </div>

      <ComposeDrawer open={compose} onClose={() => setCompose(false)} />
    </Layout>
  );
}
