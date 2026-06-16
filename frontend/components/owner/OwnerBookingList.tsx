import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import DatePicker from "@/components/date_picker";
import EmptyState from "@/components/EmptyState";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Center } from "@/components/ui/center";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { supabase } from "@/lib/supabase";
import tailwindConfig from "@/tailwind.config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import resolveConfig from "tailwindcss/resolveConfig";

import { useToastStore } from "@/store/useToastStore";
import { Input, InputField, InputSlot } from "../ui/input";
type OwnerBookingListProps = {
  ownerId: string;
  initialStatus?: string;
};
type BookingStatus =
  | "all"
  | "completed"
  | "approved"
  | "rejected"
  | "pending"
  | "cancelled";

type BookingItem = {
  id: string;
  customer_id: string;
  car_id: string;
  driver_id?: string | null;
  start_date: string;
  end_date: string;
  pickup_time?: string | null;
  dropoff_time?: string | null;
  total_price?: number | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  status: string;
  created_at: string;
  car_name: string;
  renter_name: string;
  car_number?: string | null;
  image_url: string | null;
};

type BookingsPage = {
  bookings: BookingItem[];
  count: number;
  nextPage?: number;
};

const BOOKINGS_PAGE_SIZE = 10;

const getDateKey = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSearchTerms = (search: string) =>
  search.trim().toLowerCase().split(/\s+/).filter(Boolean);

export default function OwnerBookingList({
  ownerId,
  initialStatus = "all",
}: OwnerBookingListProps) {
  const [search, setSearch] = useState("");
  const { status } = useLocalSearchParams() as { status?: string };
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>(
    (initialStatus as BookingStatus) || "all",
  );
  const fullConfig = resolveConfig(tailwindConfig) as any;
  const brand = fullConfig.theme.colors.brand;
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState(
    `${firstDayOfMonth.getFullYear()}-${firstDayOfMonth.getMonth() + 1}-${firstDayOfMonth.getDate()}`,
  );
  const [endDate, setEndDate] = useState(
    `${lastDayOfMonth.getFullYear()}-${lastDayOfMonth.getMonth() + 1}-${lastDayOfMonth.getDate()}`,
  );

  const {
    visible: toastVisible,
    message: toastMessage,
    type: toastType,
    showToast,
    hideToast,
  } = useToastStore();

  const goToDetail = (bookingId: string) => {
    router.push(`/booking/${bookingId}`);
  };

  const calculateRentalDuration = (
    startDateString?: string | null,
    endDateString?: string | null,
  ) => {
    if (!startDateString || !endDateString) return "-";

    const start = new Date(startDateString);
    const end = new Date(endDateString);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "-";

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24) + 1);

    return diffDays > 1 ? `${diffDays} Days` : "1 Day";
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? dateString
      : d
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        .replace(/,/g, "");
  };

  // format to 12 hr
  const formatTo12Hour = (time?: string) => {
    if (!time) return "--:--";

    const [hourStr, minute] = time.split(":");
    let hour = parseInt(hourStr, 10);

    if (isNaN(hour)) return "--:--";

    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;

    return `${hour}:${minute} ${ampm}`;
  };

  const formatBookingId = (id: string) => {
    return id?.length > 13
      ? `${id.toUpperCase().slice(0, 13)}...`
      : id?.toUpperCase();
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return {
          className: " bg-success-0",
          textClass: "text-success-700",
        };
      case "approved":
        return {
          className: " bg-sky-50",
          textClass: "text-sky-600",
        };
      case "rejected":
        return {
          className: " bg-error-50",
          textClass: "text-error-800",
        };
      case "pending":
        return {
          className: " bg-warning-50",
          textClass: "text-warning-700",
        };
      case "cancelled":
        return {
          className: " bg-error-0",
          textClass: "text-error-700",
        };
      default:
        return {
          className: "bg-gray-50",
          textClass: "text-gray-600",
        };
    }
  };

  const isValidDate = (dateStr: string) => {
    if (!dateStr.trim()) return false;
    return !isNaN(new Date(dateStr).getTime());
  };

  const {
    data,
    isLoading: loading,
    refetch,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "owner_bookings",
      ownerId,
      "list",
      selectedStatus,
      startDate,
      endDate,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      if (!ownerId) return { bookings: [], count: 0 } as BookingsPage;

      const page = Number(pageParam);
      const from = page * BOOKINGS_PAGE_SIZE;
      const to = from + BOOKINGS_PAGE_SIZE - 1;

      let query = supabase
        .from("bookings")
        .select(
          `
          id,
          customer_id,
          car_id,
          start_date,
          end_date,
          pickup_time,
          dropoff_time,
          status,
          created_at,
  
          cars (
            brand,
            model,
            car_number,
            car_images (
              image_url,
              is_primary
            )
          ),
  
          customer:profiles!bookings_customer_id_fkey (
            full_name
          )
        `,
          { count: "exact" },
        )
        .eq("owner_id", ownerId);

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      if (isValidDate(startDate)) {
        query = query.gte("start_date", getDateKey(startDate));
      }

      if (isValidDate(endDate)) {
        query = query.lte("end_date", getDateKey(endDate));
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error || !data) {
        return { bookings: [], count: 0 } as BookingsPage;
      }

      const bookings = data.map((item: any) => {
        const primaryImage =
          item.cars?.car_images?.find((img: any) => img.is_primary) ||
          item.cars?.car_images?.[0];

        return {
          id: item.id,
          customer_id: item.customer_id,
          car_id: item.car_id,

          start_date: item.start_date,
          end_date: item.end_date,
          pickup_time: item.pickup_time,
          dropoff_time: item.dropoff_time,
          status: item.status,
          created_at: item.created_at,

          car_name: `${item.cars?.brand || "Unknown"} ${item.cars?.model || "Car"}`,
          car_number: item.cars?.car_number || null,
          renter_name: item.customer?.full_name || "Unknown Renter",
          image_url: primaryImage?.image_url || null,
        };
      }) as BookingItem[];

      const totalCount = count ?? 0;
      const nextPage = to + 1 < totalCount ? page + 1 : undefined;

      return { bookings, count: totalCount, nextPage };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!ownerId,
  });

  const allBookings = useMemo(
    () => data?.pages.flatMap((page) => page.bookings) ?? [],
    [data],
  );

  const totalBookings = data?.pages[0]?.count ?? 0;
  const loadedBookings = allBookings.length;

  const copyBookingIdToClipboard = async (bookingId: string) => {
    if (!bookingId) return;

    await Clipboard.setStringAsync(bookingId);
    showToast("Booking ID copied to clipboard.", "success");
  };

  // For car number copy to clipboard
  const copyCarNumberToClipboard = async (car_number: string) => {
    if (!car_number) return;

    await Clipboard.setStringAsync(car_number);
    showToast("Car number copied to clipboard", "success");
  };

  useEffect(() => {
    const targetStatus = (status?.toLowerCase() as BookingStatus) || "all";
    setSelectedStatus(targetStatus);
  }, [status]);

  const filteredBookings = useMemo(() => {
    let result = [...allBookings];

    if (search.trim()) {
      const terms = [...new Set(getSearchTerms(search))];
      result = result.filter((item) => {
        const text = `
        ${item.id}
        ${item.car_name}
        ${item.renter_name}
        ${item.status}
        ${formatDate(item.created_at)}
      `.toLowerCase();

        return terms.every((t) => text.includes(t));
      });
    }

    return result;
  }, [allBookings, search]);

  const renderFilterBadge = (
    label: string,
    value: BookingStatus,
    colorClass: string,
    textClass: string,
    baseBorderClass: string,
  ) => {
    const isSelected = selectedStatus?.toLowerCase() === value?.toLowerCase();

    return (
      <Pressable onPress={() => setSelectedStatus(value)}>
        <Badge
          variant="outline"
          className={`rounded-lg px-3 py-2 border ${isSelected ? "border-gray-500" : baseBorderClass
            } ${colorClass}`}
        >
          <BadgeText
            className={`${textClass} size-sm capitalize ${isSelected ? "font-bold" : "font-normal"
              }`}
            style={{ textAlign: "center" }}
          >
            {label}
          </BadgeText>
        </Badge>
      </Pressable>
    );
  };

  const renderBookingCard = ({ item }: { item: BookingItem }) => {
    const statusStyle = getStatusBadgeStyles(item.status);

    return (
      <Pressable
        onPress={() => goToDetail(item.id)}
        className="rounded-[16px] overflow-hidden"
        android_ripple={{ color: "rgba(0,0,0,0.05)" }}
      >
        <Card
          className="bg-white rounded-[16px] px-3 py-3 border border-outline-300 overflow-hidden"
          style={{ backgroundColor: "white" }}
        >
          <VStack className="gap-3">
            <HStack className="justify-between items-center gap-2">
              <Heading
                className="text-typography-900 text-lg font-bold flex-1"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.car_name}
              </Heading>
              <Badge
                className={`rounded-full px-2 py-1 border ${statusStyle.className}`}
              >
                <BadgeText
                  className={`text-xs capitalize text-center ${statusStyle.textClass}`}
                >
                  {item.status}
                </BadgeText>
              </Badge>
            </HStack>

            <HStack className="items-start gap-2">
              <VStack className="items-start gap-1" style={{ width: 96 }}>
                <Box
                  className="relative bg-white rounded-[16px] border border-outline-300 w-[96px] h-[84px] overflow-hidden"
                  style={{ backgroundColor: "white" }}
                >
                  <Image
                    source={
                      item.image_url
                        ? { uri: encodeURI(item.image_url) }
                        : require("@/assets/images/icon.png")
                    }
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <Badge className="absolute bottom-2 left-2 z-10 rounded-md px-2.5 py-1 bg-brand-600/30 border border-white/20 shadow-lg shadow-black/20">
                    <Pressable
                      onLongPress={() =>
                        copyCarNumberToClipboard(item.car_number || "")
                      }
                    >
                      <HStack className="items-center space-x-1">
                        <MaterialCommunityIcons
                          name="card-text-outline"
                          size={14}
                          color="#D1E8FF"
                        />
                        <BadgeText className="text-white text-[11px] uppercase font-semibold leading-none">
                          {item.car_number || "N/A"}
                        </BadgeText>
                      </HStack>
                    </Pressable>
                  </Badge>
                </Box>

                <Pressable
                  onPress={() => copyBookingIdToClipboard(item.id)}
                  onLongPress={() => copyBookingIdToClipboard(item.id)}
                  className="w-full px-1 py-0.5"
                >
                  <HStack className="items-center gap-1 pt-3 ">
                    <Text
                      className="text-[10px] text-gray-700 font-semibold"
                      numberOfLines={1}
                    >
                      ID:
                    </Text>
                    <Text
                      className="text-[10px] text-gray-600"
                      numberOfLines={1}
                    >
                      {formatBookingId(item.id)}
                    </Text>
                    <Ionicons name="copy-outline" size={11} color="#16a8e3" />
                  </HStack>
                </Pressable>
              </VStack>

              <VStack className="flex-1 justify-between gap-1 pt-0 min-h-[110px]">
                <Text
                  className="text-typography-700 text-sm leading-tight"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Renter:{" "}
                  <Text className="font-bold text-typography-900">
                    {item.renter_name}
                  </Text>
                </Text>

                <HStack className="items-center gap-1">
                  <Text className="text-brand-500 text-base">•</Text>
                  <HStack className="items-center gap-2">
                    <Text className="text-typography-700 text-sm leading-tight">
                      Start: {formatDate(item.start_date)}
                    </Text>
                    <Box className="min-w-[20px] h-[15px] px-2 border border-brand-700 rounded-full items-center justify-center">
                      <Text className="text-xs text-brand-700 font-medium text-center">
                        {formatTo12Hour(item.pickup_time ?? "--:--")}
                      </Text>
                    </Box>
                  </HStack>
                </HStack>

                <HStack className="items-center gap-1">
                  <Text className="text-brand-500 text-base">•</Text>
                  <HStack className="items-center gap-2">
                    <Text className="text-typography-700 text-sm leading-tight">
                      {`End  : ${formatDate(item.end_date)}`}
                    </Text>
                    <Box className="min-w-[20px] h-[15px] px-2 border border-brand-700 rounded-full items-center justify-center">
                      <Text className="text-xs text-brand-700 font-medium text-center">
                        {formatTo12Hour(item.dropoff_time ?? "--:--")}
                      </Text>
                    </Box>
                  </HStack>
                </HStack>

                <Text className="text-typography-700 text-sm leading-tight">
                  <Text className="text-brand-500 text-sm">•</Text> Rental
                  Duration:{" "}
                  <Text className="font-bold text-typography-800 text-brand-850">
                    {calculateRentalDuration(item.start_date, item.end_date)}
                  </Text>
                </Text>

                <HStack className="items-center justify-end gap-2 pt-3">
                  <Text className="text-brand-900 text-xs italic text-right self-end shrink">
                    Booked at: {formatDate(item.created_at)}
                  </Text>
                </HStack>
              </VStack>
            </HStack>
          </VStack>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1">
      <Box className="flex-1 bg-brand-0  px-4 pt-2 ">
        <Box className=" mt-0 ">
          <Input
            size="lg"
            className="bg-brand-0 h-11 rounded-xl border border-gray-200"
          >
            <InputField
              placeholder="Search by Booking ID, Car, Renter, or Month"
              value={search}
              onChangeText={setSearch}
              className="text-md"
            />

            <InputSlot className="pr-3">
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close" size={20} color="#999" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search" size={20} color="#16a8e3" />
              )}
            </InputSlot>
          </Input>
        </Box>
        <HStack className="justify-between gap-3  mb-3">
          <VStack className="flex-1  mt-3">
            <Text className="font-bold">Start Date </Text>
            <Pressable className=" w-full">
              <DatePicker
                label=""
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);

                  if (new Date(date) > new Date(endDate)) {
                    setEndDate("");
                  }
                }}
                minimumDate={new Date(1900, 0, 1)}
              />
            </Pressable>
          </VStack>

          <VStack className="flex-1 mt-3 ">
            <Text className="font-bold">End Date</Text>
            <Pressable className=" w-full">
              <DatePicker
                label=""
                value={endDate}
                onChange={(date) => {
                  if (new Date(date) < new Date(startDate)) {
                    setEndDate(startDate);
                  } else {
                    setEndDate(date);
                  }
                }}
                minimumDate={new Date(startDate)}
              />
            </Pressable>
          </VStack>
        </HStack>
        <Box className="mt-12 mb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            <HStack className="gap-2">
              {renderFilterBadge(
                "All",
                "all",
                "bg-gray-100",
                "text-gray-700",
                "border-gray-200",
              )}
              {renderFilterBadge(
                "Completed",
                "completed",
                "bg-green-50",
                "text-green-700",
                "border-green-100",
              )}
              {renderFilterBadge(
                "Approved",
                "approved",
                "bg-blue-50",
                "text-blue-700",
                "border-blue-100",
              )}
              {renderFilterBadge(
                "Rejected",
                "rejected",
                "bg-red-50",
                "text-red-600",
                "border-red-100",
              )}
              {renderFilterBadge(
                "Pending",
                "pending",
                "bg-yellow-50",
                "text-yellow-700",
                "border-yellow-100",
              )}
              {renderFilterBadge(
                "Cancelled",
                "cancelled",
                "bg-gray-200",
                "text-gray-700",
                "border-gray-300",
              )}
            </HStack>
          </ScrollView>
        </Box>
        <HStack className="items-center justify-between">
          <Text className="font-bold my-3">
            {loadedBookings} out of {totalBookings} showing
          </Text>
          <Divider className="flex-1 ml-3 mt-1" />
        </HStack>

        {loading ? (
          <Center className="flex-1 mt-10">
            <Spinner size="large" />
            <Text className="mt-3 text-typography-500">
              Loading bookings...
            </Text>
          </Center>
        ) : (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => item.id}
            renderItem={renderBookingCard}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <Box className="h-3" />}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 40,
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={brand[500]}
                colors={[brand[500]]}
              />
            }
            ListEmptyComponent={
              <Center className="flex-1 justify-start  ">
                <HStack className="mt-40">
                  <EmptyState
                    icon={(props: any) => (
                      <Ionicons name="calendar-outline" {...props} />
                    )}
                    message="No bookings found"
                  />
                </HStack>
              </Center>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <Box className="items-center py-4">
                  <Spinner size="small" color="#16a8e3" />
                </Box>
              ) : allBookings.length > 0 && !hasNextPage ? (
                <Box className="items-center py-4">
                  <Text className="text-sm text-gray-500">
                    No more records.
                  </Text>
                </Box>
              ) : null
            }
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
          />
        )}
      </Box>
    </SafeAreaView>
  );
}
