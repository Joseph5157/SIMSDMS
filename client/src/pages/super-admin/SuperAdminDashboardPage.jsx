import Layout, { PageHeader } from '../../components/Layout';
import StatCard from '../../components/ui/StatCard';
import { useUsers } from '../../hooks/useUsers';
import { useAuditLogs } from '../../hooks/useUsers';

const ACTION_LABELS = {
  USER_CREATED:              'User created',
  USER_DEACTIVATED:          'User deactivated',
  USER_REACTIVATED:          'User reactivated',
  USER_HARD_DELETED:         'User hard-deleted',
  SESSION_RESET:             'Session reset',
  CALENDAR_WINDOW_OPEN:      'Calendar window opened',
  CALENDAR_WINDOW_CLOSE:     'Calendar window closed',
  CALENDAR_BLOCKED_DATES_UPDATE: 'Blocked dates updated',
  CALENDAR_WORKING_DAYS_UPDATE:  'Working days updated',
  CALENDAR_SESSIONS_UPDATE:      'Sessions/faculty updated',
  ADMIN_ASSIGN_SLOTS:        'Slots assigned',
  VIOLATION_FLAG_RESOLVED:   'Violation flag resolved',
  VIOLATION_HIDDEN:          'Violation hidden',
};

function fmtAction(action) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').toLowerCase();
}

export default function SuperAdminDashboardPage({ user }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const { data: allUsers }     = useUsers();
  const { data: pendingUsers } = useUsers({ status: 'pending' });
  const { data: auditData }    = useAuditLogs({ limit: 10 });

  const totalUsers    = allUsers?.meta?.total ?? allUsers?.data?.length ?? 0;
  const totalFaculty  = allUsers?.data?.filter(u => u.role === 'faculty').length ?? 0;
  const totalAdmins   = allUsers?.data?.filter(u => u.role === 'admin').length ?? 0;
  const pendingCount  = pendingUsers?.meta?.total ?? pendingUsers?.data?.length ?? 0;

  const logs = auditData?.data ?? [];

  return (
    <Layout user={user}>
      <PageHeader title="Super Admin Dashboard" subtitle={dateStr} />

      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <StatCard label="Total users" value={totalUsers} accent="blue" icon="👥" />
        <StatCard label="Faculty" value={totalFaculty} accent="green" icon="🎓" />
        <StatCard label="Admins" value={totalAdmins} accent="yellow" icon="⚡" />
        <StatCard
          label="Pending approvals"
          value={pendingCount}
          accent={pendingCount > 0 ? 'red' : 'default'}
          sub={pendingCount > 0 ? 'Needs action' : 'All clear'}
          icon="⏳"
        />
      </div>

      {/* Recent activity */}
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 8, paddingLeft: 4 }}>
          Recent system activity
        </p>
        <div style={{ backgroundColor: '#fff', borderRadius: 16,
          border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {!logs.length ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No audit log entries yet.
            </div>
          ) : (
            logs.map((entry, i) => (
              <div key={entry.id} style={{
                padding: '12px 16px',
                borderBottom: i < logs.length - 1
                  ? '1px solid #f8fafc' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' }}>
                    {fmtAction(entry.action)}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    by {entry.actor?.name ?? 'System'} · {entry.target_type}
                  </p>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                  {new Date(entry.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short',
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
