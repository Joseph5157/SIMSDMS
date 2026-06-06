import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useInbox, useSent, useMessage, useSendMessage, useDeleteMessage } from '../../hooks/useMessages';
import { useUsers } from '../../hooks/useUsers';

function ComposeModal({ open, onClose }) {
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

  return (
    <Modal open={open} onClose={onClose} title="New Message">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">To</label>
          <select value={form.to_user_id} onChange={set('to_user_id')} required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select recipient…</option>
            {usersData?.data?.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_',' ')})</option>
            ))}
          </select>
        </div>
        <Input label="Subject" value={form.subject} onChange={set('subject')} required />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Message</label>
          <textarea value={form.body} onChange={set('body')} required rows={5}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={send.isPending}>Send</Button>
        </div>
      </form>
    </Modal>
  );
}

function MessageView({ id, onClose }) {
  const { data } = useMessage(id);
  const deleteMsg = useDeleteMessage();
  const toast = useToast();

  if (!data) return null;

  return (
    <Modal open onClose={onClose} title={data.subject} size="lg">
      <div className="text-sm text-gray-500 mb-4 flex gap-4">
        <span><strong>From:</strong> {data.sender?.name}</span>
        <span><strong>To:</strong> {data.receiver?.name}</span>
        <span>{new Date(data.created_at).toLocaleString()}</span>
      </div>
      <p className="text-gray-800 whitespace-pre-wrap">{data.body}</p>
      <div className="flex justify-end mt-6">
        <Button variant="danger" size="sm" onClick={async () => {
          await deleteMsg.mutateAsync(id);
          toast({ message: 'Message deleted.' });
          onClose();
        }}>Delete</Button>
      </div>
    </Modal>
  );
}

export default function MessagesPage({ user }) {
  const [tab, setTab]       = useState('inbox');
  const [page, setPage]     = useState(1);
  const [compose, setCompose] = useState(false);
  const [viewing, setViewing] = useState(null);

  const inbox = useInbox({ page, limit: 20 });
  const sent  = useSent({ page, limit: 20 });

  const data = tab === 'inbox' ? inbox.data : sent.data;
  const isLoading = tab === 'inbox' ? inbox.isLoading : sent.isLoading;

  return (
    <Layout user={user}>
      <PageHeader
        title="Messages"
        action={<Button onClick={() => setCompose(true)}>+ Compose</Button>}
      />
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {['inbox','sent'].map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
        {!isLoading && !data?.data?.length && <p className="text-gray-400 text-sm py-8 text-center">No messages.</p>}
        {data?.data?.map((m) => (
          <div key={m.id} onClick={() => setViewing(m.id)}
            className={`bg-white border rounded-xl px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${!m.is_read && tab === 'inbox' ? 'border-blue-200' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-sm ${!m.is_read && tab === 'inbox' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{m.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tab === 'inbox' ? `From: ${m.sender?.name}` : `To: ${m.receiver?.name}`}
                </p>
              </div>
              <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>
      <Pagination meta={data?.meta} page={page} onPage={setPage} />

      <ComposeModal open={compose} onClose={() => setCompose(false)} />
      {viewing && <MessageView id={viewing} onClose={() => setViewing(null)} />}
    </Layout>
  );
}
