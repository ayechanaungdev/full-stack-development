import CustomAlert from "@/components/app-alert";
import { AvailabeDateCalendar } from "@/components/available-display-calendar";
import DatePicker from "@/components/booking-date-picker";
import TimePicker from "@/components/booking-time-picker";
import Toast from "@/components/Toast";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { supabase } from "@/lib/supabase";
import { AntDesign, Entypo, Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { usePreventRemove } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { CalendarDays, Clock, Eye, EyeOff, Flag } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RentalBookingScreen() {
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [car, setCar] = useState<any>(null);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Visibility states for custom TimePicker modals
  const [showPickupTime, setShowPickupTime] = useState(false);
  const [showReturnTime, setShowReturnTime] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    actions: [] as any[],
  });

  // toast notification, type and message state
  type ToastType = "success" | "error" | "info" | "warning";
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      const net = await NetInfo.fetch();
      const isOnline = net.isConnected && net.isInternetReachable !== false;

      if (!isOnline) {
        setToastMessage("No internet connection");
        setToastType("error");
        setToastVisible(true);
        return;
      }

      await fetchCar();
    } catch (error) {
      setToastMessage("Something went wrong");
      setToastVisible(true);
      setToastType("error");
    } finally {
      setRefreshing(false);
    }
  };

  const copyCarNumberToClipboard = async (car_number: string) => {
    if (!car_number) return;

    await Clipboard.setStringAsync(car_number);
    setToastMessage("Car number copied to clipboard.");
    setToastVisible(true);
  };

  // Scroll helper
  const scrollToInput = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  // Validation error state for form fields
  const [errors, setErrors] = useState({
    pickupLocation: "",
    dropoffLocation: "",
  });

  // Validation location input
  const validateLocation = (name: string, value: string) => {
    const hasLetter = /[a-zA-Z]/.test(value);
    if (!hasLetter && value.trim() !== "") {
      return "Please enter a valid address.";
    }
    return "";
  };

  // Load data when screen opens or ID changes
  useEffect(() => {
    if (id) fetchCar();
    fetchUnavailableDates();
  }, [id]);

  // Fetch car detail information from Supabase
  const fetchCar = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("cars")
      .select(
        `
      *,
      profiles:owner_id ( id, full_name, avatar_url),
      car_images ( id, image_url, is_primary )
    `,
      )
      .eq("car_images.is_primary", true)
      .eq("id", id)
      .single();

    if (error || !data) {
      setLoading(false);
      setAlert({
        visible: true,
        type: "error",
        title: "Unavailable",
        message: "The selected car is no longer available.",
        actions: [{ text: "OK", onPress: () => router.replace("/search") }],
      });
      return;
    }

    setCar(data);

    // checking car availability status
    if (data.status?.toLowerCase() !== "available") {
      setLoading(false);
      setAlert({
        visible: true,
        type: "error",
        title: "Car Unavailable",
        message: "This car is currently unavailable for booking.",
        actions: [
          { text: "Browse Cars", onPress: () => router.replace("/search") },
        ],
      });
      return;
    }

    await fetchUnavailableDates();
    setLoading(false);
  };

  // fetch unavailable dates when car data is loaded
  const fetchUnavailableDates = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("start_date, end_date")
      .eq("car_id", id)
      .in("status", ["pending", "approved", "completed"]);

    if (error) {
      console.error(error);
      return;
    }

    const dates: string[] = [];
    data.forEach((booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]); // format YYYY-MM-DD
      }
    });

    setUnavailableDates(dates);
  };

  // Booking form state
  const [form, setForm] = useState({
    pickupDate: "",
    returnDate: "",
    pickupTime: "",
    returnTime: "",
    pickupLocation: "",
    dropoffLocation: "",
    note: "",
  });

  const navigation = useNavigation();

  const hasChanges =
    !!form.pickupDate ||
    !!form.returnDate ||
    !!form.pickupTime ||
    !!form.returnTime ||
    !!form.pickupLocation ||
    !!form.dropoffLocation ||
    !!form.note;

  usePreventRemove(hasChanges, ({ data }) => {
    setAlert({
      visible: true,
      type: "warning",
      title: "Confirmation",
      message: "Are you sure you want to go back? Your changes will be lost.",
      actions: [
        {
          text: "Cancel",
          type: "cancel",
        },
        {
          text: "Yes",
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    });
  });

  // Validate if all required fields are filled correctly
  const isFormValid =
    form.pickupDate &&
    form.returnDate &&
    form.pickupTime &&
    form.returnTime &&
    form.pickupLocation.trim() !== "" &&
    form.dropoffLocation.trim() !== "" &&
    !validateLocation("pickup", form.pickupLocation) &&
    !validateLocation("dropoff", form.dropoffLocation);

  // Calendar visibility toggle
  const [showCalendar, setShowCalendar] = useState(false);

  // price per day for selected car
  const pricePerDay = car?.price_per_day || 0;

  // Convert YYYY-MM-DD string to local Date object (avoid timezone issues)
  const getDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day); // local date, no timezone shift
  };

  // Conversion helpers for time formatting
  const getTimeObject = (timeStr: string) => {
    const date = new Date();

    // Round minutes to nearest 30 for the initial date
    const mins = date.getMinutes();
    if (mins < 15) {
      date.setMinutes(0, 0, 0);
    } else if (mins < 45) {
      date.setMinutes(30, 0, 0);
    } else {
      date.setHours(date.getHours() + 1, 0, 0, 0);
    }

    // Ensure the default hour is between 5 AM and 10 PM
    const currentHour = date.getHours();
    if (currentHour < 5) {
      date.setHours(5, 0, 0, 0);
    } else if (currentHour > 22 || (currentHour === 22 && date.getMinutes() > 0)) {
      date.setHours(22, 0, 0, 0);
    }

    if (!timeStr) return date;
    const [hours, minutes] = timeStr.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };
  // 24 hr ofrmat
  const formatTimeToString = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // 12 hr format
  const formatTimeTo12Hour = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 → 12

    const minutesStr = String(minutes).padStart(2, "0");

    return `${hours}:${minutesStr} ${ampm}`;
  };

  // Calculate rental duration (number of days)
  const days =
    form.pickupDate && form.returnDate
      ? (() => {
          const start = getDate(form.pickupDate);
          const end = getDate(form.returnDate);

          if (end < start) return 0;

          const diff =
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

          return diff + 1;
        })()
      : 0;

  // Total booking price calculation
  const total = days * pricePerDay;

  // Normalize today date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to validate if a time string is within 5:00 AM - 10:00 PM business hours
  const isTimeInBusinessHours = (timeStr: string) => {
    if (!timeStr) return false;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (hours < 5 || hours > 22 || (hours === 22 && minutes > 0)) {
      return false;
    }
    return true;
  };

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isPastTime = (timeStr: string) => {
    if (!timeStr) return false;
    const now = new Date();
    const [hours, minutes] = timeStr.split(":").map(Number);
    const selectedDateTime = new Date(now);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    return selectedDateTime < now;
  };

  const isTimeDifferenceValid = (pickupTime: string, returnTime: string) => {
    if (!pickupTime || !returnTime) return true;
    const [pKH, pKM] = pickupTime.split(":").map(Number);
    const [rTH, rTM] = returnTime.split(":").map(Number);
    const diffInMinutes = (rTH * 60 + rTM) - (pKH * 60 + pKM);
    return diffInMinutes >= 60;
  };

  // Reference to note input field
  const noteInputRef = React.useRef<any>(null);

  // Handle booking confirmation flow
  const handleConfirm = async () => {
    if (!form.pickupDate || !form.returnDate) return;

    if (!isTimeInBusinessHours(form.pickupTime) || !isTimeInBusinessHours(form.returnTime)) {
      setAlert({
        visible: true,
        type: "error",
        title: "Invalid Booking Time",
        message: "Booking pickup and return times must be between 5:00 AM and 10:00 PM.",
        actions: [{ text: "OK" }],
      });
      return;
    }

    const todayStr = getLocalDateString(new Date());
    if (form.pickupDate === todayStr && isPastTime(form.pickupTime)) {
      setAlert({
        visible: true,
        type: "error",
        title: "Past Time Selected",
        message: "Pick-up time cannot be in the past.",
        actions: [{ text: "OK" }],
      });
      return;
    }

    if (form.returnDate === todayStr && isPastTime(form.returnTime)) {
      setAlert({
        visible: true,
        type: "error",
        title: "Past Time Selected",
        message: "Return time cannot be in the past.",
        actions: [{ text: "OK" }],
      });
      return;
    }

    if (form.pickupDate === form.returnDate) {
      if (!isTimeDifferenceValid(form.pickupTime, form.returnTime)) {
        setAlert({
          visible: true,
          type: "error",
          title: "Invalid Duration",
          message: "Booking must be at least 1 hour long.",
          actions: [{ text: "OK" }],
        });
        return;
      }
    }

    if (!car || car.status?.toLowerCase() !== "available") {
      setAlert({
        visible: true,
        type: "error",
        title: "Unavailable",
        message: "This car is no longer available.",
        actions: [
          {
            text: "OK",
            onPress: () => router.replace("/(protected)/(home)/search"),
          },
        ],
      });
      return;
    }

    const start = getDate(form.pickupDate);
    const end = getDate(form.returnDate);

    // Check if selected dates overlap with unavailable dates
    const conflict = unavailableDates.some((d) => {
      const date = new Date(d);
      return date >= start && date <= end;
    });

    if (conflict) {
      setAlert({
        visible: true,
        type: "error",
        title: "Unavailable Range",
        message:
          "Your selected range includes unavailable dates. Please choose a different range.",
        actions: [
          {
            text: "OK",
            onPress: () => {
              setForm((prev) => ({
                ...prev,
                pickupDate: "",
                returnDate: "",
              }));
            },
          },
        ],
      });
      return;
    }

    // Ask confirmation if user did not add a note
    if (form.note.trim().length === 0) {
      setAlert({
        visible: true,
        type: "warning",
        title: "Reminder",
        message:
          "You didn't add a note. Do you want to continue booking without a note?",
        actions: [
          {
            text: "No",
            type: "cancel",
            onPress: () => {
              noteInputRef.current?.focus();
            },
          },
          {
            text: "Yes",
            onPress: () => {
              createBooking();
            },
          },
        ],
      });
      return;
    }

    createBooking();
  };

  // Create booking and insert into database
  const createBooking = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        setToastMessage("No internet connection");
        setToastVisible(true);
        setToastType("error");
        setIsSubmitting(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAlert({
          visible: true,
          type: "error",
          title: "Error",
          message: "You must be logged in to book a car.",
          actions: [
            {
              text: "OK",
              onPress: () => router.replace("/auth/login"),
            },
          ],
        });
        return;
      }

      const customerId = user.id;

      const { error } = await supabase.from("bookings").insert([
        {
          customer_id: customerId,
          owner_id: car?.owner_id,
          car_id: id,
          driver_id: null,
          start_date: form.pickupDate,
          end_date: form.returnDate,
          pickup_time: form.pickupTime,
          dropoff_time: form.returnTime,
          total_price: total,
          pickup_location: form.pickupLocation,
          dropoff_location: form.dropoffLocation,
          status: "pending",
          note: form.note,
        },
      ]);

      if (error) {
        if (error.code === "23P01") {
          setAlert({
            visible: true,
            type: "error",
            title: "Unavailable",
            message:
              "This car is already booked for selected dates. Please choose different dates.",
            actions: [
              {
                text: "OK",
                onPress: () => {
                  setForm((prev) => ({
                    ...prev,
                    pickupDate: "",
                    returnDate: "",
                  }));
                },
              },
            ],
          });
          fetchCar();
          return;
        }

        if (error.code === "40P01") {
          setAlert({
            visible: true,
            type: "warning",
            title: "High Traffic",
            message:
              "Another user is booking at the same time. Please try again.",
            actions: [
              {
                text: "Retry",
                onPress: () => {
                  setIsSubmitting(false);
                  createBooking();
                },
              },
            ],
          });
          return;
        }

        console.error(error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["owner_bookings"] });
      queryClient.invalidateQueries({ queryKey: ["renter_bookings"] });

      setTimeout(() => {
        setForm({
          pickupDate: "",
          returnDate: "",
          pickupTime: "",
          returnTime: "",
          pickupLocation: "",
          dropoffLocation: "",
          note: "",
        });

        setAlert({
          visible: true,
          type: "success",
          title: "Success",
          message: "Booking successful! Please wait for confirmation.",
          actions: [
            {
              text: "OK",
              onPress: () => router.replace("/(protected)/(tabs)/bookings"),
            },
          ],
        });
      }, 300);
    } catch (error: any) {
      console.error("Unexpected error:", error);
      if (error?.message === "Network request failed") {
        setToastMessage("Network issue");
        setToastVisible(true);
        setToastType("error");
      } else {
        setToastMessage("Error");
        setToastVisible(true);
        setToastType("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#32B6EA" />
        <Text className="mt-2 text-gray-500">Checking availability...</Text>
      </Box>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={["bottom"]}>
      <KeyboardAwareScrollView
        bottomOffset={20}
        style={{ flex: 1, backgroundColor: "#F9FBFF" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 0,
          paddingBottom: 35,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Car Information Card */}
        {car ? (
          <Box className="pt-0 bg-white rounded-2xl mb-2 border border-outline-200 overflow-hidden shadow-soft-2">
            <Image
              resizeMode={car.car_images?.[0]?.image_url ? "cover" : "contain"}
              source={
                car.car_images?.[0]?.image_url
                  ? { uri: car.car_images[0].image_url }
                  : require("@/assets/images/icon.png")
              }
              className="w-full h-40"
            />
            <HStack className="justify-between items-start p-4">
              <VStack className="gap-2 flex-1 mr-4">
                <Text
                  className="font-bold text-sm text-typography-black"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {car.brand} {car.model}
                </Text>
                <HStack className="items-center gap-2">
                  <Pressable
                    onLongPress={() => {
                      copyCarNumberToClipboard(car.car_number);
                      setToastMessage("Car number copied to clipboard.");
                      setToastVisible(true);
                      setToastType("success");
                    }}
                  >
                    <Box className="bg-brand-50 border border-brand-600 px-2 py-1 rounded-md flex-row items-center self-start">
                      <AntDesign
                        name="credit-card"
                        size={15}
                        color="#32B6EA"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className="text-brand-700 text-xs font-bold"
                        numberOfLines={1}
                      >
                        {car.car_number}
                      </Text>
                    </Box>
                  </Pressable>
                  <Pressable
                    className="p-1 rounded-full ml-2 active:bg-gray-100"
                    onPress={() => {
                      copyCarNumberToClipboard(car.car_number);

                      setToastMessage("Car number copied to clipboard.");
                      setToastVisible(true);
                      setToastType("success");
                    }}
                  >
                    <Ionicons name="copy-outline" size={15} color="#16a8e3" />
                  </Pressable>
                </HStack>
              </VStack>
              <Text className="text-brand-700 font-bold text-sm">
                {car.price_per_day.toLocaleString()} MMK{" "}
                <Text className="text-xs text-brand-700 font-normal">/day</Text>
              </Text>
            </HStack>
          </Box>
        ) : (
          <Text className="text-gray-400">Loading car info...</Text>
        )}

        {/* Booking Form */}
        <Box className="p-4 my-4 bg-white rounded-2xl mb-2 border border-outline-200 overflow-hidden shadow-soft-2">
          <Pressable
            onPress={() => setShowCalendar(!showCalendar)}
            className="border border-outline-400 rounded-xl px-3 py-2 mb-4"
          >
            <HStack className="items-center justify-between">
              <HStack className="items-center">
                <CalendarDays size={18} color="#32B6EA" />
                <Text className="ml-2 text-brand-950">See Available Dates</Text>
              </HStack>
              {showCalendar ? (
                <Eye size={20} color="#16a8e3" />
              ) : (
                <EyeOff size={20} color="#16a8e3" />
              )}
            </HStack>
          </Pressable>

          {showCalendar && (
            <AvailabeDateCalendar unavailableDates={unavailableDates} />
          )}

          {/* Business Hours Banner */}
          <Box className="bg-brand-50 border border-brand-200 rounded-xl p-3 mb-4 flex-row items-center gap-2">
            <Clock size={16} color="#32B6EA" />
            <Text className="text-xs text-brand-800 font-medium flex-1">
              Business Hours: 5:00 AM - 10:00 PM (at least 1-hour duration)
            </Text>
          </Box>

          {/* Date and Time Picking Section */}
          <HStack className="justify-between mb-4 gap-4">
            {/* Pickup Column */}
            <VStack className="flex-1 gap-3">
              <DatePicker
                label="Pick-up Date"
                required
                value={form.pickupDate}
                onChange={(v) => {
                  setForm((prev) => {
                    let returnDate = prev.returnDate;
                    const selectedPickup = getDate(v);
                    const selectedReturn = returnDate
                      ? getDate(returnDate)
                      : null;

                    if (selectedReturn && selectedReturn < selectedPickup) {
                      returnDate = v;
                    }

                    if (returnDate) {
                      const diffDays =
                        (getDate(returnDate).getTime() -
                          selectedPickup.getTime()) /
                          (1000 * 60 * 60 * 24) +
                        1;

                      if (diffDays > 30) {
                        setAlert({
                          visible: true,
                          type: "info",
                          title: "Maximum Rental Duration",
                          message: "You cannot rent for more than 30 days.",
                          actions: [
                            {
                              text: "OK",
                              onPress: () => {
                                fetchCar();
                                setForm((prev) => ({
                                  ...prev,
                                  pickupDate: "",
                                  returnDate: "",
                                  pickupTime: "",
                                  returnTime: "",
                                }));
                              },
                            },
                          ],
                        });
                      }
                    }

                    // Check if time is in the past now that date has changed
                    let pickupTime = prev.pickupTime;
                    let returnTime = prev.returnTime;
                    const todayStr = getLocalDateString(new Date());

                    if (v === todayStr && pickupTime && isPastTime(pickupTime)) {
                      pickupTime = "";
                      setToastMessage("Pick-up time reset because it was in the past.");
                      setToastType("warning");
                      setToastVisible(true);
                    }

                    if (v === returnDate && pickupTime && returnTime) {
                      if (!isTimeDifferenceValid(pickupTime, returnTime)) {
                        returnTime = "";
                        setToastMessage("Return time reset to maintain minimum 1-hour duration.");
                        setToastType("warning");
                        setToastVisible(true);
                      }
                    }

                    return { ...prev, pickupDate: v, returnDate, pickupTime, returnTime };
                  });
                }}
                minimumDate={today}
                markedDates={unavailableDates}
              />

              {/* Pick-up Time Wrapper Input Area */}
              <DatePicker
                label="Return Date"
                required
                value={form.returnDate}
                onChange={(v) => {
                  setForm((prev) => {
                    let pickupDate = prev.pickupDate || v;
                    const selectedPickup = getDate(pickupDate);
                    const selectedReturn = getDate(v);

                    const diffDays =
                      (selectedReturn.getTime() - selectedPickup.getTime()) /
                        (1000 * 60 * 60 * 24) +
                      1;

                    if (diffDays > 30) {
                      setAlert({
                        visible: true,
                        type: "info",
                        title: "Maximum Rental Duration",
                        message: "You cannot rent for more than 30 days.",
                        actions: [
                          {
                            text: "OK",
                            onPress: () => {
                              fetchCar();
                              setForm((prev) => ({
                                ...prev,
                                pickupDate: "",
                                returnDate: "",
                                pickupTime: "",
                                returnTime: "",
                              }));
                            },
                          },
                        ],
                      });
                    }

                    // Check if times are valid under new dates
                    let pickupTime = prev.pickupTime;
                    let returnTime = prev.returnTime;
                    const todayStr = getLocalDateString(new Date());

                    if (v === todayStr && returnTime && isPastTime(returnTime)) {
                      returnTime = "";
                      setToastMessage("Return time reset because it was in the past.");
                      setToastType("warning");
                      setToastVisible(true);
                    }

                    if (pickupDate === v && pickupTime && returnTime) {
                      if (!isTimeDifferenceValid(pickupTime, returnTime)) {
                        returnTime = "";
                        setToastMessage("Return time reset to maintain minimum 1-hour duration.");
                        setToastType("warning");
                        setToastVisible(true);
                      }
                    }

                    return { ...prev, pickupDate, returnDate: v, pickupTime, returnTime };
                  });
                }}
                minimumDate={
                  form.pickupDate ? new Date(form.pickupDate) : today
                }
                markedDates={unavailableDates}
              />
            </VStack>

            {/* Return Column */}
            <VStack className="flex-1 gap-3">
              <VStack>
                <Text className="mb-1 text-typography-black text-sm">
                  Pick-up Time<Text className="text-error-500"> *</Text>
                </Text>
                <Pressable
                  onPress={() => {
                    if (!form.pickupDate || !form.returnDate) {
                      setToastMessage("Please select Pick-up and Return dates first.");
                      setToastType("warning");
                      setToastVisible(true);
                      return;
                    }
                    setShowPickupTime(true);
                  }}
                  className={`rounded-xl px-3 h-11 border justify-center ${
                    (!form.pickupDate || !form.returnDate) 
                      ? "bg-gray-100 border-gray-200 opacity-60" 
                      : "bg-white border-outline-400"
                  }`}
                >
                  <HStack className="items-center gap-2">
                    <Clock size={18} color="#32B6EA" />
                    <Text
                      className={`font-bold text-sm 
                      ${form.pickupTime ? "text-gray-800" : "text-gray-400"}`}
                    >
                      {form.pickupTime
                        ? formatTimeTo12Hour(getTimeObject(form.pickupTime))
                        : "hh:mm"}
                    </Text>
                  </HStack>
                </Pressable>
                <TimePicker
                  visible={showPickupTime}
                  selectedValueString={form.pickupTime}
                  onClose={() => setShowPickupTime(false)}
                  onChange={(timeString) => {
                    const todayStr = getLocalDateString(new Date());
                    if (form.pickupDate === todayStr && isPastTime(timeString)) {
                      setAlert({
                        visible: true,
                        type: "warning",
                        title: "Past Time Selected",
                        message: "Pick-up time cannot be in the past.",
                        actions: [{ text: "OK" }],
                      });
                      return;
                    }

                    if (form.pickupDate === form.returnDate && form.returnTime) {
                      if (!isTimeDifferenceValid(timeString, form.returnTime)) {
                        setAlert({
                          visible: true,
                          type: "warning",
                          title: "Invalid Time Slot",
                          message: "Booking must be at least 1 hour long. Pick-up time must be at least 1 hour earlier than return time.",
                          actions: [{ text: "OK" }],
                        });
                        return;
                      }
                    }

                    setForm((prev) => ({ ...prev, pickupTime: timeString }));
                  }}
                  title="Select Pick-up Time"
                />
              </VStack>

              {/* Return Time Wrapper Input Area */}
              <VStack>
                <Text className="mb-1 text-typography-black text-sm">
                  Return Time<Text className="text-error-500"> *</Text>
                </Text>
                <Pressable
                  onPress={() => {
                    if (!form.pickupDate || !form.returnDate) {
                      setToastMessage("Please select Pick-up and Return dates first.");
                      setToastType("warning");
                      setToastVisible(true);
                      return;
                    }
                    setShowReturnTime(true);
                  }}
                  className={`rounded-xl px-3 h-11 border justify-center ${
                    (!form.pickupDate || !form.returnDate) 
                      ? "bg-gray-100 border-gray-200 opacity-60" 
                      : "bg-white border-outline-400"
                  }`}
                >
                  <HStack className="items-center gap-2">
                    <Clock size={18} color="#32B6EA" />
                    <Text
                      className={`font-bold text-sm color:'bl
                      ${form.returnTime ? "text-gray-800" : "text-gray-400"}`}
                    >
                      {form.returnTime
                        ? formatTimeTo12Hour(getTimeObject(form.returnTime))
                        : "hh:mm"}
                    </Text>
                  </HStack>
                </Pressable>

                <TimePicker
                  visible={showReturnTime}
                  selectedValueString={form.returnTime}
                  onClose={() => setShowReturnTime(false)}
                  onChange={(timeString) => {
                    const todayStr = getLocalDateString(new Date());
                    if (form.returnDate === todayStr && isPastTime(timeString)) {
                      setAlert({
                        visible: true,
                        type: "warning",
                        title: "Past Time Selected",
                        message: "Return time cannot be in the past.",
                        actions: [{ text: "OK" }],
                      });
                      return;
                    }

                    if (form.pickupDate === form.returnDate && form.pickupTime) {
                      if (!isTimeDifferenceValid(form.pickupTime, timeString)) {
                        setAlert({
                          visible: true,
                          type: "warning",
                          title: "Invalid Time Slot",
                          message: "Booking must be at least 1 hour long. Return time must be at least 1 hour later than pickup time.",
                          actions: [{ text: "OK" }],
                        });
                        return;
                      }
                    }

                    setForm((prev) => ({ ...prev, returnTime: timeString }));
                  }}
                  title="Select Return Time"
                />
              </VStack>
            </VStack>
          </HStack>

          {/* Locations */}
          <InputRow
            icon={(props: any) => (
              <Entypo name="location-pin" size={22} color="#32B6EA" />
            )}
            label="Pick-up Location"
            required
            placeholder="Enter Pick-up Location"
            value={form.pickupLocation}
            error={errors.pickupLocation}
            onChange={(v: string) => {
              setForm({ ...form, pickupLocation: v });
              setErrors((prev) => ({
                ...prev,
                pickupLocation: validateLocation("pickupLocation", v),
              }));
            }}
            onBlur={() => {
              setErrors((prev) => ({
                ...prev,
                pickupLocation: validateLocation(
                  "pickupLocation",
                  form.pickupLocation,
                ),
              }));
            }}
            onFocus={scrollToInput}
          />

          <InputRow
            icon={Flag}
            label="Drop-off Location"
            required
            placeholder="Enter Drop-off Location"
            value={form.dropoffLocation}
            error={errors.dropoffLocation}
            onChange={(v: string) => {
              setForm({ ...form, dropoffLocation: v });
              setErrors((prev) => ({
                ...prev,
                dropoffLocation: validateLocation("dropoffLocation", v),
              }));
            }}
            onBlur={() => {
              setErrors((prev) => ({
                ...prev,
                dropoffLocation: validateLocation(
                  "dropoffLocation",
                  form.dropoffLocation,
                ),
              }));
            }}
            onFocus={scrollToInput}
          />

          {/* Summary */}
          <Box className="mt-2 border-t border-outline-50 pt-1">
            <SummaryRow
              className="text-brand-975/80"
              label="Rental Duration"
              value={`${days} Days`}
            />
            <SummaryRow
              label="Price / Day"
              value={`${pricePerDay.toLocaleString()} Ks`}
            />
            <HStack className="justify-between mt-2 pt-2 border-t border-outline-50">
              <Text className="font-semibold text-base text-brand-975/80">
                Total Price
              </Text>
              <Text className="font-semibold text-base text-brand-975/80">
                {total.toLocaleString()} Ks
              </Text>
            </HStack>
          </Box>
        </Box>

        {/* Note */}
        <Box className="p-4 my-4 bg-white rounded-2xl mb-2 border border-outline-200 overflow-hidden shadow-soft-2">
          <Text className="mb-2 text-typography-black/80 text-sm font-medium">
            Note
          </Text>
          <Input className="h-28 border-[0.5px] rounded-xl px-1 py-2 border-brand-200">
            <InputField
              ref={noteInputRef}
              placeholder="Add any special requests or note here..."
              value={form.note}
              onChangeText={(v) => {
                if (v.length <= 100) {
                  setForm({ ...form, note: v });
                }
              }}
              multiline
              textAlignVertical="top"
            />
          </Input>
          <Text className="text-right text-xs text-typography-600 mt-1">
            {form.note.length}/100
          </Text>
        </Box>

        {/* Confirm Button */}
        <Button
          onPress={handleConfirm}
          disabled={!isFormValid || isSubmitting}
          className={`rounded-xl h-12 mb-6 ${
            !isFormValid || isSubmitting ? "bg-gray-300" : "bg-brand-700"
          }`}
        >
          <HStack className="items-center gap-2">
            {isSubmitting && <ActivityIndicator size="small" color="#fff" />}
            <ButtonText className="text-base">
              {isSubmitting ? "Processing..." : "Confirm"}
            </ButtonText>
          </HStack>
        </Button>

        {/* Alert Modal */}
        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          actions={alert.actions}
          onClose={() => setAlert((prev) => ({ ...prev, visible: false }))}
        />
      </KeyboardAwareScrollView>

      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

// Subcomponents definitions
const InputRow = ({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  required,
}: any) => (
  <VStack className="mb-3">
    <Text className="mb-1 text-typography-black text-sm">
      {label}
      {required && <Text className="text-error-500"> *</Text>}
    </Text>
    <Input
      className={`rounded-xl px-3 h-11 border ${
        error ? "border-error-500" : "border-outline-400"
      }`}
    >
      <HStack className="items-center space-x-2">
        <Icon size={18} color="#32B6EA" />
        <InputField
          placeholder={placeholder}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          maxLength={50}
        />
      </HStack>
    </Input>
    {error ? (
      <Text className="text-error-500 text-xs mt-1">{error}</Text>
    ) : null}
  </VStack>
);

const SummaryRow = ({ label, value }: any) => (
  <HStack className="justify-between mt-2 mb-1">
    <Text className="text-typography-700 text-sm">{label}</Text>
    <Text className="text-brand-975/80 font-medium text-sm">{value}</Text>
  </HStack>
);
