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

      {/* ── 1. Today's duty ── */}
      <section className="mb-4">
        {todaySlot ? (
          <div style={{
            borderRadius: 'var(--radius-2xl)', padding: 16,
            background: 'linear-gradient(135deg, var(--color-blue-50), var(--color-indigo-100))',
            border: '1px solid var(--color-blue-200)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 'var(--text-card)', fontWeight: 'var(--weight-bold)', color: 'var(--blue-800)', marginBottom: 2 }}>
                  You have duty today
                </p>
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--blue-500)', textTransform: 'capitalize' }}>
                  {todaySlot.session_type} session
                </p>
              </div>
              <Badge status={todaySlot.status} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="md" leftSection={<span>📋</span>} onClick={() => navigate(ROUTES.FACULTY_ATTENDANCE)}>
                Check In / Out
              </Button>
              {canDoViolation && (
                <Button variant="default" size="md" leftSection={<span>⚠️</span>} onClick={() => navigate(ROUTES.FACULTY_VIOLATIONS)}>
                  Record Violation
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            borderRadius: 'var(--radius-2xl)', padding: '14px 16px',
            background: 'var(--surface-page)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <div>
              <p style={{ fontSize: 'var(--text-card)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)' }}>No duty today</p>
              <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 1 }}>
                Check your upcoming slots below
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
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Slots" value={slots.length} accent="blue" icon="🗓" />
        <StatCard label="Violations" value={violationsData?.meta?.total ?? 0} accent={(violationsData?.meta?.total ?? 0) > 0 ? 'red' : 'default'} icon="⚠️" />
        <StatCard label="Unread" value={unread} accent={unread > 0 ? 'yellow' : 'default'} icon="✉️" />
      </div>

      {/* ── 4. Upcoming duties + recent messages ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)', padding: 16 }}>
          <p style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)', color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', marginBottom: 10 }}>
            Upcoming duties
          </p>
          {!upcoming.length
            ? <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>No upcoming duties this month.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-small)' }}>
                    <span style={{ color: 'var(--slate-700)' }}>
                      {new Date(s.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s.session_type}</span>
                    <Badge status={s.status} />
                  </div>
                ))}
              </div>
            )}
        </div>

        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)', color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
              Recent messages
            </p>
            {unread > 0 && (
              <span style={{ fontSize: 'var(--text-nano)', background: 'var(--blue-100)', color: 'var(--blue-600)', borderRadius: 'var(--radius-md)', padding: '2px 6px', fontWeight: 'var(--weight-bold)' }}>
                {unread} unread
              </span>
            )}
          </div>
          {!inboxData?.data?.length
            ? <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>No messages.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inboxData.data.slice(0, 4).map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-small)' }}>
                    {!m.is_read && (
                      <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-full)', background: 'var(--blue-500)', flexShrink: 0 }} />
                    )}
                    <span style={{
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: m.is_read ? 'var(--text-muted)' : 'var(--slate-700)',
                      fontWeight: m.is_read ? 'var(--weight-regular)' : 'var(--weight-semibold)',
                    }}>
                      {m.subject}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => navigate(ROUTES.FACULTY_MESSAGES)}
                  style={{ marginTop: 4, fontSize: 'var(--text-micro)', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'var(--font-sans)' }}
                >
                  View all messages →
                </button>
              </div>
            )}
        </div>
      </div>
    </Layout>
  );
}
