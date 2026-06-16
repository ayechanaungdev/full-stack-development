import EmptyState from "@/components/EmptyState";
import { Divider } from "@/components/ui/divider";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { brand } from "@/utils/dashboardHelpers";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { Search } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, BadgeText } from "../../../components/ui/badge";
import { Box } from "../../../components/ui/box";
import { HStack } from "../../../components/ui/hstack";
import { Image } from "../../../components/ui/image";
import {
  Input,
  InputField,
  InputIcon,
  InputSlot,
} from "../../../components/ui/input";
import { Pressable } from "../../../components/ui/pressable";
import { Spinner } from "../../../components/ui/spinner";
import { Switch } from "../../../components/ui/switch";
import { Text } from "../../../components/ui/text";
import { VStack } from "../../../components/ui/vstack";
interface Car {
  id: string;
  brand: string;
  model: string;
  price_per_day: number;
  seats?: number;
  car_type?: string;
  car_number: string | null;
  status?: "available" | "pending" | "unavailable";
  image_url?: string;
  car_images: { image_url: string }[];
}

type CarsPage = {
  cars: Car[];
  count: number;
  nextPage?: number;
};

const CARS_PAGE_SIZE = 10;

const getSearchTerms = (search: string) =>
  search.trim().toLowerCase().split(/\s+/).filter(Boolean);

// car_status colors
const getStatusStyle = (status?: string | null) => {
  const safeStatus = status?.toLowerCase() || "unknown";

  switch (safeStatus) {
    case "available":
      return {
        bg: "bg-success-0",
        text: "text-success-700",
        stroke: "border-success-100",
      };
    case "pending":
      return {
        bg: "bg-warning-0",
        text: "text-warning-700",
        stroke: "border-warning-100",
      };
    case "unavailable":
      return {
        bg: "bg-error-0",
        text: "text-error-700",
        stroke: "border-error-100",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-500",
        stroke: "border-gray-100",
      };
  }
};

export default function OwnerCarsScreen() {
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("All Cars");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(handler);
  }, [search]);

  const {
    data,
    isLoading: loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch: fetchData,
  } = useInfiniteQuery({
    queryKey: [
      "owner_cars",
      user?.id,
      "list",
      debouncedSearch,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) {
        return { cars: [], count: 0 } as CarsPage;
      }

      const page = Number(pageParam);
      const from = page * CARS_PAGE_SIZE;
      const to = from + CARS_PAGE_SIZE - 1;

      let query = supabase
        .from("cars")
        .select(
          `
          id, brand, model, price_per_day, seats, car_type,car_number, status,
          car_images!left(image_url)
        `,
          { count: "exact" },
        )
        .eq("owner_id", user.id);



      const terms = getSearchTerms(debouncedSearch);
      if (terms.length > 0) {
        const searchStr = `%${debouncedSearch.trim()}%`;
        query = query.or(`brand.ilike.${searchStr},model.ilike.${searchStr},car_number.ilike.${searchStr}`);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const cars = (data || []).map((car: any) => ({
        ...car,
        car_images: car.car_images || [],
        status: car.status?.toLowerCase(),
      })) as Car[];
      const totalCount = count ?? 0;
      const nextPage = to + 1 < totalCount ? page + 1 : undefined;

      return { cars, count: totalCount, nextPage };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user?.id,
  });

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchData();
      }
    }, [fetchData, user?.id]),
  );

  const cars = useMemo(
    () => data?.pages.flatMap((page) => page.cars) ?? [],
    [data],
  );
  const totalCars = data?.pages[0]?.count ?? 0;
  const isSearching = search.trim().length > 0;

  const filteredCars = useMemo(() => {
    let result = cars;

    if (selectedBrand !== "All Cars") {
      result = result.filter((car) => car.brand === selectedBrand);
    }

    if (showAvailableOnly) {
      result = result.filter((car) => car.status === "available");
    }

    return result;
  }, [cars, selectedBrand, showAvailableOnly]);

  const { data: carBrands = [] } = useQuery({
    queryKey: ["owner_cars", user?.id, "brands"],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("cars")
        .select("brand")
        .eq("owner_id", user.id)
        .order("brand", { ascending: true });

      if (error) throw error;

      return [...new Set((data || []).map((car) => car.brand))];
    },
    enabled: !!user?.id,
  });

  const brands = useMemo(() => {
    return ["All Cars", ...carBrands];
  }, [carBrands]);

  // if data fetch from supabase fails
  if (error) {
    return (
      <Box className="flex-1 justify-center items-center p-4 bg-brand-0">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={40}
          color="#EF4444"
        />
        <Text className="text-center mt-2 text-gray-600">
          {error instanceof Error ? error.message : "Error fetching data"}
        </Text>
        <TouchableOpacity
          onPress={() => fetchData()}
          className="mt-4 bg-brand-600 px-8 py-2 rounded-full"
        >
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  const renderCarCard = ({ item }: { item: Car }) => {
    const imageSource = item.car_images?.[0]?.image_url
      ? { uri: item.car_images[0].image_url }
      : require("@/assets/images/icon.png");

    const style = getStatusStyle(item.status);
    return (
      <Box className="bg-white rounded-2xl p-2 border border-gray-300 shadow-sm mb-1">
        <Pressable onPress={() => router.push(`/car/${item.id}`)}>
          <HStack space="xl" className="items-center">
            <Box className="w-36 h-32 rounded-2xl overflow-hidden bg-gray-100 mr-2">
              <Image
                source={imageSource}
                className="w-full h-full"
                alt="Car"
                resizeMode={
                  item.car_images?.[0]?.image_url ? "cover" : "contain"
                }
              />
            </Box>
            {/* Car Details */}
            <VStack className="flex-1 relative" space="xs">
              {item.status && (
                <Box
                  className={`absolute -top-2 right-2 z-10 h-[22px] border rounded-full px-3 items-center justify-center ${style.bg} ${style.stroke}`}
                >
                  <Text
                    className={`text-[10px] capitalize font-bold leading-none ${style.text}`}
                  >
                    {item.status}
                  </Text>
                </Box>
              )}

              <HStack className="justify-between items-center">
                {/* Short ID Badge (car_no)*/}
                <Badge
                  variant="outline"
                  action="info"
                  className="py-0 px-1.5 rounded items-center justify-center border border-brand-600 bg-brand-50"
                >
                  <HStack space="xs" className="items-center">
                    <MaterialCommunityIcons
                      name="card-text-outline"
                      size={14}
                      color="#16a8e3" // Matches brand-700
                    />
                    <BadgeText className="text-brand-700 text-sm uppercase font-bold leading-none">
                      {item.car_number}
                    </BadgeText>
                  </HStack>
                </Badge>
              </HStack>

              {/* Car Brand/Model/Price info... */}
              <VStack>
                <HStack space="xs" className="flex-1">
                  <Text size="sm" className="text-gray-500 font-bold">
                    Brand:
                  </Text>
                  <Text
                    size="sm"
                    className="text-gray-500 flex-1"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.brand}
                  </Text>
                </HStack>
                <HStack space="xs">
                  <Text size="sm" className="text-gray-500 font-bold">
                    Model:
                  </Text>
                  <Text
                    size="sm"
                    className="text-gray-500 flex-1"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.model}
                  </Text>
                </HStack>
                <HStack space="xs">
                  <Text size="sm" className="text-gray-500 font-bold">
                    Capacity:
                  </Text>
                  <Text size="sm" className="text-gray-500">
                    {item.seats ?? "—"} seats
                  </Text>
                </HStack>
                <HStack space="xs">
                  <Text size="sm" className="text-gray-500 font-bold">
                    Price:
                  </Text>
                  <Text size="sm" className="text-gray-500">
                    {item.price_per_day.toLocaleString()} mmk/day
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </HStack>
        </Pressable>
      </Box>
    );
  };

  if (loading)
    return (
      <Box className="flex-1 justify-center items-center bg-brand-0">
        <Spinner size="large" color="#16a8e3" />
      </Box>
    );

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-brand-0 pt-2">
      <Box className="flex-1 px-4">
        {/* Search Input */}
        <Box className="items-center w-full mb-2">
          <Input
            size="lg"
            className="bg-brand-0 h-11 rounded-lg border-gray-300"
          >
            <InputField
              placeholder="Search Your Car by model, brand, car no., or status"
              value={search}
              onChangeText={setSearch}
              className="text-md"
              maxLength={30}
            />

            {/* The Search/Clear Icon */}
            <InputSlot className="pr-3">
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close" size={22} color="#D4D4D4" />
                </TouchableOpacity>
              ) : (
                <InputIcon
                  as={(props: any) => <Search {...props} strokeWidth={2} />}
                  className="w-6 h-[26px]"
                  color="#16a8e3"
                />
              )}
            </InputSlot>
          </Input>
        </Box>

        {/* Available Toggle */}
        <HStack className="items-center justify-between mb-2">
          <Text className="text-brand-925 font-bold">
            Show Available Cars Only
          </Text>
          <Switch
            value={showAvailableOnly}
            onValueChange={setShowAvailableOnly}
            trackColor={{ false: "#D4D4D4", true: "#16a8e3" }}
          />
        </HStack>

        {/* Horizontal Brand Filter */}
        <Box className="mb-2 h-10">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={brands}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isActive = selectedBrand === item;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedBrand(item)}
                  className={`px-4 py-2 rounded-full mr-2 h-10 border items-center justify-center ${isActive
                    ? "bg-brand-700 border-brand-700"
                    : "bg-white border-outline-300"
                    }`}
                >
                  <Text
                    className={`text-sm font-bold ${isActive
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-300"
                      }`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </Box>

        <HStack className="items-center my-2 w-full">
          <Text className="font-bold text-gray-600 dark:text-gray-200 leading-none">
            {filteredCars.length}
            {" out of "}
            {totalCars}
            {" cars showing"}
          </Text>
          <Divider className="flex-1 ml-1 bg-outline-200" />
        </HStack>

        {/* Car List */}
        <FlatList
          data={filteredCars}
          keyExtractor={(item) => item.id}
          renderItem={renderCarCard}
          contentContainerStyle={{ paddingBottom: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => fetchData()}
              tintColor={brand[500]}
              colors={[brand[500]]}
            />
          }
          ListEmptyComponent={() => (
            <EmptyState
              icon={(props: any) => <Ionicons name="car-outline" {...props} />}
              message="No Records Found."
            />
          )}
          ListFooterComponent={
            isSearching ? null : isFetchingNextPage ? (
              <Box className="items-center py-4">
                <Spinner size="small" color="#16a8e3" />
              </Box>
            ) : filteredCars.length > 0 && !hasNextPage ? (
              <Box className="items-center py-4">
                <Text className="text-sm text-gray-500">No more records</Text>
              </Box>
            ) : null
          }
          ItemSeparatorComponent={() => <Box className="h-2" />}
          onEndReached={() => {
            if (!isSearching && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
        />
      </Box>

      {/* Add New Car Button */}
      <TouchableOpacity
        onPress={() => router.push("/(protected)/car/addcar")}
        style={{ elevation: 5 }}
        className="absolute bottom-5 right-5 rounded-full px-4 py-3 bg-sky-500 flex-row items-center"
      >
        <Ionicons name="add-circle-outline" size={20} color="white" />
        <Text className="text-white ml-3">Add New Car</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
