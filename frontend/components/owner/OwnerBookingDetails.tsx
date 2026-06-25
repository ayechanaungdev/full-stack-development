import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { CARD_SHADOW } from "@/utils/dashboardHelpers";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";

import * as Clipboard from "expo-clipboard";

import {
  ArrowDownCircleIcon,
  CarFrontIcon,
  ChevronDown,
  MapPinIcon,
  MessageSquareText,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CustomAlert from "../app-alert";
import ProfileDetailModal from "../ProfileDetailModal";
import { SelectorModal } from "../SelectorModal";
import Toast from "../Toast";
import { Image } from "../ui/image";
import CarDetailModal from "./OwnerBookingSelectedCarModal";

type Props = {
  bookingId: string;
};

type BookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

type BookingDetail = {
  id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time?: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  total_price: number;
  created_at: string;
  car_id: string;
  driver_id: string | null;
  customer_id: string;
  note?: string | null;
  is_read?: boolean;
  car?: {
    id: string;
    brand: string;
    model: string;
    seats: number;
    car_type: string;
    car_number: string;
    postal_code?: string | null;
    price_per_day: number;
    location: string;
    owner_id: string;
    car_images?: {
      id: string;
      image_url: string;
    }[]; // Assuming you have a separate table for car images
  };
  customer?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    nrc?: string | null;
    gender?: string | null;
    location?: string | null;
    postal_code?: string | null;
  };
  driver?: {
    id: string;
    name: string;
    phone: string;
    location?: string | null;
    postal_code?: string | null;
    photo_url: string | null;
    status: string;
  };
};

type Driver = {
  id: string;
  name: string;
  phone: string;
  status: string;
  location?: string | null;
  postal_code?: string | null;
  photo_url?: string | null;
  is_blocked?: boolean;
};

/**
 * Returns label and Tailwind CSS classes for a booking status.
 * @param status - The booking status enum value
 * @returns An object containing the display label and class names
 */
function getBookingStatusInfo(status: BookingStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        badge: "bg-warning-0 border border-warning-300",
        text: "text-warning-700",
      };
    case "approved":
      return {
        label: "Approved",
        badge: "bg-info-0 border border-info-300",
        text: "text-info-700",
      };
    case "rejected":
      return {
        label: "Rejected",
        badge: "bg-error-50 border border-error-300",
        text: "text-error-800",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        badge: "bg-error-0 border border-error-300",
        text: "text-error-700",
      };
    case "completed":
      return {
        label: "Completed",
        badge: "bg-success-0 border border-success-300",
        text: "text-success-700",
      };
    default:
      return {
        label: "Unknown",
        badge: "bg-typography-0 border border-typography-200",
        text: "text-typography-900",
      };
  }
}

/**
 * React component for displaying and managing booking details for car owners.
 * Allows viewing booking information, approving/rejecting bookings, and assigning/changing drivers.
 * @param bookingId - The UUID of the booking to display
 */
const OwnerBookingDetails = ({ bookingId }: Props) => {
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const role = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carImageError, setCarImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);

  // For Profile Detail Modal --- SMA added this code
  const [renterProfileModalOpen, setRenterProfileModalOpen] = useState(false);
  const [driverProfileModalOpen, setDriverProfileModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  //For Car Detail Modal
  const [carModalVisible, setCarModalVisible] = useState(false);
  const [selectedCar, setSelectedCar] = useState<any>(null);

  // Custom alert state (replaces default Alert.alert)
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    actions: [] as any[],
  });

  const defaultCarImage = require("@/assets/images/icon.png");
  const defaultAvatarImage = require("@/assets/images/avatar1.png");

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

  /**
   * Calculates the duration of the booking in days.
   * @returns The number of days between start and end dates (minimum 1)
   */
  const durationDays = useMemo(() => {
    if (!booking) return 0;
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const diff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1,
    );
    return Math.max(1, diff);
  }, [booking]);

  /**
   * Determines the currently selected driver based on user selection or existing booking assignment.
   * @returns The selected driver object or null
   */
  const selectedDriver = useMemo(() => {
    if (selectedDriverId) {
      return (
        drivers.find((driver) => driver.id === selectedDriverId) ??
        booking?.driver ??
        null
      );
    }
    return booking?.driver ?? null;
  }, [drivers, selectedDriverId, booking]);

  // Filter drivers:
  // - remove blocked drivers
  // - remove currently assigned driver (for approved bookings)
  const availableDrivers = useMemo(() => {
    return drivers
      .filter((d) => {
        // Exclude blocked drivers
        if (d.is_blocked) return false;

        // 🚫 Exclude already assigned driver when booking is approved
        if (booking?.status === "approved" && booking.driver_id === d.id) {
          return false;
        }

        return true;
      })
      .map((d) => ({
        ...d,
        fullDisplayLabel: `${d.name}\n${d.phone}\n${d.location}`,
      }));
  }, [drivers, booking]);

  /**
   * Loads booking details and related data (car, customer, driver) from Supabase.
   * Also fetches available drivers and marks those with conflicting bookings as blocked.
   */
  const loadBooking = useCallback(async () => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/bookings/${bookingId}`);
      const bookingData = response.data;

      if (!bookingData) {
        setError("Booking not found.");
        setBooking(null);
        return;
      }

      const profile = bookingData.user?.profile || {};

      setBooking({
        id: String(bookingData.id),
        status: (bookingData.status?.toLowerCase() || "pending") as BookingStatus,
        start_date: bookingData.startDate?.split("T")[0] || "",
        end_date: bookingData.endDate?.split("T")[0] || "",
        pickup_time: formatTo12Hour(bookingData.pickupTime),
        dropoff_time: formatTo12Hour(bookingData.dropoffTime ?? undefined),
        pickup_location: bookingData.pickupLocation,
        dropoff_location: bookingData.dropoffLocation,
        total_price: Number(bookingData.totalPrice),
        created_at: bookingData.createdAt,
        car_id: String(bookingData.carId),
        driver_id: bookingData.driverId ? String(bookingData.driverId) : null,
        customer_id: String(bookingData.userId),
        car: bookingData.car
          ? {
              id: String(bookingData.car.id),
              brand: bookingData.car.brand,
              model: bookingData.car.model,
              seats: bookingData.car.seats,
              car_type: bookingData.car.car_type,
              car_number: bookingData.car.car_number,
              postal_code: bookingData.car.postal_code,
              price_per_day: bookingData.car.pricePerDay,
              location: bookingData.car.location,
              owner_id: String(bookingData.car.ownerId),
              car_images: (bookingData.car.carImages || []).map(
                (img: any) => ({
                  id: String(img.id),
                  image_url: img.image_url,
                }),
              ),
            }
          : undefined,
        customer: {
          id: String(bookingData.user?.id),
          full_name: profile.full_name || bookingData.user?.name || null,
          phone: profile.phone || null,
          avatar_url: profile.avatar_url || null,
          nrc: profile.nrc || null,
          gender: profile.gender || null,
          location: profile.location || null,
          postal_code: profile.postal_code || null,
        },
        driver: bookingData.driver
          ? {
              id: String(bookingData.driver.id),
              name: bookingData.driver.name,
              phone: bookingData.driver.phone,
              photo_url: bookingData.driver.photo_url,
              status: bookingData.driver.status,
              location: bookingData.driver.location,
              postal_code: bookingData.driver.postal_code,
            }
          : undefined,
        note: bookingData.note,
        is_read: bookingData.isRead,
      });

      // Fetch drivers for this owner
      try {
        const driversResp = await apiClient.get("/drivers");
        const driverData = Array.isArray(driversResp.data) ? driversResp.data : [];

        // Check for overlapping approved bookings to mark drivers as blocked
        let blockedDriverIds = new Set<string>();
        try {
          const overlapResp = await apiClient.get("/bookings", {
            params: {
              status: "APPROVED",
              limit: 100,
              startDate: bookingData.startDate?.split("T")[0],
              endDate: bookingData.endDate?.split("T")[0],
            },
          });
          const overlaps = overlapResp.data?.data || [];
          blockedDriverIds = new Set(
            overlaps
              .filter((b: any) => String(b.id) !== bookingId && b.driverId)
              .map((b: any) => String(b.driverId)),
          );
        } catch {}

        setDrivers(
          driverData.map((driver: any) => ({
            id: String(driver.id),
            name: driver.name,
            phone: driver.phone,
            status: driver.status,
            location: driver.location || null,
            postal_code: driver.postal_code || null,
            photo_url: driver.photo_url || null,
            is_blocked:
              blockedDriverIds.has(String(driver.id)) ||
              driver.status !== "available",
          })),
        );

        if (!selectedDriverId && bookingData.driverId) {
          setSelectedDriverId(String(bookingData.driverId));
        }
      } catch {}
    } catch (err: any) {
      setError("Booking not found.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, selectedDriverId]);

  useEffect(() => {
    if (role !== "car_owner") {
      setError("Only car owners can view this screen.");
      setLoading(false);
      return;
    }
    loadBooking();
  }, [loadBooking, role]);

  useEffect(() => {
    const markBookingNotificationRead = async () => {
      if (!currentUserId || !bookingId) return;

      try {
        await apiClient.patch(`/bookings/${bookingId}/read`);
      } catch {}
    };

    markBookingNotificationRead();
  }, [bookingId, currentUserId, queryClient]);

  /**
   * Displays an alert dialog with a title and message.
   * @param title - The title of the alert
   * @param message - The message content of the alert
   */
  // Helper function to show a simple alert with only "OK" button
  // Helper function to show alert with dynamic type (success, error, warning, info)
  const showMessage = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ) => {
    setAlert({
      visible: true,
      title,
      message,
      type,
      actions: [
        {
          text: "OK",
        },
      ],
    });
  };

  /**
   * Updates the booking with new changes and shows a success message.
   * @param changes - Partial booking data to update
   * @param message - Success message to display after update
   */
  const updateBooking = async (
    changes: Partial<BookingDetail>,
    message: string,
  ) => {
    if (!booking) return;
    setSaving(true);

    try {
      const payload: any = {};
      if (changes.status) payload.status = changes.status.toUpperCase();
      if (changes.driver_id !== undefined) payload.driverId = Number(changes.driver_id);

      await apiClient.patch(`/bookings/${booking.id}/status`, payload);

      setBooking((prev) => (prev ? { ...prev, ...changes } : prev));
      setSaving(false);
      showMessage("Success", message, "success");

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["owner_bookings"] });
      queryClient.invalidateQueries({ queryKey: ["renter_bookings"] });

      // Immediately re-load state so we have the latest relations
      await loadBooking();
    } catch (error: any) {
      showMessage(
        "Update failed",
        error?.response?.data?.message || error?.message || "Failed to update booking",
        "error",
      );
      setSaving(false);
    }
  };

  /**
   * Handles status change for the booking with user confirmation.
   * @param newStatus - The new status to set for the booking
   */
  // Handle booking status change (approve / reject)
  const handleStatusChange = (newStatus: BookingStatus) => {
    const isApprove = newStatus === "approved";
    const statusLabel = getBookingStatusInfo(newStatus).label;

    // 🚫 Prevent approving without selecting a driver
    if (isApprove && !selectedDriverId) {
      setDriverError("Driver is required");
      return;
    }

    // Show confirmation alert before updating booking
    setAlert({
      visible: true,
      type: "info",
      title: `Confirm ${statusLabel}`,
      message: `Are you sure you want to set this booking to '${statusLabel}'?`,
      actions: [
        {
          text: "Cancel",
          type: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            const changes: Partial<BookingDetail> = { status: newStatus };

            // ✅ If approving, attach selected driver
            if (isApprove && selectedDriverId) {
              changes.driver_id = selectedDriverId;
            }

            // Call API to update booking
            updateBooking(
              changes,
              `Booking successfully ${statusLabel.toLowerCase()}.`,
            );
          },
        },
      ],
    });
  };

  const canChangeDriver =
    booking?.status === "approved" && new Date() < new Date(booking.start_date);

  /**
   * Handles driver change with validation and user confirmation.
   * Only allows change if a driver is selected and canChangeDriver is true.
   */
  // Handle driver assignment / change
  const handleDriverChange = () => {
    if (!selectedDriverId) {
      showMessage(
        "Driver Required",
        "Please select a driver before changing.",
        "warning",
      );
      return;
    }

    const targetDriver = drivers.find((d) => d.id === selectedDriverId);

    if (!targetDriver) {
      showMessage(
        "Driver not found",
        "Selected driver could not be found.",
        "error",
      );
      return;
    }

    // 🚫 NEW: Prevent assigning same driver again
    if (booking?.driver_id === selectedDriverId) {
      showMessage(
        "No Change",
        "This driver is already assigned to this booking.",
        "info",
      );
      return;
    }

    // ✅ Proceed with confirmation
    setAlert({
      visible: true,
      type: "info",
      title: "Confirm driver change",
      message: `Assign ${targetDriver.name} to this booking?`,
      actions: [
        { text: "Cancel", type: "cancel" },
        {
          text: "Assign",
          onPress: () =>
            updateBooking(
              { driver_id: selectedDriverId },
              `Driver changed to ${targetDriver.name}`,
            ),
        },
      ],
    });
  };

  const router = useRouter();
  const navigation = useNavigation();

  /**
   * Navigates to the messages screen to chat with the customer.
   * Requires a valid customer ID.
   */
  const handleOpenCustomerChat = () => {
    if (!booking?.customer_id) {
      showMessage("Cannot open chat", "Customer ID is not available.", "error");
      return;
    }

    router.push({
      pathname: "/(protected)/chat/[userId]",
      params: { userId: booking.customer_id },
    });
  };

  const formatBookingId = (id: string | undefined) => {
    if (!id) return "-";

    return id.length > 13
      ? `${id.toUpperCase().slice(0, 13)}...`
      : id.toUpperCase();
  };

  const copyBookingIdToClipboard = async (bookingId: string | undefined) => {
    if (!bookingId) return;

    await Clipboard.setStringAsync(bookingId);
    setToastMessage("Booking ID copied to clipboard.");
    setToastVisible(true);
  };

  const copyPhoneToClipboard = async (phoneNumber: string | undefined) => {
    if (!phoneNumber) return;

    await Clipboard.setStringAsync(phoneNumber);
    setToastMessage("Phone number copied to clipboard.");
    setToastVisible(true);
  };

  const copyCarNumberToClipboard = async (carNumber: string | undefined) => {
    if (!carNumber) return;

    await Clipboard.setStringAsync(carNumber);
    setToastMessage("Car number copied to clipboard.");
    setToastVisible(true);
  };

  /**
   * Sets up the navigation header with a status badge showing the current booking status.
   * Updates the header right component with appropriate styling based on booking status.
   */
  useLayoutEffect(() => {
    if (booking?.status) {
      const statusInfo = getBookingStatusInfo(booking.status);
      navigation.setOptions({
        headerRight: () => (
          <View className={`rounded-[9px] px-3 py-2 ml-3 ${statusInfo.badge}`}>
            <Text className={`${statusInfo.text} font-bold text-[12px]`}>
              {statusInfo.label}
            </Text>
          </View>
        ),
      });
    }
  }, [booking?.status, navigation]);

  /**
   * Custom renderer for each driver item in the SelectorModal.
   * Matches the premium design requested by the user.
   */
  const renderDriverItem = useCallback(
    (driver: any, isSelected: boolean) => {
      return (
        <Card
          size="md"
          className={`p-4 rounded-[20px] shadow-none border ${
            isSelected
              ? "bg-brand-50 border-brand-300"
              : "bg-white border-typography-100"
          }`}
        >
          <HStack space="lg" className="items-center">
            <Image
              source={
                !avatarError && driver.photo_url
                  ? { uri: driver.photo_url }
                  : defaultAvatarImage
              }
              onError={() => setAvatarError(true)}
              className="h-20 w-20 rounded-full bg-typography-50"
              alt="Driver Photo"
            />
            <VStack space="xs" className="flex-1">
              <HStack className="items-center">
                <Text className="text-sm text-typography-600 min-w-[90px]">
                  Driver Name :
                </Text>
                <Text className="text-sm font-medium text-typography-900 flex-1">
                  {driver.name}
                </Text>
              </HStack>
              <HStack className="items-center">
                <Text className="text-sm text-typography-600 min-w-[90px]">
                  Driver ID:
                </Text>
                <Text className="text-sm font-medium text-typography-900 flex-1">
                  DRV-{driver.id.split("-")[0].toUpperCase()}
                </Text>
              </HStack>
              <HStack className="items-center">
                <Text className="text-sm text-typography-600 min-w-[90px]">
                  Phone no :
                </Text>
                <Text className="text-sm font-medium text-typography-900 flex-1">
                  {driver.phone}
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </Card>
      );
    },
    [defaultAvatarImage],
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-0 dark:bg-black">
        <ActivityIndicator />
        <Text className="mt-2 text-typography-500">
          Loading booking details...
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-0 dark:bg-black p-4">
        <Text className="text-error-600 font-bold">
          {error ?? "Booking not found."}
        </Text>
      </View>
    );
  }

  /**
   * Renders the main UI for the booking details screen.
   * Includes customer info, trip timeline, car details, driver selection, and action buttons.
   */
  return (
    <View className="flex-1 bg-brand-0">
      <ScrollView className="flex-1 bg-brand-0 p-4">
        <VStack space="md" className="pb-12">
          {/* Booking ID Row */}
          <Card
            size="md"
            variant="elevated"
            className="p-3 rounded-2xl shadow-none border border-gray-100"
            style={CARD_SHADOW}
          >
            <HStack className="items-center flex-wrap gap-1">
              <Text className="text-sm font-semibold text-typography-900">
                {`Booking ID    :`}
              </Text>

              <Pressable
                onPress={() => copyBookingIdToClipboard(booking.id)}
                onLongPress={() => copyBookingIdToClipboard(booking.id)}
                className="flex-row items-center gap-1"
              >
                <Text
                  className="text-sm text-typography-700"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {formatBookingId(booking.id)}
                </Text>
                <Ionicons name="copy-outline" size={14} color="#32B6EA" />
              </Pressable>
            </HStack>
          </Card>

          {/* Customer Profile Card */}
          <Card
            size="md"
            variant="elevated"
            className="p-4 rounded-2xl flex-row items-center justify-between shadow-sm border border-gray-100"
            style={CARD_SHADOW}
          >
            <TouchableOpacity
              onPress={() => setRenterProfileModalOpen(true)}
              className="flex-1"
            >
              <HStack space="md" className="items-center">
                <Image
                  source={
                    !avatarError && booking.customer?.avatar_url
                      ? { uri: booking.customer.avatar_url }
                      : defaultAvatarImage
                  }
                  onError={() => setAvatarError(true)} //fallback trigger
                  className="h-12 w-12 rounded-full"
                  alt="Avatar"
                />
                <VStack className="flex-1">
                  <Text
                    className="text-base font-bold text-typography-900"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {booking.customer?.full_name ?? "Unknown Renter"}
                  </Text>
                  <Pressable
                    onPress={() =>
                      copyPhoneToClipboard(booking.customer?.phone ?? "")
                    }
                    onLongPress={() =>
                      copyPhoneToClipboard(booking.customer?.phone ?? "")
                    }
                    className="flex-row items-center"
                  >
                    <Text className="text-md text-typography-500">
                      Phone: {booking.customer?.phone ?? ""}
                    </Text>
                    <Ionicons
                      name="copy-outline"
                      size={14}
                      color="#32B6EA"
                      style={{ marginLeft: 6 }}
                    />
                  </Pressable>
                </VStack>
              </HStack>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenCustomerChat}
              className="p-2 rounded-full"
            >
              <MessageSquareText size={28} color="#32B6EA" />
            </TouchableOpacity>
          </Card>

          {/* Trip Timeline Card */}
          <Card
            size="md"
            variant="elevated"
            className="p-4 rounded-2xl shadow-none border border-gray-100"
            style={CARD_SHADOW}
          >
            <Text className="text-xl font-bold text-typography-900 mb-4">
              Trip Timeline
            </Text>
            <HStack className="justify-between">
              {/* Pickup Section */}
              <VStack className="flex-1 items-center">
                <MapPinIcon size={24} color="#32B6EA" />
                <Text className="text-md font-bold mt-2">Pick-up:</Text>
                <HStack space="xs" className="items-center mt-1">
                  <Text className="text-md text-typography-600">
                    {new Date(booking.start_date)
                      .toISOString()
                      .split("T")[0]
                      .replace(/-/g, "/")}
                  </Text>
                  <Box className="min-w-[30px] h-[15px] px-2 border border-brand-700 rounded-full items-center justify-center">
                    <Text className="text-xs text-brand-700 font-medium text-center">
                      {booking.pickup_time ?? "--:--"}
                    </Text>
                  </Box>
                </HStack>

                <Text className="text-sm text-typography-400 text-center mt-1">
                  {booking.pickup_location ?? "GIC Myanmar Co.,Ltd."}
                </Text>
              </VStack>

              {/* Dropoff Section */}
              <VStack className="flex-1 items-center">
                <ArrowDownCircleIcon size={24} color="#32B6EA" />
                <Text className="text-md font-bold mt-2">Drop-off:</Text>
                <HStack space="xs" className="items-center mt-1">
                  <Text className="text-md text-typography-600">
                    {new Date(booking.end_date)
                      .toISOString()
                      .split("T")[0]
                      .replace(/-/g, "/")}
                  </Text>
                  {/* <Box className="min-w-[70px] h-[23px] px-2 border border-brand-700 rounded-full items-center justify-center"> */}
                  <Box className="min-w-[30px] h-[15px] px-2 border border-brand-700 rounded-full items-center justify-center">
                    <Text className="text-xs text-brand-700 font-medium text-center">
                      {booking.dropoff_time ?? "--:--"}
                    </Text>
                  </Box>
                </HStack>
                {/* </Box> */}
                <Text className="text-sm text-typography-400 text-center mt-1">
                  {booking.dropoff_location ?? "Sule Square"}
                </Text>
              </VStack>
            </HStack>
          </Card>

          {/* Car Selected and Pricing Summary (Side-by-Side) */}
          <HStack space="md">
            <Pressable
              onPress={() => {
                setSelectedCar(booking.car);
                setCarModalVisible(true);
              }}
            >
              <Card
                className="flex-1 p-3 rounded-2xl shadow-none border border-gray-100"
                style={CARD_SHADOW}
              >
                <Text className="text-xl font-bold mb-2">Car Selected</Text>
                <Image
                  source={
                    !carImageError && booking.car?.car_images?.[0]?.image_url
                      ? { uri: booking.car.car_images[0].image_url }
                      : defaultCarImage
                  }
                  onError={() => setCarImageError(true)} // fallback trigger
                  className="h-20 w-full rounded-xl mb-3"
                  alt="Car Image"
                />
                <HStack space="xs" className="items-center">
                  <CarFrontIcon size={18} color="#32B6EA" />
                  <Text className="text-sm font-bold">
                    {booking.car?.brand ?? "Toyota"}{" "}
                    {booking.car?.model ?? "Model 2"}
                  </Text>
                </HStack>
                <Pressable
                  onPress={() =>
                    copyCarNumberToClipboard(booking.car?.car_number)
                  }
                >
                  <HStack space="xs" className="items-center mt-1">
                    <FontAwesome name="credit-card" size={14} color="#32B6EA" />
                    <Text className="text-sm">
                      {booking.car?.car_number ?? "CAR_001"}
                    </Text>
                    <Ionicons
                      name="copy-outline"
                      size={15}
                      color="#32B6EA"
                      style={{ marginLeft: 4 }}
                    />
                  </HStack>
                </Pressable>
              </Card>
            </Pressable>
            <Card
              className="flex-1 p-3 rounded-2xl shadow-none border border-gray-100"
              style={CARD_SHADOW}
            >
              <Text className="text-xl font-bold mb-4">Pricing Summary</Text>
              <VStack space="xl">
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-500">
                    Rental Duration
                  </Text>
                  <Text className="text-sm font-bold">
                    {durationDays === 1 ? "1 Day" : `${durationDays} Days`}
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text className="text-sm text-typography-500">
                    Price / Day
                  </Text>
                  <Text className="text-sm font-bold">
                    {booking.car?.price_per_day ?? "120000"} MMK
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text className="text-sm font-bold text-brand-900">
                    Total Price
                  </Text>
                  <Text className="text-sm font-bold text-brand-900">
                    {booking.total_price ?? "360000"} MMK
                  </Text>
                </HStack>
              </VStack>
            </Card>
          </HStack>

          {/* Driver Selection Section */}
          {(booking.status === "pending" || booking.status === "approved") && (
            <VStack space="xs">
              <Text className="text-sm font-bold text-typography-900">
                Select Driver <Text className="text-error-500">*</Text>
              </Text>

              {(() => {
                const isEnabled =
                  booking.status === "pending" || canChangeDriver;

                return (
                  <>
                    <TouchableOpacity
                      activeOpacity={isEnabled ? 0.7 : 1}
                      onPress={
                        isEnabled
                          ? () => setIsDriverModalVisible(true)
                          : undefined
                      }
                      disabled={!isEnabled}
                      className={`h-14 rounded-2xl border px-5 flex-row items-center justify-between
                        ${
                          driverError
                            ? "border-error-500" // ❗ error style
                            : isEnabled
                              ? "bg-white border-typography-200"
                              : "bg-gray-100 border-gray-200"
                        }`}
                    >
                      <Text
                        className={`text-lg ${
                          isEnabled
                            ? selectedDriverId
                              ? "text-typography-900"
                              : "text-typography-400"
                            : "text-gray-400"
                        }`}
                      >
                        {drivers.find((d) => d.id === selectedDriverId)?.name ??
                          "Select a Driver"}
                      </Text>

                      <ChevronDown
                        size={24}
                        color={isEnabled ? "#737373" : "#c4c4c4"}
                      />
                    </TouchableOpacity>

                    {/* ✅ Error message */}
                    {driverError && (
                      <Text className="text-error-500 text-sm mt-1">
                        {driverError}
                      </Text>
                    )}
                  </>
                );
              })()}
            </VStack>
          )}

          {/* Selected Driver Info Card - Exact Match to Image */}
          {selectedDriver &&
            (booking.status === "approved" ||
              booking.status === "completed" ||
              (booking.status === "pending" && selectedDriverId)) && (
              <VStack space="xs">
                <Text className="text-sm font-bold text-typography-900">
                  Selected Driver
                </Text>
                <Pressable onPress={() => setDriverProfileModalOpen(true)}>
                  <Card
                    size="md"
                    variant="elevated"
                    className="p-5 rounded-[20px] shadow-sm border border-typography-100 bg-white"
                    style={CARD_SHADOW}
                  >
                    <HStack space="lg" className="items-center">
                      {/* Driver Photo */}
                      <Image
                        source={
                          !avatarError && selectedDriver.photo_url
                            ? { uri: selectedDriver.photo_url }
                            : defaultAvatarImage
                        }
                        onError={() => setAvatarError(true)} //fallback trigger
                        className="h-24 w-24 rounded-full bg-typography-50"
                        alt="Driver Photo"
                      />

                      <VStack space="xs" className="flex-1">
                        <HStack className="items-center">
                          <Text className="text-md text-typography-600 min-w-[100px]">
                            Driver Name :
                          </Text>
                          <Text className="text-md font-medium text-typography-900 flex-1">
                            {selectedDriver.name}
                          </Text>
                        </HStack>

                        <HStack className="items-center">
                          <Text className="text-md text-typography-600 min-w-[100px]">
                            Driver ID:
                          </Text>
                          <Text className="text-md font-medium text-typography-900 flex-1">
                            DRV-{selectedDriver.id.split("-")[0].toUpperCase()}
                          </Text>
                        </HStack>

                        <HStack className="items-center">
                          <Text className="text-md text-typography-600 min-w-[100px]">
                            Phone no :
                          </Text>
                          <Text className="text-md font-medium text-typography-900 flex-1">
                            {selectedDriver.phone}
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>
                  </Card>
                </Pressable>
              </VStack>
            )}

          {/* Footer Action Buttons */}
          {booking.status === "pending" ? (
            <HStack space="md" className="mt-4">
              <Button
                className="flex-1 bg-error-600 rounded-md h-12"
                onPress={() => handleStatusChange("rejected")}
              >
                <ButtonText className="text-white font-bold">
                  Cancel Booking
                </ButtonText>
              </Button>
              <Button
                className="flex-1 bg-brand-600 rounded-md h-12"
                onPress={() => handleStatusChange("approved")}
              >
                <ButtonText className="text-white font-bold">
                  Approve Booking
                </ButtonText>
              </Button>
            </HStack>
          ) : booking.status === "approved" ? (
            <HStack space="md" className="mt-4">
              <Button
                className="flex-1 bg-gray-200 border-none rounded-md h-12"
                disabled
              >
                <ButtonText className="text-white font-bold">
                  Cancel Booking
                </ButtonText>
              </Button>
              <Button
                className={`flex-1 rounded-md h-12 ${canChangeDriver ? "bg-brand-600" : "bg-gray-200"}`}
                onPress={canChangeDriver ? handleDriverChange : undefined}
                disabled={!canChangeDriver}
              >
                <ButtonText className={`font-bold text-white`}>
                  Change Driver
                </ButtonText>
              </Button>
            </HStack>
          ) : (
            <Button
              className="flex-1 bg-brand-600 rounded-md h-12"
              onPress={() =>
                router.push(
                  `/(protected)/(home)/inquiry?bookingId=${booking.id}`,
                )
              }
            >
              <ButtonText className="text-white font-bold">
                Give Feedback about Customer
              </ButtonText>
              <Ionicons
                name="alert-circle"
                size={20}
                color="white"
                className="mr-1"
              />
            </Button>
          )}
        </VStack>
      </ScrollView>

      <SelectorModal
        visible={isDriverModalVisible}
        onClose={() => setIsDriverModalVisible(false)}
        title="Select Driver"
        options={availableDrivers}
        labelField="fullDisplayLabel"
        renderCustomItem={renderDriverItem}
        selectedValue={
          availableDrivers.find((d) => d.id === selectedDriverId)
            ?.fullDisplayLabel
        }
        onSelect={(driver: Driver) => {
          setSelectedDriverId(driver.id);
          setDriverError(null); // ✅ clear error
          setIsDriverModalVisible(false);
        }}
        emptyMessage={
          availableDrivers.length === 0
            ? "There is no available driver for this booking"
            : "No matching items found"
        }
      />
      <ProfileDetailModal
        open={renterProfileModalOpen}
        onClose={() => setRenterProfileModalOpen(false)}
        profile={{
          name: booking.customer?.full_name ?? "",
          phone: booking.customer?.phone ?? "",
          postal_code: booking.customer?.postal_code ?? "",
          location: booking.customer?.location ?? "",
          avatarUrl: booking.customer?.avatar_url ?? "",
        }}
      />
      <ProfileDetailModal
        open={driverProfileModalOpen}
        onClose={() => setDriverProfileModalOpen(false)}
        profile={{
          name: selectedDriver?.name ?? "",
          phone: selectedDriver?.phone ?? "",
          postal_code: selectedDriver?.postal_code ?? "",
          location: selectedDriver?.location ?? "",
          avatarUrl: selectedDriver?.photo_url ?? "",
        }}
      />
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onClose={() => setToastVisible(false)}
      />
      <CarDetailModal
        visible={carModalVisible}
        onClose={() => setCarModalVisible(false)}
        car={selectedCar}
      />
      {/* Custom Alert Modal (replaces default Alert.alert) */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        actions={alert.actions}
        onClose={() =>
          setAlert((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </View>
  );
};

export default OwnerBookingDetails;
