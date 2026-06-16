import { Header } from "@/components/Header";
import { MessageIcon } from "@/components/message-icon";
import Toast from "@/components/Toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useBadgeCounts } from "@/store/useBadgeStore";
import { useToastStore } from "@/store/useToastStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Reusable Tab Icon component
function TabIcon({
  name,
  focused,
  color,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
  color: string;
}) {
  return (
    <View
      className={`w-[60px] h-[38px] justify-center items-center rounded-full mt-2 ${
        focused ? "bg-brand-700/10" : "bg-transparent"
      }`}
    >
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { role, profile } = useAuthStore();
  const isOwner = role === "car_owner";
  const fullName = profile?.full_name || "Guest";
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0];
  const dualName = nameParts.slice(0, 2).join(" ");
  const formattedName =
    dualName.length > 15
      ? firstName.length > 10
        ? firstName.substring(0, 10) + "..."
        : firstName
      : dualName;
  const avatarUrl = profile?.avatar_url || null;
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const {
    visible: toastVisible,
    message: toastMessage,
    type: toastType,
    hideToast,
  } = useToastStore();
  const { data: badges } = useBadgeCounts(user?.id);
  const notifications = badges?.notifications || 0;
  const reports = badges?.reports || 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#16a8e3", // brand-700
          tabBarInactiveTintColor: "#687076",
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 10,
            backgroundColor: "#f0fafe",
            height:
              Platform.OS === "android"
                ? insets.bottom > 0
                  ? 65 + insets.bottom
                  : 85
                : 85 + insets.bottom,
            paddingBottom:
              Platform.OS === "android"
                ? insets.bottom > 0
                  ? insets.bottom
                  : 10
                : insets.bottom || 10,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={["#f0fafe", "#e1f6fd", "#c4ecfb"]}
              locations={[0, 0.5, 1]}
              style={{ flex: 1 }}
            />
          ),
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            marginTop: 8,
          },
        }}
      >
        {/* === Shared Tabs (both roles) === */}
        <Tabs.Screen
          name="index"
          options={{
            title: isOwner ? "Dashboard" : "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={
                  isOwner
                    ? focused
                      ? "grid"
                      : "grid-outline"
                    : focused
                      ? "home"
                      : "home-outline"
                }
                focused={focused}
                color={color}
              />
            ),
            header: () => (
              <Header
                avatarUrl={avatarUrl}
                title={`Hi, ${formattedName} !`}
                isOwner={isOwner}
                onBell={() => router.push("/notifications")}
                notificationCount={notifications}
                reportcount={reports}
                onAvatarPress={() => router.push("/profile")}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: "Bookings",
            header: () => (
              <Header
                avatarUrl={avatarUrl}
                title={isOwner ? "Booking list" : "Booking History"}
                centerTitle={true}
                isOwner={isOwner}
                onBell={() => router.push("/notifications")}
                notificationCount={notifications}
                reportcount={reports}
                onAvatarPress={() => router.push("/profile")}
              />
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? "calendar" : "calendar-outline"}
                focused={focused}
                color={color}
              />
            ),
          }}
        />

        {/* === Renter-only Tab === */}
        <Tabs.Screen
          name="wishlist"
          options={{
            title: "Wishlist",
            href: isOwner ? null : "/(protected)/(tabs)/wishlist",
            header: () => (
              <Header
                avatarUrl={avatarUrl}
                title={!isOwner ? "Wishlist" : ""}
                centerTitle={!isOwner}
                isOwner={isOwner}
                onBell={() => router.push("/notifications")}
                notificationCount={notifications}
                reportcount={reports}
                onAvatarPress={() => router.push("/profile")}
              />
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? "heart" : "heart-outline"}
                focused={focused}
                color={color}
              />
            ),
          }}
        />

        {/* === Shared Tab === */}
        <Tabs.Screen
          name="messages"
          options={{
            title: "Chat history",
            header: () => (
              <Header
                avatarUrl={avatarUrl}
                title={"Messages"}
                centerTitle={true}
                isOwner={isOwner}
                notificationCount={notifications}
                reportcount={reports}
                onBell={() => router.push("/notifications")}
                onAvatarPress={() => router.push("/profile")}
              />
            ),
            tabBarIcon: ({ color, focused }) => (
              <MessageIcon focused={focused} color={color} />
            ),
          }}
        />

        {/* === Owner-only Tabs === */}
        <Tabs.Screen
          name="owner_cars"
          options={{
            title: "My Cars",
            href: isOwner ? "/(protected)/(tabs)/owner_cars" : null,
            header: () => (
              <Header
                avatarUrl={avatarUrl}
                isOwner={isOwner}
                title={isOwner ? "My Cars" : ""}
                centerTitle={isOwner}
                onBell={() => router.push("/notifications")}
                notificationCount={notifications}
                reportcount={reports}
                onAvatarPress={() => router.push("/profile")}
              />
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? "car" : "car-outline"}
                focused={focused}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="drivers"
          options={{
            title: "Drivers",
            header: () => (
              <Header
                isOwner={isOwner}
                avatarUrl={avatarUrl}
                title={isOwner ? "Driver List" : ""}
                centerTitle={isOwner}
                onBell={() => router.push("/notifications")}
                notificationCount={notifications}
                reportcount={reports}
                onAvatarPress={() => router.push("/profile")}
              />
            ),
            href: isOwner ? "/(protected)/(tabs)/drivers" : null,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? "people" : "people-outline"}
                focused={focused}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={hideToast}
      />
    </GestureHandlerRootView>
  );
}
