import Layout, { PageHeader, Card, CardHeader, CardBody } from '../../components/Layout';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import { useUsers } from '../../hooks/useUsers';
import { useLiveAttendance } from '../../hooks/useAttendance';
import { useCoverRequests } from '../../hooks/useCoverRequests';
import { useFlaggedViolations } from '../../hooks/useReports';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

const QUICK_ACTIONS = [
  { label: 'Live Attendance', emoji: '✅', path: ROUTES.ADMIN_ATTENDANCE,      tint: '#f0fdf4', ink: '#065f46' },
  { label: 'Cover Requests',  emoji: '🔄', path: ROUTES.ADMIN_COVER_REQUESTS,  tint: '#eff6ff', ink: '#1e40af' },
  { label: 'Violations',      emoji: '⚠️', path: ROUTES.ADMIN_VIOLATIONS,      tint: '#fef2f2', ink: '#991b1b' },
  { label: 'Reports',         emoji: '📊', path: ROUTES.ADMIN_REPORTS,         tint: '#f5f3ff', ink: '#5b21b6' },
];

export default function AdminDashboardPage({ user }) {
  const navigate = useNavigate();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const { data: allUsers }           = useUsers({ status: 'active' });
  const { data: pendingUsers }       = useUsers({ status: 'pending' });
  const { data: pendingTelegramUsers } = useUsers({ status: 'pending_telegram' });
  const { data: liveData }           = useLiveAttendance();
  const { data: openCovers }         = useCoverRequests({ status: 'open' });
  const { data: flagged }            = useFlaggedViolations();

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

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Active Faculty"   value={activeFaculty}        accent="blue"   icon="👥" />
        <StatCard label="Pending"          value={pendingCount}          accent={pendingCount > 0 ? 'yellow' : 'default'}
          sub={pendingCount > 0 ? 'Needs action' : 'All clear'} icon="⏳" />
        <StatCard label="Cover Requests"   value={openCoverCount}        accent={openCoverCount > 0 ? 'yellow' : 'default'} icon="🔄" />
        <StatCard label="Flagged"          value={pendingFlaggedCount}   accent={pendingFlaggedCount > 0 ? 'red' : 'default'}
          sub={pendingFlaggedCount > 0 ? 'Awaiting review' : 'None pending'} icon="⚑" />
      </div>

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
        <CardHeader>📋 Today's attendance</CardHeader>
        <CardBody className="p-0">
          {!liveSlots.length ? (
            <p style={{ padding: 16, fontSize: 'var(--text-card)', color: 'var(--text-muted)' }}>No duty slots scheduled today.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
                {[
                  { n: checkedOut,    label: 'Out',    color: 'var(--color-emerald-solid)', tint: '#f0fdf4' },
                  { n: checkedIn,     label: 'In',     color: 'var(--brand)',               tint: '#eff6ff' },
                  { n: notCheckedIn,  label: 'Not in', color: 'var(--text-muted)',          tint: 'var(--surface-page)' },
                  ...(lateCount > 0 ? [{ n: lateCount, label: 'Late', color: 'var(--color-amber-solid)', tint: '#fffbeb' }] : []),
                ].map((item) => (
                  <div key={item.label} style={{
                    flex: 1, background: item.tint, borderRadius: 12, padding: '10px 8px', textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.n}</p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {liveSlots.map((s) => (
                  <div
                    key={s.slot_id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 16px', borderBottom: '1px solid var(--surface-page)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--text-card)', color: 'var(--color-slate-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.covering_faculty ? `${s.faculty?.name} → ${s.covering_faculty?.name}` : s.faculty?.name}
                      </p>
                    </div>
                    <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', textTransform: 'capitalize', marginRight: 10, flexShrink: 0 }}>
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
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {openCovers.data.slice(0, 8).map((cr) => (
                <div
                  key={cr.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 16px', borderBottom: '1px solid var(--surface-page)', gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
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
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {pendingFlaggedViolations.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 16px', borderBottom: '1px solid var(--surface-page)', gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 'var(--text-card)', color: 'var(--color-slate-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.student?.student_name}
                    </p>
                    <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 1 }}>
                      {v.violationType?.name}{v.flag_note ? ` · ${v.flag_note.slice(0, 40)}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-amber-text)', flexShrink: 0 }}>
                    {v.faculty?.name}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--divider)' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 'var(--control-min)',
                backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '14px 14px',
                cursor: 'pointer', textAlign: 'left', transition: `all var(--dur-fast)`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-blue-200)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: item.tint, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 19,
              }}>
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
