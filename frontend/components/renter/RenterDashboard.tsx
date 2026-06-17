import { AvailableCarsList } from "@/components/dashboard/AvailableCarList";
import { QuickExploreCard } from "@/components/dashboard/QuickExploreCard";
import { RecentBookingCard } from "@/components/dashboard/RecentBookingCard";
import { TopTrendsSection } from "@/components/dashboard/TopTrendSection";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useToastStore } from "@/store/useToastStore";
import { getTownshipName } from "@/utils/dashboardHelpers";
import { useDashboardData } from "@/utils/userDashboardData";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  CalendarSearch,
  Car,
  ChevronUp,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import EmptyState from "../EmptyState";
import { Heading } from "../ui/heading";
import { Icon } from "../ui/icon";

const { width: SW } = Dimensions.get("window");

function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = 8,
  style = {},
}: {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "#CBD5E1",
          opacity,
        },
        style,
      ]}
    />
  );
}

function RecentBookingSkeleton() {
  return (
    <Box className="mx-4 mb-4">
      <HStack className="items-center justify-between mb-3">
        <SkeletonBlock width={140} height={18} radius={6} />
        <SkeletonBlock width={60} height={14} radius={6} />
      </HStack>

      <Box
        className="p-3 bg-white border border-gray-100 rounded-2xl"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <HStack className="gap-3">
          <SkeletonBlock width={84} height={72} radius={12} />

          <VStack className="flex-1 gap-2 pt-1">
            <SkeletonBlock width="70%" height={16} radius={6} />
            <SkeletonBlock width="50%" height={12} radius={6} />

            <HStack className="gap-4 mt-1">
              <SkeletonBlock width={50} height={12} radius={6} />
              <SkeletonBlock width={50} height={12} radius={6} />
              <SkeletonBlock width={40} height={12} radius={6} />
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </Box>
  );
}

function TopTrendsSkeleton() {
  return (
    <Box className="mb-5">
      <HStack className="items-center justify-between px-4 mb-3">
        <SkeletonBlock width={110} height={18} radius={6} />

        <HStack className="gap-2">
          <SkeletonBlock width={32} height={32} radius={16} />
          <SkeletonBlock width={32} height={32} radius={16} />
        </HStack>
      </HStack>

      <HStack style={{ paddingLeft: 16, gap: 16 }}>
        {[0, 1].map((i) => (
          <Box
            key={i}
            className="overflow-hidden bg-white border border-gray-100 rounded-3xl"
            style={{ width: SW * 0.64 }}
          >
            <SkeletonBlock width="100%" height={168} radius={0} />

            <VStack className="gap-2 px-4 pt-3 pb-4">
              <SkeletonBlock width="75%" height={16} radius={6} />

              <HStack className="gap-3">
                <SkeletonBlock width={60} height={12} radius={6} />
                <SkeletonBlock width={60} height={12} radius={6} />
              </HStack>

              <HStack className="items-center justify-between mt-1">
                <SkeletonBlock width={90} height={14} radius={6} />
                <SkeletonBlock width={72} height={28} radius={20} />
              </HStack>
            </VStack>
          </Box>
        ))}
      </HStack>
    </Box>
  );
}

function AvailableCarsSkeleton() {
  return (
    <Box className="mb-4">
      <HStack className="items-center justify-between px-4 mb-3">
        <SkeletonBlock width={150} height={18} radius={6} />

        <SkeletonBlock width={60} height={14} radius={6} />
      </HStack>

      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          className="p-3 mx-4 mb-3 bg-white border border-gray-100 rounded-2xl"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <HStack className="items-center gap-3">
            <SkeletonBlock width={84} height={64} radius={12} />

            <VStack className="flex-1 gap-2">
              <SkeletonBlock width="65%" height={15} radius={6} />
              <SkeletonBlock width="80%" height={12} radius={6} />
            </VStack>

            <SkeletonBlock width={32} height={32} radius={16} />
          </HStack>
        </Box>
      ))}
    </Box>
  );
}
export default function RenterDashboard({ navigation }: { navigation?: any }) {
  const {
    loading,
    refreshing,
    setRefreshing,
    profile,
    currentBooking,
    topTrends,
    availableCars,
    locationOptions,
    fetchData,
  } = useDashboardData();

  const router = useRouter();

  const {
    visible: toastVisible,
    message: toastMessage,
    type: toastType,
    showToast,
    hideToast,
  } = useToastStore();

  const [showButton, setShowButton] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);

  const township = getTownshipName(profile?.postal_code ?? "");

  // const [toast, setToast] = useState({
  //   visible: false,
  //   message: "",
  //   type: "success" as "success" | "error",
  // });

  // const showToast = (
  //   message: string,
  //   type: "success" | "error" = "success",
  // ) => {
  //   setToast({ visible: true, message, type });
  // };

  // const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  return (
    <View style={{ flex: 1, backgroundColor: "#f7fdff" }}>
      {/* <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      /> */}
      <ScrollView
        key={scrollKey}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setShowButton(y > 300);
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchData();
            }}
          />
        }
      >
        <QuickExploreCard
          locationOptions={locationOptions}
          loadingLocations={loading}
          userPostalCode={profile?.postal_code ?? ""}
        />

        {loading || refreshing ? (
          <RecentBookingSkeleton />
        ) : currentBooking ? (
          <RecentBookingCard
            booking={currentBooking}
            onViewAll={() => router.push("/bookings")}
            onPress={(id) => router.push(`/booking/${id}`)}
          />
        ) : (
          <VStack className="mx-4 mt-4 mb-4">
            <HStack className="items-center justify-between mb-3">
              <HStack className="items-center gap-2">
                <Icon as={CalendarDays} size="md" className="text-brand-900" />
                <Heading size="lg" className="font-extrabold text-brand-900">
                  Recent Bookings
                </Heading>
              </HStack>

              <Pressable
                onPress={() => router.push("/bookings")}
                className="active:opacity-60"
              >
                <Text className="text-sm font-semibold text-brand-600">
                  View All →
                </Text>
              </Pressable>
            </HStack>

            <EmptyState
              icon={CalendarSearch}
              iconSize={32}
              message="No active bookings"
              iconColor="#38bdf8"
              containerClassName="border-2 mt-4 mb-4 border-dashed bg-blue-50 border-blue-200 items-center justify-center py-6 rounded-[28px]"
              textClassName="text-sm text-center text-brand-600 mt-2"
            />
          </VStack>
        )}

        {loading || refreshing ? (
          <TopTrendsSkeleton />
        ) : topTrends.length > 0 ? (
          <TopTrendsSection
            topTrends={topTrends}
            onCardPress={(carId) => router.push(`/car/${carId}`)}
            onBook={(carId) =>
              router.push(`/(protected)/car/bookingForm?id=${carId}`)
            }
            onNotify={showToast}
          />
        ) : (
          <VStack className="mt-2 mb-4">
            <HStack className="items-center justify-between px-4 mb-3">
              <Heading size="lg" className="font-extrabold text-brand-900">
                Top Trends
              </Heading>
            </HStack>
            <EmptyState
              icon={Car}
              message="No trends at the moment"
              iconColor="#38bdf8"
              containerClassName="mx-4 mt-4 mb-5 border-2 border-dashed bg-blue-50 border-blue-200 items-center justify-center py-10 rounded-[28px]"
              textClassName="text-sm text-center text-brand-600 mt-2"
            />
          </VStack>
        )}

        {loading || refreshing ? (
          <AvailableCarsSkeleton />
        ) : (
          <AvailableCarsList
            cars={availableCars}
            profilePostalCode={township}
            onViewAll={() =>
              router.push({
                pathname: "/search",
              })
            }
            onCarPress={(carId) => router.push(`/car/${carId}`)}
          />
        )}
      </ScrollView>
      {showButton && (
        <TouchableOpacity
          onPress={() => {
            setScrollKey((prev) => prev + 1);
            setShowButton(false);
          }}
          className="absolute bottom-12 right-6 p-3 rounded-full bg-brand-800"
        >
          <ChevronUp size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
