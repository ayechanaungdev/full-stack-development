import { CarListItem } from "@/app/(protected)/(home)/search";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import tailwindConfig from "@/tailwind.config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, TouchableOpacity } from "react-native";
import resolveConfig from "tailwindcss/resolveConfig";
import townships from "../constants/yangon-townships.json";
import { Icon } from "./ui/icon";

type CarCardProps = {
  car: CarListItem;
  isGrid: boolean;
  isWishlist?: boolean;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  onPress: () => void;
};

const fullConfig = resolveConfig(tailwindConfig) as any;
const brand = fullConfig.theme.colors.brand;
export const shadowStyle = {
  shadowColor: brand[925],
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

export const getImageUrl = (car: CarListItem) => {
  const url = car.car_images?.[0]?.image_url;
  if (!url) return null;
  if (!url.startsWith("http")) {
    return null;
  }

  return url.replace("https://https://", "https://");
};

const getRating = (car: CarListItem): number => {
  return car.avg_rating ?? 0;
};

export default function CarCard({
  car,
  isGrid,
  wishlist,
  toggleWishlist,
  onPress,
}: CarCardProps) {
  const isWishlisted = wishlist.includes(car.id);
  const [imgError, setImgError] = useState(false);
  const rating = getRating(car);

  useEffect(() => {
    setImgError(false);
  }, [car.id]);

  const imageUrl = getImageUrl(car);

  if (isGrid) {
    return (
      <TouchableOpacity
        style={shadowStyle}
        className="w-[48%] mb-4 bg-white border border-outline-100 rounded-2xl overflow-hidden"
        onPress={onPress}
      >
        {/* Image+ rating+ Wishlist */}
        <Box className="relative h-[90px] bg-brand-100 overflow-hidden">
          <Image
            source={
              !imageUrl || imgError
                ? require("@/assets/images/icon.png")
                : { uri: imageUrl }
            }
            style={{ width: "100%", height: "100%" }}
            onError={() => setImgError(true)}
            resizeMode={!imageUrl || imgError ? "contain" : "cover"}
          />

          {/* Rating */}
          <Box className="absolute left-2 top-2 bg-white px-2 py-[2px] rounded-full flex-row items-center">
            <Ionicons name="star" size={10} color="#facc15" />
            <Text className="ml-1 text-gray-700 text-[9px]">
              <Text className="text-[10px] font-bold">{rating.toFixed(1)}</Text>{" "}
              ({car.review_count || 0})
            </Text>
          </Box>

          {/* Wishlist */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              toggleWishlist(car.id);
            }}
            className="absolute right-2 top-2 p-1.5 rounded-full bg-white/80 border border-gray-100"
          >
            <Ionicons
              name={isWishlisted ? "bookmark" : "bookmark-outline"}
              size={18}
              color="#16a8e3"
            />
          </Pressable>

          <Box className="absolute right-2 bottom-2 bg-brand-100 px-3 py-[2px] rounded-xl border border-gray-200">
            <Text className="text-[8px] font-bold uppercase text-brand-700">
              {car.car_type || "-"}
            </Text>
          </Box>
        </Box>

        {/* Content */}
        <VStack className="px-3 py-3 gap-2">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-[12px] font-bold text-brand-900"
          >
            {car.brand} {car.model}
          </Text>

          <HStack className="items-center">
            <HStack className="items-center">
              <MaterialCommunityIcons
                name="seat-recline-normal"
                size={11}
                color="#525252"
              />
              <Text className="text-[10px] text-gray-600 ml-1">
                {car.seats ?? "-"} Seats
              </Text>
            </HStack>

            {/* Township */}
            <Text className="text-gray-500 mx-2 text-[9px]">•</Text>

            <HStack className="items-center flex-1 min-w-0">
              <Ionicons name="location-outline" size={11} color="#525252" />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="text-[10px] text-gray-600 ml-1 flex-1"
              >
                {car.postal_code
                  ? townships.find(
                      (t) => String(t.postalCode) === String(car.postal_code),
                    )?.name || "-"
                  : "-"}
              </Text>
            </HStack>
          </HStack>

          <HStack className="items-end justify-end mt-auto">
            <HStack className="items-end">
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="text-[13px] font-bold text-black"
              >
                {car.price_per_day.toLocaleString()}
              </Text>
              <Text className="text-[10px] text-gray-600 ml-1 mb-[1px]">
                MMK /day
              </Text>
            </HStack>
          </HStack>
        </VStack>
      </TouchableOpacity>
    );
  }

  //  List Layout
  return (
    <TouchableOpacity
      style={shadowStyle}
      className="w-full mb-4 bg-white border border-outline-100 rounded-2xl overflow-hidden"
      onPress={onPress}
    >
      <HStack className="w-full p-3">
        {/* LEFT IMAGE */}
        <Box className="w-[110px] h-[82px] relative rounded-2xl overflow-hidden bg-brand-100">
          <Image
            source={
              !imageUrl || imgError
                ? require("@/assets/images/icon.png")
                : { uri: imageUrl }
            }
            onError={() => setImgError(true)}
            resizeMode={!imageUrl || imgError ? "contain" : "cover"}
            className="w-full h-full"
          />
        </Box>

        {/* RIGHT CONTENT */}
        <Box className="flex-1 ml-3 h-[82px]">
          <VStack className="flex-1">
            {/* Top Row */}
            <HStack className="items-start justify-between">
              <VStack className="flex-1 pr-2">
                {/* Brand + Model */}
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-[14px] font-bold text-brand-900 leading-[20px]"
                >
                  {car.brand} {car.model}
                </Text>

                {/* Rating */}
                <HStack className="items-center mt-[2px] gap-x-[1px]">
                  {[1, 2, 3, 4, 5].map((i) => {
                    const full = i <= Math.floor(rating);
                    const half = i === Math.ceil(rating) && !full;

                    return (
                      <Box key={i} className="w-4 h-4 relative">
                        {/* Outline Star */}
                        <Icon
                          as={Star}
                          size="xs"
                          color="#facc15"
                          // className="text-brand-700"
                          style={{ fill: "none" }}
                        />

                        {/* Full Star */}
                        {full && (
                          <Icon
                            as={Star}
                            size="xs"
                            style={{
                              stroke: "#facc15",
                              fill: "#facc15",
                              position: "absolute",
                              left: 0,
                              top: 0,
                            }}
                          />
                        )}

                        {half && (
                          <Box
                            className="absolute top-0 left-0 overflow-hidden"
                            style={{ width: 5.5 }}
                          >
                            <Icon
                              as={Star}
                              size="xs"
                              style={{ stroke: "#facc15", fill: "#facc15" }}
                            />
                          </Box>
                        )}
                      </Box>
                    );
                  })}

                  <Text className="text-[10px] font-semibold text-sky-600 ml-2">
                    {rating.toFixed(1)}
                  </Text>
                </HStack>
              </VStack>

              {/* Wishlist */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  toggleWishlist(car.id);
                }}
                className="pt-[1px]"
              >
                <Ionicons
                  name={isWishlisted ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color="#16a8e3"
                />
              </Pressable>
            </HStack>

            {/* Seat + Township */}
            <HStack className="items-center mt-2">
              {/* Seats */}
              <HStack className="items-center">
                <MaterialCommunityIcons
                  name="seat-recline-normal"
                  size={11}
                  color="#525252"
                />

                <Text className="text-[10px] text-gray-600 ml-1">
                  {car.seats ?? "-"} Seats
                </Text>
              </HStack>

              <Text className="text-gray-500 mx-2 text-[9px]">•</Text>

              {/* Township */}
              <HStack className="items-center flex-1 min-w-0">
                <Ionicons name="location-outline" size={11} color="#525252" />

                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-[10px] text-gray-600 ml-1 flex-1"
                >
                  {car.postal_code
                    ? townships.find(
                        (t) => String(t.postalCode) === String(car.postal_code),
                      )?.name
                      ? `${
                          townships.find(
                            (t) =>
                              String(t.postalCode) === String(car.postal_code),
                          )?.name
                        } Township`
                      : "- Township"
                    : "-"}
                </Text>
              </HStack>
            </HStack>

            {/* Bottom Row */}
            <HStack className="items-end justify-between mt-auto">
              {/* Car Type */}
              <Box className="bg-brand-100 px-4 py-[4px] rounded-xl">
                <Text className="text-[8px] font-semibold uppercase text-brand-700">
                  {car.car_type || "-"}
                </Text>
              </Box>

              {/* Price */}
              <HStack className="items-end">
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="text-[13px] font-bold text-black"
                >
                  {car.price_per_day.toLocaleString()}
                </Text>

                <Text className="text-[10px] text-gray-600 ml-1 mb-[1px]">
                  MMK /day
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </Box>
      </HStack>
    </TouchableOpacity>
  );
}
