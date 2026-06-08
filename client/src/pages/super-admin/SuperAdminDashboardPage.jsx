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
        <StatCard label="Total users"     value={totalUsers} />
        <StatCard label="Faculty"         value={totalFaculty} />
        <StatCard label="Admins"          value={totalAdmins} />
        <StatCard
          label="Pending approvals"
          value={pendingCount}
          sub={pendingCount > 0 ? 'Needs action' : 'All clear'}
        />
      </div>

      {/* Recent audit log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Recent system activity</p>
        {!logs.length ? (
          <p className="text-sm text-gray-400">No audit log entries yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between py-2.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 capitalize">{fmtAction(entry.action)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    by {entry.actor?.name ?? 'System'}
                    {entry.target_type && (
                      <span className="ml-1 text-gray-300">· {entry.target_type}</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
