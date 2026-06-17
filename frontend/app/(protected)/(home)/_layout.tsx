import { BackButton } from "@/components/BackButton";
import { useAuthStore } from "@/store/useAuthStore";
import { router, Stack } from "expo-router";
import { SquarePen } from "lucide-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";

export default function HomeLayout() {
  const profile = useAuthStore((state) => state.profile);
  if (!profile) return null;
  const isCarOwner = profile.role === "car_owner";

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTitleAlign: "center",
        headerTintColor: "#16a8e3",
        headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
        headerStyle: { backgroundColor: "#f7fdff" },
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="reports" options={{ title: "Reports History" }} />
      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
          headerRight: () =>
            isCarOwner ? (
              <TouchableOpacity
                className="p-1 rounded-full border border-brand-700 bg-white items-center justify-center"
                onPress={() => router.push("/profile-edit")}
              >
                <SquarePen size={24} color="#16a8e3" />
              </TouchableOpacity>
            ) : null,
        }}
      />
      <Stack.Screen
        name="profile-edit"
        options={{ title: "Personal Information" }}
      />
      <Stack.Screen
        name="change-password"
        options={{ title: "Change Password" }}
      />
      <Stack.Screen name="search" options={{ title: "Explore Cars" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="inquiry" options={{ title: "Inquiry Form" }} />
    </Stack>
  );
}
