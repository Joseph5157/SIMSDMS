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
import { useAttendance } from '../../hooks/useAttendance';
import Skeleton from '../../components/ui/Skeleton';
import { ROUTES } from '../../utils/constants';

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: slotsData, isLoading: slotsLoading }      = useMonthSlots(year, month);
  const { data: violationsData } = useMyViolations({ limit: 5 });
  const { data: inboxData }      = useInbox({ limit: 5 });
  const { data: coverData }      = useMyCoverRequests();

  const slots    = slotsData?.data ?? [];
  const today    = todayIST();
  const todaySlot = slots.find((s) => new Date(s.duty_date).toISOString().slice(0, 10) === today);
  const { data: attData }        = useAttendance(todaySlot?.id);
  const upcoming  = slots.filter((s) => new Date(s.duty_date).toISOString().slice(0, 10) > today).slice(0, 3);
  const unread    = inboxData?.data?.filter((m) => !m.is_read).length ?? 0;

  const att = attData?.data;
  // Clock-out warnings: check if checked-in but not out, and session ends within 15 min
  const sessionEndHour = todaySlot?.session_type === 'morning' ? 13 : 18;
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const minsUntilEnd = todaySlot
    ? (sessionEndHour - nowIST.getUTCHours()) * 60 - nowIST.getUTCMinutes()
    : null;
  const showClockOutWarning = att?.in_time && !att?.out_time && minsUntilEnd !== null && minsUntilEnd >= 0 && minsUntilEnd <= 15;
  const wasAutoClocked = !!att?.auto_out;

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
      <section className="mb-5">
        {slotsLoading ? (
          /* Loading skeleton */
          <>
            <Skeleton height="160px" className="rounded-2xl mb-4" />
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} height="96px" className="rounded-xl" />)}
            </div>
            <Skeleton height="120px" className="rounded-xl mb-4" />
            <Skeleton height="120px" className="rounded-xl" />
          </>
        ) : todaySlot ? (
          <div style={{
            borderRadius: 'var(--radius-3xl)', padding: 20, position: 'relative', overflow: 'hidden',
            background: 'var(--brand-gradient-deep)',
            boxShadow: '0 8px 24px -8px rgba(37,99,235,0.45)',
          }}>
            {/* decorative glow */}
            <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'relative' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    📋 Today's duty
                  </p>
                  <p style={{ fontSize: 'var(--text-h2)', fontWeight: 800, color: 'var(--text-on-dark)', lineHeight: 1.1, textTransform: 'capitalize' }}>
                    {todaySlot.session_type} session
                  </p>
                  <p style={{ fontSize: 'var(--text-small)', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
                    {todaySlot.session_type === 'morning' ? 'Starts 9:00 AM' : 'Starts 2:00 PM'}
                  </p>
                </div>
                <Badge status={todaySlot.status} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="md" color="dark" leftSection={<span>📋</span>} onClick={() => navigate(ROUTES.FACULTY_ATTENDANCE)}
                  style={{ background: 'var(--surface-card)', color: 'var(--brand)', fontWeight: 700 }}>
                  Check In / Out
                </Button>
                {canDoViolation && (
                  <Button size="md" variant="white" leftSection={<span>⚠️</span>} onClick={() => navigate(ROUTES.FACULTY_VIOLATIONS)}
                    style={{ background: 'rgba(255,255,255,0.25)', color: 'var(--text-on-dark)', border: '1px solid rgba(255,255,255,0.4)' }}>
                    Record Violation
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-3xl)] px-[18px] py-5">
            <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--surface-page)] flex items-center justify-center text-2xl shrink-0">
              📅
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-card-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>No duty today</p>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)', marginTop: 2 }}>
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

      {/* ── 2b. Clock-out alerts ── */}
      {showClockOutWarning && (
        <section className="mb-4">
          <Alert tone="warning" icon="⏰"
            title="Remember to clock out"
            action={<Button variant="outline" size="sm" onClick={() => navigate(ROUTES.FACULTY_ATTENDANCE)}>Go →</Button>}>
            Your {todaySlot?.session_type} session ends in {minsUntilEnd} min. Clock out before auto-out kicks in.
          </Alert>
        </section>
      )}
      {wasAutoClocked && (
        <section className="mb-4">
          <Alert tone="info" icon="🔔"
            title="You were auto clocked out">
            The system recorded your check-out automatically at session end.
          </Alert>
        </section>
      )}

      {/* ── 2c. Zero-state guidance ── */}
      {!todaySlot && slots.length === 0 && (
        <section className="mb-5">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-xl)] px-5 py-6 text-center">
            <p style={{ fontSize: 'var(--text-h2)', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Welcome to SIMS DMS
            </p>
            <p style={{ fontSize: 'var(--text-card)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You don't have any duty slots assigned yet.
              <br />
              Your admin will open the scheduling window and notify you when it's time to pick your slots.
            </p>
          </div>
        </section>
      )}

      {/* ── 3. KPI stat cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Slots" value={slots.length} accent="blue" icon="🗓" />
        <StatCard label="Violations" value={violationsData?.meta?.total ?? 0} accent={(violationsData?.meta?.total ?? 0) > 0 ? 'red' : 'default'} icon="⚠️" />
        <StatCard label="Unread" value={unread} accent={unread > 0 ? 'yellow' : 'default'} icon="✉️" />
      </div>

      {/* ── 4. Upcoming duties ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Upcoming duties
          </p>
          <button onClick={() => navigate(ROUTES.FACULTY_SLOTS)}
            style={{ fontSize: 'var(--text-small)', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            All slots →
          </button>
        </div>
        {!upcoming.length ? (
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-dashed border-[var(--border)] px-4 py-5 text-center">
            <p style={{ fontSize: 'var(--text-card)', color: 'var(--text-muted)' }}>No upcoming duties this month.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((s) => {
              const d = new Date(s.duty_date);
              return (
                <div key={s.id} className="flex items-center gap-3 bg-[var(--surface-card)] rounded-[var(--radius-xl)] border border-[var(--border)] px-[14px] py-3">
                  <div className="w-[42px] h-[42px] rounded-[var(--radius-lg)] shrink-0 bg-[var(--surface-page)] flex flex-col items-center justify-center">
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{d.getDate()}</span>
                    <span style={{ fontSize: 'var(--text-nano)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {d.toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 'var(--text-card)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{s.session_type} session</p>
                    <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 1 }}>
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
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Recent messages
          </p>
          {unread > 0 && (
            <span style={{ fontSize: 'var(--text-micro)', background: 'var(--blue-100)', color: 'var(--blue-600)', borderRadius: 'var(--radius-md)', padding: '2px 8px', fontWeight: 700 }}>
              {unread} unread
            </span>
          )}
        </div>
        {!inboxData?.data?.length ? (
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-dashed border-[var(--border)] px-4 py-5 text-center">
            <p style={{ fontSize: 'var(--text-card)', color: 'var(--text-muted)' }}>No messages.</p>
          </div>
        ) : (
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] overflow-hidden">
            {inboxData.data.slice(0, 4).map((m, i) => (
              <div key={m.id} className="flex items-center gap-[10px] px-[14px] py-3"
                style={{ borderBottom: i < Math.min(inboxData.data.length, 4) - 1 ? '1px solid var(--divider)' : 'none' }}>
                <span className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={{ background: m.is_read ? 'transparent' : 'var(--blue-500)' }} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{
                    fontSize: 'var(--text-card)',
                    color: m.is_read ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontWeight: m.is_read ? 400 : 600,
                  }}>
                  {m.subject}
                </span>
              </div>
            ))}
            <button
              onClick={() => navigate(ROUTES.FACULTY_MESSAGES)}
              className="w-full px-[14px] py-[11px] bg-[var(--surface-page)] border-none border-t border-[var(--divider)] cursor-pointer text-center"
              style={{ fontSize: 'var(--text-small)', color: 'var(--brand)', borderTop: '1px solid var(--divider)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}
            >
              View all messages →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
