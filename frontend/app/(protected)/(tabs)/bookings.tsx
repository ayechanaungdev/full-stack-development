import OwnerBookingList from "@/components/owner/OwnerBookingList";
import RenterBookingList from "@/components/renter/RenterBookingList";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export default function BookingsScreen() {
  const { role, profile, user } = useAuthStore();
  const queryClient = useQueryClient();
  const { status } = useLocalSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  // const resetBookingCount = useBadgeStore((state) => state.resetBookingCount);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    const markAsRead = async () => {
      if (!user) return;
      await supabase
        .from("bookings")
        .update({ is_read: true })
        .or(`customer_id.eq.${user.id},owner_id.eq.${user.id}`)
        .eq("is_read", false);

      const { data: updatedNotifications } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .select("id")
        .eq("receiver_id", user.id)
        .eq("type", "booking")
        .eq("is_read", false);

      const notificationReadCount = updatedNotifications?.length ?? 0;

      queryClient.setQueryData(["badge-counts", user.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          bookings: 0,
          notifications: Math.max(
            0,
            oldData.notifications - notificationReadCount,
          ),
        };
      });
    };

    markAsRead();
  }, [user, queryClient]);

  if (!profile) {
    return null;
  }

  if (role === "car_owner") {
    if (!userId) return null;

    return (
      <OwnerBookingList
        // Key ensures the component resets when switching filters
        key={`${userId}-${status || "all"}`}
        ownerId={userId}
        initialStatus={(status as string) || "all"}
      />
    );
  }

  return <RenterBookingList renterId={profile.id} />;
}
