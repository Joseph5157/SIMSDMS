import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import {
  useMonthlyAttendance, useLateArrivals, useAbsentFaculty, useAutoClockOut,
  useAttendanceOverrides, useFacultyActivity, useViolationTypeBreakdown, usePendingFines,
  useFlaggedViolations, useDutyCoverage, useUnassignedFacultyReport, useCoverRequestSummary,
  useCompletionRate, useUploadHistory, useActiveStudents,
} from '../../hooks/useReports';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const REPORT_LIST = [
  { id: 'monthly-attendance',   label: '1. Monthly Attendance Summary',    group: 'Attendance' },
  { id: 'late-arrivals',        label: '2. Late Arrival Report',           group: 'Attendance' },
  { id: 'absent-faculty',       label: '3. Absent Faculty Report',         group: 'Attendance' },
  { id: 'auto-clockout',        label: '4. Auto Clock-out Report',         group: 'Attendance' },
  { id: 'attendance-overrides', label: '5. Attendance Override Log',       group: 'Attendance' },
  { id: 'faculty-activity',     label: '6. Faculty Violation Activity',    group: 'Violations' },
  { id: 'violation-types',      label: '7. Violation Type Breakdown',      group: 'Violations' },
  { id: 'pending-fines',        label: '8. Pending Fines Summary',         group: 'Violations' },
  { id: 'flagged-violations',   label: '9. Flagged Violations',            group: 'Violations' },
  { id: 'duty-coverage',        label: '10. Monthly Duty Coverage',        group: 'Duty' },
  { id: 'unassigned-faculty',   label: '11. Unassigned Faculty',           group: 'Duty' },
  { id: 'cover-requests',       label: '12. Cover Request Summary',        group: 'Duty' },
  { id: 'completion-rate',      label: '13. Session Completion Rate',      group: 'Duty' },
  { id: 'upload-history',       label: '14. Student Upload History',       group: 'Students' },
  { id: 'active-students',      label: '15. Active Student Roster',        group: 'Students' },
  { id: 'student-violations',   label: '16. Student Violation History',    group: 'Students' },
];

function MonthFilter({ year, month, setYear, setMonth }) {
  const now = new Date();
  return (
    <div className="flex gap-2 mb-4">
      <select value={year} onChange={(e) => setYear(+e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
        {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y}>{y}</option>)}
      </select>
      <select value={month} onChange={(e) => setMonth(+e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
        {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
      </select>
    </div>
  );
}

function ReportSection({ id, data, isLoading, year, month }) {
  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data)     return null;

  switch (id) {
    case 'monthly-attendance': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Dept.</Th><Th>Total</Th><Th>Completed</Th><Th>Absent</Th><Th>Late</Th><Th>Auto-out</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={7} />}
          {data.data?.map((r, i) => (
            <tr key={i}>
              <Td className="font-medium">{r.faculty?.name}</Td>
              <Td>{r.faculty?.department ?? '—'}</Td>
              <Td>{r.total}</Td><Td>{r.completed}</Td><Td>{r.absent}</Td><Td>{r.late}</Td><Td>{r.auto_out}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'late-arrivals': case 'auto-clockout': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Date</Th><Th>Session</Th><Th>In time</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={4} />}
          {data.data?.map((r) => (
            <tr key={r.id}>
              <Td className="font-medium">{r.faculty?.name}</Td>
              <Td>{new Date(r.dutySlot?.duty_date).toLocaleDateString('en-IN')}</Td>
              <Td className="capitalize">{r.dutySlot?.session_type}</Td>
              <Td>{r.in_time ? new Date(r.in_time).toLocaleTimeString() : '—'}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'absent-faculty': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Date</Th><Th>Status</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={3} />}
          {data.data?.map((s) => (
            <tr key={s.id}>
              <Td className="font-medium">{s.faculty?.name}</Td>
              <Td>{new Date(s.duty_date).toLocaleDateString('en-IN')}</Td>
              <Td><Badge status={s.status} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'attendance-overrides': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Date</Th><Th>Overridden by</Th><Th>Reason</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={4} />}
          {data.data?.map((r) => (
            <tr key={r.id}>
              <Td>{r.faculty?.name}</Td>
              <Td>{new Date(r.dutySlot?.duty_date).toLocaleDateString('en-IN')}</Td>
              <Td>{r.overriddenBy?.name}</Td>
              <Td className="text-xs text-gray-500 max-w-xs truncate">{r.override_reason}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'faculty-activity': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Dept.</Th><Th>Violations</Th><Th>Total Fines (₹)</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={4} />}
          {data.data?.map((r, i) => (
            <tr key={i}>
              <Td className="font-medium">{r.faculty?.name}</Td>
              <Td>{r.faculty?.department ?? '—'}</Td>
              <Td>{r.violation_count}</Td>
              <Td>₹{Number(r.total_fines).toFixed(2)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'violation-types': return (
      <Table>
        <thead><tr><Th>Type</Th><Th>Count</Th><Th>Total Fines (₹)</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={3} />}
          {data.data?.map((r, i) => (
            <tr key={i}>
              <Td className="font-medium">{r.type?.name}</Td>
              <Td>{r.count}</Td>
              <Td>₹{Number(r.total_fines).toFixed(2)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'pending-fines': return (
      <>
        <p className="text-sm font-semibold text-gray-700 mb-3">Total outstanding: ₹{data.total_fine_amount} across {data.total} violations</p>
        <Table>
          <thead><tr><Th>Student</Th><Th>Reg. No.</Th><Th>Course</Th><Th>Type</Th><Th>Fine (₹)</Th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.data?.map((v) => (
              <tr key={v.id}>
                <Td className="font-medium">{v.student?.student_name}</Td>
                <Td className="font-mono text-xs">{v.student?.registration_number}</Td>
                <Td>{v.student?.course}</Td>
                <Td>{v.violationType?.name}</Td>
                <Td className="font-semibold">₹{v.fine_amount}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );

    case 'flagged-violations': return (
      <>
        <div className="flex gap-4 mb-3 text-sm">
          <span className="text-orange-600 font-medium">Pending: {data.pending_count}</span>
          <span className="text-green-600 font-medium">Resolved: {data.resolved_count}</span>
        </div>
        <Table>
          <thead><tr><Th>Student</Th><Th>Faculty</Th><Th>Type</Th><Th>Flag note</Th><Th>Resolved</Th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.data?.map((v) => (
              <tr key={v.id}>
                <Td>{v.student?.student_name}</Td>
                <Td>{v.faculty?.name}</Td>
                <Td>{v.violationType?.name}</Td>
                <Td className="text-xs text-gray-500 max-w-xs truncate">{v.flag_note}</Td>
                <Td>{v.flag_resolved_at ? <Badge status="active" label="Resolved" /> : <Badge status="pending" label="Pending" />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );

    case 'duty-coverage': return (
      <div className="grid grid-cols-2 gap-4">
        {[['Total slots', data.total], ['Completed', data.completed], ['Absent', data.absent], ['Cover pending', data.cover_pending],
          ['Covered', data.covered], ['Scheduled', data.scheduled], ['Morning', data.morning], ['Afternoon', data.afternoon],
          ['Completion rate', `${data.completion_rate}%`]].map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    );

    case 'unassigned-faculty': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Dept.</Th><Th>Picked</Th><Th>Required</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={4} message="All faculty have picked their slots." />}
          {data.data?.map((f) => (
            <tr key={f.id}>
              <Td className="font-medium">{f.name}</Td>
              <Td>{f.department ?? '—'}</Td>
              <Td>{f.slots_picked}</Td>
              <Td>{f.required}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'cover-requests': return (
      <div className="grid grid-cols-2 gap-4">
        {[['Total', data.total], ['Open', data.open], ['Covered', data.covered], ['Expired', data.expired],
          ['Cancelled', data.cancelled], ['Fulfillment rate', `${data.fulfillment_rate}%`]].map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    );

    case 'completion-rate': return (
      <Table>
        <thead><tr><Th>Month</Th><Th>Total slots</Th><Th>Completed</Th><Th>Rate</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {data.data?.map((r) => (
            <tr key={`${r.year}-${r.month}`}>
              <Td className="font-medium">{MONTHS[r.month-1]} {r.year}</Td>
              <Td>{r.total}</Td>
              <Td>{r.completed}</Td>
              <Td><span className={`font-semibold ${parseFloat(r.rate) >= 80 ? 'text-green-600' : 'text-red-600'}`}>{r.rate}%</span></Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'upload-history': return (
      <Table>
        <thead><tr><Th>Filename</Th><Th>Uploaded by</Th><Th>Added</Th><Th>Updated</Th><Th>Deactivated</Th><Th>Errors</Th><Th>Date</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={7} />}
          {data.data?.map((log) => (
            <tr key={log.id}>
              <Td className="text-xs font-mono">{log.filename}</Td>
              <Td>{log.uploader?.name}</Td>
              <Td>{log.added_count}</Td><Td>{log.updated_count}</Td><Td>{log.deactivated_count}</Td>
              <Td>{Array.isArray(log.errors) ? log.errors.length : 0}</Td>
              <Td className="text-xs">{new Date(log.uploaded_at).toLocaleDateString('en-IN')}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'active-students': return (
      <>
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(data.breakdown ?? {}).map(([key, count]) => (
            <span key={key} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">{key}: {count}</span>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-3">Total: {data.total} active students</p>
      </>
    );

    case 'student-violations': return (
      <Table>
        <thead><tr><Th>Student</Th><Th>Reg. No.</Th><Th>Type</Th><Th>Fine</Th><Th>Faculty</Th><Th>Date</Th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {!data.data?.length && <EmptyRow cols={6} />}
          {data.data?.map((v) => (
            <tr key={v.id}>
              <Td className="font-medium">{v.student?.student_name}</Td>
              <Td className="font-mono text-xs">{v.student?.registration_number}</Td>
              <Td>{v.violationType?.name}</Td>
              <Td>{v.is_warning_only ? 'Warning' : `₹${v.fine_amount}`}</Td>
              <Td>{v.faculty?.name}</Td>
              <Td className="text-xs">{new Date(v.created_at).toLocaleDateString('en-IN')}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    default: return <pre className="text-xs text-gray-500 overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  }
}

function ReportView({ id }) {
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const params = { year, month };

  const needs_month = !['pending-fines','flagged-violations','upload-history','active-students','completion-rate','student-violations'].includes(id);

  const hooks = {
    'monthly-attendance':   useMonthlyAttendance,
    'late-arrivals':        useLateArrivals,
    'absent-faculty':       useAbsentFaculty,
    'auto-clockout':        useAutoClockOut,
    'attendance-overrides': useAttendanceOverrides,
    'faculty-activity':     useFacultyActivity,
    'violation-types':      useViolationTypeBreakdown,
    'pending-fines':        usePendingFines,
    'flagged-violations':   useFlaggedViolations,
    'duty-coverage':        useDutyCoverage,
    'unassigned-faculty':   useUnassignedFacultyReport,
    'cover-requests':       useCoverRequestSummary,
    'completion-rate':      useCompletionRate,
    'upload-history':       useUploadHistory,
    'active-students':      useActiveStudents,
  };

  // student-violations uses same hook as flagged
  const useHook = hooks[id] ?? useFlaggedViolations;
  const { data, isLoading } = useHook(needs_month ? params : {});

  return (
    <div>
      {needs_month && <MonthFilter year={year} month={month} setYear={setYear} setMonth={setMonth} />}
      <ReportSection id={id} data={data} isLoading={isLoading} year={year} month={month} />
    </div>
  );
}

export default function ReportsPage({ user }) {
  const [activeReport, setActiveReport] = useState(REPORT_LIST[0].id);
  const groups = [...new Set(REPORT_LIST.map(r => r.group))];
  const activeLabel = REPORT_LIST.find(r => r.id === activeReport)?.label ?? '';

  return (
    <Layout user={user}>
      <PageHeader title="Reports" subtitle="16 system reports" />
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">{group}</p>
              {REPORT_LIST.filter(r => r.group === group).map((r) => (
                <button key={r.id} onClick={() => setActiveReport(r.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${activeReport === r.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Report content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{activeLabel}</h2>
          <ReportView key={activeReport} id={activeReport} />
        </div>
      </div>
    </Layout>
  );
}
