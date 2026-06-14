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

// ── Report card definitions ────────────────────────────────────────────────────
const REPORTS = [
  // Attendance group
  { id: 'monthly-attendance',   emoji: '📊', color: 'bg-blue-100',   label: 'Monthly Attendance',   desc: 'Full attendance summary per faculty' },
  { id: 'late-arrivals',        emoji: '⏰', color: 'bg-amber-100',  label: 'Late Arrivals',         desc: 'Faculty who checked in late' },
  { id: 'absent-faculty',       emoji: '❌', color: 'bg-red-100',    label: 'Absent Faculty',        desc: 'Slots with no check-in recorded' },
  { id: 'auto-clockout',        emoji: '🕓', color: 'bg-orange-100', label: 'Auto Clock-outs',       desc: 'System-clocked-out records' },
  // Violations group
  { id: 'faculty-activity',     emoji: '👤', color: 'bg-purple-100', label: 'Faculty Activity',      desc: 'Violations recorded per faculty' },
  { id: 'violation-types',      emoji: '🏷', color: 'bg-indigo-100', label: 'Type Breakdown',        desc: 'Violations grouped by type' },
  { id: 'pending-fines',        emoji: '💰', color: 'bg-yellow-100', label: 'Pending Fines',         desc: 'Outstanding fine amounts' },
  { id: 'flagged-violations',   emoji: '⚑',  color: 'bg-amber-100',  label: 'Flagged Violations',    desc: 'Records flagged for Admin review' },
  // Duty & Coverage group
  { id: 'duty-coverage',        emoji: '📅', color: 'bg-green-100',  label: 'Duty Coverage',         desc: 'Monthly slot completion stats' },
  { id: 'unassigned-faculty',   emoji: '👥', color: 'bg-slate-100',  label: 'Unassigned Faculty',    desc: 'Faculty without full slot allocation' },
  { id: 'cover-requests',       emoji: '🔄', color: 'bg-cyan-100',   label: 'Cover Request Summary', desc: 'Broadcast outcomes and fulfilment rate' },
  { id: 'completion-rate',      emoji: '📈', color: 'bg-teal-100',   label: 'Completion Rate',       desc: 'Month-by-month session completion %' },
  // Students group
  { id: 'attendance-overrides', emoji: '✏️', color: 'bg-pink-100',   label: 'Override Log',          desc: 'Admin-overridden attendance records' },
  { id: 'upload-history',       emoji: '📤', color: 'bg-blue-100',   label: 'Upload History',        desc: 'Excel upload log with error counts' },
  { id: 'active-students',      emoji: '🎓', color: 'bg-green-100',  label: 'Active Students',       desc: 'Student roster breakdown by course' },
  { id: 'student-violations',   emoji: '⚠️', color: 'bg-red-100',   label: 'Student Violations',    desc: 'All violations by student' },
];

// ── Month filter ───────────────────────────────────────────────────────────────
function MonthFilter({ year, month, setYear, setMonth }) {
  const now = new Date();
  const cls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white';
  return (
    <div className="flex gap-2 mb-5">
      <select value={year} onChange={(e) => setYear(+e.target.value)} className={cls}>
        {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
      </select>
      <select value={month} onChange={(e) => setMonth(+e.target.value)} className={cls}>
        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
      </select>
    </div>
  );
}

// ── Report result content ──────────────────────────────────────────────────────
function ReportSection({ id, data, isLoading }) {
  if (isLoading) return <p className="text-[13px] text-slate-400">Loading…</p>;
  if (!data)     return null;

  switch (id) {
    case 'monthly-attendance': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Dept</Th><Th>Total</Th><Th>Completed</Th><Th>Absent</Th><Th>Late</Th><Th>Auto-out</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
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
        <tbody className="divide-y divide-slate-100">
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
        <tbody className="divide-y divide-slate-100">
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
        <tbody className="divide-y divide-slate-100">
          {!data.data?.length && <EmptyRow cols={4} />}
          {data.data?.map((r) => (
            <tr key={r.id}>
              <Td>{r.faculty?.name}</Td>
              <Td>{new Date(r.dutySlot?.duty_date).toLocaleDateString('en-IN')}</Td>
              <Td>{r.overriddenBy?.name}</Td>
              <Td className="text-[12px] text-slate-500 max-w-xs truncate">{r.override_reason}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'faculty-activity': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Dept</Th><Th>Violations</Th><Th>Total Fines (₹)</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
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
        <tbody className="divide-y divide-slate-100">
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
        <p className="text-[13px] font-semibold text-slate-700 mb-3">
          Total outstanding: ₹{data.total_fine_amount} across {data.total} violations
        </p>
        <Table>
          <thead><tr><Th>Student</Th><Th>Reg. No.</Th><Th>Course</Th><Th>Type</Th><Th>Fine (₹)</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.data?.map((v) => (
              <tr key={v.id}>
                <Td className="font-medium">{v.student?.student_name}</Td>
                <Td className="font-mono text-[12px]">{v.student?.registration_number}</Td>
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
        <div className="flex gap-4 mb-3 text-[13px]">
          <span className="text-orange-600 font-medium">Pending: {data.pending_count}</span>
          <span className="text-green-600 font-medium">Resolved: {data.resolved_count}</span>
        </div>
        <Table>
          <thead><tr><Th>Student</Th><Th>Faculty</Th><Th>Type</Th><Th>Flag note</Th><Th>Resolved</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.data?.map((v) => (
              <tr key={v.id}>
                <Td>{v.student?.student_name}</Td>
                <Td>{v.faculty?.name}</Td>
                <Td>{v.violationType?.name}</Td>
                <Td className="text-[12px] text-slate-500 max-w-xs truncate">{v.flag_note}</Td>
                <Td>{v.flag_resolved_at ? <Badge status="active" label="Resolved" /> : <Badge status="pending" label="Pending" />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );

    case 'duty-coverage': return (
      <div className="grid grid-cols-3 gap-3">
        {[['Total slots', data.total], ['Completed', data.completed], ['Absent', data.absent],
          ['Cover pending', data.cover_pending], ['Covered', data.covered], ['Scheduled', data.scheduled],
          ['Morning', data.morning], ['Afternoon', data.afternoon], ['Completion rate', `${data.completion_rate}%`],
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded-xl p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="text-[20px] font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>
    );

    case 'unassigned-faculty': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Dept</Th><Th>Picked</Th><Th>Required</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
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
      <div className="grid grid-cols-3 gap-3">
        {[['Total', data.total], ['Open', data.open], ['Covered', data.covered],
          ['Expired', data.expired], ['Cancelled', data.cancelled], ['Fulfillment rate', `${data.fulfillment_rate}%`],
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded-xl p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="text-[20px] font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>
    );

    case 'completion-rate': return (
      <Table>
        <thead><tr><Th>Month</Th><Th>Total slots</Th><Th>Completed</Th><Th>Rate</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {data.data?.map((r) => (
            <tr key={`${r.year}-${r.month}`}>
              <Td className="font-medium">{MONTHS[r.month - 1]} {r.year}</Td>
              <Td>{r.total}</Td>
              <Td>{r.completed}</Td>
              <Td>
                <span className={`font-semibold ${parseFloat(r.rate) >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                  {r.rate}%
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'upload-history': return (
      <Table>
        <thead><tr><Th>Filename</Th><Th>Uploaded by</Th><Th>Added</Th><Th>Updated</Th><Th>Deactivated</Th><Th>Errors</Th><Th>Date</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data.data?.length && <EmptyRow cols={7} />}
          {data.data?.map((log) => (
            <tr key={log.id}>
              <Td className="font-mono text-[12px]">{log.filename}</Td>
              <Td>{log.uploader?.name}</Td>
              <Td>{log.added_count}</Td><Td>{log.updated_count}</Td><Td>{log.deactivated_count}</Td>
              <Td>{Array.isArray(log.errors) ? log.errors.length : 0}</Td>
              <Td className="text-[12px]">{new Date(log.uploaded_at).toLocaleDateString('en-IN')}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    case 'active-students': return (
      <>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(data.breakdown ?? {}).map(([key, count]) => (
            <span key={key} className="bg-blue-50 text-blue-700 text-[12px] px-3 py-1 rounded-full">
              {key}: {count}
            </span>
          ))}
        </div>
        <p className="text-[13px] text-slate-500">Total: <strong>{data.total}</strong> active students</p>
      </>
    );

    case 'student-violations': return (
      <Table>
        <thead><tr><Th>Student</Th><Th>Reg. No.</Th><Th>Type</Th><Th>Fine</Th><Th>Faculty</Th><Th>Date</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data.data?.length && <EmptyRow cols={6} />}
          {data.data?.map((v) => (
            <tr key={v.id}>
              <Td className="font-medium">{v.student?.student_name}</Td>
              <Td className="font-mono text-[12px]">{v.student?.registration_number}</Td>
              <Td>{v.violationType?.name}</Td>
              <Td>{v.is_warning_only ? 'Warning' : `₹${v.fine_amount}`}</Td>
              <Td>{v.faculty?.name}</Td>
              <Td className="text-[12px]">{new Date(v.created_at).toLocaleDateString('en-IN')}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    default: return <pre className="text-[12px] text-slate-500 overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ── Report view (runs the hook for selected report) ────────────────────────────
const NO_MONTH = ['pending-fines','flagged-violations','upload-history','active-students','completion-rate','student-violations'];

function ReportView({ id }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const needsMonth = !NO_MONTH.includes(id);
  const params = needsMonth ? { year, month } : {};

  const hookMap = {
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
  const useHook = hookMap[id] ?? useFlaggedViolations;
  const { data, isLoading } = useHook(params);

  return (
    <div>
      {needsMonth && <MonthFilter year={year} month={month} setYear={setYear} setMonth={setMonth} />}
      <ReportSection id={id} data={data} isLoading={isLoading} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage({ user }) {
  const [active, setActive] = useState(null);

  const activeReport = REPORTS.find((r) => r.id === active);

  return (
    <Layout user={user}>
      <PageHeader title="Reports" subtitle="16 system reports" />

      {/* 4-column card grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            onClick={() => setActive(active === r.id ? null : r.id)}
            className={`text-left rounded-xl border p-4 transition-all ${
              active === r.id
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg ${r.color} flex items-center justify-center text-[18px] mb-3`}>
              {r.emoji}
            </div>
            <p className="text-[13px] font-semibold text-slate-900 leading-snug">{r.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Result panel */}
      {active && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-slate-900">
              {activeReport?.emoji} {activeReport?.label}
            </h2>
            <button
              onClick={() => setActive(null)}
              className="text-slate-400 hover:text-slate-600 text-[18px] leading-none"
            >
              ✕
            </button>
          </div>
          <ReportView key={active} id={active} />
        </div>
      )}
    </Layout>
  );
}
