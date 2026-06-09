import { useNavigate } from 'react-router-dom';
import Layout, { PageHeader } from '../../components/Layout';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useMonthSlots } from '../../hooks/useDutySlots';
import { useMyViolations } from '../../hooks/useViolations';
import { useInbox } from '../../hooks/useMessages';
import { useMyCoverRequests } from '../../hooks/useCoverRequests';
import { ROUTES } from '../../utils/constants';

// Get today's calendar date in IST (UTC+5:30) as "YYYY-MM-DD"
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

      {/* ── 1. Today's Duty (highest priority action) ── */}
      <section className="mb-4">
        {todaySlot ? (
          <div style={{
            borderRadius: 16, padding: '16px',
            background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
            border: '1px solid #bfdbfe',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 2 }}>
                  You have duty today
                </p>
                <p style={{ fontSize: 12, color: '#3b82f6', textTransform: 'capitalize' }}>
                  {todaySlot.session_type} session
                </p>
              </div>
              <Badge status={todaySlot.status} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="default" onClick={() => navigate(ROUTES.FACULTY_ATTENDANCE)}>
                📋 Check In / Out
              </Button>
              {canDoViolation && (
                <Button variant="secondary" size="default" onClick={() => navigate(ROUTES.FACULTY_VIOLATIONS)}>
                  ⚠️ Record Violation
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            borderRadius: 16, padding: '14px 16px',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>No duty today</p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                Check your upcoming slots below
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Cover Request Status ── */}
      {activeCoverRequests.length > 0 && (
        <section className="mb-4">
          <div style={{
            borderRadius: 16, padding: '14px 16px',
            background: '#fff7ed', border: '1px solid #fed7aa',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 2 }}>
                  {myOpenRequests.length > 0
                    ? `${myOpenRequests.length} open cover request${myOpenRequests.length > 1 ? 's' : ''} — awaiting a volunteer`
                    : `You are volunteered to cover ${volunteeredFor.length} slot${volunteeredFor.length > 1 ? 's' : ''}`}
                </p>
                <p style={{ fontSize: 11, color: '#ea580c' }}>
                  {activeCoverRequests.length} active cover request{activeCoverRequests.length > 1 ? 's' : ''} total
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.FACULTY_COVER_REQUESTS)}>
                View →
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Stats (compact, below CTAs) ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Slots" value={slots.length} accent="blue" icon="🗓" />
        <StatCard label="Violations" value={violationsData?.meta?.total ?? 0} accent="default" icon="⚠️" />
        <StatCard label="Unread" value={unread} accent={unread > 0 ? 'yellow' : 'default'} icon="✉️" />
      </div>

      {/* ── 4. Secondary info: Upcoming duties + Recent messages ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Upcoming duties
          </p>
          {!upcoming.length
            ? <p style={{ fontSize: 12, color: '#94a3b8' }}>No upcoming duties this month.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#334155' }}>
                      {new Date(s.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{s.session_type}</span>
                    <Badge status={s.status} />
                  </div>
                ))}
              </div>
            )}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Recent messages
            </p>
            {unread > 0 && (
              <span style={{ fontSize: 10, background: '#dbeafe', color: '#2563eb', borderRadius: 8, padding: '2px 6px', fontWeight: 700 }}>
                {unread} unread
              </span>
            )}
          </div>
          {!inboxData?.data?.length
            ? <p style={{ fontSize: 12, color: '#94a3b8' }}>No messages.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inboxData.data.slice(0, 4).map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    {!m.is_read && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1, color: m.is_read ? '#94a3b8' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: m.is_read ? 400 : 600 }}>
                      {m.subject}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => navigate(ROUTES.FACULTY_MESSAGES)}
                  style={{ marginTop: 4, fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
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
