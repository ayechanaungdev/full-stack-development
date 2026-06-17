import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuthStore } from "@/store/useAuthStore";
import type { CarItem } from "@/utils/dashboard";
import {
  brand,
  CARD_GAP,
  CARD_HEIGHT,
  CARD_SHADOW,
  CARD_STEP,
  CARD_WIDTH,
  getCarImageSource,
  truncate,
} from "@/utils/dashboardHelpers";
import {
  Bookmark,
  Car,
  ChevronLeft,
  ChevronRight,
  Star,
  Users,
  Wind,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import EmptyState from "../EmptyState";
import { Box } from "../ui/box";

function ArrowButton({
  onPress,
  icon,
  isActive,
}: {
  onPress: () => void;
  icon: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        borderColor: "#94d8f4",
        borderWidth: 2,
        backgroundColor: isActive ? "#0ea5e9" : "#e1f6fd",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </TouchableOpacity>
  );
}
interface TrendCardProps {
  car: CarItem;
  onBook: () => void;
  isWishlisted: boolean;
  onWishlistToggle: () => void;
  onCardPress: (id: string) => void;
}

const SPRING_CFG = { damping: 20, stiffness: 180, mass: 0.9 };

function TrendCard({
  car,
  onBook,
  isWishlisted,
  onWishlistToggle,
  onCardPress
}: TrendCardProps) {
  const imageUrl = car.car_images?.[0]?.image_url ?? null;

  return (
    <Pressable onPress={() => onCardPress(car.id)}>
      <Box
        className="mb-5 bg-white"
        style={{
          width: CARD_WIDTH,
          marginRight: CARD_GAP,
          borderRadius: 28,
          padding: 10,
          ...CARD_SHADOW,
          borderWidth: 2,
          borderColor: `${brand[950]}1A`,
        }}
      >
        <Box
          className="bg-slate-50 relative items-center justify-center p-10 h-[170px]"
          style={{ borderRadius: 22 }}
        >
          <Box className="absolute z-10 top-3 right-2">
            <Pressable onPress={(e) => {
              e.stopPropagation();
              onWishlistToggle();
            }} className="active:opacity-60">
              <Icon
                as={Bookmark}
                size="2xl"
                className={isWishlisted ? "text-sky-500" : "text-slate-400"}
                style={{
                  stroke: isWishlisted ? "#0EA5E9" : undefined,
                  fill: isWishlisted ? "#0EA5E9" : "none",
                }}
              />
            </Pressable>
          </Box>

          <Box className="w-full h-full overflow-hidden rounded-xl">
            <Image
              source={getCarImageSource(car?.car_images?.[0]?.image_url)}
              alt={`${car.brand} ${car.model}`}
              className="w-full h-full rounded-xl"
              resizeMode="cover"
            />
          </Box>
        </Box>

        <VStack className="gap-2 px-2 pt-4 pb-2">
          <HStack className="items-center justify-between">
            <Text className="text-[17px] font-bold flex-1 mr-2" numberOfLines={1}>
              {truncate(car.brand, 10)} {truncate(car.model, 10)}
            </Text>
            {car.average_rating !== null && (
              <HStack className="items-center gap-1 px-2 py-1 rounded-full bg-sky-50">
                <Icon as={Star} size="xs" className="text-amber-400" />
                <Text className="text-xs font-bold text-sky-600">
                  {Number(car.average_rating).toFixed(1)}
                </Text>
              </HStack>
            )}
          </HStack>

          <HStack className="gap-4">
            {car.has_ac && (
              <HStack className="items-center gap-1">
                <Icon as={Wind} size="xs" className="text-gray-400" />
                <Text className="text-xs font-medium text-gray-400">Aircon</Text>
              </HStack>
            )}
            {car.seats && (
              <HStack className="items-center gap-1">
                <Icon as={Users} size="xs" className="text-gray-400" />
                <Text className="text-xs font-medium text-gray-400">
                  {car.seats} seats
                </Text>
              </HStack>
            )}
          </HStack>

          <HStack className="items-center justify-between mt-1">
            <HStack className="items-baseline gap-1">
              <Text className="font-black text-md text-sky-900">
                {Number(car.price_per_day).toLocaleString()}
              </Text>
              <Text className="text-[10px] font-bold text-slate-400">
                MMK/day
              </Text>
            </HStack>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onBook();
              }}
              className="px-5 py-3 bg-sky-500 rounded-2xl active:opacity-80"
            >
              <Text className="text-md font-bold text-white">Book Now</Text>
            </Pressable>
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );
}

interface Props {
  topTrends: CarItem[];
  onBook: (carId: string) => void;
  onNotify: (message: string, type: "success" | "error") => void;
  onCardPress: (carId: string) => void;

}

export function TopTrendsSection({ topTrends, onBook, onNotify, onCardPress }: Props) {
  const { user } = useAuthStore();
  const { wishlist, toggleWishlist } = useWishlist();
  const total = topTrends.length;

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [activeArrow, setActiveArrow] = useState<"left" | "right" | null>(null); // ← new

  const setIndexSafe = (next: number) => {
    const clamped = Math.max(0, Math.min(next, total - 1));
    indexRef.current = clamped;
    setIndex(clamped);
  };

  const handleWishlistToggle = async (carId: string) => {
    if (!user) {
      onNotify("Please log in to save favourites.", "error");
      return;
    }
    const wasWishlisted = wishlist.some(
      (w) => String(w.car_id) === String(carId),
    );
    try {
      await toggleWishlist(carId);
      const message = wasWishlisted
        ? "Removed from wishlist"
        : "Added to wishlist";
      onNotify(message, "success");
    } catch (err) {
      onNotify("Something went wrong.", "error");
    }
  };

  const offsetX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  const goTo = (next: number, direction: "left" | "right") => {
    // ← updated signature
    const clamped = Math.max(0, Math.min(next, total - 1));
    setIndexSafe(clamped);
    setActiveArrow(direction); // ← new
    offsetX.value = withSpring(-clamped * CARD_STEP, SPRING_CFG);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragStartX.value = offsetX.value;
    })
    .onUpdate((e) => {
      const raw = dragStartX.value + e.translationX;
      const min = -(total - 1) * CARD_STEP;
      offsetX.value = Math.max(
        min - CARD_STEP * 0.15,
        Math.min(raw, CARD_STEP * 0.15),
      );
    })
    .onEnd((e) => {
      "worklet";
      const snapped = Math.max(
        0,
        Math.min(
          Math.round(-(offsetX.value + e.velocityX * 0.04) / CARD_STEP),
          total - 1,
        ),
      );
      offsetX.value = withSpring(-snapped * CARD_STEP, SPRING_CFG);
      runOnJS(setIndexSafe)(snapped);
    });

  return (
    <VStack className="mt-2 mb-4">
      <HStack className="items-center justify-between px-4 mb-3">
        <Heading size="lg" className="font-extrabold text-brand-900">
          Top Trends
        </Heading>

        {total > 1 && (
          <HStack className="gap-2">
            <ArrowButton
              onPress={() => goTo(index - 1, "left")}
              isActive={activeArrow === "left"}
              icon={
                <Icon
                  as={ChevronLeft}
                  size="sm"
                  className={
                    activeArrow === "left" ? "text-white" : "text-brand-700"
                  }
                />
              }
            />
            <ArrowButton
              onPress={() => goTo(index + 1, "right")}
              isActive={activeArrow === "right"}
              icon={
                <Icon
                  as={ChevronRight}
                  size="sm"
                  className={
                    activeArrow === "right" ? "text-white" : "text-brand-700"
                  }
                />
              }
            />
          </HStack>
        )}
      </HStack>

      {total === 0 ? (
        <EmptyState
          icon={Car}
          message="No trends at the moment"
          iconColor="#38bdf8"
          containerClassName="mx-4 mt-4 mb-5 border-2 border-dashed bg-blue-50 border-blue-200 items-center justify-center py-10 rounded-[28px]"
          textClassName="text-sm text-center text-brand-600 mt-2"
        />
      ) : (
        <View
          style={{
            height: CARD_HEIGHT,
            overflow: "hidden",
            paddingLeft: 16,
            paddingBottom: 20,
          }}
        >
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                { flexDirection: "row", height: CARD_HEIGHT },
                animatedStyle,
              ]}
            >
              {topTrends.map((car) => (
                <TrendCard
                  key={car.id}
                  car={car}
                  onBook={() => onBook(car.id)}
                  onCardPress={onCardPress}
                  isWishlisted={wishlist.some(
                    (w) => String(w.car_id) === String(car.id),
                  )}
                  onWishlistToggle={() => handleWishlistToggle(car.id)}
                />
              ))}
            </Animated.View>
          </GestureDetector>
        </View>
      )}
    </VStack>
  );
}
