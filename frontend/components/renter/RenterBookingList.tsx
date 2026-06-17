import EmptyState from "@/components/EmptyState";
import MonthYearPicker from "@/components/month_year_picker";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { SearchIcon } from "@/components/ui/icon";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";

import { supabase } from "@/lib/supabase";
import { CARD_SHADOW } from "@/utils/dashboardHelpers";

import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";

import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { MapPinIcon } from "lucide-react-native";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import useToastStore from "@/store/useToastStore";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
} from "react-native";
interface Props {
  renterId: string;
}

interface BookingListItem {
  id: string;
  status: string;
  total_price: number;
  start_date: string;
  pickup_location?: string | null;
  pickup_time: string;
  dropoff_time: string;
  dropoff_location?: string | null;
  end_date: string;
  brand: string;
  model: string;
  image_url: string;
}

const PAGE_SIZE = 10;

const MONTHS_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const getStatusStyle = (status?: string | null) => {
  const safeStatus = status?.toLowerCase() || "unknown";

  switch (safeStatus) {
    case "approved":
      return {
        bg: "bg-info-0",
        text: "text-info-700",
        stroke: "border-info-100",
        activeStroke: "border-info-900",
      };

    case "completed":
      return {
        bg: "bg-success-0",
        text: "text-success-700",
        stroke: "border-success-100",
        activeStroke: "border-success-900",
      };

    case "pending":
      return {
        bg: "bg-warning-0",
        text: "text-warning-700",
        stroke: "border-warning-100",
        activeStroke: "border-warning-900",
      };

    case "cancelled":
      return {
        bg: "bg-error-0",
        text: "text-error-700",
        stroke: "border-error-100",
        activeStroke: "border-error-900",
      };

    case "rejected":
      return {
        bg: "bg-error-50",
        text: "text-error-800",
        stroke: "border-error-100",
        activeStroke: "border-error-900",
      };

    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-500",
        stroke: "border-gray-100",
        activeStroke: "border-gray-900",
      };
  }
};

export default function RenterBookingList({ renterId }: Props) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [cars, setCars] = useState<BookingListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const {
    visible: toastVisible,
    message: toastMessage,
    type: toastType,
    showToast,
    hideToast,
  } = useToastStore();

  const formatBookingId = (id: string) => {
    return id.length > 13
      ? `${id.toUpperCase().slice(0, 13)}...`
      : id.toUpperCase();
  };

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

  const fetchBookings = useCallback(
    async (pageNumber = 0, refresh = false) => {
      try {
        if (!renterId) return;
        if (loadingMore && !refresh) return;

        setFetchError("");
        if (pageNumber === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const from = pageNumber * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("bookings")
          .select(
            `
          id,
          status,
          total_price,
          start_date,
          pickup_location,
          pickup_time,
          dropoff_location,
          dropoff_time,
          end_date,
          car:cars (
            brand,
            model,
            car_images (
              image_url,
              is_primary
            )
          )
        `,
            { count: "exact" },
          )
          .eq("customer_id", renterId)
          .order("start_date", { ascending: false })
          .range(from, to);

        if (selectedStatus !== "All") {
          query = query.eq("status", selectedStatus.toLowerCase());
        }

        if (filterMonth !== null && filterYear !== null) {
          const startDate = new Date(filterYear, filterMonth, 1);
          const endDate = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);
          query = query
            .gte("start_date", startDate.toISOString())
            .lte("start_date", endDate.toISOString());
        }

        const { data, error, count } = await query;
        if (error) throw error;

        setTotalCount(count || 0);

        const mappedData = (data || []).map((item: any) => {
          const primaryImage =
            item.car?.car_images?.find((img: any) => img.is_primary) ||
            item.car?.car_images?.[0];

          return {
            id: item.id,
            status: item.status,
            total_price: item.total_price,
            start_date: item.start_date,
            pickup_location: item.pickup_location ?? "Not specified",
            pickup_time: item.pickup_time,
            dropoff_location: item.dropoff_location ?? "Not specified",
            dropoff_time: item.dropoff_time,
            end_date: item.end_date,
            brand: item.car?.brand || "",
            model: item.car?.model || "",
            image_url: primaryImage?.image_url || "",
          };
        });

        if (refresh || pageNumber === 0) {
          setCars(mappedData);
        } else {
          setCars((prev) => {
            const merged = [...prev, ...mappedData];
            return merged.filter(
              (item, index, self) =>
                index === self.findIndex((t) => t.id === item.id),
            );
          });
        }

        const loadedItems = from + mappedData.length;
        setHasMore(loadedItems < (count || 0));
      } catch (error: any) {
        console.error("Fetch bookings error:", error);
        setFetchError(error?.message || "Failed to load bookings");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [renterId, selectedStatus, filterMonth, filterYear, loadingMore],
  );

  const copyBookingIdToClipboard = async (bookingId: string) => {
    if (!bookingId) return;
    await Clipboard.setStringAsync(bookingId);
    showToast("Car number copied to clipboard.", "success");
  };

  useEffect(() => {
    if (!renterId) return;
    setPage(0);
    setHasMore(true);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    fetchBookings(0, true);
  }, [renterId, selectedStatus, filterMonth, filterYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await fetchBookings(0, true);
  };

  const handleLoadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchBookings(nextPage);
  };

  const filteredCars = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return cars;

    return cars.filter((car) => {
      return (
        car.id.toLowerCase().includes(query) ||
        car.brand.toLowerCase().includes(query) ||
        car.model.toLowerCase().includes(query) ||
        (car.pickup_location ?? "").toLowerCase().includes(query)
      );
    });
  }, [cars, searchQuery]);

  const renderItem = ({ item }: { item: BookingListItem }) => {
    const style = getStatusStyle(item.status);
    const carTitle =
      item.brand || item.model
        ? `${item.brand} ${item.model}`
        : "Car not available";

    return (
      <Pressable
        onPress={() => router.push(`/booking/${item.id}`)}
        className="mx-4 mb-4"
      >
        <Box
          className="bg-white rounded-[22px] m-1 p-4"
          style={{
            ...CARD_SHADOW,
            backgroundColor: "white",
          }}
        >
          {/* HEADER */}
          <HStack className="items-center">
            <Box className="w-24 h-20 rounded-xl overflow-hidden bg-brand-50">
              <Image
                source={
                  item.image_url
                    ? { uri: item.image_url }
                    : require("@/assets/images/icon.png")
                }
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </Box>

            <VStack className="ml-2 flex-1">
              <HStack className="justify-between items-center">
                <Text
                  className="text-typography-800 font-semibold text-md"
                  style={{ maxWidth: "70%" }}
                  numberOfLines={1}
                >
                  {carTitle}
                </Text>

                <Box
                  className={`px-3 py-1 rounded-full border ${style.bg} ${style.stroke}`}
                >
                  <Text
                    className={`text-xs font-semibold capitalize ${style.text}`}
                  >
                    {String(item.status)}
                  </Text>
                </Box>
              </HStack>

              <HStack className="items-center mt-1">
                <Pressable
                  onPress={() => copyBookingIdToClipboard(item.id)}
                  onLongPress={() => copyBookingIdToClipboard(item.id)}
                  className="flex-row items-center"
                >
                  <Text className="text-xs text-gray-400 mt-1">
                    {`${formatBookingId(item.id)}`}
                  </Text>
                </Pressable>
                <Pressable
                  className="p-1 rounded-full ml-2 active:bg-gray-100"
                  onPress={() => copyBookingIdToClipboard(item.id)}
                >
                  <Ionicons name="copy-outline" size={12} color="#16a8e3" />
                </Pressable>
              </HStack>
            </VStack>
          </HStack>

          <Divider className="my-2 h-[0.5px] border-none bg-slate-300" />

          {/* PICKUP / DROPOFF */}
          <HStack className="items-center">
            {/* PICKUP */}
            <VStack className="flex-1 items-center px-2">
              <HStack className="items-center">
                <MapPinIcon size={20} color="#32B6EA" />
                <Text className="text-md font-bold ml-2">Pick-up:</Text>
              </HStack>

              <HStack className="items-center gap-2 mt-1">
                <Text className="text-sm text-typography-600">
                  {item.start_date
                    ? String(item.start_date).split("-").reverse().join("-")
                    : "--/--/----"}
                </Text>

                <Box className="min-w-[40px] h-5 px-2 border border-brand-700 rounded-full items-center justify-center">
                  <Text className="text-[11px] text-brand-700 font-medium text-center">
                    {String(formatTo12Hour(item.pickup_time))}
                  </Text>
                </Box>
              </HStack>

              <Text
                className="text-sm text-typography-400 mt-1 text-center"
                numberOfLines={2}
              >
                {String(item.pickup_location || "Not specified")}
              </Text>
            </VStack>

            {/* DROPOFF */}
            <VStack className="flex-1 items-center px-2">
              <HStack className="items-center">
                <FontAwesome name="map-pin" size={20} color="red" />
                <Text className="text-md font-bold ml-2">Drop-off:</Text>
              </HStack>

              <HStack className="items-center gap-2 mt-1">
                <Text className="text-sm text-typography-600">
                  {item.end_date
                    ? String(item.end_date).split("-").reverse().join("-")
                    : "--/--/----"}
                </Text>

                <Box className="min-w-[40px] h-5 px-2 border border-brand-700 rounded-full items-center justify-center">
                  <Text className="text-[11px] text-brand-700 font-medium text-center">
                    {String(formatTo12Hour(item.dropoff_time))}
                  </Text>
                </Box>
              </HStack>

              <Text
                className="text-sm text-typography-400 mt-1 text-center"
                numberOfLines={2}
              >
                {String(item.dropoff_location || "Not specified")}
              </Text>
            </VStack>
          </HStack>

          <Divider className="my-3 h-[0.5px] border-none bg-slate-300" />

          {/* FOOTER */}
          <HStack className="justify-between items-center">
            <VStack>
              <Text className="text-xs text-gray-500">Total Price</Text>
              <Text className="text-lg font-bold text-brand-700">
                {`${item.total_price?.toLocaleString()} MMK`}
              </Text>
            </VStack>

            <Text className="text-brand-700 font-semibold">View Details →</Text>
          </HStack>
        </Box>
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <Box className="py-5">
          <ActivityIndicator size="small" color="#16A8E3" />
          <Text className="text-center text-xs text-gray-500 mt-2">
            Loading more bookings...
          </Text>
        </Box>
      );
    }

    if (cars.length > 0 && !hasMore) {
      return (
        <Box className="py-6">
          <Text className="text-center text-sm text-gray-400 font-bold">
            No more records
          </Text>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box className="flex-1 bg-brand-0">
      {/* SEARCH */}
      <HStack className="px-4 pt-4 pb-2 items-center" space="sm">
        <Box className="flex-1">
          <Input className="bg-white rounded-xl px-3 h-11">
            <InputField
              placeholder="Search bookings..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="text-sm"
              maxLength={30}
            />

            <InputSlot>
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Entypo name="cross" size={18} color="#9CA3AF" />
                </Pressable>
              ) : (
                <SearchIcon
                  className="text-gray-400"
                  width={14}
                  height={14}
                  fill="white"
                  stroke="#9CA3AF"
                />
              )}
            </InputSlot>
          </Input>
        </Box>

        {/* DATE FILTER */}
        <HStack space="xs">
          <Pressable
            onPress={() => setIsPickerOpen(true)}
            className="bg-white h-11 px-3 rounded-xl border border-gray-200 flex-row items-center"
          >
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text className="text-xs text-gray-600 ml-1 font-medium">
              {filterMonth !== null && filterYear !== null
                ? `${MONTHS_SHORT[filterMonth]} ${filterYear}`
                : "Date"}
            </Text>
          </Pressable>

          {(filterMonth !== null || filterYear !== null) && (
            <Pressable
              onPress={() => {
                setFilterMonth(null);
                setFilterYear(null);
              }}
              className="bg-gray-100 h-11 px-2.5 rounded-xl items-center justify-center border border-gray-200"
            >
              <Ionicons name="refresh" size={14} color="#EF4444" />
            </Pressable>
          )}
        </HStack>
      </HStack>

      {/* MONTH PICKER */}
      <MonthYearPicker
        isOpen={isPickerOpen}
        initialMonth={filterMonth ?? new Date().getMonth()}
        initialYear={filterYear ?? new Date().getFullYear()}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(month, year) => {
          setFilterMonth(month);
          setFilterYear(year);
          setIsPickerOpen(false);
        }}
      />

      {/* STATUS TABS */}
      <Box style={{ height: 60 }} className="pb-3 mt-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 pb-3 mt-3"
          contentContainerStyle={{
            gap: 8,
            paddingRight: 16,
          }}
        >
          {[
            "All",
            "Completed",
            "Approved",
            "Pending",
            "Cancelled",
            "Rejected",
          ].map((status) => {
            const isActive = selectedStatus === status;
            const style =
              status === "All"
                ? {
                    bg: "bg-gray-200",
                    text: "text-gray-700",
                    stroke: "border-gray-100",
                    activeStroke: "border-gray-900",
                  }
                : getStatusStyle(status.toLowerCase());

            return (
              <Pressable
                key={status}
                onPress={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg border ${
                  isActive
                    ? `${style.bg} ${style.activeStroke}`
                    : `${style.bg} ${style.stroke}`
                }`}
              >
                <Text
                  className={`text-xs ${style.text} ${
                    isActive ? "font-semibold" : "font-normal"
                  }`}
                >
                  {status}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Box>

      {/* TOTAL INFO */}
      {!loading && (
        <HStack className="justify-between px-5">
          <Text className="text-xs text-brand-700 font-bold">
            {`${cars.length} out of  ${totalCount} showing`}
          </Text>
        </HStack>
      )}
      <Box className="px-5">
      <Divider className=" mb-2 mt-1 h-[0.5px] border-none bg-slate-300" />
      </Box>

      {/* LOADING */}
      {loading ? (
        <Box className="flex-1 justify-center items-center">
          <Spinner size="large" color="#16A8E3" />
        </Box>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredCars}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 30,
            flexGrow: 1,
          }}
          removeClippedSubviews
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#16A8E3"
              colors={["#16A8E3"]}
            />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              icon={(props: any) => (
                <Ionicons name="calendar-outline" {...props} />
              )}
              message={fetchError || "No bookings found"}
            />
          }
        />
      )}
    </Box>
  );
}
