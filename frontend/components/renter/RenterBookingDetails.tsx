import CustomAlert from "@/components/app-alert";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { adjustBadgeCount } from "@/store/useBadgeStore";
import { CARD_SHADOW } from "@/utils/dashboardHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { MessageSquareText, Star } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "../Toast";

// import { KeyboardAvoidingView } from "react-native-keyboard-controller";

interface Props {
  bookingId: string;
}

interface BookingDetail {
  id: string;
  status: string;
  customer_id: string;
  car_id: string;
  total_price: number;
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time: string;
  pickup_location: string;
  dropoff_location: string;
  note: string;
  car: {
    brand: string;
    model: string;
    car_number: string;
    price_per_day: number;
    owner_id: string;
  };
  image_url: string;
}

// status style
const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
      return {
        bg: "bg-info-0",
        text: "text-info-700",
        stroke: "border-info-100",
      };
    case "completed":
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
    case "cancelled":
      return {
        bg: "bg-error-0",
        text: "text-error-700",
        stroke: "border-error-100",
      };
    case "rejected":
      return {
        bg: "bg-red-50",
        text: "text-error-800",
        stroke: "border-error-100",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-500",
        stroke: "border-gray-300",
      };
  }
};

const RenterBookingDetails = ({ bookingId }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.session?.user?.id);
  const [data, setData] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // review state
  const [rating, setRating] = useState(0);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showRatingError, setShowRatingError] = useState(false);
  // alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    actions: [] as {
      text: string;
      onPress?: () => void;
      type?: "cancel" | "default";
    }[],
  });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // take bookingId props
  useEffect(() => {
    if (bookingId) {
      fetchDetail();
    }
  }, [bookingId]);

  useEffect(() => {
    const markBookingNotificationRead = async () => {
      if (!userId || !bookingId) return;

      const { data: updatedBookings } = await supabase
        .from("bookings")
        .update({ is_read: true })
        .select("id")
        .eq("id", bookingId)
        .eq("is_read", false);

      const bookingReadCount = updatedBookings?.length ?? 0;
      if (bookingReadCount > 0) {
        adjustBadgeCount(userId, "bookings", -bookingReadCount);
      }

      const { data: updatedNotifications } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .select("id")
        .eq("receiver_id", userId)
        .eq("reference_id", bookingId)
        .eq("type", "booking")
        .eq("is_read", false);

      const notificationReadCount = updatedNotifications?.length ?? 0;
      if (notificationReadCount > 0) {
        adjustBadgeCount(userId, "notifications", -notificationReadCount);
      }
    };

    markBookingNotificationRead();
  }, [bookingId, userId, queryClient]);

  // fetch
  const fetchDetail = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        status,
        customer_id,
        car_id,
        total_price,
        start_date,
        end_date,
        pickup_time,
        dropoff_time,
        pickup_location,
        dropoff_location,
        note,
        car:cars (
          brand,
          model,
          car_number,
          price_per_day,
          owner_id,
          car_images (
            image_url,
            is_primary
          )
        )
      `,
      )
      .eq("id", bookingId)
      .single();

    if (error) {
      console.error("Fetch error:", error.message);
      setLoading(false);
      return;
    }

    const primaryImage =
      (data.car as any)?.car_images?.find((img: any) => img.is_primary) ||
      (data.car as any)?.car_images?.[0];

    setData({
      id: data.id,
      status: data.status,
      customer_id: data.customer_id,
      car_id: data.car_id,
      total_price: data.total_price,
      start_date: data.start_date,
      end_date: data.end_date,
      pickup_time: data.pickup_time,
      dropoff_time: data.dropoff_time,
      pickup_location: data.pickup_location,
      dropoff_location: data.dropoff_location,
      note: data.note,
      car: {
        brand: (data.car as any)?.brand,
        model: (data.car as any)?.model,
        car_number: (data.car as any)?.car_number,
        price_per_day: (data.car as any)?.price_per_day,
        owner_id: (data.car as any)?.owner_id,
      },
      image_url: primaryImage?.image_url || "",
    });

    setLoading(false);
  };

  // cancel booking
  const handleCancelBooking = () => {
    setAlertData({
      title: "Cancel Booking",
      message: "Are you sure you want to cancel this booking?",
      type: "error",
      actions: [
        {
          text: "Cancel",
          type: "cancel",
        },
        {
          text: "OK",
          onPress: async () => {
            const { error } = await supabase
              .from("bookings")
              .update({ status: "cancelled" })
              .eq("id", bookingId);

            if (error) {
              setAlertData({
                title: "Error",
                message: error.message,
                type: "error",
                actions: [{ text: "OK" }],
              });
              setAlertVisible(true);
              return;
            }

            // Invalidate queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ["owner_bookings"] });
            queryClient.invalidateQueries({ queryKey: ["renter_bookings"] });

            setAlertData({
              title: "Success",
              message: "Booking cancelled successfully",
              type: "success",
              actions: [
                {
                  text: "OK",
                  onPress: () => fetchDetail(),
                },
              ],
            });
            setAlertVisible(true);
          },
        },
      ],
    });

    setAlertVisible(true);
  };

  // handle submit review
  const handleSubmitReview = async () => {
    if (rating === 0) {
      setShowRatingError(true);
      return;
    }

    setShowRatingError(false);
    setSubmitting(true);

    const { error } = await supabase.from("reviews").insert({
      car_id: data?.car_id,
      user_id: data?.customer_id,
      rating: rating,
      comment: comment,
    });

    setSubmitting(false);
    if (error) {
      setAlertData({
        title: "Error",
        message: error.message,
        type: "error",
        actions: [
          {
            text: "OK",
          },
        ],
      });
      setAlertVisible(true);
    } else {
      setAlertData({
        title: "Success",
        message: "Review submitted successfully",
        type: "success",
        actions: [
          {
            text: "OK",
            onPress: () => {
              setReviewVisible(false);
              setRating(0);
              setComment("");
              setShowRatingError(false);
            },
          },
        ],
      });
      setAlertVisible(true);
    }
  };

  // review stars
  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <Pressable
        key={star}
        onPress={() => {
          // If clicking the same star that's currently selected, unselect it (set to 0)
          if (rating === star) {
            setRating(0);
          } else {
            setRating(star);
          }
          setShowRatingError(false);
        }}
      >
        <Star
          size={30}
          stroke="#facc15"
          fill={star <= rating ? "#facc15" : "none"}
          style={{
            marginHorizontal: 3,
            marginTop: 1, // aligns visually with text
          }}
        />
      </Pressable>
    ));
  };

  // loading
  if (loading || !data) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <Spinner size="large" color="#16A8E3" />
      </Box>
    );
  }

  const statusStyle = getStatusStyle(data.status);

  // calculate days
  const days =
    (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) /
      (1000 * 60 * 60 * 24) +
    1;

  // format to 12 hr
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

  const total_p = days * data.car.price_per_day;

  const copyBookingIdToClipboard = async (bookingId: string) => {
    if (!bookingId) return;

    await Clipboard.setStringAsync(bookingId);
    setToastMessage("Booking ID copied to clipboard.");
    setToastVisible(true);
  };

  const copyCarNumberToClipboard = async (carNumber: string) => {
    if (!carNumber) return;

    await Clipboard.setStringAsync(carNumber);
    setToastMessage("Car number copied to clipboard.");
    setToastVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={["bottom"]}>
      <Box className="flex-1">
        <ScrollView className="flex-1 bg-brand-0">
          {/* CAR CARD */}
          <Box
            className="bg-white rounded-[22px] m-4 p-4"
            style={{ ...CARD_SHADOW, backgroundColor: "white" }}
          >
            <Box className="relative">
              {/* car image and set default image if not available */}
              <Image
                source={
                  data.image_url
                    ? { uri: data.image_url }
                    : require("@/assets/images/icon.png")
                }
                className="w-full h-40 rounded-xl"
                resizeMode="cover"
              />

              {/* STATUS BADGE */}
              <Box
                className={`
                absolute top-1 right-1 px-3 py-1 rounded-lg border
                ${statusStyle.bg} ${statusStyle.stroke}
              `}
              >
                <Text
                  className={`
                  text-xs font-semibold capitalize
                  ${statusStyle.text}
                `}
                >
                  {data.status}
                </Text>
              </Box>
            </Box>

            <HStack className="justify-between mt-2">
              <Text
                className="mt-2 text-gray-900 font-semibold"
                style={{ flexShrink: 1, flexWrap: "wrap" }} // allow wrapping but prevent overflow
              >
                {data.car.brand} {data.car.model}
              </Text>
              <Text
                numberOfLines={1}
                className="text-sm font-semibold text-brand-700 mt-2"
              >
                {data.car.price_per_day.toLocaleString()} MMK /day
              </Text>
            </HStack>

            <HStack className="items-center gap-2 mt-1">
              <Pressable
                onLongPress={() =>
                  copyCarNumberToClipboard(data.car.car_number)
                }
                className="self-start"
              >
                <HStack className="items-center gap-1 px-3 py-1 rounded-md bg-brand-50 border border-blue-300">
                  <MaterialCommunityIcons
                    name="card-text-outline"
                    size={14}
                    color="#16a8e3"
                  />
                  <Text className="text-xs text-brand-700 font-medium">
                    {data.car.car_number}
                  </Text>
                </HStack>
              </Pressable>
              <Pressable
                onPress={() => copyCarNumberToClipboard(data.car.car_number)}
                className="p-1 rounded-md bg-brand-50 border border-blue-300 active:bg-blue-100"
              >
                <Ionicons name="copy-outline" size={14} color="#16a8e3" />
              </Pressable>
            </HStack>
            <Pressable onLongPress={() => copyBookingIdToClipboard(data.id)}>
              <HStack className="items-center gap-1 mt-1 px-3 py-1 rounded-md self-start mt-2">
                <Text className="text-xs text-gray-400">
                  Booking ID: #
                  {data.id.length > 13 ? `${data.id.slice(0, 13)}...` : data.id}
                </Text>
                <Ionicons
                  name="copy-outline"
                  size={16}
                  color="#16a8e3"
                  onPress={() => copyBookingIdToClipboard(data.id)}
                  style={{ marginLeft: 4 }}
                />
              </HStack>
            </Pressable>
          </Box>

          {/* TRIP SCHEDULE */}
          <Box className="mx-1 mt-1">
            <Text className="text-xs text-slate-600 pl-3">TRIP SCHEDULE</Text>

            {/* PICKUP ROW */}
            {/* TRIP SCHEDULE */}
            <Box className="mx-4 mt-4">
              {/* MAIN CARD */}
              <Box
                className="bg-white rounded-2xl p-4"
                style={{ ...CARD_SHADOW, backgroundColor: "white" }}
              >
                {/* ================= PICKUP CARD ================= */}
                <Box className="bg-brand-50 rounded-xl p-3 mb-3 border border-brand-100">
                  <HStack className="items-start">
                    <Box className="w-10 h-10 rounded-full justify-center items-center bg-brand-100">
                      <EvilIcons name="location" size={18} color="#16A8E3" />
                    </Box>

                    <VStack className="flex-1 ml-3">
                      <Text className="text-2xs text-gray-400">
                        PICKUP LOCATION
                      </Text>
                      <Text className="text-sm font-medium">
                        {data.pickup_location}
                      </Text>

                      <Text className="text-2xs text-gray-400 mt-2">
                        PICKUP DATE
                      </Text>
                      <HStack className="items-center gap-2 mt-1">
                        <Text className="text-xs text-gray-600">
                          {data.start_date.replace(/-/g, "/")}
                        </Text>

                        <Box className="min-w-[50px] h-[15px] px-2 border border-brand-700 rounded-full items-center justify-center">
                          <Text className="text-xs text-brand-700 font-medium text-center">
                            {formatTo12Hour(data.pickup_time) ?? "--:--"}
                          </Text>
                        </Box>
                      </HStack>
                    </VStack>
                  </HStack>
                </Box>

                {/* ================= DROPOFF CARD ================= */}
                <Box className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <HStack className="items-start">
                    <Box className="w-10 h-10 rounded-full justify-center items-center bg-gray-200">
                      <MaterialIcons
                        name="outlined-flag"
                        size={18}
                        color="#6B7280"
                      />
                    </Box>

                    <VStack className="flex-1 ml-3">
                      <Text className="text-2xs text-gray-400">
                        DROP-OFF LOCATION
                      </Text>
                      <Text className="text-sm font-medium">
                        {data.dropoff_location}
                      </Text>

                      <Text className="text-2xs text-gray-400 mt-2">
                        DROP-OFF DATE
                      </Text>
                      <HStack className="items-center gap-2 mt-1">
                        <Text className="text-xs text-gray-600">
                          {data.end_date.replace(/-/g, "/")}
                        </Text>

                        <Box className="min-w-[50px] h-[15px] px-2 border border-brand-700 rounded-full items-center justify-center">
                          <Text className="text-xs text-brand-700 font-medium text-center">
                            {formatTo12Hour(data.dropoff_time) ?? "--:--"}
                          </Text>
                        </Box>
                      </HStack>
                    </VStack>
                  </HStack>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* NOTE */}
          <Box className="mx-4 mt-4">
            <Text className="text-xs text-slate-500 mb-2">BOOKING INFO</Text>

            <Box
              className="bg-white rounded-[22px] m-1 p-4"
              style={{ ...CARD_SHADOW, backgroundColor: "white" }}
            >
              {/* First row */}
              <HStack className="items-center gap-2">
                <MaterialIcons name="sticky-note-2" size={16} color="#94A3B8" />
                <Text className="text-2xs text-gray-400">SPECIAL NOTE</Text>
              </HStack>

              {/* Second line (indented) */}
              <Box className="ml-6 mt-1 mb-2">
                <Text
                  className="text-xs text-gray-500 font-bold"
                  style={{ textAlign: "justify" }}
                >
                  {`"${data.note || "No special note"}"`}
                </Text>
              </Box>
            </Box>
          </Box>

          {/* PAYMENT */}
          <Box className="mx-4 mt-4">
            <Text className="text-xs text-slate-500 mb-2">PAYMENT SUMMARY</Text>

            <Box
              className="bg-white rounded-[22px] m-1 p-4"
              style={{ ...CARD_SHADOW, backgroundColor: "white" }}
            >
              <HStack className="justify-between mb-2">
                <Text className="text-sm text-gray-500">Rental Duration</Text>
                <Text className="text-sm text-black">{days} Days</Text>
              </HStack>

              <HStack className="justify-between mb-2">
                <Text className="text-sm text-gray-500">Price / Day</Text>
                <Text className="text-sm text-black">
                  {data.car.price_per_day.toLocaleString()} MMK
                </Text>
              </HStack>

              <Divider className="my-2" />

              <HStack className="justify-between">
                <Text className="font-semibold text-xl">Total Price</Text>
                <Text className="font-semibold text-brand-700 text-xl">
                  {Number(total_p ?? 0).toLocaleString()} MMK
                </Text>
              </HStack>
            </Box>
          </Box>

          {/* cancel or review */}
          <Box className="mx-4 my-5 mt-6 mb-10">
            {data.status.toLowerCase() === "pending" ? (
              <Button
                className="rounded-lg bg-white border border-red-500"
                style={{ minHeight: 48 }}
                onPress={handleCancelBooking}
              >
                <HStack className="items-center">
                  <Box className="w-5 h-5 justify-center items-center border border-red-500 mr-2 rounded-full">
                    <Entypo name="cross" size={15} color="#EF4444" />
                  </Box>
                  <Text className="text-sm text-red-500">Cancel Booking</Text>
                </HStack>
              </Button>
            ) : data.status.toLowerCase() === "completed" ? (
              <HStack className="gap-4">
                <Button
                  className="flex-1 rounded-lg bg-brand-700 border border-blue-400"
                  onPress={() =>
                    router.push(
                      `/(protected)/(home)/inquiry?bookingId=${data.id}`,
                    )
                  }
                  style={{ minHeight: 48 }}
                >
                  <ButtonText className="font-medium text-white">
                    Feedbacks
                  </ButtonText>

                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color="white"
                    style={{ marginLeft: 6 }}
                  />
                </Button>

                <Button
                  className="flex-1 rounded-lg bg-brand-700 border border-blue-400"
                  onPress={() => setReviewVisible(true)}
                  style={{ minHeight: 48 }}
                >
                  <ButtonText className="font-medium text-white">
                    Give Review
                  </ButtonText>

                  <Ionicons
                    name="star"
                    size={20}
                    color="white"
                    style={{ marginLeft: 6 }}
                  />
                </Button>
              </HStack>
            ) : (
              <Button
                disabled
                className=" flex-1 rounded-lg bg-gray-100 border border-gray-300"
                style={{ minHeight: 48 }}
              >
                <HStack className="items-center">
                  <Box className="w-5 h-5 justify-center items-center border border-gray-400 mr-2 rounded-full">
                    <Entypo name="cross" size={15} color="#9CA3AF" />
                  </Box>
                  <Text className="text-sm text-gray-400">Cancel Booking</Text>
                </HStack>
              </Button>
            )}
          </Box>

          {/* MODAL for review */}
          <Modal visible={reviewVisible} transparent animationType="fade">
            <Box className="flex-1 justify-center items-center bg-black/50 px-6">
              <KeyboardAvoidingView
                behavior={Platform.OS === "android" ? "padding" : "height"}
                keyboardVerticalOffset={50}
                style={{ width: "100%" }}
              >
                <Box className="bg-white w-full p-6 rounded-[10px] items-start">
                  <Text className="text-typography-800 font-semibold text-md">
                    Rate your satisfaction with this booking.
                  </Text>

                  <HStack
                    className="flex-row items-center mt-2 mb-3"
                    style={{ alignSelf: "flex-start" }}
                  >
                    {renderStars()}
                  </HStack>

                  <Text className="text-typography-800 font-semibold text-md">
                    Leave Comment
                  </Text>

                  {/* {data.customer_id} */}

                  <TextInput
                    className="w-full border border-gray-200 rounded-xl p-3 mb-2 mt-1"
                    multiline
                    numberOfLines={4}
                    maxLength={255}
                    value={comment}
                    onChangeText={setComment}
                    textAlignVertical="top"
                    style={{ minHeight: 100, textAlignVertical: "top" }}
                  />

                  {/* Error message - only shows when user tries to submit without rating */}
                  {showRatingError && (
                    <Text className="text-red-500 text-sm mb-3 text-left">
                      Please select a rating!
                    </Text>
                  )}
                  <HStack className="mt-6 w-full gap-10">
                    {/* Clear Button */}
                    <Button
                      onPress={() => {
                        setReviewVisible(false);
                        setShowRatingError(false);
                        setRating(0);
                        setComment("");
                      }}
                      className="flex-1 h-10 rounded-xl border border-gray-300 bg-white items-center justify-center"
                    >
                      <ButtonText className="text-gray-500 font-medium">
                        Clear
                      </ButtonText>
                    </Button>

                    {/* Submit Button */}
                    <Button
                      onPress={handleSubmitReview}
                      disabled={submitting}
                      className="flex-1 h-10 rounded-xl bg-brand-700 items-center justify-center"
                    >
                      <ButtonText className="text-white font-medium">
                        {submitting ? "Submitting..." : "Submit"}
                      </ButtonText>
                    </Button>
                  </HStack>
                </Box>
              </KeyboardAvoidingView>
            </Box>
          </Modal>
        </ScrollView>

        {/* Floating Message Icon */}
        <Pressable
          className="bg-brand-700"
          style={{
            position: "absolute",
            bottom: "15%",
            right: 20,
            padding: 14,
            borderRadius: 50,
            elevation: 5,
          }}
          onPress={() => router.push(`/(protected)/chat/${data.car.owner_id}`)}
        >
          <MessageSquareText size={22} color="white" />
        </Pressable>

        {/* custom alert rerender */}
        <CustomAlert
          visible={alertVisible}
          title={alertData.title}
          message={alertData.message}
          type={alertData.type}
          onClose={() => setAlertVisible(false)}
          actions={alertData.actions}
        />
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type="success"
          onClose={() => setToastVisible(false)}
        />
      </Box>
    </SafeAreaView>
  );
};

export default RenterBookingDetails;
