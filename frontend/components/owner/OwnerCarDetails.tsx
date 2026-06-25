import Toast from "@/components/Toast";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import {
  Building2,
  CarFront,
  CreditCard,
  MapPin,
  Shapes,
  SquarePen,
  Wind,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image as RNImage,
  View,
} from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/BackButton";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Image as GluestackImage } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView as RNScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import townshipsData from "@/constants/yangon-townships.json";
import { apiClient } from "@/lib/axios";
import tailwindConfig from "@/tailwind.config";
import { CARD_SHADOW } from "@/utils/dashboardHelpers";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import resolveConfig from "tailwindcss/resolveConfig";

const fullConfig = resolveConfig(tailwindConfig) as any;
const brand = fullConfig.theme.colors.brand;

const SeatPassengerIcon = ({ size, color, style, ...props }: any) => {
  const sizeMap: Record<string, number> = {
    "2xs": 12,
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 24,
  };
  const iconSize = typeof size === "number" ? size : sizeMap[size] || 20;
  return (
    <MaterialCommunityIcons
      name="seat-recline-extra"
      size={iconSize}
      color={color || "#16a8e3"}
      style={style}
      {...props}
    />
  );
};

const { width: screenWidth } = Dimensions.get("window");
const CAROUSEL_WIDTH = screenWidth - 32;

type Car = {
  id: string;
  brand: string;
  model: string;
  price_per_day: number;
  seats: number;
  car_type: string;
  status: string;
  location: string;
  description: string;
  car_number: string | null;
  has_ac: boolean;
  postal_code: string | null;
};

type CarImage = {
  image_url: string;
};

const CardTextIcon = ({ size, color, ...props }: any) => {
  const sizeMap: Record<string, number> = {
    "2xs": 12,
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 24,
  };
  const iconSize = typeof size === "number" ? size : sizeMap[size] || 18;
  return (
    <MaterialCommunityIcons
      name="card-text-outline"
      size={iconSize}
      color={color || "#16a8e3"}
      {...props}
    />
  );
};

const townshipMap: Record<string, string> = {};
townshipsData.forEach((township: { name: string; postalCode: string }) => {
  townshipMap[township.postalCode] = township.name;
});

const getTownshipFromPostalCode = (postalCode: string | null): string => {
  if (!postalCode) return "";
  return townshipMap[postalCode] || postalCode;
};

type OwnerCarDetailsProps = {
  carId: string;
};

export default function OwnerCarDetails({ carId }: OwnerCarDetailsProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const carouselRef = useRef<ICarouselInstance>(null);
  const defaultCarIcon = require("@/assets/images/icon.png");
  const [containerWidth, setContainerWidth] = useState(CAROUSEL_WIDTH);

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["car_details", carId],
    queryFn: async () => {
      if (!carId) throw new Error("Car ID is required");

      const response = await apiClient.get(`/cars/${carId}`);
      const carData = response.data;

      const car: Car = {
        ...carData,
        price_per_day: carData.pricePerDay,
        postal_code: carData.postal_code || null,
      };

      const images = (carData.carImages || []).map((img: any) => ({
        image_url: img.image_url,
      })) as CarImage[];

      return { car, images };
    },
    enabled: !!carId,
  });

  const car = data?.car || null;
  const images = data?.images || [];

  // Reset image index when data changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [carId]);

  const imageUrls = images
    .map((img) => img.image_url)
    .filter((url) => url && url.trim() !== "");

  const renderItem = ({ item }: { item: string }) => (
    <ExpoImage
      source={{ uri: item }}
      alt="Car Image"
      style={{ width: containerWidth, height: 220 }}
      contentFit="cover"
      transition={300}
    />
  );

  // FIXED: Function to scroll to specific index when dot is clicked
  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      // Use scrollTo method to go to the specific index
      carouselRef.current.scrollTo({ index, animated: true });
      setActiveImageIndex(index);
    }
  };

  if (loading) {
    return (
      <Box
        className="flex-1 justify-center items-center bg-white"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color={brand[700]} />
      </Box>
    );
  }

  if (!car) {
    return (
      <Box
        className="flex-1 justify-center items-center bg-white p-4"
        style={{ paddingTop: insets.top }}
      >
        <RNImage
          source={defaultCarIcon}
          style={{ width: 120, height: 120, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text className="text-lg font-semibold text-center">
          There is no corresponding data.
        </Text>
        {error && (
          <Text className="text-sm text-error-600 mt-2 text-center">
            {error.message}
          </Text>
        )}
        <Button className="mt-4" onPress={() => router.back()}>
          <Text className="text-white">Go Back</Text>
        </Button>
      </Box>
    );
  }

  const isEditable =
    car?.status === "Available" || car?.status === "Unavailable";

  const getStatusBadgeProps = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return { color: "success", text: "Available" };
      case "pending":
        return { color: "warning", text: "Pending" };
      case "unavailable":
        return { color: "error", text: "Unavailable" };
      default:
        return { color: "info", text: status };
    }
  };

  const statusProps = getStatusBadgeProps(car.status);

  const descriptionText =
    car.description ||
    `The ${car.brand} ${car.model} is a premium vehicle offering exceptional performance and comfort. Perfect for city driving and long road trips alike.`;
  const shouldTruncate = descriptionText.length > 150;
  const displayText =
    !expanded && shouldTruncate
      ? descriptionText.substring(0, 80) + "..."
      : descriptionText;

  const hasImages = imageUrls.length > 0;

  const township = getTownshipFromPostalCode(car.postal_code);
  const hasPostalCode =
    car.postal_code && car.postal_code.trim() !== "" && township !== "";

  const handleEditPress = () => {
    if (isEditable) {
      router.push(`/car/editcar?id=${carId}`);
    }
  };

  const copyCarNumberToClipboard = async () => {
    if (!car?.car_number) return;

    await Clipboard.setStringAsync(car.car_number);
    setToastMessage("Car number copied to clipboard.");
    setToastVisible(true);
  };

  return (
    <Box
      className="flex-1"
      style={{
        backgroundColor: brand[50],
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* CUSTOM HEADER */}
      <HStack className="px-5 py-2 items-center justify-between">
        <BackButton />
        <Heading size="md" className="text-brand-700 font-bold">
          Car Details
        </Heading>
        <Pressable
          onPress={handleEditPress}
          disabled={!isEditable}
          className="p-2 active:opacity-70"
        >
          <Icon
            as={SquarePen}
            size="xl"
            className={isEditable ? "text-brand-700" : "text-slate-400"}
          />
        </Pressable>
      </HStack>

      <RNScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGE CAROUSEL - Using react-native-reanimated-carousel */}
        <Box
          className="mt-1 mx-4 bg-white"
          style={{ borderRadius: 24, overflow: "hidden", ...CARD_SHADOW }}
          onLayout={(e: any) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && w !== containerWidth) setContainerWidth(w);
          }}
        >
          {hasImages ? (
            <View style={{ position: "relative" }}>
              <Carousel
                ref={carouselRef}
                width={containerWidth}
                height={220}
                data={imageUrls}
                renderItem={renderItem}
                onProgressChange={(_, absoluteProgress) => {
                  const normalizedIndex = Math.round(absoluteProgress);
                  // Handle loop wrap-around
                  const positiveIndex =
                    ((normalizedIndex % imageUrls.length) + imageUrls.length) %
                    imageUrls.length;
                  if (positiveIndex !== activeImageIndex) {
                    setActiveImageIndex(positiveIndex);
                  }
                }}
                autoPlay={imageUrls.length > 1}
                autoPlayInterval={3000}
                loop={imageUrls.length > 1}
                scrollAnimationDuration={500}
                defaultIndex={0}
              />

              {/* Dot Indicators */}
              {imageUrls.length > 1 && (
                <HStack
                  space="md"
                  className="absolute bottom-4 left-0 right-0 justify-center z-10"
                >
                  {imageUrls.map((_, i) => (
                    <Pressable
                      key={i}
                      hitSlop={12}
                      onPress={() => scrollToIndex(i)}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor:
                            activeImageIndex === i
                              ? "#ffffff"
                              : "rgba(255,255,255,0.65)",
                        }}
                      />
                    </Pressable>
                  ))}
                </HStack>
              )}
            </View>
          ) : (
            <Box
              style={{
                width: containerWidth,
                height: 220,
                backgroundColor: brand[50],
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <GluestackImage
                source={defaultCarIcon}
                className="w-36 h-36"
                alt="No Car Image"
                resizeMode="contain"
              />
            </Box>
          )}

          {/* Status Badge */}
          <Box className="absolute top-5 right-5 z-20">
            <Badge
              variant="solid"
              action={statusProps.color as any}
              className="rounded-xl px-4 py-2 border-2 border-white/20"
            >
              <BadgeText className="font-bold text-xs uppercase tracking-wider">
                {statusProps.text}
              </BadgeText>
            </Badge>
          </Box>
        </Box>

        <Box
          className="m-4 p-5 bg-white rounded-3xl shadow-sm"
          style={{ ...CARD_SHADOW }}
        >
          <HStack className="justify-between items-start">
            <HStack space="md" className="items-center flex-wrap">
              <Heading size="xl" className="text-slate-900 font-bold">
                {car.brand} {car.model}
              </Heading>
              {car.car_number && (
                <HStack className="items-center">
                  <Pressable onLongPress={copyCarNumberToClipboard}>
                    <Badge
                      variant="outline"
                      action="info"
                      className="rounded-lg border-brand-200 px-3 py-1.5 flex-row items-center"
                    >
                      <Icon
                        as={CardTextIcon}
                        size="md"
                        className="text-brand-700 mr-2"
                      />
                      <BadgeText className="text-brand-700 text-sm font-bold uppercase tracking-wider">
                        {car.car_number}
                      </BadgeText>
                    </Badge>
                  </Pressable>
                  <Pressable
                    onPress={copyCarNumberToClipboard}
                    className="p-1 rounded-full ml-2 active:bg-gray-100"
                  >
                    <MaterialCommunityIcons
                      name="content-copy"
                      size={15}
                      color="#16a8e3"
                      style={{ margin: 1 }}
                    />
                  </Pressable>
                </HStack>
              )}
            </HStack>
          </HStack>

          <VStack space="sm" className="mt-4">
            <HStack space="xs" className="items-center">
              <Icon
                as={Building2}
                size="md"
                className="text-brand-700 fill-brand-700"
              />
              <Text className="text-slate-400 text-sm font-medium">
                {car.location}
              </Text>
            </HStack>

            {hasPostalCode && (
              <HStack className="justify-between items-center">
                <HStack space="xs" className="items-center">
                  <Icon as={MapPin} size="md" className="text-brand-700" />
                  <Text className="text-slate-400 font-bold text-sm">
                    {township}
                  </Text>
                </HStack>
                <Box className="items-end">
                  <Text className="text-xl font-bold text-slate-900">
                    {car.price_per_day.toLocaleString()}MMK{" "}
                    <Text className="text-sm font-normal text-slate-400">
                      /day
                    </Text>
                  </Text>
                </Box>
              </HStack>
            )}

            {!hasPostalCode && (
              <HStack className="justify-end items-center">
                <Box className="items-end">
                  <Text className="text-xl font-bold text-slate-900">
                    {car.price_per_day.toLocaleString()}MMK{" "}
                    <Text className="text-sm font-normal text-slate-400">
                      /day
                    </Text>
                  </Text>
                </Box>
              </HStack>
            )}
          </VStack>
        </Box>

        <Box
          className="mx-4 mb-4 p-5 bg-white rounded-3xl shadow-sm"
          style={{ ...CARD_SHADOW }}
        >
          <Heading
            size="xs"
            className="text-slate-400 mb-2 uppercase tracking-wider"
          >
            Description
          </Heading>
          <Text className="text-slate-600 leading-6">
            {displayText}
            {shouldTruncate && (
              <Text
                onPress={() => setExpanded(!expanded)}
                className="text-brand-700 font-semibold"
              >
                {expanded ? " See Less" : " See More"}
              </Text>
            )}
          </Text>
        </Box>

        <Box
          className="mx-4 mb-10 p-5 bg-white rounded-3xl shadow-sm"
          style={{ ...CARD_SHADOW }}
        >
          <Heading
            size="xs"
            className="text-slate-400 mb-4 uppercase tracking-wider"
          >
            Specification
          </Heading>

          <Box
            className="flex-row flex-wrap justify-between"
            style={{ ...CARD_SHADOW }}
          >
            <SpecItem icon={CreditCard} label="BRAND" value={car.brand || ""} />
            <SpecItem icon={CarFront} label="MODEL" value={car.model || ""} />
            <SpecItem
              icon={SeatPassengerIcon}
              label="SEATS"
              value={car.seats ? `${car.seats} Seats` : ""}
            />
            <SpecItem
              icon={Shapes}
              label="CAR TYPE"
              value={car.car_type || ""}
            />
            <SpecItem
              icon={Wind}
              label="HAS AIRCON"
              value={
                car.has_ac !== null && car.has_ac !== undefined
                  ? car.has_ac
                    ? "Yes"
                    : "No"
                  : ""
              }
              fullWidth
            />
          </Box>
        </Box>
      </RNScrollView>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onClose={() => setToastVisible(false)}
      />
    </Box>
  );
}

function SpecItem({
  icon,
  label,
  value,
  fullWidth = false,
}: {
  icon: any;
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <Box
      className={`mb-4 p-4 bg-slate-100/80 rounded-2xl flex-row items-center border border-slate-100 ${fullWidth ? "w-full" : "w-[48%]"}`}
    >
      <Box className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3 shadow-xs">
        <Icon as={icon} size="md" className="text-brand-700" />
      </Box>
      <VStack>
        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
          {label}
        </Text>
        <Text className="text-sm text-slate-800 font-bold leading-tight">
          {value || ""}
        </Text>
      </VStack>
    </Box>
  );
}
