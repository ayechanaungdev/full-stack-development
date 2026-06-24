import { apiClient } from '@/lib/axios';
import { socketService } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';

const processedNotificationIds = new Set<string>();

export const markNotificationIdProcessed = (id: string) => {
  if (!id) return;
  processedNotificationIds.add(id);
};

export const hasNotificationIdBeenProcessed = (id: string) => {
  return id ? processedNotificationIds.has(id) : false;
};

type BadgeCounts = {
  notifications: number;
  messages: number;
  bookings: number;
  reports: number;
};

const clampCount = (value: number) => Math.max(0, value);

const updateBadgeCache = (
  qc: QueryClient,
  userId: string,
  field: keyof BadgeCounts,
  delta: number,
) => {
  qc.setQueryData<BadgeCounts>(['badge-counts', userId], (prev) => {
    const current = prev ?? {
      notifications: 0,
      messages: 0,
      bookings: 0,
      reports: 0,
    };
    return {
      ...current,
      [field]: clampCount((current[field] ?? 0) + delta),
    };
  });
};

export const adjustBadgeCount = (
  userId: string,
  field: keyof BadgeCounts,
  delta: number,
) => updateBadgeCache(queryClient, userId, field, delta);

export const useBadgeCounts = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['badge-counts', userId],
    queryFn: async () => {
      if (!userId) return { notifications: 0, messages: 0, bookings: 0, reports: 0 };
      const response = await apiClient.get('/notifications/counts');
      return response.data as BadgeCounts;
    },
    enabled: !!userId,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useBadgeActions = () => {
  const qc = useQueryClient();

  const invalidateBadgeCounts = (userId: string) => {
    qc.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };

  const resetNotificationCount = (userId: string) => {
    qc.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };

  const resetReportCount = (userId: string) => {
    qc.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };

  return {
    invalidateBadgeCounts,
    resetNotificationCount,
    resetReportCount,
  };
};

export const setupBadgeRealtime = (userId: string, qc: QueryClient) => {
  const handleBadgeUpdate = (counts: BadgeCounts) => {
    qc.setQueryData<BadgeCounts>(['badge-counts', userId], counts);
  };

  const handleNewBooking = () => {
    updateBadgeCache(qc, userId, 'bookings', 1);
  };

  const handleBookingUpdate = () => {
    qc.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };

  socketService.on('badgeUpdate', handleBadgeUpdate);
  socketService.on('newBooking', handleNewBooking);
  socketService.on('bookingUpdate', handleBookingUpdate);

  return () => {
    socketService.off('badgeUpdate', handleBadgeUpdate);
    socketService.off('newBooking', handleNewBooking);
    socketService.off('bookingUpdate', handleBookingUpdate);
    qc.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };
};
