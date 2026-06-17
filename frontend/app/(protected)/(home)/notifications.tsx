import { supabase } from "@/lib/supabase";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  Text as RNText,
  ScrollView,
  SectionList,
  TouchableOpacity,
  View,
} from "react-native";

// Gluestack UI components
import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
} from "@/components/ui/checkbox";
import { HStack } from "@/components/ui/hstack";
import { CheckIcon, Icon, TrashIcon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import CustomAlert from "@/components/app-alert";
import Toast from "@/components/Toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useBadgeActions } from "@/store/useBadgeStore";
import {
  Bell,
  Car as CarIcon,
  CheckCircle2 as DoneIcon,
  MessageCircle as MsgIcon,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "all" | "booking" | "message" | "system" | "owner-car";

export default function NotificationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { invalidateBadgeCounts } = useBadgeActions();
  const { user, profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isViewAll, setIsViewAll] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const hasSelection = selectedIds.length > 0;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showAlert, setShowAlert] = useState(false);
  const [userRefreshing, setUserRefreshing] = useState(false);
  const [isForceLoading, setIsForceLoading] = useState(false);
  const tabs: TabType[] = ["all", "booking", "message"];
  const isRenter = profile?.role === "renter";

  if (!isRenter) {
    tabs.push("owner-car");
    tabs.push("system");
  }

  const handleManualRefresh = async () => {
    setUserRefreshing(true);
    await refetch();
    setUserRefreshing(false);
  };

  // 💡 Pagination Limits
  const INITIAL_LIMIT = 10;
  const PAGE_LIMIT = 10;

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["notifications", activeTab, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) return [];

      if (activeTab === "all" && pageParam === 0) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        const priorityQuery = supabase
          .from("notifications")
          .select("*")
          .eq("receiver_id", user.id)
          .eq("type", "system")
          // .eq("is_read", false)
          .gte("created_at", threeDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(3);

        const messageQuery = supabase
          .from("notifications")
          .select("*")
          .eq("receiver_id", user.id)
          .eq("type", "message")
          .eq("is_read", false)
          .order("sender_id")
          .order("created_at", { ascending: false });

        const messageCondition = `and(type.eq.message,is_read.eq.false)`;
        const otherCondition = `type.neq.message`;

        const regularQuery = supabase
          .from("notifications")
          .select("*")
          .eq("receiver_id", user.id)
          // .eq("is_read", false)
          .or(`${messageCondition},${otherCondition}`)
          .order("created_at", { ascending: false })
          .range(0, 14);

        const [
          { data: prioritySystems, error: err1 },
          { data: allNotis, error: err2 },
          { data: messageNotis, error: err3 },
        ] = await Promise.all([priorityQuery, regularQuery, messageQuery]);

        if (err1) throw err1;
        if (err2) throw err2;
        if (err3) throw err3;

        if (err1 || err2 || err3) throw err1 || err2 || err3;

        const latestMessagesPerSender = (messageNotis || []).reduce(
          (acc: any[], current: any) => {
            const existing = acc.find((m) => m.sender_id === current.sender_id);
            if (!existing) acc.push(current);
            return acc;
          },
          [],
        );

        const priorityIds = (prioritySystems || []).map((p) => p.id);
        const messageIds = (messageNotis || []).map((m) => m.id);

        const filteredRegular = (allNotis || []).filter(
          (item) =>
            !priorityIds.includes(item.id) && !messageIds.includes(item.id),
        );

        const finalRegular = filteredRegular.slice(
          0,
          INITIAL_LIMIT - (prioritySystems?.length || 0),
        );

        // const combined = [...(prioritySystems || []), ...latestMessagesPerSender, ...finalRegular];
        const combinedRaw = [
          ...(prioritySystems || []),
          ...latestMessagesPerSender,
          ...finalRegular,
        ];

        const combined = combinedRaw
          .filter(
            (item, index, self) =>
              index === self.findIndex((t) => t.id === item.id),
          )
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

        return combined;
      }

      const from =
        pageParam === 0 ? 0 : INITIAL_LIMIT + (pageParam - 1) * PAGE_LIMIT;
      const to = pageParam === 0 ? INITIAL_LIMIT - 1 : from + PAGE_LIMIT - 1;

      const query = supabase
        .from("notifications")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (activeTab === "message") {
        query.eq("is_read", false).order("sender_id");
      }

      if (activeTab !== "all") {
        query.eq("type", activeTab);
      }

      const { data: resData, error } = await query;
      if (error) throw error;

      if (activeTab === "message") {
        const uniqueMessages = (resData || []).reduce(
          (acc: any[], current: any) => {
            const existing = acc.find((m) => m.sender_id === current.sender_id);
            if (!existing) acc.push(current);
            return acc;
          },
          [],
        );
        return uniqueMessages;
      }
      return resData || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length === 0) {
        return undefined;
      }
      const expectedCount = allPages.length === 1 ? INITIAL_LIMIT : PAGE_LIMIT;
      if (lastPage.length < expectedCount) {
        return undefined;
      }
      return allPages.length;
    },
    placeholderData: (previousData) => previousData,
  });

  const safeNotifications = useMemo(() => {
    if (!data?.pages) return [];

    const seen = new Set();

    return data.pages
      .flat()
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  }, [data]);

  useEffect(() => {
    setIsViewAll(false);
    setIsEditMode(false);
    setSelectedIds([]);
    setIsForceLoading(false);
  }, [activeTab]);

  const displayedNotifications = useMemo(() => {
    if (!isViewAll) {
      if (activeTab === "all") {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        const systemNotis = safeNotifications.filter(
          (item) =>
            item.type === "system" && new Date(item.created_at) >= threeDaysAgo,
        );

        const otherNotis = safeNotifications.filter(
          (item) =>
            item.type !== "system" || new Date(item.created_at) < threeDaysAgo,
        );

        const limitedSystems = systemNotis.slice(0, 3);

        const remainingSlots = 5 - limitedSystems.length;
        const limitedOthers = otherNotis.slice(0, remainingSlots);

        return [...limitedSystems, ...limitedOthers];
      }

      return safeNotifications.slice(0, 5);
    }
    return safeNotifications;
  }, [safeNotifications, isViewAll, activeTab]);

  const { sections } = useMemo(() => {
    let mainList = displayedNotifications;

    const groups = mainList.reduce((groups: any, item: any) => {
      if (!item || !item.created_at) return groups;
      const date = new Date(item.created_at);
      const title =
        date.toDateString() === new Date().toDateString()
          ? "Today"
          : date.toDateString() ===
              new Date(
                new Date().setDate(new Date().getDate() - 1),
              ).toDateString()
            ? "Yesterday"
            : "Earlier";
      if (!groups[title]) groups[title] = [];
      groups[title].push(item);
      return groups;
    }, {});

    return {
      sections: Object.keys(groups).map((title) => ({
        title,
        data: groups[title],
      })),
    };
  }, [displayedNotifications]);

  const handleViewAllPress = () => {
    if (isForceLoading) return;
    setIsForceLoading(true);
    if (hasNextPage) fetchNextPage();
    setTimeout(() => {
      setIsViewAll(true);
      setIsForceLoading(false);
    }, 800);
  };

  const handleLoadMore = () => {
    if (!isViewAll || isFetchingNextPage || isForceLoading || !hasNextPage)
      return;
    setIsForceLoading(true);
    fetchNextPage();
    setTimeout(() => {
      setIsForceLoading(false);
    }, 500);
  };

  const handleItemPress = async (item: any) => {
    if (isEditMode) {
      setSelectedIds((prev) =>
        prev.includes(item.id)
          ? prev.filter((id) => id !== item.id)
          : [...prev, item.id],
      );
    } else {
      if (item.is_read === false) {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", item.id);
        if (!error) {
          queryClient.setQueryData(["notifications", activeTab], (old: any) => {
            if (!old || !old.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any[]) =>
                Array.isArray(page)
                  ? page.map((n) =>
                      n.id === item.id ? { ...n, is_read: true } : n,
                    )
                  : [],
              ),
            };
          });
          if (user?.id) invalidateBadgeCounts(user.id);
        }
      }

      if (item.type === "message") {
        const chatId = item.sender_id || item.metadata?.sender_id;
        if (chatId) router.push(`/chat/${chatId}` as any);
      } else if (item.type === "booking") {
        const bookingId = item.reference_id || item.metadata?.reference_id;
        router.push(`/booking/${bookingId || item.id}` as any);
      } else if (item.type === "system") {
        const reportId = item.reference_id || item.metadata?.reference_id;
        router.push(`/reports/${reportId || item.id}` as any);
      } else if (item.type === "owner-car") {
        const carid = item.reference_id || item.metadata?.reference_id;
        router.push(`/car/${carid || item.id}` as any);
      }
    }
  };

  const toggleSelectAll = () => {
    if (!displayedNotifications || displayedNotifications.length === 0) {
      setSelectedIds([]);
      return;
    }
    let currentIds = displayedNotifications.map((n) => n?.id).filter(Boolean);
    if (selectedIds.length === currentIds.length) setSelectedIds([]);
    else setSelectedIds(currentIds);
  };

  const deleteSelected = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", selectedIds);
      if (error) throw error;
      setShowAlert(false);

      queryClient.setQueryData(["notifications", activeTab], (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            Array.isArray(page)
              ? page.filter((n) => n && !selectedIds.includes(n.id))
              : [],
          ),
        };
      });

      setTimeout(() => {
        setToastType("success");
        setToastMessage(`${selectedIds.length} items deleted successfully`);
        setToastVisible(true);
        setSelectedIds([]);
        setIsEditMode(false);
      }, 300);
    } catch (error: any) {
      setShowAlert(false);
      setTimeout(() => {
        setToastType("error");
        setToastMessage(error.message);
        setToastVisible(true);
      }, 300);
    }
  };

  const getNotiDetails = (type: string) => {
    switch (type) {
      case "message":
        return {
          title: "Message",
          icon: <MsgIcon color="#0EA5E9" size={20} />,
        };
      case "booking":
        return {
          title: "Booking",
          icon: <CarIcon color="#0EA5E9" size={20} />,
        };
      case "system":
        return {
          title: "Daily Report",
          icon: <DoneIcon color="#0EA5E9" size={20} />,
        };
      case "owner-car":
        return { title: "Car", icon: <CarIcon color="#0EA5E9" size={20} /> };
      default:
        return {
          title: "Notification",
          icon: <MsgIcon color="#0EA5E9" size={20} />,
        };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / 1000,
    );
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const renderSkeletonCard = (index: number) => {
    return (
      <Box
        key={`skeleton-${index}`}
        className="mb-3 rounded-2xl p-4 border border-gray-100 bg-white shadow-sm opacity-60"
      >
        <HStack className="items-center space-x-3">
          <Box className="w-11 h-11 rounded-full bg-gray-200" />
          <VStack className="flex-1 ml-3">
            <HStack className="justify-between items-center mb-2">
              <Box className="w-24 h-4 bg-gray-200 rounded-md" />
              <Box className="w-12 h-3 bg-gray-200 rounded-md" />
            </HStack>
            <Box className="w-11/12 h-3 bg-gray-200 rounded-md mb-1.5" />
            <Box className="w-2/3 h-3 bg-gray-200 rounded-md" />
          </VStack>
        </HStack>
      </Box>
    );
  };

  const renderNotiCard = (item: any) => {
    if (!item) return null;
    const details = getNotiDetails(item.type);
    const isSelected = selectedIds.includes(item.id);
    return (
      <Pressable
        key={item.id}
        onPress={() => handleItemPress(item)}
        className={`mb-3 rounded-2xl p-4 border shadow-sm ${isSelected ? "border-blue-400 bg-blue-50" : item.is_read === false ? "border-blue-200 bg-blue-100" : "border-gray-100 bg-white"}`}
      >
        <HStack className="items-center space-x-3">
          <Center className="w-11 h-11 rounded-full bg-[#F0F9FF]">
            {details.icon}
          </Center>
          <VStack className="flex-1 ml-3">
            <HStack className="justify-between items-center">
              <Text className="text-[#1E293B] font-bold text-[14px]">
                {details.title}
              </Text>
              <Text className="text-gray-400 text-[10px]">
                {getTimeAgo(item.created_at)}
              </Text>
            </HStack>
            {item.title && (
              <Text
                className="text-gray-800 font-semibold text-[13px] mt-0.5"
                numberOfLines={1}
              >
                {item.title}
              </Text>
            )}
            <Text
              className="text-gray-500 text-xs leading-4 mt-1"
              numberOfLines={2}
            >
              {item.content || item.body}
            </Text>
          </VStack>
          {isEditMode && (
            <Box className="pl-2">
              <Checkbox
                value={item.id}
                isChecked={isSelected}
                size="sm"
                onChange={() => handleItemPress(item)}
              >
                <CheckboxIndicator className="rounded-md">
                  <CheckboxIcon as={CheckIcon} />
                </CheckboxIndicator>
              </Checkbox>
            </Box>
          )}
        </HStack>
      </Pressable>
    );
  };

  if (isLoading && !isRefetching) {
    return (
      <Center className="flex-1 bg-white">
        <Spinner size="large" color="#0EA5E9" />
      </Center>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7FDFF]">
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />

      {/* Tabs Layout */}
      <View style={{ marginTop: 8, backgroundColor: "#F7FDFF", width: "100%" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 8,
            flexGrow: 1,
          }}
        >
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 32 }}>
            {tabs.map((tabId) => {
              const labels = {
                all: "All",
                booking: "Booking",
                message: "Message",
                system: "Daily Report",
                "owner-car": "Car",
              };
              const isActive = activeTab === tabId;

              return (
                <TouchableOpacity
                  key={tabId}
                  onPress={() => setActiveTab(tabId)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: isActive ? "#0EA5E9" : "#E5E7EB",
                    backgroundColor: isActive ? "#0EA5E9" : "#FFFFFF",
                    marginRight: 4,
                  }}
                >
                  <RNText
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: isActive ? "#FFFFFF" : "#4B5563",
                    }}
                  >
                    {labels[tabId]}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {isEditMode && (
        <Box className="px-4 mt-2" style={{ zIndex: 10 }}>
          <HStack className="px-4 py-3 justify-between items-center bg-[#F7FDFF] rounded-2xl border border-gray-100 shadow-sm">
            <HStack className="items-center space-x-3">
              <Checkbox
                value="all"
                isChecked={
                  selectedIds.length > 0 &&
                  selectedIds.length === displayedNotifications.length
                }
                onChange={toggleSelectAll}
                size="sm"
              >
                <CheckboxIndicator className="rounded-md">
                  <CheckboxIcon as={CheckIcon} />
                </CheckboxIndicator>
              </Checkbox>
              <Text className="text-gray-900 font-bold ml-2">
                All {selectedIds.length} Selected
              </Text>
            </HStack>
            <TouchableOpacity
              onPress={() => setShowAlert(true)}
              disabled={!hasSelection}
              hitSlop={20}
            >
              <Icon
                as={TrashIcon}
                color="#EF4444"
                fill="#EF4444"
                size="xl"
                style={{ opacity: hasSelection ? 1 : 0.3 }}
              />
            </TouchableOpacity>
          </HStack>
        </Box>
      )}

      <CustomAlert
        visible={showAlert}
        title="Delete Notifications"
        message={`Are you sure you want to delete ${selectedIds.length} selected notifications?`}
        type="warning"
        onClose={() => setShowAlert(false)}
        actions={[
          {
            text: "Cancel",
            type: "cancel",
            onPress: () => setShowAlert(false),
          },
          { text: "Delete", onPress: deleteSelected },
        ]}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item?.id}
        style={{ flex: 1, marginTop: 10 }}
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 100,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={userRefreshing}
            onRefresh={handleManualRefresh}
          />
        }
        renderSectionHeader={({ section }) => {
          if (section.data.length === 0) return null;
          const isFirstSection = sections[0].title === section.title;
          return (
            <Box className="bg-[#F7FDFF] py-3 px-2">
              <HStack className="justify-between items-center">
                <Text className="text-gray-400 font-medium text-xs uppercase">
                  {section.title}
                </Text>
                {isFirstSection && (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() =>
                      isEditMode
                        ? (setIsEditMode(false), setSelectedIds([]))
                        : setIsEditMode(true)
                    }
                  >
                    <Text
                      style={{
                        color: "#0EA5E9",
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {isEditMode ? "Cancel" : "Clear"}
                    </Text>
                  </TouchableOpacity>
                )}
              </HStack>
            </Box>
          );
        }}
        ListEmptyComponent={
          !isLoading && !isRefetching ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 40,
              }}
            >
              <Bell color="#CBD5E1" size={48} />
              <Text className="text-gray-400 font-medium mt-2">
                There is no notifications
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => renderNotiCard(item)}
        ListFooterComponent={
          <VStack className="mt-2">
            {isFetchingNextPage || isForceLoading ? (
              <Box className="mt-2">
                {[...Array(3)].map((_, index) => renderSkeletonCard(index))}
              </Box>
            ) : !isViewAll &&
              safeNotifications.length > displayedNotifications.length ? (
              <TouchableOpacity
                onPress={handleViewAllPress}
                activeOpacity={0.7}
                className="py-3 my-4 bg-white rounded-2xl border border-gray-100 items-center justify-center shadow-sm"
              >
                <Text className="text-[#0EA5E9] font-bold text-sm">
                  View All
                </Text>
              </TouchableOpacity>
            ) : isViewAll &&
              displayedNotifications.length > 0 &&
              !hasNextPage ? (
              <Box className="items-center py-4">
                <Text className="text-sm text-gray-500">No more records</Text>
              </Box>
            ) : (
              <Box className="h-10" />
            )}
          </VStack>
        }
      />
    </SafeAreaView>
  );
}
