import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { APP_SHORT_NAME } from '../../utils/branding';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import { Button } from '@mantine/core';
import { useMonthSlots, useReassignedAway } from '../../hooks/useDutySlots';
import { useMyViolations } from '../../hooks/useViolations';
import { useInbox } from '../../hooks/useMessages';
import { useMyAttendanceSummary, useCheckIn, useCheckOut } from '../../hooks/useAttendance';
import { useDutyTimingSettings } from '../../hooks/useDutyTimingSettings';
import { useSentReassignmentRequests, useCancelReassignmentRequest } from '../../hooks/useDutyReassignmentRequests';
import { formatHourMin, getGreeting } from '../../utils/time';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import RecordViolationModal from '../../components/faculty/RecordViolationModal';
import MyViolationsSummary from '../../components/faculty/MyViolationsSummary';
import RequestReassignmentModal from '../../components/faculty/RequestReassignmentModal';
import PendingReassignmentRequests from '../../components/faculty/PendingReassignmentRequests';
import { ROUTES } from '../../utils/constants';
import { IconRefresh } from '@tabler/icons-react';

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// Tonal icon-tile tints per activity category (M3 category-color language).
const ACTIVITY_TINT = {
  red:    'var(--color-red-bg)',
  blue:   'var(--color-blue-50)',
  indigo: 'var(--color-indigo-bg)',
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// One hero card for a single duty session today. Each of a faculty member's
// today sessions (morning / afternoon) renders its own independent card with
// its own check-in / check-out controls (P29).
function TodaySessionCard({ session, timingSettings, checkInPending, checkOutPending, onCheckIn, onCheckOut }) {
  const startLabel = timingSettings
    ? formatHourMin(
        timingSettings[`session_start_${session.session_type}_hour`],
        timingSettings[`session_start_${session.session_type}_min`],
      )
    : (session.session_type === 'morning' ? '8:00 AM' : '1:00 PM');

  return (
    <div
      className="rounded-[var(--radius-3xl)] p-5 relative overflow-hidden"
      style={{
        background: 'var(--brand-gradient-deep)',
        boxShadow: '0 8px 24px -8px rgba(37,99,235,0.45)',
      }}>
      <div className="absolute -top-10 -right-[30px] w-[140px] h-[140px] rounded-[var(--radius-full)] bg-[rgba(255,255,255,0.12)]" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[length:var(--text-micro)] font-[var(--weight-bold)] text-[rgba(255,255,255,0.7)] uppercase tracking-[var(--tracking-wide)] mb-1.5">
              📋 Today's duty
            </p>
            <p className="text-[length:var(--text-h2)] font-[var(--weight-extra)] text-[var(--text-on-dark)] leading-[1.1] capitalize">
              {session.session_type} session
            </p>
            <p className="text-[length:var(--text-small)] text-[rgba(255,255,255,0.75)] mt-1">
              Starts {startLabel}
            </p>
          </div>
          {/* Driven by the live-computed attendance_status, not the raw
              slot_status column — slot_status is set once by the absent
              cron job and stays frozen until a check-in happens, so it can
              disagree with the currently-configured Duty Timing Settings
              window (see attendance-status.service.js). */}
          <Badge status={session.attendance_status} />
        </div>

        {session.in_time && session.out_time ? (
          <p className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[var(--text-on-dark)]">
            ✓ Checked in {new Date(session.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            {' · '}out {new Date(session.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : session.in_time ? (
          <>
            <p className="text-[length:var(--text-small)] text-[rgba(255,255,255,0.85)] mb-2">
              ● Checked in {new Date(session.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <Button size="md" color="dark" fullWidth loading={checkOutPending}
              onClick={() => onCheckOut(session.slot_id)}
              style={{ background: 'var(--surface-card)', color: 'var(--brand)', fontWeight: 700 }}>
              Check Out
            </Button>
          </>
        ) : session.attendance_status === 'absent' ? (
          <p className="text-[length:var(--text-small)] text-[rgba(255,255,255,0.85)]">
            ● Marked absent — the check-in window for this session has closed.
          </p>
        ) : (
          <>
            <p className="text-[length:var(--text-small)] text-[rgba(255,255,255,0.7)] mb-2">
              ● Not checked in
            </p>
            <Button size="md" color="dark" fullWidth loading={checkInPending}
              onClick={() => onCheckIn(session.slot_id)}
              style={{ background: 'var(--surface-card)', color: 'var(--brand)', fontWeight: 700 }}>
              Check In
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const toast = useToast();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [showRecordViolation, setShowRecordViolation] = useState(false);
  const [dismissedAlerts, setDismissedAlerts]         = useState(new Set());

  const { data: slotsData, isLoading: slotsLoading, isError: slotsError } = useMonthSlots(year, month);
  const { data: violationsData, isLoading: violationsLoading } = useMyViolations({ limit: 5 });
  const { data: inboxData, isLoading: inboxLoading }            = useInbox({ limit: 5 });
  const { data: reassignedAwayData, isLoading: reassignLoading } = useReassignedAway(year, month);
  const { data: timingSettings } = useDutyTimingSettings();

  const slots    = slotsData?.data ?? [];
  const today    = todayIST();
  const upcoming  = slots.filter((s) => isoDate(s.duty_date) > today).slice(0, 3);

  // Today's attendance comes from the per-session summary endpoint, which returns
  // EVERY session the faculty has today with its own attendance state — a faculty
  // with both a morning and afternoon duty gets two independent cards (P29). The
  // old code used slots.find(), which silently showed only the first session.
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useMyAttendanceSummary(year, month);
  const SESSION_ORDER = { morning: 0, afternoon: 1 };
  const todaySessions = (summary?.today ?? [])
    .slice()
    .sort((a, b) => SESSION_ORDER[a.session_type] - SESSION_ORDER[b.session_type]);

  const checkIn  = useCheckIn();
  const checkOut = useCheckOut();
  const [busySlot, setBusySlot] = useState(null);

  async function handleCheckIn(slotId) {
    setBusySlot(slotId);
    try {
      await checkIn.mutateAsync(slotId);
      toast({ message: `Checked in at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, type: 'success' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Check-in failed.', type: 'error' });
    } finally {
      setBusySlot(null);
    }
  }
  async function handleCheckOut(slotId) {
    setBusySlot(slotId);
    try {
      await checkOut.mutateAsync(slotId);
      toast({ message: `Checked out at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, type: 'success' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Check-out failed.', type: 'error' });
    } finally {
      setBusySlot(null);
    }
  }

  // Minutes until a given session's configured auto clock-out time (per session).
  // Freezing this via useMemo would be wrong — it needs to reflect the actual
  // current time on whatever render happens to run it.
  // eslint-disable-next-line react-hooks/purity
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  function minsUntilSessionEnd(sessionType) {
    const h = timingSettings?.[`auto_checkout_${sessionType}_hour`];
    const m = timingSettings?.[`auto_checkout_${sessionType}_min`];
    if (h == null) return null;
    return (h - nowIST.getUTCHours()) * 60 + ((m ?? 0) - nowIST.getUTCMinutes());
  }
  // A session that is checked-in-not-out and within 15 min of its auto clock-out.
  const clockoutSession = todaySessions.find((s) => {
    if (!s.in_time || s.out_time) return false;
    const mins = minsUntilSessionEnd(s.session_type);
    return mins !== null && mins >= 0 && mins <= 15;
  });
  const autoClockedSession = todaySessions.find((s) => s.auto_out);

  const reassignedAway = reassignedAwayData?.data ?? [];

  // True when this slot was reassigned TO the current faculty (they are the new owner).
  const wasReassignedToMe = (s) => s.reassignments?.[0]?.to_faculty_id === user?.id;

  // "Request reassignment" — opens a dedicated request popup (faculty picks a
  // colleague directly; the colleague must accept before the duty transfers).
  // This replaced the old message-to-admin flow (Admin reassignment remains a
  // separate, always-available method — see duty-slots.controller.js).
  const [reassignReqSlot, setReassignReqSlot] = useState(null);
  const { data: sentRequestsData } = useSentReassignmentRequests();
  const sentRequests = sentRequestsData?.data ?? [];
  const cancelRequest = useCancelReassignmentRequest();

  // Latest sent request (of any status) for a given slot, so the UI can show
  // "requested to X — pending/accepted/declined" on the upcoming-duty row.
  function sentRequestFor(slotId) {
    return sentRequests.find((r) => r.dutySlot.id === slotId);
  }

  // Mirrors the backend guard on PATCH /duty-reassignment-requests/:id/cancel
  // (requester-only, pending-only) so the button only ever appears when the
  // call would actually succeed.
  function canCancel(req) {
    return req?.status === 'pending' && req?.from_faculty_id === user?.id;
  }

  async function handleCancelRequest(id) {
    try {
      await cancelRequest.mutateAsync(id);
      toast({ message: 'Reassignment request cancelled.' });
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Failed to cancel request.', type: 'error' });
    }
  }

  const canDoViolation = todaySessions.some((s) => s.slot_status === 'scheduled');

  // ── Single, priority-ordered, dismissible alert (never stack banners) ──
  const alertCandidates = [
    clockoutSession && {
      key: 'clockout', tone: 'warning', icon: '⏰', title: 'Remember to clock out',
      body: `Your ${clockoutSession.session_type} session ends in ${minsUntilSessionEnd(clockoutSession.session_type)} min. Clock out before auto-out kicks in.`,
    },
    autoClockedSession && {
      key: 'autoclock', tone: 'info', icon: '🔔', title: 'You were auto clocked out',
      body: `The system recorded your ${autoClockedSession.session_type} check-out automatically at session end.`,
    },
  ].filter(Boolean);
  const activeAlert = alertCandidates.find((a) => !dismissedAlerts.has(a.key));

  // ── Next 7 days strip (rolling window from today, not calendar week — duty cadence is sparse) ──
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const iso = isoDate(d);
    return { date: d, iso, isToday: i === 0, slot: slots.find((s) => isoDate(s.duty_date) === iso) };
  });

  // ── Unified recent-activity feed (violations logged, messages, duty reassignments) ──
  const activityLoading = violationsLoading || inboxLoading || reassignLoading;
  const activityItems = [
    ...(violationsData?.data ?? []).map((v) => ({
      id: `v-${v.id}`, icon: '⚠️', accent: 'red', timestamp: v.created_at,
      text: `Student violation recorded — ${v.student?.student_name ?? 'Student'}`,
    })),
    ...(inboxData?.data ?? []).map((m) => ({
      id: `m-${m.id}`, icon: '✉️', accent: 'blue', timestamp: m.created_at, unread: !m.is_read,
      text: `Message: ${m.subject}`,
    })),
    ...reassignedAway.map((r) => ({
      id: `ra-${r.id}`, icon: '🔄', accent: 'indigo', timestamp: r.created_at,
      text: `Duty reassigned to ${r.toFaculty?.name ?? 'another faculty'}`,
      status: 'reassigned',
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);

  return (
    <Layout user={user}>
      {/* ── Header — left-aligned, avatar/notifications live in the shared chrome ── */}
      <div className="mb-5 pb-4 border-b border-[var(--border)]">
        <p className="text-[length:var(--text-h2)] font-[var(--weight-extra)] text-[var(--text-primary)] leading-[1.2]">
          Good {getGreeting()}, {user?.title ? `${user.title} ` : ''}{user?.name}
        </p>
        <p className="text-[length:var(--text-small)] text-[var(--text-muted)] mt-0.5">
          {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* ── 1. Today's duty — hero (one card per session; P29) ── */}
      <section className="mb-4">
        {summaryLoading ? (
          <>
            <Skeleton height="160px" className="rounded-2xl mb-4" />
            <Skeleton height="44px" className="rounded-xl mb-4" />
            <Skeleton height="120px" className="rounded-xl mb-4" />
            <Skeleton height="120px" className="rounded-xl" />
          </>
        ) : summaryError ? (
          <Alert tone="danger" icon="⚠️" title="Couldn't load today's duty"
            action={<Button variant="outline" size="sm" onClick={() => refetchSummary()}>Retry</Button>}>
            Check your connection and try again.
          </Alert>
        ) : todaySessions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {todaySessions.map((s) => (
              <TodaySessionCard
                key={s.slot_id}
                session={s}
                timingSettings={timingSettings}
                checkInPending={checkIn.isPending && busySlot === s.slot_id}
                checkOutPending={checkOut.isPending && busySlot === s.slot_id}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-3xl)] px-[18px] py-5">
            <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-blue-50)] flex items-center justify-center text-2xl shrink-0">
              📅
            </div>
            <div>
              <p className="text-[length:var(--text-card-lg)] font-[var(--weight-bold)] text-[var(--text-primary)]">No duty today</p>
              <p className="text-[length:var(--text-small)] text-[var(--text-muted)] mt-0.5">
                Enjoy your day — check upcoming slots below.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Quick actions ── */}
      {!slotsLoading && !slotsError && canDoViolation && (
        <section className="mb-4 flex gap-2 flex-wrap">
          <Button size="md" variant="light" leftSection={<span>⚠️</span>} onClick={() => setShowRecordViolation(true)}>
            Record Student Violation
          </Button>
        </section>
      )}

      {/* ── 3. One alert at a time, dismissible ── */}
      {activeAlert && (
        <section className="mb-4">
          <Alert tone={activeAlert.tone} icon={activeAlert.icon} title={activeAlert.title}
            action={
              <div className="flex items-center gap-2">
                {activeAlert.action}
                <button
                  onClick={() => setDismissedAlerts((prev) => new Set(prev).add(activeAlert.key))}
                  aria-label="Dismiss"
                  className="bg-transparent border-0 cursor-pointer p-0.5 opacity-60 text-[14px] leading-none">
                  ✕
                </button>
              </div>
            }>
            {activeAlert.body}
          </Alert>
        </section>
      )}

      {/* ── 3b. Zero-state guidance ── */}
      {!todaySessions.length && slots.length === 0 && !slotsLoading && !slotsError && (
        <section className="mb-5">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-xl)] px-5 py-6 text-center">
            <p className="text-[length:var(--text-h2)] font-[var(--weight-bold)] mb-2 text-[var(--text-primary)]">
              Welcome to {APP_SHORT_NAME}
            </p>
            <p className="text-[length:var(--text-card)] text-[var(--text-secondary)] leading-[1.5]">
              You don't have any duty slots assigned yet.
              <br />
              Your admin will open the scheduling window and notify you when it's time to pick your slots.
            </p>
          </div>
        </section>
      )}

      {/* ── 4. Next 7 days — glanceable strip ── */}
      {slots.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[length:var(--text-micro)] font-[var(--weight-bold)] text-[var(--text-secondary)] uppercase tracking-[var(--tracking-wide)]">
              Next 7 days
            </p>
            {/* padding+negative-margin expands the tap area to ≥44px without shifting the label */}
            <button onClick={() => navigate(ROUTES.FACULTY_SLOTS)}
              className="text-[length:var(--text-small)] text-[var(--brand)] bg-transparent border-0 cursor-pointer py-[13px] px-2 -my-[13px] -mx-2 font-[var(--weight-semibold)] font-[var(--font-sans)]">
              All slots →
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {next7Days.map(({ date, iso, isToday, slot }) => (
              <div key={iso}
                className={`flex flex-col items-center justify-center shrink-0 w-14 h-16 rounded-[var(--radius-lg)] border ${
                  isToday ? 'bg-[var(--brand)] border-[var(--brand)]'
                    : slot ? 'bg-[var(--color-blue-50)] border-[var(--color-blue-200)]'
                    : 'bg-[var(--surface-card)] border-[var(--border)]'
                }`}>
                <span className={`text-[length:var(--text-nano)] font-[var(--weight-bold)] uppercase ${isToday ? 'text-[rgba(255,255,255,0.8)]' : 'text-[var(--text-muted)]'}`}>
                  {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
                <span className={`text-[16px] font-[var(--weight-extra)] leading-[1.6] ${isToday ? 'text-[var(--text-on-dark)]' : 'text-[var(--text-primary)]'}`}>
                  {date.getDate()}
                </span>
                <span className={`w-[5px] h-[5px] rounded-full ${slot ? (isToday ? 'bg-[rgba(255,255,255,0.9)]' : 'bg-[var(--brand)]') : 'bg-transparent'}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4b. Incoming reassignment requests — need this faculty's accept/reject ── */}
      <PendingReassignmentRequests />

      {/* ── 5. Upcoming duties (beyond the 7-day strip — duty cadence is sparse) ── */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p className="text-[length:var(--text-micro)] font-[var(--weight-bold)] text-[var(--text-secondary)] uppercase tracking-[var(--tracking-wide)] mb-3">
            Upcoming duties
          </p>
          <div className="flex flex-col gap-2">
            {upcoming.map((s) => {
              const d = new Date(s.duty_date);
              const sentReq = sentRequestFor(s.id);
              const hasPendingRequest = sentReq?.status === 'pending';
              return (
                <div key={s.id} className="relative overflow-hidden bg-[var(--surface-card)] rounded-[var(--radius-xl)] border border-[var(--border)] px-[14px] py-3">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand)]" />
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-[var(--radius-lg)] shrink-0 bg-[var(--color-blue-50)] flex flex-col items-center justify-center">
                      <span className="text-[16px] font-[var(--weight-extra)] text-[var(--color-blue-800)] leading-none">{d.getDate()}</span>
                      <span className="text-[length:var(--text-nano)] font-[var(--weight-bold)] text-[var(--brand)] uppercase">
                        {d.toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[var(--text-primary)] capitalize">{s.session_type} session</p>
                      <p className="text-[length:var(--text-micro)] text-[var(--text-muted)] mt-[1px]">
                        {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                        {wasReassignedToMe(s) && s.reassignments[0].fromFaculty?.name
                          ? ` · reassigned from ${s.reassignments[0].fromFaculty.name}`
                          : ''}
                        {hasPendingRequest ? ` · requested to ${sentReq.toFaculty?.name} — pending` : ''}
                        {sentReq?.status === 'declined' ? ` · ${sentReq.toFaculty?.name} declined` : ''}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {wasReassignedToMe(s) ? <Badge status="reassigned" /> : <Badge status={s.status} />}
                    </div>
                  </div>
                  {/* Request reassignment / cancel — its own row so the button reads as a clear, tappable action */}
                  {canCancel(sentReq) ? (
                    <div className="mt-3 pt-3 border-t border-[var(--divider)] flex justify-end">
                      <Button
                        size="sm"
                        variant="light"
                        color="red"
                        loading={cancelRequest.isPending}
                        onClick={() => handleCancelRequest(sentReq.id)}
                        styles={{ root: { minHeight: 'var(--control-min)', fontWeight: 700 } }}
                      >
                        Cancel request
                      </Button>
                    </div>
                  ) : !hasPendingRequest && (
                    <div className="mt-3 pt-3 border-t border-[var(--divider)] flex justify-end">
                      <Button
                        size="sm"
                        variant="light"
                        color="blue"
                        leftSection={<IconRefresh size={15} stroke={2} />}
                        onClick={() => setReassignReqSlot(s)}
                        styles={{ root: { minHeight: 'var(--control-min)', fontWeight: 700 } }}
                      >
                        Request reassignment
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5b. Reassigned away — duties moved off this faculty by admin ── */}
      {reassignedAway.length > 0 && (
        <div className="mb-4">
          <p className="text-[length:var(--text-micro)] font-[var(--weight-bold)] text-[var(--text-secondary)] uppercase tracking-[var(--tracking-wide)] mb-3">
            Reassigned away
          </p>
          <div className="flex flex-col gap-2">
            {reassignedAway.map((r) => {
              const d = new Date(r.duty_date);
              return (
                <div key={r.id} className="relative overflow-hidden flex items-center gap-3 bg-[var(--surface-card)] rounded-[var(--radius-xl)] border border-[var(--border)] px-[14px] py-3">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-indigo-solid)]" />
                  <div className="w-[42px] h-[42px] rounded-[var(--radius-lg)] shrink-0 bg-[var(--color-indigo-bg)] flex flex-col items-center justify-center">
                    <span className="text-[16px] font-[var(--weight-extra)] text-[var(--color-indigo-text)] leading-none">{d.getDate()}</span>
                    <span className="text-[length:var(--text-nano)] font-[var(--weight-bold)] text-[var(--color-indigo-text)] uppercase">
                      {d.toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[length:var(--text-card)] font-[var(--weight-semibold)] text-[var(--text-primary)] capitalize">
                      {r.session_type} session
                    </p>
                    <p className="text-[length:var(--text-micro)] text-[var(--text-muted)] mt-[1px]">
                      Reassigned to {r.toFaculty?.name ?? '—'}{r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                  <Badge status="reassigned" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5c. My violations — personalized summary + history (P25) ── */}
      <div className="mb-5">
        <MyViolationsSummary />
      </div>

      {/* ── 6. Recent activity — unified feed (violations logged, messages, duty reassignments) ── */}
      <div>
        <p className="text-[length:var(--text-micro)] font-[var(--weight-bold)] text-[var(--text-secondary)] uppercase tracking-[var(--tracking-wide)] mb-3">
          Recent activity
        </p>
        {activityLoading ? (
          <Skeleton height="140px" className="rounded-2xl" />
        ) : !activityItems.length ? (
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-dashed border-[var(--border)] px-4 py-5 text-center">
            <p className="text-[length:var(--text-card)] text-[var(--text-muted)]">No recent activity yet.</p>
          </div>
        ) : (
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] border border-[var(--border)] overflow-hidden">
            {activityItems.map((item, i) => (
              <div key={item.id}
                className={`flex items-center gap-[10px] px-[14px] py-3 ${i < activityItems.length - 1 ? 'border-b border-[var(--divider)]' : ''}`}>
                <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[15px]"
                  style={{ background: ACTIVITY_TINT[item.accent] ?? 'var(--surface-page)' }}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`overflow-hidden text-ellipsis whitespace-nowrap text-[length:var(--text-card)] text-[var(--text-primary)] ${item.unread ? 'font-[var(--weight-semibold)]' : 'font-[var(--weight-medium)]'}`}>
                    {item.text}
                  </p>
                  <p className="text-[length:var(--text-nano)] text-[var(--text-muted)] mt-[1px]">
                    {timeAgo(item.timestamp)}
                  </p>
                </div>
                {item.status && <Badge status={item.status} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <RecordViolationModal open={showRecordViolation} onClose={() => setShowRecordViolation(false)} />
      <RequestReassignmentModal slot={reassignReqSlot} onClose={() => setReassignReqSlot(null)} />
    </Layout>
  );
}
