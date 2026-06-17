import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import type { CarItem } from "@/utils/dashboard";
import {
  brand,
  CARD_SHADOW,
  getCarImageSource,
  truncate,
} from "@/utils/dashboardHelpers";
import { Car, ChevronRight } from "lucide-react-native";
import React from "react";
import EmptyState from "../EmptyState";

function AvailableCarRow({
  car,
  onPress,
}: {
  car: CarItem;
  onPress: () => void;
}) {
  const imageUrl = car.car_images?.[0]?.image_url ?? null;

  return (
    <Box
      className="px-3 py-3 mx-4 mb-3 bg-white border border-gray-100 shadow-sm rounded-2xl "
      style={{
        ...CARD_SHADOW,
        borderColor: `${brand[925]}1A`,
        borderWidth: 1,
      }}
    >
      <Pressable onPress={onPress} className="active:opacity-90">

        <HStack className="items-center gap-3">
          <Box className="w-[84px] h-[64px] rounded-xl overflow-hidden bg-sky-50">
            {imageUrl ? (
              <Image
                source={getCarImageSource(car.car_images?.[0]?.image_url)}
                alt={`${car.brand} ${car.model}`}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Image
                source={getCarImageSource(car.car_images?.[0]?.image_url)}
                alt={`${car.brand} ${car.model}`}
                className="w-full h-full"
                resizeMode="cover"
              />
            )}
          </Box>

          <VStack className="flex-1 gap-0.5">
            <Text className="text-[15px] font-extrabold text-gray-900">
              {truncate(car.brand, 10)} {truncate(car.model, 10)}
            </Text>

            <HStack className="items-center gap-1">
              {car.car_type && (
                <Text className="text-xs text-gray-400">{car.car_type}</Text>
              )}

              {car.car_type && (
                <Text className="text-xs text-gray-300"> • </Text>
              )}

              <Text className="text-xs font-medium text-gray-500">
                {Number(car.price_per_day).toLocaleString()} MMK/day
              </Text>
            </HStack>
          </VStack>

          <Box className="items-center justify-center w-8 h-8 rounded-full bg-sky-100 border border-brand-300">
            <Icon as={ChevronRight} size="sm" className="text-brand-700" />
          </Box>
        </HStack>
      </Pressable>

    </Box>
  );
}

interface Props {
  cars: CarItem[];
  profilePostalCode: string | null;
  onViewAll: () => void;
  onCarPress: (carId: string) => void;
}

export function AvailableCarsList({
  cars,
  profilePostalCode,
  onViewAll,
  onCarPress,
}: Props) {
  return (
    <VStack className="">
      <HStack className="items-center justify-between px-4 mb-3">
        <Heading size="lg" className="font-extrabold text-brand-900">
          Currently Available
        </Heading>

        <Pressable onPress={onViewAll} className="active:opacity-60">
          <Text className="text-sm font-semibold text-brand-700">
            View All →
          </Text>
        </Pressable>
      </HStack>

      {cars.length > 0 ? (
        cars.map((car) => (
          <AvailableCarRow
            key={car.id}
            car={car}
            onPress={() => onCarPress(car.id)}
          />
        ))
      ) : (
        <EmptyState
          icon={Car}
          message={`No cars available${profilePostalCode ? `\nin ${profilePostalCode}` : ""}`}
          iconSize={48}
          iconColor="#38bdf8"
          containerClassName="flex-1 justify-center items-center py-8 gap-2"
          textClassName="text-sm text-center text-brand-600 mt-2"
        />
      )}
    </VStack>
  );
}
