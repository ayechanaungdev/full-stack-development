import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';

type BadgeCounts = {
  notifications: number;
  messages: number;
  bookings: number;
  reports: number;
};

const clampCount = (value: number) => Math.max(0, value);

const processedNotificationIds = new Set<string>();

export const markNotificationIdProcessed = (id: string) => {
  if (!id) return;
  processedNotificationIds.add(id);
};

export const hasNotificationIdBeenProcessed = (id: string) => {
  return id ? processedNotificationIds.has(id) : false;
};

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

const handleRealtimePayload = (
  queryClient: QueryClient,
  userId: string,
  field: keyof BadgeCounts,
  payload: any,
) => {
  const eventType = payload?.eventType || payload?.event || payload?.operation;
  const oldRecord = payload?.old || payload?.old_record;
  const newRecord = payload?.new || payload?.record;

  if (field === 'notifications' && eventType === 'INSERT') {
    const newId = newRecord?.id;
    if (newId && hasNotificationIdBeenProcessed(newId)) {
      return;
    }
  }

  const oldIsRead = oldRecord?.is_read;
  const newIsRead = newRecord?.is_read;

  const isUnreadValue = (value: any) => value !== true;
  const addIfUnread = (record: any) => record && isUnreadValue(record.is_read);

  if (eventType === 'INSERT' || eventType === 'insert') {
    if (addIfUnread(newRecord)) {
      updateBadgeCache(queryClient, userId, field, 1);
      return;
    }
  }

  if (eventType === 'UPDATE' || eventType === 'update') {
    if (isUnreadValue(oldIsRead) && newIsRead === true) {
      updateBadgeCache(queryClient, userId, field, -1);
      return;
    }
    if (oldIsRead === true && isUnreadValue(newIsRead)) {
      updateBadgeCache(queryClient, userId, field, 1);
      return;
    }
  }

  if (eventType === 'DELETE' || eventType === 'delete') {
    if (oldRecord && isUnreadValue(oldIsRead)) {
      updateBadgeCache(queryClient, userId, field, -1);
      return;
    }
  }

  queryClient.invalidateQueries({ queryKey: ['badge-counts', userId] });
};

// Badge counts query hook
export const useBadgeCounts = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['badge-counts', userId],
    queryFn: async () => {
      if (!userId) return { notifications: 0, messages: 0, bookings: 0, reports: 0 };

      const [notiRes, msgRes, bookingRes, reportRes] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true })
          .eq('receiver_id', userId).eq('is_read', false),

        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('receiver_id', userId).eq('is_read', false),

        supabase.from('bookings').select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .or(`customer_id.eq.${userId},owner_id.eq.${userId}`),

        supabase.from('daily_reports').select('*', { count: 'exact', head: true })
          .eq('is_read', false).eq('owner_id', userId)
      ]);

      return {
        notifications: notiRes.count || 0,
        messages: msgRes.count || 0,
        bookings: bookingRes.count || 0,
        reports: reportRes.count || 0
      };
    },
    enabled: !!userId,
    // Smart refetching: realtime + fallback polling
    refetchInterval: 30000, // 30 seconds fallback
    refetchIntervalInBackground: false, // Don't poll when app is backgrounded
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};

// Badge actions hook
export const useBadgeActions = () => {
  const queryClient = useQueryClient();

  const invalidateBadgeCounts = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };

  const resetNotificationCount = (userId: string) => {
    // Mark notifications as read in database
    // This will trigger realtime update automatically
    queryClient.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };

  const resetReportCount = (userId: string) => {
    // Mark reports as read in database
    // This will trigger realtime update automatically
    queryClient.invalidateQueries({ queryKey: ['badge-counts', userId] });
  };

  return {
    invalidateBadgeCounts,
    resetNotificationCount,
    resetReportCount,
  };
};

// Realtime subscription setup (call this once in your app)
export const setupBadgeRealtime = (userId: string, queryClient: QueryClient) => {
  const channel = supabase.channel(`badge-${userId}`);

  // Notifications
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notifications',
    filter: `receiver_id=eq.${userId}`,
  }, (payload) => handleRealtimePayload(queryClient, userId, 'notifications', payload));

  // Messages
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages',
    filter: `receiver_id=eq.${userId}`,
  }, (payload) => handleRealtimePayload(queryClient, userId, 'messages', payload));

  // Bookings
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings',
    filter: `or(customer_id.eq.${userId},owner_id.eq.${userId})`,
  }, (payload) => handleRealtimePayload(queryClient, userId, 'bookings', payload));

  // Daily Reports
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'daily_reports',
    filter: `owner_id=eq.${userId}`,
  }, (payload) => handleRealtimePayload(queryClient, userId, 'reports', payload));

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};