import EmptyState from "@/components/EmptyState";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { adjustBadgeCount, useBadgeActions } from "@/store/useBadgeStore";
import tailwindConfig from "@/tailwind.config";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  SectionList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import resolveConfig from "tailwindcss/resolveConfig";

type ReportRecord = {
  id: string;
  total_completed: number;
  booking_ids: string[];
  status: string;
  is_read: boolean;
  created_at?: string;
};

type ReportsPage = {
  records: ReportRecord[];
  count: number;
  nextPage?: number;
};

const REPORTS_PAGE_SIZE = 10;

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRangeBounds = (startDate: Date, endDate: Date) => {
  const start = getDateKey(startDate);
  const end = getDateKey(endDate);
  const startOfDay = new Date(startDate);
  const endOfDay = new Date(endDate);

  startOfDay.setHours(0, 0, 0, 0);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startBound: startOfDay.toISOString(),
    endBound: endOfDay.toISOString(),
  };
};

const markReportsReadInInfiniteCache = (oldData: any, reportId?: string) => {
  if (!oldData?.pages) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page: ReportsPage) => ({
      ...page,
      records: page.records.map((item) =>
        !reportId || item.id === reportId ? { ...item, is_read: true } : item,
      ),
    })),
  };
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

const ReportsHistoryScreen = () => {
  const { profile, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ); // Default to 7 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const { resetReportCount } = useBadgeActions();

  const { start, end, startBound, endBound } = useMemo(
    () => getDateRangeBounds(startDate, endDate),
    [startDate, endDate],
  );

  const todayDate = useMemo(() => getDateKey(new Date()), []);
  const { startBound: todayStartBound, endBound: todayEndBound } = useMemo(
    () => getDateRangeBounds(new Date(), new Date()),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const markAsRead = async () => {
        if (!user || !profile?.id) return;

        try {
          // Fetch all unread reports for this owner
          const reportsResp = await apiClient.get("/reports", {
            params: { limit: 100, startDate: "2020-01-01", endDate: new Date().toISOString().split("T")[0] },
          });
          const reportsList = reportsResp.data?.data || [];
          const unreadReports = reportsList.filter((r: any) => !r.isRead);

          if (unreadReports.length > 0) {
            // Mark each report as read
            await Promise.all(
              unreadReports.map((r: any) =>
                apiClient.patch(`/reports/${r.id}/read`),
              ),
            );

            adjustBadgeCount(user.id, "reports", -unreadReports.length);

            queryClient.setQueryData(
              ["daily_reports", profile?.id, "today", todayDate],
              (oldData: ReportRecord | undefined) =>
                oldData ? { ...oldData, is_read: true } : oldData,
            );

            queryClient.setQueriesData(
              { queryKey: ["daily_reports", profile?.id, "list"] },
              (oldData: any) => markReportsReadInInfiniteCache(oldData),
            );
          }
        } catch {}
      };

      markAsRead();

      return () => {
        if (user?.id) resetReportCount(user.id);
      };
    }, [user, queryClient, profile?.id, resetReportCount, todayDate]),
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch: refetchReports,
    error,
  } = useInfiniteQuery({
    queryKey: ["daily_reports", profile?.id, "list", start, end],
    queryFn: async ({ pageParam = 0 }) => {
      const page = Number(pageParam);

      const response = await apiClient.get("/reports", {
        params: {
          page: page + 1,
          limit: REPORTS_PAGE_SIZE,
          startDate: start,
          endDate: end,
        },
      });

      const { data, total } = response.data;
      const records = (data || []).map((item: any) => ({
        id: String(item.id),
        total_completed: item.total_completed || 0,
        booking_ids: item.booking_ids || [],
        status: item.status || "",
        is_read: item.isRead || false,
        created_at: item.createdAt,
      })) as ReportRecord[];

      const totalCount = total ?? 0;
      const loadedCount = (page + 1) * REPORTS_PAGE_SIZE;
      const nextPage = loadedCount < totalCount ? page + 1 : undefined;

      return { records, count: totalCount, nextPage };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!profile?.id, // Only run if profile.id exists
  });

  const records = useMemo(
    () => data?.pages.flatMap((page) => page.records) ?? [],
    [data],
  );

  const totalRecords = data?.pages[0]?.count ?? 0;

  // Today report
  const {
    data: todayReport,
    isRefetching: isTodayReportRefetching,
    refetch: refetchTodayReport,
  } = useQuery({
    queryKey: ["daily_reports", profile?.id, "today", todayDate],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const response = await apiClient.get("/reports", {
        params: {
          limit: 1,
          startDate: today,
          endDate: today,
        },
      });
      const data = response.data?.data?.[0];
      if (!data) return null;
      return {
        id: String(data.id),
        total_completed: data.total_completed || 0,
        booking_ids: data.booking_ids || [],
        status: data.status || "",
        is_read: data.isRead || false,
        created_at: data.createdAt,
      } as ReportRecord;
    },
    enabled: !!profile?.id,
  });

  // Filter and group reports
  const filteredAndGroupedReports = useMemo(() => {
    if (!records.length) return {};

    // Group by date
    const grouped = records.reduce(
      (acc, report) => {
        const date = report.created_at?.split("T")[0] || "Unknown";
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(report);
        return acc;
      },
      {} as Record<string, ReportRecord[]>,
    );

    // Sort dates in descending order and mark today
    const sortedGroups = Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .reduce(
        (acc, date) => {
          const displayDate = date;
          acc[displayDate] = grouped[date];
          return acc;
        },
        {} as Record<string, ReportRecord[]>,
      );

    return sortedGroups;
  }, [records]);

  const sections = Object.entries(filteredAndGroupedReports).map(
    ([title, data]) => ({
      title,
      data,
    }),
  );

  const onRefresh = useCallback(() => {
    void Promise.all([refetchReports(), refetchTodayReport()]);
  }, [refetchReports, refetchTodayReport]);

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  if (isLoading)
    return (
      <Box className="flex-1 justify-center items-center bg-brand-50">
        <Spinner size="large" color="#16a8e3" />
        <Text className="mt-4 text-gray-700">Loading reports...</Text>
      </Box>
    );

  if (error) {
    return (
      <VStack className="flex-1 bg-brand-50 px-4 py-4 justify-center items-center">
        <Text>Error: {error.message}</Text>
      </VStack>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <VStack className="flex-1 bg-brand-0 px-4 py-4">
        {todayReport ? (
          <>
            <Text>Review yesterday reports</Text>
            <TouchableOpacity
              key={todayReport.id}
              onPress={async () => {
                if (user?.id && !todayReport.is_read) {
                  try {
                    await apiClient.patch(`/reports/${todayReport.id}/read`);
                    adjustBadgeCount(user.id, "reports", -1);

                    queryClient.setQueryData(
                      ["daily_reports", profile?.id, "today", todayDate],
                      (oldData: ReportRecord | null | undefined) =>
                        oldData ? { ...oldData, is_read: true } : oldData,
                    );

                    queryClient.setQueriesData(
                      { queryKey: ["daily_reports", profile?.id, "list"] },
                      (oldData: any) =>
                        markReportsReadInInfiniteCache(oldData, todayReport.id),
                    );
                  } catch {}
                }
                router.push(`/reports/${todayReport.id}`);
              }}
            >
              <Card
                className="rounded-md bg-gray-50 p-4 mb-4 mx-1 mt-2"
                style={{ ...CARD_SHADOW }}
              >
                <HStack
                  className="items-center text-gray-900 gap-28"
                  space="md"
                >
                  <VStack>
                    <Text className="text-sm font-medium text-gray-900">
                      Date
                    </Text>
                    <Text className="text-sm font-medium text-gray-900">
                      Total Completed Bookings
                    </Text>
                  </VStack>
                  <VStack>
                    <Text className="text-sm font-semibold text-gray-900">
                      {todayReport.created_at?.split("T")[0]}
                    </Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {todayReport.total_completed}
                    </Text>
                  </VStack>
                </HStack>
                <Text className="text-sm text-brand-500 text-right mt-2">
                  {" "}
                  View Details →
                </Text>
              </Card>
            </TouchableOpacity>
          </>
        ) : (
          <VStack className="mb-8">
            <Text className="text-lg font-semibold text-gray-900">
              No report for today yet.
            </Text>
            <Text className="text-sm text-gray-600">
              Choose a date range to view reports!
            </Text>
          </VStack>
        )}
        {/* Date Range Picker */}
        <Card
          className="mb-8 rounded-md bg-brand-100 p-4"
          style={{ ...CARD_SHADOW }}
        >
          <VStack space="md">
            <Text className="text-lg font-semibold text-gray-900">
              Search Previous Reports
            </Text>
            <HStack space="md" className="justify-between">
              <VStack className="flex-1">
                <Text className="text-sm font-medium mb-2">From</Text>
                <Button
                  onPress={() => setShowStartPicker(true)}
                  className="bg-white border border-gray-300 rounded-md"
                >
                  <ButtonText className="text-gray-700">
                    {startDate.toLocaleDateString()}
                  </ButtonText>
                </Button>
              </VStack>
              <VStack className="flex-1">
                <Text className="text-sm font-medium mb-2">To</Text>
                <Button
                  onPress={() => setShowEndPicker(true)}
                  className="bg-white border border-gray-300 rounded-md"
                >
                  <ButtonText className="text-gray-700">
                    {endDate.toLocaleDateString()}
                  </ButtonText>
                </Button>
              </VStack>
            </HStack>
          </VStack>
        </Card>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            maximumDate={endDate}
            onChange={onStartDateChange}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={onEndDateChange}
          />
        )}

        <Text className="mb-4 text-semibold text-md text-gray-900">
          {totalRecords} Records found from{" "}
          <Text className="font-bold text-brand-500">
            {startDate.toLocaleDateString()}
          </Text>{" "}
          to{" "}
          <Text className="font-bold text-brand-500">
            {endDate.toLocaleDateString()}
          </Text>
        </Text>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item: report }) => (
            <TouchableOpacity
              onPress={async () => {
                if (user?.id && !report.is_read) {
                  try {
                    await apiClient.patch(`/reports/${report.id}/read`);
                    adjustBadgeCount(user.id, "reports", -1);

                    queryClient.setQueryData(
                      ["daily_reports", profile?.id, "today", todayDate],
                      (oldData: ReportRecord | null | undefined) =>
                        oldData?.id === report.id
                          ? { ...oldData, is_read: true }
                          : oldData,
                    );

                    queryClient.setQueriesData(
                      { queryKey: ["daily_reports", profile?.id, "list"] },
                      (oldData: any) =>
                        markReportsReadInInfiniteCache(oldData, report.id),
                    );
                  } catch {}
                }
                router.push(`/reports/${report.id}`);
              }}
            >
              <Card
                className="rounded-md bg-gray-50 p-4 mb-4 mx-1"
                style={{ ...CARD_SHADOW }}
              >
                <HStack
                  className="items-center text-gray-900 gap-28"
                  space="md"
                >
                  <VStack>
                    <Text className="text-sm font-medium text-gray-900">
                      Date
                    </Text>
                    <Text className="text-sm font-medium text-gray-900">
                      Total Completed Bookings
                    </Text>
                  </VStack>
                  <VStack>
                    <Text className="text-sm font-semibold text-gray-900">
                      {report.created_at?.split("T")[0]}
                    </Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {report.total_completed}
                    </Text>
                  </VStack>
                </HStack>
                <Text className="text-sm text-brand-500 text-right mt-2">
                  View Details →
                </Text>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Box className="items-center justify-center py-12">
              <EmptyState
                icon={(props: any) => (
                  <Ionicons name="document-text-outline" {...props} />
                )}
                message="No reports found"
              />
            </Box>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <Box className="items-center py-4">
                <Spinner size="small" color="#16a8e3" />
              </Box>
            ) : records.length > 0 && !hasNextPage ? (
              <Box className="items-center py-4">
                <Text className="text-sm text-gray-500">No more reports</Text>
              </Box>
            ) : null
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isTodayReportRefetching}
              onRefresh={onRefresh}
              colors={[brand[700]]}
              tintColor={brand[700]}
            />
          }
        />
      </VStack>
    </SafeAreaView>
  );
};

export default ReportsHistoryScreen;
