import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { apiClient } from "@/lib/axios";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import tailwindConfig from "@/tailwind.config";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertOctagon,
  Archive,
  BadgeCheck,
  Car,
  Inbox,
  MapPin,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react-native";

import {
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import resolveConfig from "tailwindcss/resolveConfig";
import EmptyState from "../EmptyState";

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

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // --- HELPER FUNCTIONS ---

  /** Formats large numbers for display (e.g., 850000 -> 850K) */
  const formatK = (num: number) => {
    if (num >= 1000000)
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
  };

  // Used for the main big Heading
  const formatTotal = (num: number) => {
    // If the total is massive (e.g., over 10 Million), shorten it to keep UI clean
    if (num >= 10000000) {
      return (num / 1000000).toFixed(2) + "M";
    }
    // Otherwise, show the full formatted number for accuracy
    return new Intl.NumberFormat().format(num);
  };

  /** Handles navigation to the Bookings screen with optional status filters */
  const handleBookingNavigation = (targetStatus?: string) => {
    if (userId) {
      router.push({
        pathname: "/bookings",
        params: {
          ownerId: userId,
          status: targetStatus || "all", // Defaults to "all" if no status provided
        },
      });
    }
  };



  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["owner_dashboard", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const response = await apiClient.get(`/bookings/owner-dashboard`);
      return response.data;
    },
    enabled: !!userId,
  });

  const stats = data?.earnings || {
    total: 0,
    today: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
  };
  const businessStats = data?.overview || {
    cars: 0,
    activeRentals: 0,
    drivers: 0,
  };
  const todayTrips = data?.trips || [];
  const fleetStatus = data?.fleet || { available: 0, unavailable: 0 };
  // --- LOGIC: GROWTH PERCENTAGE ---
  const diff = stats.thisMonth - stats.lastMonth;
  const rawGrowth =
    stats.lastMonth > 0
      ? (diff / stats.lastMonth) * 100
      : stats.thisMonth > 0
        ? 100
        : 0;
  const clampedGrowth = Math.max(-100, Math.min(100, Math.round(rawGrowth)));
  const growthDisplay =
    clampedGrowth > 0 ? `+${clampedGrowth}%` : `${clampedGrowth}%`;

  if (isLoading) {
    return (
      <Box className="flex-1 justify-center items-center bg-brand-0">
        <Spinner size="large" color={brand[700]} />
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-brand-0 px-4">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30, paddingTop: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[brand[700]]}
            tintColor={brand[700]}
          />
        }
      >
        {/* SECTION: EARNINGS CARD */}
        <Box className="mb-2">
          <Box
            className="bg-white rounded-[22px] m-1 mx-1"
            style={{ ...CARD_SHADOW, backgroundColor: "white" }}
          >
            <LinearGradient
              colors={[brand[700], brand[850]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 20,
                paddingHorizontal: 22,
                borderRadius: 22,
                overflow: "hidden",
              }}
            >
              {/* Decorative Circle */}
              <Box className="absolute -top-[30px] -right-[30px] w-[140px] h-[140px] rounded-full bg-white/10" />

              {/* Top Section: Yearly Total */}
              <VStack className="gap-2">
                <Text className="text-white opacity-80 font-bold" size="sm">
                  TOTAL EARNINGS FOR THIS YEAR
                </Text>
                <Heading
                  className="text-white font-bold"
                  size="2xl"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  MMK {formatTotal(stats.thisYear || 0)}
                </Heading>
              </VStack>

              {/* Middle Section: Growth Badge */}
              <HStack className="bg-white/20 self-start px-2 py-1 rounded-md items-center gap-2 mt-3">
                <Icon
                  as={clampedGrowth >= 0 ? TrendingUp : TrendingDown}
                  color="white"
                  size="sm"
                />
                <Text className="text-white" size="sm" numberOfLines={1}>
                  {growthDisplay} this month
                </Text>
              </HStack>

              {/* Bottom Section: Stats Row */}
              <HStack className="mt-5 justify-between items-start w-full">
                <SummaryStat label="Today" value={formatK(stats.today)} />
                <SummaryStat
                  label="Last Month"
                  value={formatK(stats.lastMonth)}
                />
                <SummaryStat
                  label="This Month"
                  value={formatK(stats.thisMonth)}
                />
              </HStack>
            </LinearGradient>
          </Box>
        </Box>
        {/* SECTION: BUSINESS OVERVIEW (Cars, Rentals, Drivers) */}
        <VStack className="mt-5 gap-1">
          <Heading size="lg" className="text-brand-975">
            Business Overview
          </Heading>
          <HStack className="gap-2 overflow-visible py-2">
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-1"
              onPress={() => router.push("/owner_cars")}
            >
              <StatCard
                label="Cars"
                value={businessStats.cars.toString()}
                icon={Car}
                color={brand[700]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-1"
              onPress={() => handleBookingNavigation("approved")}
            >
              <StatCard
                label="Active Rentals"
                value={businessStats.activeRentals.toString()}
                icon={Archive}
                color={brand[700]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-1"
              onPress={() => router.push("/drivers")}
            >
              <StatCard
                label="Drivers"
                value={businessStats.drivers.toString()}
                icon={Users}
                color={brand[700]}
              />
            </TouchableOpacity>
          </HStack>
        </VStack>

        {/* SECTION: TODAY'S TRIPS LIST */}
        <VStack className="mt-5 gap-1">
          <Heading size="lg" className="text-brand-975">
            Trips Today
          </Heading>
          <Box
            className="bg-white p-4 rounded-[22px] border border-brand-100 m-1 mx-1"
            style={{ ...CARD_SHADOW, backgroundColor: "white" }}
          >
            {todayTrips.length > 0 ? (
              todayTrips.slice(0, 2).map((trip: any, index: number) => (
                <VStack key={trip.id}>
                  <TripItem
                    model={trip.Car ? `${trip.Car.brand} ${trip.Car.model}` : "Unknown Car"}
                    driver={trip.Driver?.name || "No Driver"}
                    location={trip.pickupLocation || "Not set"}
                    img={
                      trip.Car?.CarImage?.[0]?.image_url
                        ? { uri: trip.Car.CarImage[0].image_url }
                        : null
                    }
                  />
                  {/* Only show divider between items */}
                  {index === 0 && todayTrips.length > 1 && (
                    <Divider className="my-4 bg-brand-100" />
                  )}
                </VStack>
              ))
            ) : (
              <EmptyState
                icon={Inbox}
                message="No Trip Today"
                containerClassName="justify-center items-center py-6"
              />
            )}

            <Divider className="my-4 bg-brand-100" />

            <Pressable
              className="items-center p-1"
              onPress={() => handleBookingNavigation()}
            >
              <Text size="md" className="text-brand-500 font-bold">
                View All Bookings →
              </Text>
            </Pressable>
          </Box>
        </VStack>

        {/* SECTION: FLEET STATUS (Available/Unavailable) */}
        <VStack className="mt-5 gap-1">
          <HStack className="justify-between items-center">
            <Heading size="lg" className="text-brand-975">
              Fleet Status
            </Heading>
            <Pressable onPress={() => router.push("/owner_cars")}>
              <Text size="md" className="text-brand-700 font-bold">
                My Cars List →
              </Text>
            </Pressable>
          </HStack>
          <HStack className="gap-2 overflow-visible py-1">
            <StatusCard
              label="Available"
              count={fleetStatus.available.toString()}
              icon={BadgeCheck}
              className="bg-brand-200"
              iconColor={brand[925]}
            />
            <StatusCard
              label="Unavailable"
              count={fleetStatus.unavailable.toString()}
              icon={AlertOctagon}
              className="bg-brand-50"
              iconColor={brand[925]}
            />
          </HStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

// --- REUSABLE SUB-COMPONENTS (Stateless) ---

/** Small text summary inside the main gradient card */
const SummaryStat = ({ label, value }: { label: string; value: string }) => (
  <VStack className="flex-1">
    <Text className="text-white opacity-70" size="xs" numberOfLines={1}>
      {label}
    </Text>
    <Heading className="text-white" size="sm" numberOfLines={1}>
      {value}
    </Heading>
  </VStack>
);

/** Square icon card for main counts (Cars, Rentals, Drivers) */
const StatCard = ({ label, value, icon, color }: any) => (
  <Box
    className="flex-1 bg-white p-3 rounded-[24px] items-center mx-1"
    style={{ ...CARD_SHADOW, backgroundColor: "white" }}
  >
    <Icon as={icon} color={color} size="xl" />
    <Heading size="lg" className="mt-1 text-brand-975">
      {value}
    </Heading>
    <Text size="xs" className="text-brand-925 text-center" numberOfLines={1}>
      {label}
    </Text>
  </Box>
);

/** Wide status card for Available/Unavailable metrics */
const StatusCard = ({ label, count, icon, className, iconColor }: any) => (
  <HStack
    className={`flex-1 p-4 rounded-[16px] justify-between items-center m-1 ${className}`}
    style={{ ...CARD_SHADOW }}
  >
    <VStack>
      <Heading size="xl" className="text-brand-950">
        {count}
      </Heading>
      <Text size="sm" className="text-brand-925 font-medium">
        {label}
      </Text>
    </VStack>
    <Icon as={icon} color={iconColor} size="xl" />
  </HStack>
);

/** List item for Trip display showing car info and driver */
const TripItem = ({ model, driver, location, img }: any) => (
  <HStack className="gap-4 items-center">
    {img ? (
      <Image
        source={img}
        style={{ width: 60, height: 40, borderRadius: 8 }}
        resizeMode="cover"
      />
    ) : (
      <Center className="w-[60px] h-[40px] border border-dashed border-brand-300 rounded-[8px]">
        <Icon as={Car} size="md" className="text-brand-400" />
      </Center>
    )}

    {/* The flex-1 here is the secret sauce for overflow protection */}
    <VStack className="flex-1">
      <Heading size="md" className="text-brand-950" numberOfLines={1}>
        {model}
      </Heading>

      <HStack className="items-center mt-1 w-full gap-3">
        {/* Driver - shrink allows it to take only needed space */}
        <HStack className="items-center gap-1 shrink">
          <Icon as={User} size="xs" className="text-brand-500" />
          <Text size="xs" className="text-brand-925" numberOfLines={1}>
            {driver}
          </Text>
        </HStack>

        {/* Location - flex-1 takes the REST of the space and truncates */}
        <HStack className="items-center gap-1 flex-1">
          <Icon as={MapPin} size="xs" className="text-brand-500" />
          <Text
            size="xs"
            className="text-brand-925 flex-1"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {location}
          </Text>
        </HStack>
      </HStack>
    </VStack>
  </HStack>
);
