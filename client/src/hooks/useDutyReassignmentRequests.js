import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

// Faculty-to-faculty reassignment requests (Method 2, separate from the
// admin-controlled reassignment in useDutySlots.js).

const REASSIGNMENT_POLL_INTERVAL = 30_000;

export const reassignmentRequestKeys = {
  all: ['reassignmentRequests'],
  pending: () => [...reassignmentRequestKeys.all, 'pending'],
  sent: () => [...reassignmentRequestKeys.all, 'sent'],
  eligibleFacultyRoot: () => [...reassignmentRequestKeys.all, 'eligibleFaculty'],
  eligibleFaculty: (dutySlotId) => [...reassignmentRequestKeys.eligibleFacultyRoot(), dutySlotId],
};

const getResponseData = (response) => response.data;

async function fetchEligibleFaculty({ dutySlotId, signal }) {
  const response = await api.get(
    `/duty-reassignment-requests/eligible-faculty/${encodeURIComponent(dutySlotId)}`,
    { signal },
  );
  return getResponseData(response);
}

async function fetchPendingRequests({ signal }) {
  const response = await api.get('/duty-reassignment-requests', { signal });
  return getResponseData(response);
}

async function fetchSentRequests({ signal }) {
  const response = await api.get('/duty-reassignment-requests/sent', { signal });
  return getResponseData(response);
}

async function createReassignmentRequest(payload) {
  if (!payload?.duty_slot_id) throw new Error('A duty slot ID is required.');
  if (!payload?.to_faculty_id) throw new Error('A target faculty ID is required.');
  const response = await api.post('/duty-reassignment-requests', payload);
  return getResponseData(response);
}

async function respondToReassignmentRequest({ id, status }) {
  if (!id) throw new Error('A reassignment request ID is required.');
  if (!['approved', 'declined'].includes(status)) {
    throw new Error('Status must be either "approved" or "declined".');
  }
  const response = await api.patch(`/duty-reassignment-requests/${encodeURIComponent(id)}`, { status });
  return getResponseData(response);
}

async function cancelReassignmentRequest(id) {
  if (!id) throw new Error('A reassignment request ID is required.');
  const response = await api.patch(`/duty-reassignment-requests/${encodeURIComponent(id)}/cancel`);
  return getResponseData(response);
}

function shouldRetryRequest(failureCount, error) {
  if (failureCount >= 1) return false;
  const status = error?.response?.status;
  return !(status && status >= 400 && status < 500);
}

function removeRequestFromPendingCache(queryClient, requestId) {
  queryClient.setQueryData(reassignmentRequestKeys.pending(), (current) => {
    if (!current?.data) return current;
    return {
      ...current,
      data: current.data.filter((request) => request.id !== requestId),
    };
  });
}

function updateSentRequestStatus(queryClient, requestId, status, serverResult) {
  queryClient.setQueryData(reassignmentRequestKeys.sent(), (current) => {
    if (!current?.data) return current;
    return {
      ...current,
      data: current.data.map((request) =>
        request.id === requestId ? { ...request, ...serverResult, status } : request,
      ),
    };
  });
}

export function useEligibleFaculty(dutySlotId) {
  return useQuery({
    queryKey: reassignmentRequestKeys.eligibleFaculty(dutySlotId),
    queryFn: ({ signal }) => fetchEligibleFaculty({ dutySlotId, signal }),
    enabled: dutySlotId != null && dutySlotId !== '',
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    retry: shouldRetryRequest,
    refetchOnWindowFocus: false,
  });
}

export function usePendingReassignmentRequests() {
  return useQuery({
    queryKey: reassignmentRequestKeys.pending(),
    queryFn: ({ signal }) => fetchPendingRequests({ signal }),
    staleTime: 10_000,
    refetchInterval: REASSIGNMENT_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: shouldRetryRequest,
  });
}

export function useSentReassignmentRequests() {
  return useQuery({
    queryKey: reassignmentRequestKeys.sent(),
    queryFn: ({ signal }) => fetchSentRequests({ signal }),
    staleTime: 10_000,
    refetchInterval: (query) => {
      const requests = query.state.data?.data ?? [];
      return requests.some((request) => request.status === 'pending') ? REASSIGNMENT_POLL_INTERVAL : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: shouldRetryRequest,
  });
}

export function useCreateReassignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReassignmentRequest,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reassignmentRequestKeys.sent() }),
        queryClient.invalidateQueries({ queryKey: reassignmentRequestKeys.pending() }),
      ]);
    },
  });
}

export function useRespondToReassignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: respondToReassignmentRequest,
    onSuccess: async (serverResult, { id, status }) => {
      removeRequestFromPendingCache(queryClient, id);
      updateSentRequestStatus(queryClient, id, status, serverResult);

      const invalidations = [
        queryClient.invalidateQueries({ queryKey: reassignmentRequestKeys.pending() }),
        queryClient.invalidateQueries({ queryKey: reassignmentRequestKeys.sent() }),
      ];
      if (status === 'approved') {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ['dutySlots'] }),
          queryClient.invalidateQueries({ queryKey: ['reassignedAway'] }),
          queryClient.invalidateQueries({ queryKey: reassignmentRequestKeys.eligibleFacultyRoot() }),
        );
      }
      await Promise.all(invalidations);
    },
  });
}

export function useCancelReassignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelReassignmentRequest,
    onSuccess: async (serverResult, id) => {
      updateSentRequestStatus(queryClient, id, 'cancelled', serverResult);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reassignmentRequestKeys.sent() }),
        queryClient.invalidateQueries({ queryKey: reassignmentRequestKeys.pending() }),
      ]);
    },
  });
}
