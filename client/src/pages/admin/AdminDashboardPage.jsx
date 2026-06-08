import Layout, { PageHeader } from '../../components/Layout';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { useUsers } from '../../hooks/useUsers';
import { useLiveAttendance } from '../../hooks/useAttendance';
import { useCoverRequests } from '../../hooks/useCoverRequests';
import { useFlaggedViolations } from '../../hooks/useReports';

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

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Active faculty" value={activeFaculty} accent="green" icon="👥" />
        <StatCard label="Pending approvals" value={pendingCount} accent={pendingCount > 0 ? 'yellow' : 'default'} sub={pendingCount > 0 ? 'Needs action' : 'All clear'} icon="⏳" />
        <StatCard label="Open cover requests" value={openCoverCount} accent={openCoverCount > 0 ? 'yellow' : 'default'} icon="🔄" />
        <StatCard label="Flagged violations" value={flaggedCount} accent={flaggedCount > 0 ? 'red' : 'default'} sub={flaggedCount > 0 ? 'Awaiting review' : 'None pending'} icon="⚑" />
      </div>

      {/* Panels grid */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Live attendance panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>📋 Today's attendance</p>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {!liveSlots.length ? (
              <p className="text-[13px] text-slate-500">No duty slots scheduled today.</p>
            ) : (
              <>
                <div className="flex gap-4 mb-5 text-[12px]">
                  <div>
                    <span className="font-semibold text-green-700 block">{checkedOut}</span>
                    <span className="text-slate-500">Checked out</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700 block">{checkedIn}</span>
                    <span className="text-slate-500">Checked in</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 block">{notCheckedIn}</span>
                    <span className="text-slate-500">Not in</span>
                  </div>
                  {lateCount > 0 && (
                    <div>
                      <span className="font-semibold text-amber-700 block">{lateCount}</span>
                      <span className="text-slate-500">Late</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {liveSlots.map((s) => (
                    <div key={s.slot_id} className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-700 truncate flex-1">{s.faculty?.name}</span>
                      <span className="text-slate-500 capitalize mx-3 text-[11px]">{s.session_type}</span>
                      <Badge
                        status={s.attendance_status === 'checked_out' ? 'completed'
                               : s.attendance_status === 'checked_in'  ? 'active'
                               : 'absent'}
                        label={s.attendance_status === 'checked_out' ? 'Out'
                             : s.attendance_status === 'checked_in'  ? 'In'
                             : 'Not in'}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Open cover requests panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>🔄 Open cover requests</p>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {!openCovers?.data?.length ? (
              <p className="text-[13px] text-slate-500">No open cover requests.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {openCovers.data.slice(0, 8).map((cr) => (
                  <div key={cr.id} className="flex items-start justify-between text-[12px] gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-900 font-medium truncate">{cr.requester?.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                        {cr.dutySlot?.session_type} •{' '}
                        {cr.dutySlot?.duty_date
                          ? new Date(cr.dutySlot.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                          : '—'}
                      </p>
                    </div>
                    <Badge
                      status={cr.volunteer_id ? 'pending' : 'open'}
                      label={cr.volunteer_id ? 'Has volunteer' : 'Open'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending approvals alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-l-amber-500 border border-amber-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-amber-900 mb-1">
            {pendingCount} account{pendingCount !== 1 ? 's' : ''} awaiting approval
          </p>
          <p className="text-[12px] text-amber-800">
            Go to <span className="font-medium">Users</span> to review and activate pending accounts.
          </p>
        </div>
      )}
    </Layout>
  );
}
