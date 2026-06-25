import EmptyState from "@/components/EmptyState";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import Ionicons from "@expo/vector-icons/Ionicons";

import CustomAlert from "@/components/app-alert";
import ProfileDetailModal from "@/components/ProfileDetailModal";
import { Center } from "@/components/ui/center";
import { Divider } from "@/components/ui/divider";
import { Icon } from "@/components/ui/icon";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import yangonTownships from "@/constants/yangon-townships.json";
import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { MapPin, Phone, Search, SquarePen, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Driver {
  id: string;
  name: string;
  phone: string;
  location: string;
  postal_code: string;
  status: "available" | "on trip" | "offline";
  photo_url: string;
}

const getStatusStyle = (status?: string | null) => {
  const safeStatus = status?.toLowerCase() || "unknown";

  switch (safeStatus) {
    case "all":
      return {
        bg: "bg-info-0",
        text: "text-info-700",
        stroke: "border-info-300",
        activeStroke: "border-info-900",
      };
    case "available":
      return {
        bg: "bg-success-0",
        text: "text-success-700",
        stroke: "border-success-300",
        activeStroke: "border-success-900",
      };
    case "on trip":
      return {
        bg: "bg-warning-0",
        text: "text-warning-700",
        stroke: "border-warning-300",
        activeStroke: "border-warning-900",
      };
    case "offline":
      return {
        bg: "bg-error-0",
        text: "text-error-700",
        stroke: "border-error-300",
        activeStroke: "border-error-900",
      };

    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-500",
        stroke: "border-gray-300",
        activeStroke: "border-gray-900",
      };
  }
};

export default function DriverListScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();
  type StatusType = "All" | "Available" | "On Trip" | "Offline";
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    location: "",
    postal_code: "",
    avatarUrl: "",
  });
  const PAGE_SIZE = 10;

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);

  const [totalCount, setTotalCount] = useState(0);

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

  const {
    data: drivers = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["drivers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: driversData } = await apiClient.get("/drivers");

      const today = new Date().toISOString().split("T")[0];
      const mapped = (driversData || []).map((d: any) => ({
        ...d,
        id: String(d.id),
        status: d.bookings?.some(
          (b: any) =>
            b.status === "APPROVED" &&
            new Date(b.start_date).toISOString().split("T")[0] === today
        )
          ? "on trip"
          : d.status,
      })) as Driver[];

      setTotalCount(mapped.length);
      return mapped;
    },
    enabled: !!user?.id,
  });

  const confirmDelete = async (id: string) => {
    setAlertData({
      title: "Delete Driver",
      message: "Are you sure you want to delete this driver?",
      type: "warning",
      actions: [
        {
          text: "Cancel",
          type: "cancel",
        },
        {
          text: "Delete",
          onPress: () => handleDelete(id),
        },
      ],
    });
    setAlertVisible(true);
    return;
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/drivers/${id}`);

      setAlertData({
        title: "Delete Driver",
        message: "Driver Deleted Successfully",
        type: "success",
        actions: [{ text: "OK" }],
      });
      setAlertVisible(true);
      queryClient.invalidateQueries({ queryKey: ["drivers", user?.id] });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete driver";
      setAlertData({
        title: "Error",
        message,
        type: "error",
        actions: [{ text: "OK" }],
      });
      setAlertVisible(true);
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      driver.name.toLowerCase().includes(query) || driver.phone.includes(query);

    const matchesStatus =
      selectedStatus === "All" ||
      driver.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const visibleDrivers = filteredDrivers.slice(0, visibleCount);

  const loadMore = () => {
    if (visibleCount < filteredDrivers.length) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  };

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setVisibleCount(PAGE_SIZE);
    setRefreshing(false);
  };

  const getTownshipName = (postalCode: string) => {
    return (
      yangonTownships.find((t) => t.postalCode === postalCode)?.name ||
      postalCode
    );
  };

  const formatDriverLocation = (location: string, postalCode: string) => {
    const townshipName = getTownshipName(postalCode);

    if (location && townshipName) {
      return `${location}, ${townshipName} Tsp`;
    }

    if (location) {
      return location;
    }

    if (townshipName) {
      return `${townshipName} Tsp`;
    }

    return "No address";
  };

  const handleCopyPhone = async (phone: string) => {
    if (!phone) return;

    await Clipboard.setStringAsync(phone);
    showToast("Phone number copied to clipboard.", "success");
  };

  const renderItem = ({ item }: { item: Driver }) => {
    const isOnTrip = item.status === "on trip";
    const style = getStatusStyle(item.status);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Box
          key={item.id}
          className="bg-white rounded-2xl p-1 border border-gray-300 shadow-sm"
        >
          <HStack>
            {/* Avatar & Status */}
            <VStack className="items-center justify-start ml-2 mr-2 mt-3" space="sm">
              <Pressable
                onPress={() => {
                  setProfileModalOpen(true);
                  setProfile({
                    name: item.name,
                    phone: item.phone,
                    location: item.location,
                    postal_code: item.postal_code,
                    avatarUrl: item.photo_url,
                  });
                }}
              >
                <Image
                  source={
                    item.photo_url
                      ? { uri: item.photo_url }
                      : require("@/assets/images/avatar1.png")
                  }
                  alt="driver"
                  size="md"
                  className="rounded-full border-2 border-gray-100"
                />
              </Pressable>

              <Box
                className={`px-2 py-0.5 rounded-full border ${style.bg} ${style.stroke}`}
              >
                <Text className={`text-[10px] font-semibold capitalize ${style.text}`}>
                  {item.status?.toLowerCase() || "Unknown"}
                </Text>
              </Box>
            </VStack>

            {/* Info */}
            <VStack className="flex-1 py-3 px-3">
              <Text
                className=" text-lg font-bold text-black"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
              <HStack className="items-center mt-1" style={{ flexShrink: 1 }}>
                <Icon as={Phone} size="sm" className="text-sky-500 mr-2" />
                <Text className="text-sm text-slate-700" numberOfLines={1}>
                  {item.phone}
                </Text>
                <Pressable
                  onPress={() => handleCopyPhone(item.phone)}
                  onLongPress={() => handleCopyPhone(item.phone)}
                  className="ml-1 p-1"
                >
                  <Ionicons name="copy-outline" size={15} color="#16a8e3" />
                </Pressable>
              </HStack>

              <HStack space="sm" className="mt-1 items-start">
                <Icon
                  as={MapPin}
                  size="sm"
                  color="#00AEEF"
                  className="text-slate-800 mt-1"
                />
                <Text
                  className="text-sm text-slate-700"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {formatDriverLocation(item.location, item.postal_code)}
                </Text>
              </HStack>
            </VStack>
            <Divider
              orientation="vertical"
              className="mr-8 mt-1"
              style={{ height: 118 }}
            />
          </HStack>

          {/* Actions */}
          <VStack className="absolute right-2 py-3 mt-3" space="2xl">
            <Pressable
              disabled={isOnTrip}
              onPress={() => {
                if (!isOnTrip) {
                  router.push({
                    pathname: "/(protected)/driver/[id]",
                    params: { id: item.id },
                  });
                } else {
                  setAlertData({
                    title: "Error Driver",
                    message: "Cannot delete driver",
                    type: "error",
                    actions: [
                      {
                        text: "OK",
                      },
                    ],
                  });
                  setAlertVisible(true);
                }
              }}
              className={isOnTrip ? "opacity-40" : ""}
            >
              <SquarePen size={22} color="#00AEEF" />
            </Pressable>

            <Pressable
              disabled={isOnTrip}
              onPress={() => {
                if (!isOnTrip) confirmDelete(item.id);
              }}
              className={isOnTrip ? "opacity-40" : ""}
            >
              <Trash2 size={22} color="#EF4444" />
            </Pressable>
          </VStack>


        </Box>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-brand-0 pt-2">
      <Box className="flex-1 px-4">
        {/* Search Container */}
        <Box className="items-center w-full mb-2">
          <Input
            size="lg"
            className="bg-brand-0 h-11 rounded-lg border-gray-300"
          >
            <InputField
              placeholder="Search by Driver Name and Phone no"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="text-md"
            />

            {/* The Search/Clear Icon */}
            <InputSlot className="pr-3">
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close" size={22} color="#D4D4D4" />
                </TouchableOpacity>
              ) : (
                <InputIcon
                  as={(props: any) => <Search {...props} strokeWidth={2} />}
                  className="w-6 h-[26px]"
                  color="#16a8e3"
                />
              )}
            </InputSlot>
          </Input>
        </Box>
        {/* Filters */}
        <Box style={{ height: 60 }} className="px-0 pb-3 ">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 pb-3 mt-3 pl-3"
            contentContainerStyle={{ gap: 15, paddingRight: 16 }}
            style={{ maxHeight: 50 }}
          >
            {(["All", "Available", "On Trip", "Offline"] as StatusType[]).map(
              (status) => {
                const isActive = selectedStatus === status;
                const style =
                  status === "All"
                    ? {
                      bg: "bg-gray-200",
                      text: "text-gray-700",
                      stroke: "border-gray-100",
                      activeStroke: "border-gray-900",
                    }
                    : getStatusStyle(status.toLowerCase());

                return (
                  <Pressable
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    className={`px-4 py-2 rounded-lg border ${isActive ? `${style.bg} ${style.activeStroke}` : `${style.bg} ${style.stroke}`} `}
                  >
                    <Text
                      className={`text-xs ${style.text} font-medium ${isActive ? "font-semibold" : "font-normal"}`}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>
        </Box>

        <HStack>
          <Text className="text-center font-bold mb-3">
            {visibleDrivers.length} out of {totalCount} found
          </Text>

          <Divider className="my-3 mt-3 " />
        </HStack>

        {/* List */}
        {loading ? (
          <Center className="flex-1 mt-10">
            <Spinner size="large" />
            <Text className="mt-3 text-typography-500">Loading Drivers...</Text>
          </Center>
        ) : (
          <FlatList
            data={visibleDrivers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 15 }}
            removeClippedSubviews
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#16a8e3"]}
                tintColor="#16a8e3"
              />
            }
            ItemSeparatorComponent={() => <Box className="h-3" />}
            ListFooterComponent={() => (
              <Box className="items-center py-5">
                {visibleCount < filteredDrivers.length ? (
                  <ActivityIndicator size="small" color="#16a8e3" />
                ) : filteredDrivers.length > 0 ? (
                  <Text className="text-gray-400 text-sm">No more records</Text>
                ) : null}
              </Box>
            )}
            ListEmptyComponent={() => (
              <EmptyState
                icon={(props: any) => (
                  <Ionicons name="people-outline" {...props} />
                )}
                message="No Drivers Found"
              />
            )}
          />
        )}
      </Box>
      {/* Add Button */}
      <TouchableOpacity
        onPress={() => router.push("/driver-registration")}
        style={{ elevation: 5 }}
        className="absolute bottom-5 right-5 rounded-full px-4 py-3 bg-sky-500 flex-row items-center"
      >
        <Ionicons name="add-circle-outline" size={20} color="white" />
        <Text className="text-white ml-3">Add New Driver</Text>
      </TouchableOpacity>

      <ProfileDetailModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profile={{
          name: profile.name,
          phone: profile.phone,
          postal_code: profile.postal_code,
          location: profile.location,
          avatarUrl: profile.avatarUrl,
        }}
      />
      {/* custom alert rerender */}
      <CustomAlert
        visible={alertVisible}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
        onClose={() => setAlertVisible(false)}
        actions={alertData.actions}
      />
    </SafeAreaView>
  );
}
