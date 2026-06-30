import { BackButton } from "@/components/BackButton";
import { useAuthStore } from '@/store/useAuthStore';

import { Redirect, Stack } from 'expo-router';
import React from 'react';

export default function ProtectedLayout() {
  // Push notification registration is handled in root _layout.tsx — removed duplicate here
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(home)" />
      <Stack.Screen
        name="booking/[id]"
        options={{
          headerShown: true,
          title: "Booking Details",
          headerTintColor: "#16a8e3",
          headerStyle: { backgroundColor: '#F7FDFF' },
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="car/[id]"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen name="reports/[id]" />
      <Stack.Screen
        name="driver/[id]"
        options={{
          headerShown: true,
          title: "Update Driver Detail",
          headerTintColor: "#16a8e3",
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
          headerLeft: () => <BackButton />,
        }}
      ></Stack.Screen>
    </Stack>
  );
}
