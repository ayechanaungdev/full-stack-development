import { BackButton } from "@/components/BackButton";
import registerForPushNotificationsAsync from '@/hooks/get-push-noti-token';
import { useAuthStore } from '@/store/useAuthStore';

import { Redirect, Stack } from 'expo-router';
import React, { useEffect } from 'react';

export default function ProtectedLayout() {
  // OLD: destructured only session; used session.user.id for push notifications
  // const { session, isLoading } = useAuthStore();
  // useEffect(() => { if (session?.user?.id) { registerForPushNotificationsAsync(session.user.id); } }, [session]);
  // NEW: also destructure user (backend auth stores user separately)
  const { session, user, isLoading } = useAuthStore();

  //for push notification token registration
useEffect(() => {
  if (user?.id) {
    registerForPushNotificationsAsync(user.id);
  }
}, [user]);
//******************************************************* */

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
