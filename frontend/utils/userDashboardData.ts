import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type {
  Booking,
  CarItem,
  LocationOption,
  Profile,
} from "@/utils/dashboard";
import { isoDate, townshipLocationOptions } from "@/utils/dashboardHelpers";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useDashboardData() {
  const { fetchProfile, user } = useAuthStore();
  const [locationOptions] = useState<LocationOption[]>(townshipLocationOptions);
  const startDate = isoDate(0);

  const getAvailableCars = async (postalCode: string, start: string) => {
    try {
      const { data: conflicts } = await supabase
        .from("bookings")
        .select("car_id")
        .lte("start_date", start)
        .gte("end_date", start)
        .in("status", ["pending", "approved"]);

      const conflictIds = [
        ...new Set((conflicts ?? []).map((b: any) => b.car_id).filter(Boolean)),
      ] as string[];

      let query = supabase
        .from("cars")
        .select(
          `id, brand, model, price_per_day, car_type, seats, has_ac, location, postal_code,
           car_images ( image_url )`,
        )
        .eq("status", "Available")
        .eq("postal_code", postalCode)
        .range(0, 4);

      if (conflictIds.length > 0) {
        query = query.not("id", "in", `(${conflictIds.join(",")})`);
      }

      const { data: cars } = await query;
      return cars ?? [];
    } catch (err) {
      console.error("fetchAvailableCars:", err);
      return [];
    }
  };

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["renter_dashboard", user?.id],
    queryFn: async () => {
      const uid = user?.id;
      if (!uid) throw new Error("No user");

      await fetchProfile(uid, true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, location, postal_code")
        .eq("id", uid)
        .single();

      if (profileError) throw profileError;
      const prof = profileData as Profile;

      const { data: bookingData } = await supabase
        .from("bookings")
        .select(
          `id,status, start_date, end_date, total_price,
           cars ( brand, model, location, car_images ( image_url ) )`,
        )
        .eq("customer_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: trendRaw } = await supabase
        .from("cars")
        .select(
          `id, brand, model, price_per_day, car_type, seats, has_ac, location,
           car_images ( image_url ), bookings ( id ), reviews ( rating )`,
        )
        .eq("status", "Available");

      let rankedTrends: CarItem[] = [];
      if (trendRaw) {
        rankedTrends = (trendRaw as any[])
          .map((c) => ({
            ...c,
            total_bookings: c.bookings?.length ?? 0,
            review_count: c.reviews?.length ?? 0,
            average_rating: c.reviews?.length
              ? c.reviews.reduce(
                  (s: number, r: any) => s + (r.rating ?? 0),
                  0,
                ) / c.reviews.length
              : null,
          }))
          .sort((a, b) => {
            if (b.total_bookings !== a.total_bookings)
              return b.total_bookings - a.total_bookings;
            return (b.average_rating ?? 0) - (a.average_rating ?? 0);
          })
          .slice(0, 3);
      }

      let avCars: CarItem[] = [];
      if (prof?.postal_code || prof?.location) {
        avCars = await getAvailableCars(prof.postal_code ?? "", startDate);
      }

      return {
        profile: prof,
        currentBooking: bookingData as Booking | null,
        topTrends: rankedTrends,
        availableCars: avCars,
      };
    },
    enabled: !!user?.id,
  });

  return {
    loading: isLoading,
    refreshing: isRefetching,
    setRefreshing: () => {}, // Interface compatibility
    profile: data?.profile || null,
    currentBooking: data?.currentBooking || null,
    topTrends: data?.topTrends || [],
    availableCars: data?.availableCars || [],
    locationOptions,
    fetchData: refetch,
  };
}
