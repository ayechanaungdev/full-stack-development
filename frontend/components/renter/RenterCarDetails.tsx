import { supabase } from "@/lib/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Gluestack UI Components
import { AvailabeDateCalendar } from "@/components/available-display-calendar";
import { BackButton } from "@/components/BackButton";
import Toast from "@/components/Toast";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Fab, FabIcon } from "@/components/ui/fab";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useWishlist } from "@/hooks/useWishlist";
import * as Clipboard from "expo-clipboard";

import {
  Bookmark,
  CarFront,
  MapPin,
  MessageSquareText,
  Star,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

interface RenterCarDetailsProps {
  carId: string;
}

export default function RenterCarDetails({ carId }: RenterCarDetailsProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const [car, setCar] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const { wishlist, toggleWishlist } = useWishlist();
  const isWishlisted = wishlist.some(
    (w: any) => String(w.car_id) === String(carId),
  );
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  const townships = require("../../constants/yangon-townships.json");

  // Set default image for no image or image can't be loaded
  const fallbackImage = require("@/assets/images/icon.png");

  const safeImages = images && images.length > 0 ? images : [null];

  const [activeIndex, setActiveIndex] = useState(0);

  // Handle Scroll
  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  // Toast Message
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "info" | "warning",
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
  ) => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  const copyCarNumberToClipboard = async () => {
    if (!car?.car_number) return;

    await Clipboard.setStringAsync(car.car_number);
    showToast("Car number copied to clipboard.", "success");
  };

  // Fetch Car Data
  useEffect(() => {
    if (!carId) return;

    const fetchCar = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("cars")
        .select(
          `
          id, car_number, has_ac,
          brand, model, price_per_day, seats, car_type,
          location, postal_code, status, owner_id,
          car_images ( image_url ),
          reviews ( rating )
        `,
        )
        .eq("id", carId)
        .single();

      if (error) {
        setLoading(false);
        return;
      }

      if (data) {
        const imgs = data.car_images?.map((img: any) => img.image_url) || [];

        setImages(imgs.length ? imgs : []);

        const ratings = data.reviews?.map((r: any) => r.rating) || [];

        const avg =
          ratings.length > 0
            ? ratings.reduce((a: number, b: number) => a + b, 0) /
              ratings.length
            : null;

        setAvgRating(avg);
        setReviewCount(ratings.length);
        setCar(data);
      }
      setLoading(false);
    };
    fetchCar();
  }, [carId]);

  // Toggle WishList
  const handleWishlistPress = async () => {
    if (!car) return;

    try {
      await toggleWishlist(car.id);

      showToast(
        isWishlisted ? "Removed from wishlist" : "Added to wishlist",
        isWishlisted ? "success" : "success",
      );
    } catch {
      return;
    }
  };

  // Fetch Booking Data
  useEffect(() => {
    if (!car) return;

    // Only block confirmed bookings
    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_date, end_date, status")
        .eq("car_id", car.id)
        .in("status", ["approved", "completed"]);

      if (error) {
        return;
      }

      const dates: string[] = [];

      data.forEach((booking: any) => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);

        // Iterate through every day between start_date and end_date
        for (
          let d = new Date(start);
          d <= end;
          d = new Date(d.setDate(d.getDate() + 1))
        ) {
          // Format to 'YYYY-MM-DD'
          const formatted = d.toISOString().split("T")[0];
          // Add unique dates to the unavailable list
          if (!dates.includes(formatted)) dates.push(formatted);
        }
      });

      setUnavailableDates(dates);
    };

    fetchBookings();
  }, [car]);

  // Combine location and postal code township name
  const locationText = React.useMemo(() => {
    if (!car) return "";

    const township = townships.find(
      (t: any) =>
        String(t.postalCode).trim() === String(car.postal_code).trim(),
    )?.name;

    return township ? `${car.location}, ${township} Township` : car.location;
  }, [car]);

  // Loading UI
  if (loading || !car) {
    return (
      <Box className="flex-1 justify-center items-center">
        <Spinner size="large" />
        <Text className="mt-2 text-gray-500">Loading Car Details...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-brand-0">
      {/* Header Buttons */}
      <HStack
        className="absolute left-5 right-5 justify-between z-50"
        style={{ top: insets.top + 5 }}
      >
        {/* Back Button */}
        <BackButton className="bg-brand-700/15" />

        {/* Wishlist Button */}
        <Pressable
          className="p-3 border border-brand-700 rounded-full bg-brand-700/15"
          onPress={handleWishlistPress}
        >
          {/*Filled the icon if in wishlist*/}
          <Icon
            as={Bookmark}
            className="h-5 w-5"
            style={{
              stroke: "#16a8e3",
              fill: isWishlisted ? "#16a8e3" : "none",
            }}
          />
        </Pressable>
      </HStack>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header Image Carousel */}
        <Box className="relative w-full h-[240px]">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ width: width * safeImages.length }}
          >
            {safeImages.map((uri, idx) => {
              const isFallback = !uri;

              return (
                <Box
                  key={idx}
                  style={{ width }}
                  className="h-full bg-gray-100 items-center justify-center"
                >
                  <Image
                    source={isFallback ? fallbackImage : { uri }}
                    alt={isFallback ? "No image available" : `Car ${idx + 1}`}
                    resizeMode={isFallback ? "contain" : "cover"}
                    className={isFallback ? "w-36 h-36" : "w-full h-full"}
                  />
                </Box>
              );
            })}
          </ScrollView>

          {/* Pagination Dots */}
          {safeImages.length > 1 && (
            <HStack
              className="absolute left-0 right-0 flex-row justify-center items-center"
              style={{ bottom: 30, gap: 8, zIndex: 20 }}
            >
              {safeImages.map((_, idx) => (
                <Box
                  key={idx}
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeIndex === idx ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </HStack>
          )}
        </Box>

        {/* Floating Card */}
        <Box
          className="bg-white px-6 pb-2 rounded-[30px] self-center mb-4"
          style={{
            width: width * 0.92,
            marginTop: -20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          {/* Car Model */}
          <HStack className="justify-between items-start mt-2">
            <VStack className="flex-1">
              <Heading size="lg" className="text-typography-900 font-bold pt-4">
                {car.brand} {car.model}
              </Heading>

              {/* Car Number Badge */}
              <HStack className="items-center gap-2 mt-1">
                <Pressable
                  onLongPress={copyCarNumberToClipboard}
                  className="self-start"
                >
                  <Badge className="bg-brand-50 rounded-md self-start border border-brand-700">
                    <MaterialCommunityIcons
                      name="card-text-outline"
                      size={16}
                      color="#16a8e3"
                    />
                    <BadgeText className="text-brand-700 font-bold text-sm ml-1">
                      {car.car_number}
                    </BadgeText>
                  </Badge>
                </Pressable>
                <Pressable
                  onPress={copyCarNumberToClipboard}
                  className="p-1 rounded-md bg-brand-50 border border-blue-300"
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={14}
                    color="#16a8e3"
                  />
                </Pressable>
              </HStack>

              {/* Location */}
              <HStack className="items-center mt-3">
                <Icon as={MapPin} size="xs" className="text-brand-700" />
                <Text className="text-typography-900 text-xs ml-1.5">
                  {locationText}
                </Text>
              </HStack>
            </VStack>

            {/* Price */}
            <VStack className="items-end mt-4 mr-2">
              <Text className="text-lg font-bold text-brand-700">
                {car.price_per_day?.toLocaleString()}
              </Text>
              <Text className="text-2xs text-typography-400 font-bold">
                MMK / DAY
              </Text>
            </VStack>
          </HStack>

          {/* Rating */}
          <HStack className="items-center mt-4">
            {[1, 2, 3, 4, 5].map((i) => {
              const full = avgRating && i <= Math.floor(avgRating);
              const half = avgRating && i === Math.ceil(avgRating) && !full;

              return (
                <Box key={i} className="w-4 h-4 relative">
                  {/* Outline star */}
                  <Icon
                    as={Star}
                    size="xs"
                    className="text-brand-700"
                    style={{ fill: "none" }}
                  />

                  {/* Full star */}
                  {full && (
                    <Icon
                      as={Star}
                      size="xs"
                      style={{
                        stroke: "#16a8e3",
                        fill: "#16a8e3",
                        position: "absolute",
                        left: 0,
                        top: 0,
                      }}
                    />
                  )}

                  {/* Half star */}
                  {half && (
                    <Box
                      className="absolute top-0 left-0 overflow-hidden"
                      style={{ width: 6.3 }}
                    >
                      <Icon
                        as={Star}
                        size="xs"
                        style={{
                          stroke: "#16a8e3",
                          fill: "#16a8e3",
                        }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}

            {/* Review Count */}
            <Text className="text-sm font-bold pl-2">
              {avgRating ? avgRating.toFixed(1) : "0.0"}{" "}
              <Text className="text-xs text-typography-900 font-normal">
                ({reviewCount} Reviews)
              </Text>
            </Text>
          </HStack>

          {/* Specs Grid */}
          <HStack className="justify-between mt-6 mb-6">
            <SpecCard
              icon={() => (
                <MaterialIcons name="groups" size={24} color="#16a8e3" />
              )}
              label="CAPACITY"
              value={`${car.seats ?? 0} Seats`}
            />
            <SpecCard
              icon={() => <CarFront size={24} color="#16a8e3" />}
              label="TYPE"
              value={car.car_type ?? "N/A"}
            />
            <SpecCard
              icon={() => (
                <MaterialIcons name="ac-unit" size={24} color="#16a8e3" />
              )}
              label="AIR COND."
              value={car.has_ac ? "A/C" : "No A/C"}
            />
          </HStack>

          {/* Calendar Section */}
          <VStack className="mb-2">
            <AvailabeDateCalendar unavailableDates={unavailableDates} />
          </VStack>
        </Box>
      </ScrollView>

      {/* Floating Chat Icon */}
      <Fab
        className="absolute right-5 z-[999] bg-brand-700 rounded-full w-16 h-16 items-center justify-center"
        style={{
          bottom: 95 + insets.bottom,
          // iOS shadow
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,

          // Android shadow
          elevation: 8,
        }}
        onPress={() => router.push(`/chat/${car.owner_id}`)}
      >
        <FabIcon as={MessageSquareText} className="w-8 h-8" />
      </Fab>

      {/* Book Now Button */}
      <Box
        className="absolute bottom-0 w-full bg-white/90 px-5 pt-5 rounded-t-2xl border border-gray-200"
        style={{
          paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <Button
          size="lg"
          className="h-14 rounded-2xl"
          onPress={() =>
            router.push(`/(protected)/car/bookingForm?id=${car.id}`)
          }
        >
          <ButtonText className="font-bold text-lg">Book Now</ButtonText>
        </Button>
      </Box>

      {/* Toast Message Box */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </Box>
  );
}

{
  /* Specs Card */
}
const SpecCard = ({ icon, label, value }: any) => (
  <Box className="w-[31%] px-2 py-3 rounded-2xl items-center border border-brand-300 bg-brand-100/30">
    <Icon as={icon} className="text-brand-700" />
    <Text className="text-2xs text-typography-400 font-semibold uppercase">
      {label}
    </Text>
    <Text className="text-sm text-typography-900 font-semibold mt-1">
      {value}
    </Text>
  </Box>
);
