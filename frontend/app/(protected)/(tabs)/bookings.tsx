import OwnerBookingList from "@/components/owner/OwnerBookingList";
import RenterBookingList from "@/components/renter/RenterBookingList";
import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { adjustBadgeCount } from "@/store/useBadgeStore";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function BookingsScreen() {
  const { role, profile, user } = useAuthStore();
  const queryClient = useQueryClient();
  const { status } = useLocalSearchParams();

  useEffect(() => {
    const markAsRead = async () => {
      if (!user) return;
      try {
        await apiClient.patch("/notifications/read-many", {
          ids: [0],
        });
        queryClient.setQueryData(["badge-counts", user.id], (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, bookings: 0 };
        });
      } catch {}
    };

    markAsRead();
  }, [user, queryClient]);

  if (!profile) {
    return null;
  }

  if (role === "car_owner") {
    return (
      <OwnerBookingList
        key={`${user?.id || "owner"}-${status || "all"}`}
        initialStatus={(status as string) || "all"}
      />
    );
  }

  return <RenterBookingList renterId={profile.id} />;
}
