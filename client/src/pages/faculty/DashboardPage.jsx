import { useNavigate } from 'react-router-dom';
import Layout, { PageHeader } from '../../components/Layout';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import { Button } from '@mantine/core';
import { useMonthSlots } from '../../hooks/useDutySlots';
import { useMyViolations } from '../../hooks/useViolations';
import { useInbox } from '../../hooks/useMessages';
import { useMyCoverRequests } from '../../hooks/useCoverRequests';
import { ROUTES } from '../../utils/constants';

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: slotsData }      = useMonthSlots(year, month);
  const { data: violationsData } = useMyViolations({ limit: 5 });
  const { data: inboxData }      = useInbox({ limit: 5 });
  const { data: coverData }      = useMyCoverRequests();

  const slots    = slotsData?.data ?? [];
  const today    = todayIST();
  const todaySlot = slots.find((s) => new Date(s.duty_date).toISOString().slice(0, 10) === today);
  const upcoming  = slots.filter((s) => new Date(s.duty_date).toISOString().slice(0, 10) > today).slice(0, 3);
  const unread    = inboxData?.data?.filter((m) => !m.is_read).length ?? 0;

  const activeCoverRequests = (coverData?.data ?? []).filter((r) => r.status === 'open');
  const myOpenRequests      = activeCoverRequests.filter((r) => r.requested_by === user?.id);
  const volunteeredFor      = activeCoverRequests.filter((r) => r.volunteer_id === user?.id);

  const canDoViolation = todaySlot && ['scheduled', 'covered', 'cover_pending'].includes(todaySlot.status);

  return (
    <Layout user={user}>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle={now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* ── 1. Today's duty — hero ── */}
      <section style={{ marginBottom: 20 }}>
        {todaySlot ? (
          <div style={{
            borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            boxShadow: '0 8px 24px -8px rgba(37,99,235,0.45)',
          }}>
            {/* decorative glow */}
            <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    📋 Today's duty
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1, textTransform: 'capitalize' }}>
                    {todaySlot.session_type} session
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
                    {todaySlot.session_type === 'morning' ? 'Starts 9:00 AM' : 'Starts 2:00 PM'}
                  </p>
                </div>
                <Badge status={todaySlot.status} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="md" color="dark" leftSection={<span>📋</span>} onClick={() => navigate(ROUTES.FACULTY_ATTENDANCE)}
                  style={{ background: '#fff', color: '#2563eb', fontWeight: 700 }}>
                  Check In / Out
                </Button>
                {canDoViolation && (
                  <Button size="md" variant="white" leftSection={<span>⚠️</span>} onClick={() => navigate(ROUTES.FACULTY_VIOLATIONS)}
                    style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}>
                    Record Violation
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            borderRadius: 20, padding: '20px 18px',
            background: 'var(--surface-card)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
              📅
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No duty today</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Enjoy your day — check upcoming slots below.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Cover request alert ── */}
      {activeCoverRequests.length > 0 && (
        <section className="mb-4">
          <Alert tone="warning" icon="🔄"
            title={myOpenRequests.length > 0
              ? `${myOpenRequests.length} open cover request${myOpenRequests.length > 1 ? 's' : ''} — awaiting a volunteer`
              : `You are volunteered to cover ${volunteeredFor.length} slot${volunteeredFor.length > 1 ? 's' : ''}`}
            action={<Button variant="outline" size="sm" onClick={() => navigate(ROUTES.FACULTY_COVER_REQUESTS)}>View →</Button>}>
            {activeCoverRequests.length} active cover request{activeCoverRequests.length > 1 ? 's' : ''} total
          </Alert>
        </section>
      )}

      {/* ── 3. KPI stat cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Slots" value={slots.length} accent="blue" icon="🗓" />
        <StatCard label="Violations" value={violationsData?.meta?.total ?? 0} accent={(violationsData?.meta?.total ?? 0) > 0 ? 'red' : 'default'} icon="⚠️" />
        <StatCard label="Unread" value={unread} accent={unread > 0 ? 'yellow' : 'default'} icon="✉️" />
      </div>

      {/* ── 4. Upcoming duties ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Upcoming duties
          </p>
          <button onClick={() => navigate(ROUTES.FACULTY_SLOTS)}
            style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            All slots →
          </button>
        </div>
        {!upcoming.length ? (
          <div style={{ background: 'var(--surface-card)', borderRadius: 16, border: '1px dashed var(--border)', padding: '20px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming duties this month.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((s) => {
              const d = new Date(s.duty_date);
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--surface-card)', borderRadius: 14, border: '1px solid var(--border)',
                  padding: '12px 14px',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: 'var(--surface-page)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{d.getDate()}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {d.toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{s.session_type} session</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                    </p>
                  </div>
                  <Badge status={s.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. Recent messages ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Recent messages
          </p>
          {unread > 0 && (
            <span style={{ fontSize: 10, background: 'var(--blue-100)', color: 'var(--blue-600)', borderRadius: 8, padding: '2px 8px', fontWeight: 700 }}>
              {unread} unread
            </span>
          )}
        </div>
        {!inboxData?.data?.length ? (
          <div style={{ background: 'var(--surface-card)', borderRadius: 16, border: '1px dashed var(--border)', padding: '20px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No messages.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--surface-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {inboxData.data.slice(0, 4).map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderBottom: i < Math.min(inboxData.data.length, 4) - 1 ? '1px solid var(--divider)' : 'none',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: m.is_read ? 'transparent' : 'var(--blue-500)',
                }} />
                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: 13, color: m.is_read ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontWeight: m.is_read ? 400 : 600,
                }}>
                  {m.subject}
                </span>
              </div>
            ))}
            <button
              onClick={() => navigate(ROUTES.FACULTY_MESSAGES)}
              style={{ width: '100%', padding: '11px 14px', fontSize: 12, color: 'var(--brand)', background: 'var(--surface-page)', border: 'none', borderTop: '1px solid var(--divider)', cursor: 'pointer', textAlign: 'center', fontWeight: 600, fontFamily: 'var(--font-sans)' }}
            >
              View all messages →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
