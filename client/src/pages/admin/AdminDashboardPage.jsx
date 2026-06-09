import Layout, { PageHeader, Card, CardHeader, CardBody } from '../../components/Layout';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { useUsers } from '../../hooks/useUsers';
import { useLiveAttendance } from '../../hooks/useAttendance';
import { useCoverRequests } from '../../hooks/useCoverRequests';
import { useFlaggedViolations } from '../../hooks/useReports';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

const QUICK_ACTIONS = [
  { label: 'Live Attendance', emoji: '✅', path: ROUTES.ADMIN_ATTENDANCE },
  { label: 'Cover Requests',  emoji: '🔄', path: ROUTES.ADMIN_COVER_REQUESTS },
  { label: 'Violations',      emoji: '⚠️', path: ROUTES.ADMIN_VIOLATIONS },
  { label: 'Reports',         emoji: '📊', path: ROUTES.ADMIN_REPORTS },
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
        <StatCard label="Active Faculty"      value={activeFaculty}  accent="blue"   icon="👥" />
        <StatCard
          label="Pending Approvals"
          value={pendingCount}
          accent={pendingCount > 0 ? 'yellow' : 'default'}
          sub={pendingCount > 0 ? 'Needs action' : 'All clear'}
          icon="⏳"
        />
        <StatCard
          label="Open Cover Requests"
          value={openCoverCount}
          accent={openCoverCount > 0 ? 'yellow' : 'default'}
          icon="🔄"
        />
        <StatCard
          label="Flagged Violations"
          value={pendingFlaggedCount}
          accent={pendingFlaggedCount > 0 ? 'red' : 'default'}
          sub={pendingFlaggedCount > 0 ? 'Awaiting review' : 'None pending'}
          icon="⚑"
        />
      </div>

      {/* ── Pending account approvals alert ── */}
      {pendingCount > 0 && (
        <div
          className="mb-3 flex items-start gap-3 rounded-xl p-3.5 cursor-pointer"
          style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b' }}
          onClick={() => navigate(ROUTES.ADMIN_USERS)}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>⏳</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 1 }}>
              {pendingCount} account{pendingCount !== 1 ? 's' : ''} awaiting approval
            </p>
            <p style={{ fontSize: 12, color: '#b45309' }}>Tap to review and approve.</p>
          </div>
        </div>
      )}

      {/* ── Pending Telegram invites alert ── */}
      {pendingTelegramCount > 0 && (
        <div
          className="mb-3 flex items-start gap-3 rounded-xl p-3.5 cursor-pointer"
          style={{ backgroundColor: '#ecfeff', border: '1px solid #a5f3fc', borderLeft: '3px solid #06b6d4' }}
          onClick={() => navigate(ROUTES.ADMIN_USERS + '?status=pending_telegram')}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>📲</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0e7490', marginBottom: 1 }}>
              {pendingTelegramCount} user{pendingTelegramCount !== 1 ? 's' : ''} haven't linked Telegram yet
            </p>
            <p style={{ fontSize: 12, color: '#0891b2' }}>Resend invite links from the Users page.</p>
          </div>
        </div>
      )}

      {/* ── Today's attendance ── */}
      <Card className="mb-3">
        <CardHeader>📋 Today's attendance</CardHeader>
        <CardBody className="p-0">
          {!liveSlots.length ? (
            <p style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>No duty slots scheduled today.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, padding: '12px 16px 8px', borderBottom: '1px solid #f1f5f9' }}>
                {[
                  { n: checkedOut,    label: 'Out',     color: '#059669' },
                  { n: checkedIn,     label: 'In',      color: '#2563eb' },
                  { n: notCheckedIn,  label: 'Not in',  color: '#94a3b8' },
                  ...(lateCount > 0 ? [{ n: lateCount, label: 'Late', color: '#d97706' }] : []),
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.n}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {liveSlots.map((s) => (
                  <div
                    key={s.slot_id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 16px', borderBottom: '1px solid #f8fafc',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.covering_faculty ? `${s.faculty?.name} → ${s.covering_faculty?.name}` : s.faculty?.name}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize', marginRight: 10, flexShrink: 0 }}>
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
            <p style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>No open cover requests.</p>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {openCovers.data.slice(0, 8).map((cr) => (
                <div
                  key={cr.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 16px', borderBottom: '1px solid #f8fafc', gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cr.requester?.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, textTransform: 'capitalize' }}>
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
                    padding: '9px 16px', borderBottom: '1px solid #f8fafc', gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.student?.student_name}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                      {v.violationType?.name}{v.flag_note ? ` · ${v.flag_note.slice(0, 40)}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', flexShrink: 0 }}>
                    {v.faculty?.name}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => navigate(ROUTES.ADMIN_VIOLATIONS + '?is_flagged=true')}
                style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Review all flagged violations →
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Quick actions ── */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Quick actions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, minHeight: 44,
                backgroundColor: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: '12px 14px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#bfdbfe')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{item.label}</span>
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
