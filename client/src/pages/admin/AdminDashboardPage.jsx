import Layout, { PageHeader } from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import { useUsers } from '../../hooks/useUsers';
import { useLiveAttendance } from '../../hooks/useAttendance';
import { useCoverRequests } from '../../hooks/useCoverRequests';
import { useFlaggedViolations } from '../../hooks/useReports';

function StatCard({ label, value, sub, accent }) {
  const ring = accent === 'red'    ? 'border-red-200 bg-red-50'
             : accent === 'yellow' ? 'border-yellow-200 bg-yellow-50'
             : accent === 'green'  ? 'border-green-200 bg-green-50'
             : 'border-gray-200 bg-white';

  const text = accent === 'red'    ? 'text-red-700'
             : accent === 'yellow' ? 'text-yellow-700'
             : accent === 'green'  ? 'text-green-700'
             : 'text-gray-900';

  return (
    <div className={`rounded-xl border p-5 ${ring}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage({ user }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const { data: allUsers }     = useUsers({ status: 'active' });
  const { data: pendingUsers } = useUsers({ status: 'pending' });
  const { data: liveData }     = useLiveAttendance();
  const { data: openCovers }   = useCoverRequests({ status: 'open' });
  const { data: flagged }      = useFlaggedViolations();

  const activeFaculty  = allUsers?.data?.filter(u => u.role === 'faculty').length ?? 0;
  const pendingCount   = pendingUsers?.meta?.total ?? pendingUsers?.data?.length ?? 0;
  const openCoverCount = openCovers?.meta?.total ?? openCovers?.data?.length ?? 0;
  const flaggedCount   = flagged?.total ?? flagged?.data?.length ?? 0;

  const liveSlots    = liveData?.data ?? [];
  const checkedIn    = liveSlots.filter(s => s.attendance_status === 'checked_in').length;
  const checkedOut   = liveSlots.filter(s => s.attendance_status === 'checked_out').length;
  const notCheckedIn = liveSlots.filter(s => s.attendance_status === 'not_checked_in').length;
  const lateCount    = liveSlots.filter(s => s.in_status === 'late').length;

  return (
    <Layout user={user}>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle={dateStr}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <StatCard label="Active faculty" value={activeFaculty} accent="green" />
        <StatCard
          label="Pending approvals"
          value={pendingCount}
          accent={pendingCount > 0 ? 'yellow' : undefined}
          sub={pendingCount > 0 ? 'Needs action' : 'All clear'}
        />
        <StatCard
          label="Open cover requests"
          value={openCoverCount}
          accent={openCoverCount > 0 ? 'yellow' : undefined}
        />
        <StatCard
          label="Flagged violations"
          value={flaggedCount}
          accent={flaggedCount > 0 ? 'red' : undefined}
          sub={flaggedCount > 0 ? 'Awaiting review' : 'None pending'}
        />
      </div>

      {/* Today's attendance + open covers */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Live attendance summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Today's attendance
            {liveData?.date && (
              <span className="text-xs font-normal text-gray-400 ml-2">{liveData.date}</span>
            )}
          </p>
          {!liveSlots.length ? (
            <p className="text-sm text-gray-400">No duty slots scheduled today.</p>
          ) : (
            <>
              <div className="flex gap-4 mb-4 text-sm">
                <div>
                  <span className="font-semibold text-green-700">{checkedOut}</span>
                  <span className="text-gray-500 ml-1">Checked out</span>
                </div>
                <div>
                  <span className="font-semibold text-blue-700">{checkedIn}</span>
                  <span className="text-gray-500 ml-1">Checked in</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">{notCheckedIn}</span>
                  <span className="text-gray-500 ml-1">Not in</span>
                </div>
                {lateCount > 0 && (
                  <div>
                    <span className="font-semibold text-yellow-700">{lateCount}</span>
                    <span className="text-gray-500 ml-1">Late</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {liveSlots.map((s) => (
                  <div key={s.slot_id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate max-w-[140px]">{s.faculty?.name}</span>
                    <span className="text-gray-400 capitalize">{s.session_type}</span>
                    <Badge status={s.attendance_status === 'checked_out' ? 'completed'
                                 : s.attendance_status === 'checked_in'  ? 'active'
                                 : 'absent'}
                           label={s.attendance_status === 'checked_out' ? 'Out'
                                : s.attendance_status === 'checked_in'  ? 'In'
                                : 'Not in'} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Open cover requests */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Open cover requests</p>
          {!openCovers?.data?.length ? (
            <p className="text-sm text-gray-400">No open cover requests.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {openCovers.data.slice(0, 8).map((cr) => (
                <div key={cr.id} className="flex items-start justify-between text-sm gap-2">
                  <div className="min-w-0">
                    <p className="text-gray-700 truncate">{cr.requester?.name}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {cr.dutySlot?.session_type} ·{' '}
                      {cr.dutySlot?.duty_date
                        ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : '—'}
                    </p>
                  </div>
                  <Badge status={cr.volunteer_id ? 'pending' : 'open'}
                         label={cr.volunteer_id ? 'Has volunteer' : 'Open'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending approvals */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">
            {pendingCount} account{pendingCount !== 1 ? 's' : ''} awaiting approval
          </p>
          <p className="text-sm text-yellow-700">
            Go to <span className="font-medium">Users</span> to review and activate pending accounts.
          </p>
        </div>
      )}
    </Layout>
  );
}
