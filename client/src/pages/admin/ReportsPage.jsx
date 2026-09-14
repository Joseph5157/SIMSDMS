import { useState } from 'react';
import Layout, { PageHeader } from '../../components/Layout';
import { Table, Th, Td, EmptyRow, ErrorBlock } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import ResponsiveSheet from '../../components/ui/ResponsiveSheet';
import ResponsiveDataView from '../../components/ui/ResponsiveDataView';
import { MobileList, MobileListItem, MobileListItemHeader, MobileListItemMeta } from '../../components/ui/MobileList';
import EmptyState from '../../components/ui/EmptyState';
import AppButton from '../../components/ui/AppButton';
import { useMediaQuery } from '@mantine/hooks';
import { IconX } from '@tabler/icons-react';
import {
  useMonthlyAttendance, useLateArrivals, useAbsentFaculty, useAutoClockOut,
  useAttendanceOverrides, useStudentViolations, useFacultyActivity, useViolationTypeBreakdown, usePendingFines,
  useFlaggedViolations, useDutyCoverage, useUnassignedFacultyReport, useDutyReassignmentReport,
  useCompletionRate, useUploadHistory, useActiveStudents, useDailyViolationReport, useWeeklyViolationReport,
} from '../../hooks/useReports';
import { useAnalyticsFilterOptions } from '../../hooks/useAnalytics';
import { useUsers } from '../../hooks/useUsers';
import { useStudentSearch } from '../../hooks/useStudents';
import { useToast } from '../../components/ui/Toast';
import { downloadReportFile } from '../../utils/downloadFile';
import Breadcrumb from '../../components/Breadcrumb';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Report list definitions ─────────────────────────────────────────────────────
// Batch 5.1 (Spec 032, Milestone 5): identity is text-first (label + one-line
// desc), grouped by family — no per-report emoji/colour tile. See V2 §11 and
// DS-18/DS-19 (030-H): a 15-way emoji + arbitrary-colour-tile catalogue reads
// as a generic feature marketplace, not an operational report index.
const REPORTS = [
  // Attendance group
  { id: 'monthly-attendance',   group: 'Attendance',         label: 'Monthly Attendance',   desc: 'Full attendance summary per faculty' },
  { id: 'late-arrivals',        group: 'Attendance',         label: 'Late Arrivals',         desc: 'Faculty who checked in late' },
  { id: 'absent-faculty',       group: 'Attendance',         label: 'Absent Faculty',        desc: 'Slots with no check-in recorded' },
  { id: 'auto-clockout',        group: 'Attendance',         label: 'Auto Clock-outs',       desc: 'System-clocked-out records' },
  // Student Violations group
  { id: 'faculty-activity',     group: 'Student Violations', label: 'Faculty Activity',      desc: 'Student violations recorded per faculty' },
  { id: 'violation-types',      group: 'Student Violations', label: 'Type Breakdown',        desc: 'Student violations grouped by type' },
  { id: 'pending-fines',        group: 'Student Violations', label: 'Pending Fines',         desc: 'Outstanding fine amounts' },
  { id: 'flagged-violations',   group: 'Student Violations', label: 'Flagged Student Violations', desc: 'Records flagged for Admin review' },
  // Duty & Coverage group
  { id: 'duty-coverage',        group: 'Duty & Coverage',    label: 'Duty Coverage',         desc: 'Monthly slot completion stats' },
  { id: 'unassigned-faculty',   group: 'Duty & Coverage',    label: 'Unassigned Faculty',    desc: 'Faculty without full slot allocation' },
  { id: 'duty-reassignments',   group: 'Duty & Coverage',    label: 'Duty Reassignments',    desc: 'Reassignment history and per-faculty duty counts' },
  { id: 'completion-rate',      group: 'Duty & Coverage',    label: 'Completion Rate',       desc: 'Month-by-month session completion %' },
  // Students group
  { id: 'attendance-overrides', group: 'Students',           label: 'Override Log',          desc: 'Admin-overridden attendance records' },
  { id: 'upload-history',       group: 'Students',           label: 'Upload History',        desc: 'Excel upload log with error counts' },
  { id: 'active-students',      group: 'Students',           label: 'Active Students',       desc: 'Student roster breakdown by course' },
];

const REPORT_GROUPS = ['Attendance', 'Student Violations', 'Duty & Coverage', 'Students'];

// ── Month filter ───────────────────────────────────────────────────────────────
function MonthFilter({ year, month, setYear, setMonth }) {
  const now = new Date();
  // text-[length:16px] keeps mobile Safari from zooming when a control is focused.
  // min-h enforces the 44px touch-target floor (030-D-04 / DS-14 measured this at 37-40px).
  const cls = 'border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand)] bg-[var(--surface-card)] text-[var(--text-secondary)] text-[length:16px] min-h-[var(--control-min)]';
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

// Batch 5.2 (Spec 032, Milestone 5): shared micro-label for grouping a report
// card's own controls ("Period", "Filters") — same convention already used
// for the "Secondary reports" / group headings below, not a new visual system.
function FilterGroupLabel({ children }) {
  return (
    <p className="text-[length:var(--text-micro)] font-bold uppercase tracking-[var(--tracking-wide)] text-[color:var(--text-muted)] mb-2">
      {children}
    </p>
  );
}

// ── Report result content ──────────────────────────────────────────────────────
// A violation's recorder is a faculty member on duty OR an admin who recorded it
// directly. Admin recorders surface as "Admin"; faculty as their name.
function recorderName(faculty) {
  if (!faculty) return '—';
  return faculty.role === 'admin' || faculty.role === 'super_admin' ? 'Admin' : faculty.name;
}

function ReportSection({ id, data, isLoading, isError, refetch }) {
  if (isLoading) return <p className="text-[length:13px] text-[var(--text-muted)]">Loading…</p>;
  if (isError)   return <ErrorBlock onRetry={refetch} />;
  if (!data)     return null;

  switch (id) {
    // Batch 3.2d: aggregate per-faculty comparison table (same category as
    // duty-reassignments' "Duty counts", kept as the allowed scroll table) —
    // no per-event action, no status; left unchanged.
    case 'monthly-attendance': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Dept</Th><Th>Total</Th><Th>Completed</Th><Th>Absent</Th><Th>Late</Th><Th>Auto-out</Th></tr></thead>
        <tbody className="divide-y divide-[var(--divider)]">
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

    // Batch 3.2a (Spec 032): same record-scanning shape as Batch 3.1
    // (student-violations) — one row per attendance event, no actions —
    // reuses the same card pattern rather than the interim scroll table.
    case 'late-arrivals': case 'auto-clockout': return (
      <ResponsiveDataView
        mobile={
          !data.data?.length ? (
            <EmptyState message="No records found." />
          ) : (
            <MobileList>
              {data.data.map((r, i) => (
                <MobileListItem key={r.id} isLast={i === data.data.length - 1}>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <MobileListItemHeader
                      title={r.faculty?.name}
                      subtitle={new Date(r.dutySlot?.duty_date).toLocaleDateString('en-IN')}
                    />
                    <MobileListItemMeta>
                      <span className="capitalize">{r.dutySlot?.session_type}</span> · In: {r.in_time ? new Date(r.in_time).toLocaleTimeString() : '—'}
                    </MobileListItemMeta>
                  </div>
                </MobileListItem>
              ))}
            </MobileList>
          )
        }
        desktop={
          <Table>
            <thead><tr><Th>Faculty</Th><Th>Date</Th><Th>Session</Th><Th>In time</Th></tr></thead>
            <tbody className="divide-y divide-[var(--divider)]">
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
        }
      />
    );

    // Batch 3.2d (Spec 032): per-event attendance record with a status badge —
    // same category as Batch 3.2a's late-arrivals/auto-clockout (which this
    // report is the third member of), so it gets the same card treatment.
    case 'absent-faculty': return (
      <ResponsiveDataView
        mobile={
          !data.data?.length ? (
            <EmptyState message="No records found." />
          ) : (
            <MobileList>
              {data.data.map((s, i) => (
                <MobileListItem
                  key={s.id}
                  title={s.faculty?.name}
                  subtitle={new Date(s.duty_date).toLocaleDateString('en-IN')}
                  status={<Badge status={s.status} />}
                  isLast={i === data.data.length - 1}
                />
              ))}
            </MobileList>
          )
        }
        desktop={
          <Table>
            <thead><tr><Th>Faculty</Th><Th>Date</Th><Th>Status</Th></tr></thead>
            <tbody className="divide-y divide-[var(--divider)]">
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
        }
      />
    );

    // Batch 3.2d: per-event audit log with a free-text reason — same category
    // as Batch 3.2b's reassignment history — card treatment; reason shows in
    // full on mobile (no truncation needed once it can wrap in a card).
    case 'attendance-overrides': return (
      <ResponsiveDataView
        mobile={
          !data.data?.length ? (
            <EmptyState message="No records found." />
          ) : (
            <MobileList>
              {data.data.map((r, i) => (
                <MobileListItem key={r.id} isLast={i === data.data.length - 1}>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <MobileListItemHeader
                      title={r.attendance?.faculty?.name}
                      subtitle={r.attendance?.dutySlot?.duty_date ? new Date(r.attendance.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}
                    />
                    <MobileListItemMeta>
                      By {r.changedBy?.name}{r.override_reason ? ` · ${r.override_reason}` : ''}
                    </MobileListItemMeta>
                  </div>
                </MobileListItem>
              ))}
            </MobileList>
          )
        }
        desktop={
          <Table>
            <thead><tr><Th>Faculty</Th><Th>Date</Th><Th>Overridden by</Th><Th>Reason</Th></tr></thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {!data.data?.length && <EmptyRow cols={4} />}
              {data.data?.map((r) => (
                <tr key={r.id}>
                  <Td>{r.attendance?.faculty?.name}</Td>
                  <Td>{r.attendance?.dutySlot?.duty_date ? new Date(r.attendance.dutySlot.duty_date).toLocaleDateString('en-IN') : '—'}</Td>
                  <Td>{r.changedBy?.name}</Td>
                  <Td className="text-[length:12px] text-[var(--text-muted)] max-w-xs truncate">{r.override_reason}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        }
      />
    );

    // Batch 3.2d: aggregate per-recorder comparison table — allowed scroll
    // table exception, same reasoning as monthly-attendance above.
    case 'faculty-activity': return (
      <Table>
        <thead><tr><Th>Recorded By</Th><Th>Dept</Th><Th>Student Violations</Th><Th>Total Fines (₹)</Th></tr></thead>
        <tbody className="divide-y divide-[var(--divider)]">
          {!data.data?.length && <EmptyRow cols={4} />}
          {data.data?.map((r, i) => (
            <tr key={i}>
              <Td className="font-medium">{recorderName(r.faculty)}</Td>
              <Td>{r.faculty?.department ?? '—'}</Td>
              <Td>{r.violation_count}</Td>
              <Td>₹{Number(r.total_fines).toFixed(2)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    // Batch 3.2d: aggregate per-type comparison table — allowed scroll table
    // exception, same reasoning as monthly-attendance above.
    case 'violation-types': return (
      <Table>
        <thead><tr><Th>Type</Th><Th>Count</Th><Th>Total Fines (₹)</Th></tr></thead>
        <tbody className="divide-y divide-[var(--divider)]">
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

    // Batch 3.2d: per-student record list, same shape as Batch 3.1's
    // student-violations — card treatment. S.No omitted on mobile for the
    // same reason as 3.1 (list position, not report data); fine amount moves
    // to a trailing value instead of a table column. Neither this branch nor
    // flagged-violations below had an EmptyRow/EmptyState guard before this
    // batch (a pre-existing gap in the exact code being touched, not a
    // separate fix) — both got one, matching every other converted report.
    case 'pending-fines': return (
      <>
        <p className="text-[length:13px] font-semibold text-[var(--text-secondary)] mb-3">
          Total outstanding: ₹{data.total_fine_amount} across {data.total} violations
        </p>
        <ResponsiveDataView
          mobile={
            !data.data?.length ? (
              <EmptyState message="No pending fines." />
            ) : (
              <MobileList>
                {data.data.map((v, i) => (
                  <MobileListItem key={v.id} isLast={i === data.data.length - 1}>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <MobileListItemHeader title={v.student?.student_name} subtitle={v.student?.registration_number} />
                      <MobileListItemMeta>{v.student?.course} · {v.violationType?.name}</MobileListItemMeta>
                    </div>
                    <div className="shrink-0">
                      <p className="text-[length:13px] font-semibold text-[var(--text-primary)]">₹{v.fine_amount}</p>
                    </div>
                  </MobileListItem>
                ))}
              </MobileList>
            )
          }
          desktop={
            <Table>
              <thead><tr><Th>S.No</Th><Th>Student</Th><Th>Reg. No.</Th><Th>Course</Th><Th>Type</Th><Th>Fine (₹)</Th></tr></thead>
              <tbody className="divide-y divide-[var(--divider)]">
                {!data.data?.length && <EmptyRow cols={6} message="No pending fines." />}
                {data.data?.map((v, i) => (
                  <tr key={v.id}>
                    <Td>{i + 1}</Td>
                    <Td className="font-medium">{v.student?.student_name}</Td>
                    <Td className="font-mono text-[length:12px]">{v.student?.registration_number}</Td>
                    <Td>{v.student?.course}</Td>
                    <Td>{v.violationType?.name}</Td>
                    <Td className="font-semibold">₹{v.fine_amount}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          }
        />
      </>
    );

    // Batch 3.2d: per-violation record with a resolution status badge — same
    // category as duty-reassignments' history table — card treatment.
    case 'flagged-violations': return (
      <>
        <div className="flex gap-4 mb-3 text-[length:13px]">
          <span className="text-[var(--color-amber-solid)] font-medium">Pending: {data.pending_count}</span>
          <span className="text-[var(--color-emerald-solid)] font-medium">Resolved: {data.resolved_count}</span>
        </div>
        <ResponsiveDataView
          mobile={
            !data.data?.length ? (
              <EmptyState message="No flagged violations." />
            ) : (
              <MobileList>
                {data.data.map((v, i) => (
                  <MobileListItem key={v.id} isLast={i === data.data.length - 1}>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <MobileListItemHeader title={v.student?.student_name} subtitle={v.violationType?.name} />
                      <MobileListItemMeta>
                        By {recorderName(v.faculty)}{v.flag_note ? ` · ${v.flag_note}` : ''}
                      </MobileListItemMeta>
                    </div>
                    <div className="shrink-0">
                      {v.flag_resolved_at ? <Badge status="active" label="Resolved" /> : <Badge status="pending" label="Pending" />}
                    </div>
                  </MobileListItem>
                ))}
              </MobileList>
            )
          }
          desktop={
            <Table>
              <thead><tr><Th>S.No</Th><Th>Student</Th><Th>Recorded By</Th><Th>Type</Th><Th>Flag note</Th><Th>Resolved</Th></tr></thead>
              <tbody className="divide-y divide-[var(--divider)]">
                {!data.data?.length && <EmptyRow cols={6} message="No flagged violations." />}
                {data.data?.map((v, i) => (
                  <tr key={v.id}>
                    <Td>{i + 1}</Td>
                    <Td>{v.student?.student_name}</Td>
                    <Td>{recorderName(v.faculty)}</Td>
                    <Td>{v.violationType?.name}</Td>
                    <Td className="text-[length:12px] text-[var(--text-muted)] max-w-xs truncate">{v.flag_note}</Td>
                    <Td>{v.flag_resolved_at ? <Badge status="active" label="Resolved" /> : <Badge status="pending" label="Pending" />}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          }
        />
      </>
    );

    case 'duty-coverage': return (
      <div className="grid grid-cols-3 gap-3">
        {[['Total slots', data.total], ['Completed', data.completed], ['Absent', data.absent],
          ['Scheduled', data.scheduled], ['Morning', data.morning], ['Afternoon', data.afternoon],
          ['Completion rate', `${data.completion_rate}%`],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface-container-low rounded-xl p-4">
            <p className="text-[length:11px] text-[var(--text-muted)]">{label}</p>
            <p className="text-[length:20px] font-bold text-[var(--text-primary)] mt-1">{value}</p>
          </div>
        ))}
      </div>
    );

    // Batch 3.2d: aggregate per-faculty comparison table — allowed scroll
    // table exception, same reasoning as monthly-attendance above.
    case 'unassigned-faculty': return (
      <Table>
        <thead><tr><Th>Faculty</Th><Th>Picked</Th><Th>Required</Th></tr></thead>
        <tbody className="divide-y divide-[var(--divider)]">
          {!data.data?.length && <EmptyRow cols={3} message="All faculty have picked their slots." />}
          {data.data?.map((f) => (
            <tr key={f.id}>
              <Td className="font-medium">{f.name}</Td>
              <Td>{f.slots_picked}</Td>
              <Td>{f.required}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    // Batch 3.2b (Spec 032): the two tables here get different mobile
    // treatments per the V2 per-schema rule, not one mechanical conversion.
    // Duty counts is a short read-only comparison table (5 columns, one row
    // per active faculty, no actions) — it keeps the existing Table's
    // allowed-scroll-table presentation (Batch 1.3's visible-scrollbar fix)
    // unchanged. Reassignment history is per-event operational data (date,
    // people, a free-text reason, an outcome) meant to be scanned
    // individually — same card treatment as Batches 3.1/3.2a.
    case 'duty-reassignments': return (
      <div className="flex flex-col gap-6">
        {/* Per-faculty duty counts — intentionally left as the scrollable Table (short comparison table exception) */}
        <div>
          <h4 className="text-[length:13px] font-semibold text-[var(--text-secondary)] mb-2">Duty counts</h4>
          <Table>
            <thead><tr><Th>Faculty</Th><Th>Regular</Th><Th>Received</Th><Th>Reassigned away</Th><Th>Final duties</Th></tr></thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {!data.counts?.length && <EmptyRow cols={5} />}
              {data.counts?.map((c) => (
                <tr key={c.faculty_id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.regular}</Td>
                  <Td>{c.received}</Td>
                  <Td>{c.away}</Td>
                  <Td className="font-semibold">{c.final}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* Reassignment history */}
        <div>
          <h4 className="text-[length:13px] font-semibold text-[var(--text-secondary)] mb-2">Reassignment history</h4>
          <ResponsiveDataView
            mobile={
              !data.history?.length ? (
                <EmptyState message="No reassignments this month." />
              ) : (
                <MobileList>
                  {data.history.map((r, i) => (
                    <MobileListItem key={r.id} isLast={i === data.history.length - 1}>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <MobileListItemHeader
                          title={new Date(r.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          subtitle={<span className="capitalize">{r.session_type}</span>}
                        />
                        <MobileListItemMeta>{r.from_faculty?.name} → {r.to_faculty?.name}</MobileListItemMeta>
                        <MobileListItemMeta>
                          By {r.reassigned_by?.name} · <span className="capitalize">{r.final_attendance?.replace('_', ' ')}</span>
                          {r.reason ? <> · {r.reason}</> : null}
                        </MobileListItemMeta>
                      </div>
                    </MobileListItem>
                  ))}
                </MobileList>
              )
            }
            desktop={
              <Table>
                <thead><tr><Th>Date</Th><Th>Session</Th><Th>From</Th><Th>To</Th><Th>Reason</Th><Th>By</Th><Th>Attendance</Th></tr></thead>
                <tbody className="divide-y divide-[var(--divider)]">
                  {!data.history?.length && <EmptyRow cols={7} message="No reassignments this month." />}
                  {data.history?.map((r) => (
                    <tr key={r.id}>
                      <Td className="font-medium">{new Date(r.duty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Td>
                      <Td className="capitalize">{r.session_type}</Td>
                      <Td>{r.from_faculty?.name}</Td>
                      <Td>{r.to_faculty?.name}</Td>
                      <Td className="text-[length:12px] text-[var(--text-muted)]">{r.reason ?? '—'}</Td>
                      <Td>{r.reassigned_by?.name}</Td>
                      <Td className="capitalize">{r.final_attendance?.replace('_', ' ')}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            }
          />
        </div>
      </div>
    );

    // Batch 3.2d: trend-over-time comparison table (~6 rows, one per month)
    // — allowed scroll table exception, same reasoning as monthly-attendance
    // above.
    case 'completion-rate': return (
      <Table>
        <thead><tr><Th>Month</Th><Th>Total slots</Th><Th>Completed</Th><Th>Rate</Th></tr></thead>
        <tbody className="divide-y divide-[var(--divider)]">
          {data.data?.map((r) => (
            <tr key={`${r.year}-${r.month}`}>
              <Td className="font-medium">{MONTHS[r.month - 1]} {r.year}</Td>
              <Td>{r.total}</Td>
              <Td>{r.completed}</Td>
              <Td>
                <span className={`font-semibold ${parseFloat(r.rate) >= 80 ? 'text-[var(--color-emerald-solid)]' : 'text-[var(--color-red-solid)]'}`}>
                  {r.rate}%
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );

    // Batch 3.2d: per-upload event log — same category as duty-reassignments'
    // history and upload-history's own 7-column shape mirrors it — card
    // treatment.
    case 'upload-history': return (
      <ResponsiveDataView
        mobile={
          !data.data?.length ? (
            <EmptyState message="No records found." />
          ) : (
            <MobileList>
              {data.data.map((log, i) => (
                <MobileListItem key={log.id} isLast={i === data.data.length - 1}>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <MobileListItemHeader
                      title={log.filename}
                      subtitle={new Date(log.uploaded_at).toLocaleDateString('en-IN')}
                    />
                    <MobileListItemMeta>By {log.uploader?.name}</MobileListItemMeta>
                    <MobileListItemMeta>
                      Added {log.added_count} · Updated {log.updated_count} · Deactivated {log.deactivated_count} · Errors {Array.isArray(log.errors) ? log.errors.length : 0}
                    </MobileListItemMeta>
                  </div>
                </MobileListItem>
              ))}
            </MobileList>
          )
        }
        desktop={
          <Table>
            <thead><tr><Th>Filename</Th><Th>Uploaded by</Th><Th>Added</Th><Th>Updated</Th><Th>Deactivated</Th><Th>Errors</Th><Th>Date</Th></tr></thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {!data.data?.length && <EmptyRow cols={7} />}
              {data.data?.map((log) => (
                <tr key={log.id}>
                  <Td className="font-mono text-[length:12px]">{log.filename}</Td>
                  <Td>{log.uploader?.name}</Td>
                  <Td>{log.added_count}</Td><Td>{log.updated_count}</Td><Td>{log.deactivated_count}</Td>
                  <Td>{Array.isArray(log.errors) ? log.errors.length : 0}</Td>
                  <Td className="text-[length:12px]">{new Date(log.uploaded_at).toLocaleDateString('en-IN')}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        }
      />
    );

    case 'active-students': return (
      <>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(data.breakdown ?? {}).map(([key, count]) => (
            <span key={key} className="bg-[var(--color-blue-50)] text-[var(--brand)] text-[length:12px] px-3 py-1 rounded-full">
              {key}: {count}
            </span>
          ))}
        </div>
        <p className="text-[length:13px] text-[var(--text-muted)]">Total: <strong>{data.total}</strong> active students</p>
      </>
    );

    // Batch 3.1 (Spec 032, V2 §6/§11): below md (768px) this report is a
    // card list, not a horizontally-scrolled table — the record-scanning
    // shape ("must be scanned/acted on individually") the V2 table rule
    // calls out, not the short-reference-table exception. Desktop table is
    // unchanged. S.No is intentionally omitted on mobile: it is the row's
    // position, not report data, and list order already conveys it.
    case 'student-violations': return (
      <ResponsiveDataView
        mobile={
          !data.data?.length ? (
            <EmptyState message="No records found." />
          ) : (
            <MobileList>
              {data.data.map((v, i) => (
                <MobileListItem key={v.id} isLast={i === data.data.length - 1}>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <MobileListItemHeader
                      title={v.student?.student_name}
                      subtitle={v.student?.registration_number}
                    />
                    <MobileListItemMeta>
                      {v.violationType?.name} · {recorderName(v.faculty)} · {new Date(v.created_at).toLocaleDateString('en-IN')}
                    </MobileListItemMeta>
                  </div>
                </MobileListItem>
              ))}
            </MobileList>
          )
        }
        desktop={
          <Table>
            <thead><tr><Th>S.No</Th><Th>Student</Th><Th>Reg. No.</Th><Th>Type</Th><Th>Recorded By</Th><Th>Date</Th></tr></thead>
            <tbody className="divide-y divide-[var(--divider)]">
              {!data.data?.length && <EmptyRow cols={6} />}
              {data.data?.map((v, i) => (
                <tr key={v.id}>
                  <Td>{i + 1}</Td>
                  <Td className="font-medium">{v.student?.student_name}</Td>
                  <Td className="font-mono text-[length:12px]">{v.student?.registration_number}</Td>
                  <Td>{v.violationType?.name}</Td>
                  <Td>{recorderName(v.faculty)}</Td>
                  <Td className="text-[length:12px]">{new Date(v.created_at).toLocaleDateString('en-IN')}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        }
      />
    );

    default: return <pre className="text-[length:12px] text-[var(--text-muted)] overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ── Student Monthly Violation Report — the primary report (Monthly / Yearly / Overall + Excel export) ──
// text-[length:16px] keeps mobile Safari from zooming when a control is focused.
// min-h enforces the 44px touch-target floor (030-D-04 / DS-14 measured this at 37-40px).
const selectCls = 'border border-[var(--border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand)] bg-[var(--surface-card)] text-[var(--text-secondary)] text-[length:16px] min-h-[var(--control-min)]';

function StudentViolationReportCard() {
  const toast = useToast();
  const now = new Date();
  const [mode, setMode]   = useState('monthly'); // 'monthly' | 'yearly' | 'overall' | 'daily' | 'weekly'
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dailyDate, setDailyDate] = useState(now.toISOString().split('T')[0]);
  const [weeklyFromDate, setWeeklyFromDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().split('T')[0]);
  const [weeklyToDate, setWeeklyToDate] = useState(now.toISOString().split('T')[0]);
  const [downloading, setDownloading] = useState(false);

  // ── Filters (Course / Academic Year / Violation Type / Faculty) ──────────
  const { data: filterOptions } = useAnalyticsFilterOptions();
  const { data: facultyData }   = useUsers({ role: 'faculty', status: 'active' });
  const [course, setCourse]                 = useState('');
  const [studentYear, setStudentYear]       = useState('');
  const [violationTypeId, setViolationTypeId] = useState('');
  const [facultyId, setFacultyId]           = useState('');
  const [session, setSession]               = useState(''); // '' = Full Day | 'morning' | 'afternoon'

  const filterParams = {
    ...(course && { course }),
    ...(studentYear && { student_year: studentYear }),
    ...(violationTypeId && { violation_type_id: violationTypeId }),
    // "admin" is the Admin recorder bucket; any other value is a specific faculty id.
    ...(facultyId === 'admin' ? { recorded_by: 'admin' } : facultyId ? { faculty_id: facultyId } : {}),
    // Admin ad-hoc violations have no duty slot/session — they only ever show
    // under Full Day (session omitted), never under Morning or Afternoon.
    ...(session && { session }),
  };

  const params = { ...(mode === 'monthly' ? { year, month } : mode === 'yearly' ? { year } : {}), ...filterParams };
  const { data, isLoading, isError, refetch } = useStudentViolations(params);
  const { data: dailyData, isLoading: dailyLoading, isError: dailyError, refetch: refetchDaily } = useDailyViolationReport(mode === 'daily' ? dailyDate : null, filterParams);
  const { data: weeklyData, isLoading: weeklyLoading, isError: weeklyError, refetch: refetchWeekly } = useWeeklyViolationReport(mode === 'weekly' ? weeklyFromDate : null, mode === 'weekly' ? weeklyToDate : null, filterParams);

  async function handleDownload(format = 'xlsx') {
    setDownloading(true);
    try {
      const variant = format === 'pdf' ? 'pdf' : 'export';
      let endpoint;
      let downloadParams;
      let filename = '';

      if (mode === 'daily') {
        endpoint = `/reports/student-violations/daily/${dailyDate}/${variant}`;
        downloadParams = filterParams;
        filename = `student-violations-daily-${dailyDate}`;
      } else if (mode === 'weekly') {
        endpoint = `/reports/student-violations/weekly/${variant}`;
        downloadParams = { from_date: weeklyFromDate, to_date: weeklyToDate, ...filterParams };
        filename = `student-violations-weekly-${weeklyFromDate}-to-${weeklyToDate}`;
      } else {
        endpoint = `/reports/student-violations/${variant}`;
        downloadParams = params;
        const suffix = mode === 'monthly' ? `${year}-${String(month).padStart(2, '0')}` : mode === 'yearly' ? String(year) : 'all-time';
        filename = `student-violations-${suffix}`;
      }

      await downloadReportFile({ endpoint, params: downloadParams, filename, format });
    } catch {
      toast({ message: 'Could not download report.', type: 'error' });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-[var(--surface-card)] border-2 border-[var(--brand)] rounded-2xl p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="text-[length:var(--text-micro)] font-bold uppercase tracking-[var(--tracking-wide)] text-[var(--brand)] mb-1">Main report</p>
          <h2 className="text-[length:16px] font-bold text-[var(--text-primary)]">Student Violation Report</h2>
          <p className="text-[length:13px] text-[var(--text-muted)] mt-0.5">All recorded student violations — daily, weekly, monthly, yearly, or overall</p>
        </div>
        <div className="shrink-0 flex gap-2">
          <AppButton
            variant="primary"
            onClick={() => handleDownload('xlsx')}
            disabled={downloading || ((mode === 'monthly' || mode === 'yearly' || mode === 'overall') && isLoading) || (mode === 'daily' && !dailyData?.data?.length) || (mode === 'weekly' && !weeklyData?.data?.length) || (mode !== 'daily' && mode !== 'weekly' && !data?.data?.length)}
          >
            {downloading ? 'Preparing…' : '⬇ Excel'}
          </AppButton>
          <AppButton
            variant="secondary"
            onClick={() => handleDownload('pdf')}
            disabled={downloading || ((mode === 'monthly' || mode === 'yearly' || mode === 'overall') && isLoading) || (mode === 'daily' && !dailyData?.data?.length) || (mode === 'weekly' && !weeklyData?.data?.length) || (mode !== 'daily' && mode !== 'weekly' && !data?.data?.length)}
          >
            {downloading ? 'Preparing…' : '⬇ PDF'}
          </AppButton>
        </div>
      </div>

      {/* Batch 5.2 (Spec 032, Milestone 5): "Period" and "Filters" are now two
          labeled groups instead of three anonymous stacked control rows — the
          DS-18 "control wall" finding. Same micro-label convention as the
          "Secondary reports"/group headings below; no new visual system,
          no filter logic change. */}
      <div className="mb-5">
        <FilterGroupLabel>Period</FilterGroupLabel>
        <div className="flex gap-2 mb-3 flex-wrap">
          {[['monthly', 'Monthly'], ['yearly', 'Yearly'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['overall', 'Overall']].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`min-h-[var(--control-min)] px-3.5 py-1.5 rounded-lg text-[length:13px] font-semibold transition-colors cursor-pointer border ${
                mode === m
                  ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                  : 'bg-[var(--surface-page)] text-[var(--text-secondary)] border-[var(--border)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode !== 'overall' && (
          <div className="flex gap-2 flex-wrap">
            {(mode === 'monthly' || mode === 'yearly') && (
              <>
                <select id="svr-year" name="year" aria-label="Year" value={year} onChange={(e) => setYear(+e.target.value)} className={selectCls}>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y}>{y}</option>)}
                </select>
                {mode === 'monthly' && (
                  <select id="svr-month" name="month" aria-label="Month" value={month} onChange={(e) => setMonth(+e.target.value)} className={selectCls}>
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                )}
              </>
            )}
            {mode === 'daily' && (
              <input
                id="svr-daily-date"
                name="dailyDate"
                aria-label="Date"
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className={selectCls}
              />
            )}
            {mode === 'weekly' && (
              <>
                <input
                  id="svr-weekly-from"
                  name="weeklyFrom"
                  aria-label="From date"
                  type="date"
                  value={weeklyFromDate}
                  onChange={(e) => setWeeklyFromDate(e.target.value)}
                  className={selectCls}
                  placeholder="From"
                />
                <input
                  id="svr-weekly-to"
                  name="weeklyTo"
                  aria-label="To date"
                  type="date"
                  value={weeklyToDate}
                  onChange={(e) => setWeeklyToDate(e.target.value)}
                  className={selectCls}
                  placeholder="To"
                />
              </>
            )}
          </div>
        )}
      </div>

      <div className="mb-5">
        <FilterGroupLabel>Filters</FilterGroupLabel>
        <div className="flex gap-2 flex-wrap">
        <select id="svr-course" name="course" aria-label="Course" value={course} onChange={(e) => setCourse(e.target.value)} className={selectCls}>
          <option value="">All Courses</option>
          {(filterOptions?.courses ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select id="svr-student-year" name="studentYear" aria-label="Student year" value={studentYear} onChange={(e) => setStudentYear(e.target.value)} className={selectCls}>
          <option value="">All Years</option>
          {(filterOptions?.years ?? []).map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select id="svr-violation-type" name="violationType" aria-label="Violation type" value={violationTypeId} onChange={(e) => setViolationTypeId(e.target.value)} className={selectCls}>
          <option value="">All Violation Types</option>
          {(filterOptions?.violation_types ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select id="svr-recorder" name="recorder" aria-label="Recorder" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className={selectCls}>
          <option value="">All Recorders</option>
          <option value="admin">Admin</option>
          {(facultyData?.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select id="svr-session" name="session" aria-label="Session" value={session} onChange={(e) => setSession(e.target.value)} className={selectCls}>
          <option value="">Full Day</option>
          <option value="morning">Morning Session</option>
          <option value="afternoon">Afternoon Session</option>
        </select>
        </div>
      </div>

      {!isLoading && data && mode !== 'daily' && mode !== 'weekly' && (
        <p className="text-[length:12px] text-[var(--text-muted)] mb-3">
          Showing {data.shown ?? data.data?.length ?? 0} of {data.total ?? 0} student violation{(data.total ?? 0) === 1 ? '' : 's'}
        </p>
      )}

      {!dailyLoading && dailyData && mode === 'daily' && (
        <p className="text-[length:12px] text-[var(--text-muted)] mb-3">
          {dailyData.data?.length ?? 0} violation{(dailyData.data?.length ?? 0) === 1 ? '' : 's'} on {new Date(dailyDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      {!weeklyLoading && weeklyData && mode === 'weekly' && (
        <p className="text-[length:12px] text-[var(--text-muted)] mb-3">
          {weeklyData.data?.length ?? 0} violation{(weeklyData.data?.length ?? 0) === 1 ? '' : 's'} from {new Date(weeklyFromDate).toLocaleDateString('en-IN')} to {new Date(weeklyToDate).toLocaleDateString('en-IN')}
        </p>
      )}

      {mode === 'daily' && <ReportSection id="student-violations" data={dailyData} isLoading={dailyLoading} isError={dailyError} refetch={refetchDaily} />}
      {mode === 'weekly' && <ReportSection id="student-violations" data={weeklyData} isLoading={weeklyLoading} isError={weeklyError} refetch={refetchWeekly} />}
      {mode !== 'daily' && mode !== 'weekly' && <ReportSection id="student-violations" data={data} isLoading={isLoading} isError={isError} refetch={refetch} />}
    </div>
  );
}

// ── Individual Student Violation Report — full violation history for one student ──
// Reuses the same /reports/student-violations endpoints as the main card, scoped
// to a single student_id (studentViolationWhere already supports it), so PDF/Excel
// exports carry the identical no-Fine column set.
function IndividualStudentReportCard() {
  const toast = useToast();
  const now = new Date();
  const [student, setStudent] = useState(null); // { id, student_name, registration_number, course, academic_year }
  const [query, setQuery]     = useState('');
  const [mode, setMode]       = useState('overall');
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [dailyDate, setDailyDate] = useState(now.toISOString().split('T')[0]);
  const [weeklyFromDate, setWeeklyFromDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().split('T')[0]);
  const [weeklyToDate, setWeeklyToDate] = useState(now.toISOString().split('T')[0]);
  const [downloading, setDownloading] = useState(false);

  const { data: searchData, isLoading: searching } = useStudentSearch(query);
  const results = searchData?.data ?? [];

  // Every query below is gated on a selected student so we never fetch all-students data.
  const sid = student?.id ?? null;
  const filterParams = sid ? { student_id: sid } : {};
  const params = { ...(mode === 'monthly' ? { year, month } : mode === 'yearly' ? { year } : {}), ...filterParams };

  // Gate the fetch on a selected student so we never pull the all-students report.
  const { data, isLoading, isError, refetch } =
    useStudentViolations(params, { enabled: !!sid && mode !== 'daily' && mode !== 'weekly' });
  const { data: dailyData, isLoading: dailyLoading, isError: dailyError, refetch: refetchDaily } =
    useDailyViolationReport(sid && mode === 'daily' ? dailyDate : null, filterParams);
  const { data: weeklyData, isLoading: weeklyLoading, isError: weeklyError, refetch: refetchWeekly } =
    useWeeklyViolationReport(sid && mode === 'weekly' ? weeklyFromDate : null, sid && mode === 'weekly' ? weeklyToDate : null, filterParams);

  async function handleDownload(format = 'xlsx') {
    if (!student) return;
    setDownloading(true);
    try {
      const variant = format === 'pdf' ? 'pdf' : 'export';
      let endpoint, downloadParams, filename;
      const reg = student.registration_number;

      if (mode === 'daily') {
        endpoint = `/reports/student-violations/daily/${dailyDate}/${variant}`;
        downloadParams = filterParams;
        filename = `student-${reg}-daily-${dailyDate}`;
      } else if (mode === 'weekly') {
        endpoint = `/reports/student-violations/weekly/${variant}`;
        downloadParams = { from_date: weeklyFromDate, to_date: weeklyToDate, ...filterParams };
        filename = `student-${reg}-weekly-${weeklyFromDate}-to-${weeklyToDate}`;
      } else {
        endpoint = `/reports/student-violations/${variant}`;
        downloadParams = params;
        const suffix = mode === 'monthly' ? `${year}-${String(month).padStart(2, '0')}` : mode === 'yearly' ? String(year) : 'all-time';
        filename = `student-${reg}-${suffix}`;
      }

      await downloadReportFile({ endpoint, params: downloadParams, filename, format });
    } catch {
      toast({ message: 'Could not download report.', type: 'error' });
    } finally {
      setDownloading(false);
    }
  }

  const hasRows =
    mode === 'daily'  ? !!dailyData?.data?.length :
    mode === 'weekly' ? !!weeklyData?.data?.length :
    !!data?.data?.length;
  const busy =
    mode === 'daily'  ? dailyLoading :
    mode === 'weekly' ? weeklyLoading :
    isLoading;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="text-[length:var(--text-micro)] font-bold uppercase tracking-[var(--tracking-wide)] text-[var(--text-muted)] mb-1">By student</p>
          <h2 className="text-[length:16px] font-bold text-[var(--text-primary)]">Individual Student Violation Report</h2>
          <p className="text-[length:13px] text-[var(--text-muted)] mt-0.5">Complete violation history for one student — for counselling, parent meetings, and reviews</p>
        </div>
        <div className="shrink-0 flex gap-2">
          <AppButton
            variant="primary"
            onClick={() => handleDownload('xlsx')}
            disabled={!student || downloading || busy || !hasRows}
          >
            {downloading ? 'Preparing…' : '⬇ Excel'}
          </AppButton>
          <AppButton
            variant="secondary"
            onClick={() => handleDownload('pdf')}
            disabled={!student || downloading || busy || !hasRows}
          >
            {downloading ? 'Preparing…' : '⬇ PDF'}
          </AppButton>
        </div>
      </div>

      {/* Student search-and-pick */}
      {!student ? (
        <div className="relative mb-5 max-w-md">
          <input
            id="isvr-student-search"
            name="studentSearch"
            aria-label="Search student by name or registration number"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student by name or registration number…"
            className={`${selectCls} w-full`}
          />
          {query.trim().length >= 2 && (
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-card)] shadow-[var(--shadow-dropdown)]">
              {searching && <p className="px-3 py-2 text-[length:13px] text-[var(--text-muted)]">Searching…</p>}
              {!searching && !results.length && <p className="px-3 py-2 text-[length:13px] text-[var(--text-muted)]">No students found.</p>}
              {results.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setStudent(s); setQuery(''); }}
                  className="block w-full text-left px-3 py-2 hover:bg-[var(--surface-page)] border-b border-[var(--divider)] last:border-b-0"
                >
                  <span className="text-[length:13px] font-medium text-[var(--text-primary)]">{s.student_name}</span>
                  <span className="text-[length:12px] text-[var(--text-muted)] ml-2">{s.registration_number} · {s.course}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="rounded-lg border border-[var(--brand)] bg-[var(--color-blue-50)] px-3 py-2">
            <span className="text-[length:13px] font-semibold text-[var(--text-primary)]">{student.student_name}</span>
            <span className="text-[length:12px] text-[var(--text-muted)] ml-2">{student.registration_number} · {student.course}{student.academic_year ? ` · ${student.academic_year}` : ''}</span>
          </div>
          <button
            type="button"
            onClick={() => { setStudent(null); setQuery(''); }}
            className="text-[length:13px] font-semibold text-[var(--brand)] cursor-pointer bg-transparent border-none"
          >
            Change student
          </button>
        </div>
      )}

      {student && (
        <>
          {/* Batch 5.2: same "Period" grouping as the main report card above. */}
          <div className="mb-5">
            <FilterGroupLabel>Period</FilterGroupLabel>
            <div className="flex gap-2 mb-3 flex-wrap">
              {[['monthly', 'Monthly'], ['yearly', 'Yearly'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['overall', 'Overall History']].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`min-h-[var(--control-min)] px-3.5 py-1.5 rounded-lg text-[length:13px] font-semibold transition-colors cursor-pointer border ${
                    mode === m
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                      : 'bg-[var(--surface-page)] text-[var(--text-secondary)] border-[var(--border)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode !== 'overall' && (
              <div className="flex gap-2 flex-wrap">
                {(mode === 'monthly' || mode === 'yearly') && (
                  <>
                    <select id="isvr-year" name="year" aria-label="Year" value={year} onChange={(e) => setYear(+e.target.value)} className={selectCls}>
                      {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y}>{y}</option>)}
                    </select>
                    {mode === 'monthly' && (
                      <select id="isvr-month" name="month" aria-label="Month" value={month} onChange={(e) => setMonth(+e.target.value)} className={selectCls}>
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                      </select>
                    )}
                  </>
                )}
                {mode === 'daily' && (
                  <input id="isvr-daily-date" name="dailyDate" aria-label="Date" type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className={selectCls} />
                )}
                {mode === 'weekly' && (
                  <>
                    <input id="isvr-weekly-from" name="weeklyFrom" aria-label="From date" type="date" value={weeklyFromDate} onChange={(e) => setWeeklyFromDate(e.target.value)} className={selectCls} />
                    <input id="isvr-weekly-to" name="weeklyTo" aria-label="To date" type="date" value={weeklyToDate} onChange={(e) => setWeeklyToDate(e.target.value)} className={selectCls} />
                  </>
                )}
              </div>
            )}
          </div>

          {mode === 'daily'  && <ReportSection id="student-violations" data={dailyData}  isLoading={dailyLoading}  isError={dailyError}  refetch={refetchDaily} />}
          {mode === 'weekly' && <ReportSection id="student-violations" data={weeklyData} isLoading={weeklyLoading} isError={weeklyError} refetch={refetchWeekly} />}
          {mode !== 'daily' && mode !== 'weekly' && <ReportSection id="student-violations" data={data} isLoading={isLoading} isError={isError} refetch={refetch} />}
        </>
      )}
    </div>
  );
}

// ── Report view (runs the hook for selected report) ────────────────────────────
const NO_MONTH = ['pending-fines','flagged-violations','upload-history','active-students','completion-rate'];

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
    'duty-reassignments':   useDutyReassignmentReport,
    'completion-rate':      useCompletionRate,
    'upload-history':       useUploadHistory,
    'active-students':      useActiveStudents,
  };
  const useHook = hookMap[id] ?? useFlaggedViolations;
  const { data, isLoading, isError, refetch } = useHook(params);

  return (
    <div>
      {needsMonth && <MonthFilter year={year} month={month} setYear={setYear} setMonth={setMonth} />}
      <ReportSection id={id} data={data} isLoading={isLoading} isError={isError} refetch={refetch} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage({ user }) {
  const [active, setActive] = useState(null);
  const isMobile = useMediaQuery('(max-width: 639px)');

  const activeReport = REPORTS.find((r) => r.id === active);

  const reportContent = active && (
    <div className="p-5">
      <ReportView key={active} id={active} />
    </div>
  );

  return (
    <Layout user={user}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]} />
      <PageHeader title="Reports" subtitle="2 primary reports + 15 secondary reports" />

      <StudentViolationReportCard />
      <IndividualStudentReportCard />

      <p className="text-[length:var(--text-micro)] font-bold uppercase tracking-[var(--tracking-wide)] text-[color:var(--text-muted)] mb-3">
        Secondary reports
      </p>

      {/* Batch 5.1 (Spec 032, Milestone 5): grouped operational index, not an
          icon-card catalogue — one bordered list per family, text-first rows
          with a divider between entries (same list-with-row-separators
          language as e.g. Students' mobile list), selection shown via the
          same left-accent-bar + tint treatment as the sidebar's active nav
          item (Layout.module.css .navItemActive), not a per-report colour. */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {REPORT_GROUPS.map((group) => (
          <div key={group} className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden self-start">
            <p className="text-[length:var(--text-micro)] font-bold uppercase tracking-[var(--tracking-wide)] text-[color:var(--text-muted)] px-4 pt-3 pb-2">
              {group}
            </p>
            <div className="divide-y divide-[var(--divider)]">
              {REPORTS.filter((r) => r.group === group).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActive(active === r.id ? null : r.id)}
                  aria-pressed={active === r.id}
                  className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 border-l-[3px] transition-colors ${
                    active === r.id
                      ? 'border-l-[var(--brand)] bg-[var(--color-blue-50)]'
                      : 'border-l-transparent hover:bg-[var(--surface-page)]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`block text-[length:13px] font-semibold leading-snug ${active === r.id ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>
                      {r.label}
                    </span>
                    <span className="block text-[length:var(--text-micro)] text-[color:var(--text-muted)] mt-0.5 leading-snug">
                      {r.desc}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: ResponsiveSheet for report results */}
      {isMobile && (
        <ResponsiveSheet
          open={!!active}
          onClose={() => setActive(null)}
          title={activeReport?.label ?? ''}
          subtitle={activeReport?.desc}
        >
          {reportContent}
        </ResponsiveSheet>
      )}

      {/* Desktop: inline result panel */}
      {!isMobile && active && (
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-5">
          {/* h2 stays a direct child of this flex row (not wrapped further) —
              e2e/reports-*.spec.js locate this panel via
              `getByRole('heading', ...).locator('..').locator('..')`, i.e.
              exactly two levels up from the heading; an added wrapper here
              would retarget "panel" to this row instead of the card below. */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[length:14px] font-semibold text-[var(--text-primary)]">
              {activeReport?.label}
            </h2>
            <button
              onClick={() => setActive(null)}
              aria-label="Close report"
              className="w-9 h-9 shrink-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-page)] flex items-center justify-center cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <IconX size={16} stroke={2} />
            </button>
          </div>
          <ReportView key={active} id={active} />
        </div>
      )}
    </Layout>
  );
}
