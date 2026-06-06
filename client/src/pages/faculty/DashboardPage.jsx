import Layout, { PageHeader } from '../../components/Layout';
import Badge from '../../components/ui/Badge';
import { useMonthSlots } from '../../hooks/useDutySlots';
import { useMyViolations } from '../../hooks/useViolations';
import { useInbox } from '../../hooks/useMessages';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage({ user }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: slotsData }      = useMonthSlots(year, month);
  const { data: violationsData } = useMyViolations({ limit: 5 });
  const { data: inboxData }      = useInbox({ limit: 5 });

  const slots = slotsData?.data ?? [];
  const todayStr = now.toISOString().slice(0, 10);
  const todaySlot = slots.find(s => new Date(s.duty_date).toISOString().slice(0,10) === todayStr);
  const upcoming  = slots.filter(s => new Date(s.duty_date) > now).slice(0, 3);
  const unread    = inboxData?.data?.filter(m => !m.is_read).length ?? 0;

  return (
    <Layout user={user}>
      <PageHeader title={`Welcome, ${user?.name?.split(' ')[0]}`} subtitle={`${now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Slots this month" value={slots.length} />
        <StatCard label="Violations recorded" value={violationsData?.meta?.total ?? 0} />
        <StatCard label="Unread messages" value={unread} />
      </div>

      {todaySlot && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-1">You have duty today</p>
          <p className="text-sm text-blue-700 capitalize">{todaySlot.session_type} session · <Badge status={todaySlot.status} /></p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Upcoming duties</p>
          {!upcoming.length && <p className="text-sm text-gray-400">No upcoming duties this month.</p>}
          <div className="space-y-2">
            {upcoming.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span>{new Date(s.duty_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>
                <span className="capitalize text-gray-500">{s.session_type}</span>
                <Badge status={s.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Recent violations recorded</p>
          {!violationsData?.data?.length && <p className="text-sm text-gray-400">No violations recorded yet.</p>}
          <div className="space-y-2">
            {violationsData?.data?.slice(0,5).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{v.student?.student_name}</span>
                <span className="text-gray-500 text-xs">{v.violationType?.name}</span>
                {v.is_flagged && <Badge status="pending" label="Flagged" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
