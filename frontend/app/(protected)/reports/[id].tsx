import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { adjustBadgeCount } from "@/store/useBadgeStore";
import tailwindConfig from "@/tailwind.config";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, ScrollView } from "react-native";
import resolveConfig from "tailwindcss/resolveConfig";

type ReportRecord = {
  id: string;
  total_completed: number;
  booking_ids: string[];
  status: string;
  created_at?: string;
  is_read?: boolean;
  // Add other fields if available
};

// --- THEME & STYLING CONFIG ---
const fullConfig = resolveConfig(tailwindConfig) as any;
const brand = fullConfig.theme.colors.brand;
const CARD_SHADOW = {
  shadowColor: brand[925],
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, user } = useAuthStore();
  const queryClient = useQueryClient();
  const {
    data: report,
    isLoading: isReportLoading,
    error: reportError,
  } = useQuery({
    queryKey: ["daily_reports", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("id", id)
        .eq("owner_id", profile?.id)
        .single();

      if (error) throw error;

      // booking_ids may come as JSON string form (e.g. '["id1","id2"]')
      const booking_ids_raw = (data as any)?.booking_ids;
      const parsed_booking_ids: string[] =
        typeof booking_ids_raw === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(booking_ids_raw);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : Array.isArray(booking_ids_raw)
            ? booking_ids_raw
            : [];

      return {
        ...(data as any),
        booking_ids: parsed_booking_ids,
      } as ReportRecord;
    },
    enabled: !!id && !!profile?.id,
  });

  const {
    data: bookings,
    isLoading: isBookingsLoading,
    error: bookingsError,
  } = useQuery({
    queryKey: ["bookings", report?.booking_ids?.join(",")],
    queryFn: async () => {
      if (!report?.booking_ids?.length) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, car:cars(*, car_images(*)), customer:profiles!bookings_customer_id_fkey(*)",
        )
        .in("id", report.booking_ids);

      if (error) throw error;
      return data;
    },
    enabled: !!report?.booking_ids?.length,
  });

  useEffect(() => {
    const markReportRead = async () => {
      if (!report || !user?.id || report.is_read) return;

      const { data: updatedReports } = await supabase
        .from("daily_reports")
        .update({ is_read: true })
        .select("id")
        .eq("id", report.id)
        .eq("is_read", false);

      const reportReadCount = updatedReports?.length ?? 0;
      if (reportReadCount > 0) {
        adjustBadgeCount(user.id, "reports", -reportReadCount);

        const { data: updatedNotifications } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .select("id")
          .eq("receiver_id", user.id)
          .eq("reference_id", report.id)
          .eq("type", "system")
          .eq("is_read", false);

        const notificationReadCount = updatedNotifications?.length ?? 0;
        if (notificationReadCount > 0) {
          adjustBadgeCount(user.id, "notifications", -notificationReadCount);
        }

        queryClient.setQueryData(["badge-counts", user.id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            reports: Math.max(0, oldData.reports - reportReadCount),
          };
        });

        queryClient.setQueriesData(
          { queryKey: ["daily_reports", profile?.id, "list"] },
          (oldData: any) => {
            if (!oldData?.pages) return oldData;

            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                records: Array.isArray(page.records)
                  ? page.records.map((item: any) =>
                      item.id === report.id
                        ? { ...item, is_read: true }
                        : item,
                    )
                  : page.records,
              })),
            };
          },
        );
      }
    };

    markReportRead();
  }, [report, user?.id, queryClient, profile?.id]);

  const fetchError = reportError || bookingsError;

  if (fetchError || !report) {
    return (
      <VStack className="flex-1 bg-brand-50 px-4 py-4 justify-center items-center">
        <Text>Report not found or error: {fetchError?.message}</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-blue-500">Go Back</Text>
        </Pressable>
      </VStack>
    );
  }

  return (
    <VStack className="flex-1 bg-brand-0 px-4">
      <HStack className="pt-12 items-center mb-4">
        <VStack className="absolute top-12 left-2">
          <BackButton />
        </VStack>
        <Heading className="text-[1.4rem] text-brand-700 text-center mx-auto">
          Report Details
        </Heading>
      </HStack>

      {isReportLoading || isBookingsLoading ? (
        <VStack className="flex-1 bg-brand-50 px-4 py-4 justify-center items-center">
          <Spinner size="large" color="#16a8e3" />
          <Text>Loading report details...</Text>
        </VStack>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <Card className="bg-brand-0 rounded-xl p-4">
            <VStack space="md">
              <HStack className="justify-between items-center">
                <Text className="text-lg font-bold text-gray-900">
                  Date : {report.created_at?.split("T")[0]}
                </Text>
                {/* <Badge
              variant={report.status === "completed" ? "solid" : "outline"}
              action={report.status === "completed" ? "success" : "warning"}
            >
              <BadgeText>{report.status}</BadgeText>
            </Badge> */}
              </HStack>

              <VStack space="sm">
                <Text className="text-sm text-gray-600">
                  <Text className="font-semibold">Total Completed:</Text>{" "}
                  {report.total_completed}
                </Text>
                {bookings && bookings.length > 0 ? (
                  bookings.map((booking: any) => {
                    const startDate = booking.start_date
                      ? booking.start_date.toString().split("T")[0]
                      : booking.start_date || "N/A";
                    const endDate = booking.end_date
                      ? booking.end_date.toString().split("T")[0]
                      : booking.end_date || "N/A";
                    const createdAt = booking.created_at
                      ? new Date(booking.created_at).toLocaleDateString()
                      : "N/A";
                    const totalDays =
                      booking.start_date && booking.end_date
                        ? Math.max(
                            1,
                            Math.round(
                              (new Date(booking.end_date).getTime() -
                                new Date(booking.start_date).getTime()) /
                                (1000 * 60 * 60 * 24),
                            ),
                          )
                        : "-";
                    const carTitle =
                      (booking.car?.brand || "") +
                        (booking.car?.model ? ` ${booking.car.model}` : "") ||
                      booking.car_id ||
                      "Car details unavailable";
                    const renterName =
                      booking.customer?.name ||
                      booking.customer?.full_name ||
                      booking.customer_id ||
                      "Unknown renter";
                    const imageUri =
                      booking.car?.car_images?.[0]?.image_url ||
                      booking.car?.image_url ||
                      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=640&q=80";
                    const carPlateNumber = booking.car?.car_number || "N/A";
                    return (
                      <Pressable
                        key={booking.id}
                        onPress={() => router.push(`/booking/${booking.id}`)}
                      >
                        <Card
                          key={booking.id}
                          className="rounded-xl overflow-hidden bg-white mb-2"
                          style={{ ...CARD_SHADOW }}
                        >
                          <VStack space="md">
                            <HStack className="items-start">
                              <Image
                                alt="Car Image"
                                resizeMode="contain"
                                source={{ uri: imageUri }}
                              />
                              <VStack className="flex-1 ml-3">
                                <HStack className="items-center justify-between">
                                  <Text className="text-lg font-semibold text-gray-900 flex-1">
                                    {carPlateNumber}
                                  </Text>
                                  <Text className="text-sm text-gray-600">
                                    Duration : {totalDays}{" "}
                                    {typeof totalDays === "number"
                                      ? "Days"
                                      : ""}
                                  </Text>
                                </HStack>

                                <VStack>
                                  <HStack>
                                    <Text className="text-sm text-gray-600 font-semibold">
                                      Renter :{" "}
                                    </Text>
                                    <Text className="text-sm text-gray-600 ">
                                      {renterName}
                                    </Text>
                                  </HStack>
                                  <HStack>
                                    <Text className="text-sm text-gray-600 font-semibold">
                                      Booked at:{" "}
                                    </Text>
                                    <Text className="text-sm text-gray-600 ">
                                      {startDate}
                                    </Text>
                                  </HStack>
                                </VStack>
                              </VStack>
                            </HStack>
                          </VStack>

                          <Text className="text-sm text-brand-700 text-right">
                            View Details →
                          </Text>
                        </Card>
                      </Pressable>
                    );
                  })
                ) : (
                  <Text className="text-sm text-gray-500">
                    No booking details available.
                  </Text>
                )}
                {report.created_at && (
                  <Text className="text-sm text-gray-600">
                    {new Date(report.created_at).toLocaleString()}
                  </Text>
                )}
              </VStack>
            </VStack>
          </Card>
        </ScrollView>
      )}
    </VStack>
  );
}
