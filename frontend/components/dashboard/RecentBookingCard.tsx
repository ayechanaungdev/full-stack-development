import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { Booking } from "@/utils/dashboard";
import {
  brand,
  CARD_SHADOW,
  daysBetween,
  fmtShortDate,
  getCarImageSource,
  getStatusStyle,
  truncate,
} from "@/utils/dashboardHelpers";
import { CalendarDays, CalendarSearch, MapPin } from "lucide-react-native";
import React from "react";

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  booking: Booking;
  onViewAll: () => void;
  onPress: (id: string) => void;
}

export function RecentBookingCard({ booking, onViewAll, onPress }: CardProps) {
  const car = booking.cars;
  const imageUrl = car?.car_images?.[0]?.image_url ?? null;
  const { pill, label } = getStatusStyle(booking.status);
  const days =
    booking.start_date === booking.end_date
      ? 1
      : daysBetween(booking.start_date, booking.end_date) + 1;
  return (
    <VStack className="mx-4 mt-4 mb-4">
      <HStack className="items-center justify-between mb-3">
        <HStack className="items-center gap-2">
          <Icon as={CalendarDays} size="md" className="text-brand-900" />

          <Heading size="lg" className="font-extrabold text-brand-900">
            Recent Bookings
          </Heading>
        </HStack>

        <Pressable onPress={onViewAll} className="active:opacity-60">
          <Text className="text-sm font-semibold text-brand-600">
            View All →
          </Text>
        </Pressable>
      </HStack>

      <Box
        className="p-3 mb-4 mt-1 bg-white rounded-3xl"
        style={{
          ...CARD_SHADOW,
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: `${brand[925]}1A`,
        }}
      >
        <Pressable
          onPress={() => onPress(booking.id)}
          className="active:opacity-90"
        >
          <HStack className="items-start gap-3">
            <Box className="w-[84px] h-[80px] rounded-xl overflow-hidden bg-sky-50 border border-sky-100">
              <Image
                source={getCarImageSource(car?.car_images?.[0]?.image_url)}
                alt={car?.brand}
                className="w-full h-full"
                resizeMode="cover"
              />
            </Box>
            <VStack className="flex-1">
              <HStack className="items-center justify-between mb-1">
                <Text
                  className="text-base font-extrabold text-brand-900"
                  numberOfLines={1}
                >
                  {truncate(car?.brand, 12)} {truncate(car?.model, 10)}
                </Text>

                <Box className={`px-2 py-0.5 rounded-full ${pill}`}>
                  <Text
                    className={`text-[10px] font-extrabold uppercase tracking-widest ${label}`}
                  >
                    {booking.status}
                  </Text>
                </Box>
              </HStack>

              {/* Location */}

              <HStack className="items-center gap-1 mb-2">
                <Icon as={MapPin} size="xs" className="text-gray-400" />
                <Text className="text-xs text-gray-400">
                  {truncate(car?.location, 30)}
                </Text>
              </HStack>

              {/* Pick Up / Return / Days */}

              <HStack className="gap-5 mt-2 ml-2 ">
                <VStack>
                  <Text className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                    Pick Up
                  </Text>

                  <Text className="text-sm font-extrabold text-gray-700">
                    {fmtShortDate(booking.start_date)}
                  </Text>
                </VStack>

                <VStack>
                  <Text className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                    Return
                  </Text>

                  <Text className="text-sm font-extrabold text-gray-700">
                    {fmtShortDate(booking.end_date)}
                  </Text>
                </VStack>

                <VStack>
                  <Text className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                    Days
                  </Text>

                  <Text className="text-sm font-extrabold text-sky-500">
                    {days} {days === 1 ? "day" : "days"}
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </HStack>
        </Pressable>
      </Box>
    </VStack>
  );
}

interface PlaceholderProps {
  onPress: () => void;
}
export function NoBookingPlaceholder({ onPress }: PlaceholderProps) {
  return (
    <Pressable onPress={onPress} className="mx-4 mb-4 active:opacity-80">
      <Box className="items-center gap-2 p-5 border bg-sky-50 border-sky-100 rounded-2xl">
        <Icon as={CalendarSearch} size="xl" className="text-sky-400" />

        <Text className="text-sm font-bold text-sky-700">
          No active bookings
        </Text>

        <Text className="text-xs text-center text-sky-400">
          Tap to explore and find your next ride
        </Text>
      </Box>
    </Pressable>
  );
}
