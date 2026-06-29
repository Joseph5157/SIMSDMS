import Layout, { PageHeader, Card, CardHeader, CardBody } from '../../components/Layout';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import { useUsers } from '../../hooks/useUsers';
import { useLiveAttendance } from '../../hooks/useAttendance';
import { useCoverRequests } from '../../hooks/useCoverRequests';
import { useFlaggedViolations, useCompletionRate } from '../../hooks/useReports';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../../components/ui/Skeleton';
import { ROUTES } from '../../utils/constants';

const QUICK_ACTIONS = [
  { label: 'Live Attendance', emoji: '✅', path: ROUTES.ADMIN_ATTENDANCE,      tint: 'var(--color-emerald-bg)', ink: 'var(--color-emerald-text)' },
  { label: 'Cover Requests',  emoji: '🔄', path: ROUTES.ADMIN_COVER_REQUESTS,  tint: 'var(--color-blue-50)',    ink: 'var(--color-blue-800)' },
  { label: 'Violations',      emoji: '⚠️', path: ROUTES.ADMIN_VIOLATIONS,      tint: 'var(--color-red-bg)',     ink: 'var(--color-red-text)' },
  { label: 'Reports',         emoji: '📊', path: ROUTES.ADMIN_REPORTS,         tint: 'var(--color-purple-bg)',  ink: 'var(--color-purple-text)' },
];

export default function AdminDashboardPage({ user }) {
  const navigate = useNavigate();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const { data: allUsers, isLoading }  = useUsers({ status: 'active' });
  const { data: pendingUsers }       = useUsers({ status: 'pending' });
  const { data: pendingTelegramUsers } = useUsers({ status: 'pending_telegram' });
  const { data: liveData }           = useLiveAttendance();
  const { data: openCovers }         = useCoverRequests({ status: 'open' });
  const { data: flagged }            = useFlaggedViolations();

  // Completion rate trend (this month vs last month)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { data: crThis } = useCompletionRate({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const { data: crLast } = useCompletionRate({ year: lastMonthDate.getFullYear(), month: lastMonthDate.getMonth() + 1 });
  const rateThis = crThis?.data?.completion_rate ?? null;
  const rateLast = crLast?.data?.completion_rate ?? null;
  const rateDelta = rateThis !== null && rateLast !== null ? Math.round(rateThis - rateLast) : null;

  const activeFaculty       = allUsers?.data?.filter((u) => u.role === 'faculty').length ?? 0;
  const pendingCount        = pendingUsers?.meta?.total  ?? pendingUsers?.data?.length ?? 0;
  const pendingTelegramCount = pendingTelegramUsers?.meta?.total ?? pendingTelegramUsers?.data?.length ?? 0;
  const openCoverCount      = openCovers?.meta?.total    ?? openCovers?.data?.length ?? 0;
  const pendingFlaggedCount = flagged?.pending_count ?? 0;

  const liveSlots    = liveData?.data ?? [];
  const checkedIn    = liveSlots.filter((s) => s.attendance_status === 'checked_in').length;
  const checkedOut   = liveSlots.filter((s) => s.attendance_status === 'checked_out').length;
  const notCheckedIn = liveSlots.filter((s) => s.attendance_status === 'not_checked_in').length;
  const lateCount    = liveSlots.filter((s) => s.in_status === 'late').length;

  const pendingFlaggedViolations = (flagged?.data ?? []).filter((v) => v.is_flagged).slice(0, 5);

  return (
    <Layout user={user}>
      <PageHeader
        title={`Good ${getGreeting()}, ${user?.name?.split(' ')[0]}`}
        subtitle={dateStr}
      />

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="96px" className="rounded-xl" />)}
          </div>
          <Skeleton height="140px" className="rounded-xl mb-3" />
          <Skeleton height="140px" className="rounded-xl" />
        </>
      )}

      {/* ── KPI grid ── */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Active Faculty"   value={activeFaculty}        accent="blue"   icon="👥" />
          <StatCard label="Pending"          value={pendingCount}          accent={pendingCount > 0 ? 'yellow' : 'default'}
            sub={pendingCount > 0 ? 'Needs action' : 'All clear'} icon="⏳" />
          <StatCard label="Cover Requests"   value={openCoverCount}        accent={openCoverCount > 0 ? 'yellow' : 'default'} icon="🔄" />
          <StatCard label="Flagged"          value={pendingFlaggedCount}   accent={pendingFlaggedCount > 0 ? 'red' : 'default'}
            sub={pendingFlaggedCount > 0 ? 'Awaiting review' : 'None pending'} icon="⚑" />
        </div>
      )}

      {/* ── Pending account approvals alert ── */}
      {pendingCount > 0 && (
        <Alert tone="warning" icon="⏳" className="mb-3"
          title={`${pendingCount} account${pendingCount !== 1 ? 's' : ''} awaiting approval`}
          onClick={() => navigate(ROUTES.ADMIN_USERS)}>
          Tap to review and approve.
        </Alert>
      )}

      {/* ── Pending Telegram invites alert ── */}
      {pendingTelegramCount > 0 && (
        <Alert tone="telegram" icon="📲" className="mb-3"
          title={`${pendingTelegramCount} user${pendingTelegramCount !== 1 ? 's' : ''} haven't linked Telegram yet`}
          onClick={() => navigate(ROUTES.ADMIN_USERS + '?status=pending_telegram')}>
          Resend invite links from the Users page.
        </Alert>
      )}

      {/* ── Today's attendance ── */}
      <Card className="mb-3">
        <CardHeader action={rateDelta !== null ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 'var(--text-micro)', fontWeight: 700,
            padding: '2px 6px', borderRadius: 'var(--radius-md)',
            ...(rateDelta > 0
              ? { background: 'var(--color-emerald-bg)', color: 'var(--color-emerald-text)' }
              : rateDelta < 0
              ? { background: 'var(--color-red-bg)', color: 'var(--color-red-text)' }
              : { background: 'var(--surface-page)', color: 'var(--text-muted)' }),
          }}>
            {rateDelta > 0 ? '▲' : rateDelta < 0 ? '▼' : '—'}
            {rateDelta !== 0 ? ` ${Math.abs(rateDelta)}%` : null}
            {' vs last mo'}
          </span>
        ) : null}>
          📋 Today's attendance
        </CardHeader>
        <CardBody className="p-0">
          {!liveSlots.length ? (
            <p style={{ padding: 16, fontSize: 'var(--text-card)', color: 'var(--text-muted)' }}>No duty slots scheduled today.</p>
          ) : (
            <>
              <div className="flex gap-2 px-4 py-[14px] border-b border-[var(--border)]">
                {[
                  { n: checkedOut,    label: 'Out',    color: 'var(--color-emerald-solid)', tint: 'var(--color-emerald-bg)' },
                  { n: checkedIn,     label: 'In',     color: 'var(--brand)',               tint: 'var(--color-blue-50)' },
                  { n: notCheckedIn,  label: 'Not in', color: 'var(--text-muted)',          tint: 'var(--surface-page)' },
                  ...(lateCount > 0 ? [{ n: lateCount, label: 'Late', color: 'var(--color-amber-solid)', tint: 'var(--color-amber-bg)' }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex-1 rounded-[var(--radius-lg)] px-2 py-[10px] text-center"
                    style={{ background: item.tint }}>
                    <p style={{ fontSize: 'var(--text-h2)', fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.n}</p>
                    <p style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {liveSlots.map((s) => (
                  <div
                    key={s.slot_id}
                    className="flex items-center justify-between px-4 py-[9px] border-b border-[var(--divider)]"
                  >
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 'var(--text-card)', color: 'var(--color-slate-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.covering_faculty ? `${s.faculty?.name} → ${s.covering_faculty?.name}` : s.faculty?.name}
                      </p>
                    </div>
                    <span className="shrink-0 mr-[10px]"
                      style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {s.session_type}
                    </span>
                    <Badge
                      status={
                        s.attendance_status === 'checked_out' ? 'completed' :
                        s.attendance_status === 'checked_in'  ? 'checked_in' :
                        'not_checked_in'
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* ── Open cover requests ── */}
      <Card className="mb-3">
        <CardHeader>🔄 Open cover requests</CardHeader>
        <CardBody className="p-0">
          {!openCovers?.data?.length ? (
            <p style={{ padding: 16, fontSize: 'var(--text-card)', color: 'var(--text-muted)' }}>No open cover requests.</p>
          ) : (
            <div className="max-h-[220px] overflow-y-auto">
              {openCovers.data.slice(0, 8).map((cr) => (
                <div
                  key={cr.id}
                  className="flex items-center justify-between px-4 py-[9px] border-b border-[var(--divider)] gap-[10px]"
                >
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 'var(--text-card)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-slate-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cr.requester?.name}
                    </p>
                    <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 1, textTransform: 'capitalize' }}>
                      {cr.dutySlot?.session_type}
                      {cr.dutySlot?.duty_date && ` · ${new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                    </p>
                  </div>
                  <Badge status={cr.volunteer_id ? 'pending' : 'open'} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Flagged violations requiring review ── */}
      {pendingFlaggedCount > 0 && (
        <Card className="mb-4">
          <CardHeader>⚑ Flagged violations — needs review</CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[200px] overflow-y-auto">
              {pendingFlaggedViolations.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-4 py-[9px] border-b border-[var(--divider)] gap-[10px]"
                >
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 'var(--text-card)', color: 'var(--color-slate-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.student?.student_name}
                    </p>
                    <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 1 }}>
                      {v.violationType?.name}{v.flag_note ? ` · ${v.flag_note.slice(0, 40)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0"
                    style={{ fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-amber-text)' }}>
                    {v.faculty?.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-[var(--divider)]">
              <button
                onClick={() => navigate(ROUTES.ADMIN_VIOLATIONS + '?is_flagged=true')}
                style={{ fontSize: 'var(--text-small)', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Review all flagged violations →
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Quick actions ── */}
      <div>
        <p style={{ fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-bold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 10 }}>
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-[10px]">
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-2xl)] px-[14px] py-[14px] cursor-pointer text-left transition-all hover:border-blue-500 hover:-translate-y-px"
              style={{ minHeight: 'var(--control-min)' }}
            >
              <span className="w-10 h-10 rounded-[var(--radius-lg)] shrink-0 flex items-center justify-center text-[19px]"
                style={{ background: item.tint }}>
                {item.emoji}
              </span>
              <span style={{ fontSize: 'var(--text-card)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
