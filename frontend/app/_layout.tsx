import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen"; // Added this
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css"; // Must be the very first import for NativeWind v4

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import registerForPushNotificationsAsync from "@/hooks/get-push-noti-token";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore"; // Import your store
import {
  markNotificationIdProcessed,
  setupBadgeRealtime,
} from "@/store/useBadgeStore";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications"; // For deep linking from notifications
import { useLastNotificationResponse } from "expo-notifications"; // For deep linking from notifications
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

// Keep the splash screen visible while we fetch the initial auth session
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const { isLoading, isInitialized } = useAuthStore();
  const initialize = useAuthStore((state) => state.initialize);
  const router = useRouter();
  const lastResponse = useLastNotificationResponse();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      registerForPushNotificationsAsync(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // Realtime setup for badges
    if (user?.id) {
      const cleanup = setupBadgeRealtime(user.id, queryClient);
      return () => cleanup();
    }
  }, [user?.id]);

  const hideSplashScreen = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (error) {
      console.warn("Splash hide failed:", error);
    }
  }, []);

  // Trigger one-time hydration from AsyncStorage on cold start.
  // This is the definitive fix for "stuck on splash / needs two opens" — we
  // explicitly await getSession() before ever hiding the splash screen.
  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isLoading) {
      void hideSplashScreen();
      return;
    }

    const fallbackTimer = setTimeout(() => {
      void hideSplashScreen();
    }, 2500);

    return () => clearTimeout(fallbackTimer);
  }, [hideSplashScreen, isInitialized, isLoading]);

  // IMPLEMENTED: Deep linking for notifications
  useEffect(() => {
    // app closed app from notification to open app, handle it here
    if (lastResponse && lastResponse.notification.request.content.data.url) {
      const url = lastResponse.notification.request.content.data.url as string;
      const path = url.replace("carrentalpractice://", "/");

      // if router ready or not
      setTimeout(() => {
        router.replace(path as any);
      }, 1);
    }
  }, [lastResponse, router]);

  const processedNotificationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const url = response.notification.request.content.data.url as string;
          if (url) {
            const path = url.replace("carrentalpractice://", "/");
            const data = response.notification.request.content.data;
            const notification_id = data?.notification_id;
            if (notification_id) {
              await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notification_id);
            }

            setTimeout(() => {
              router.replace(`/(protected)${path}` as any);
            }, 100);
          }
        },
      );

    return () => responseSubscription.remove();
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as any;
        const notificationId = data?.notification_id;

        if (notificationId) {
          if (processedNotificationIds.current.has(notificationId)) {
            return;
          }
          processedNotificationIds.current.add(notificationId);
          markNotificationIdProcessed(notificationId);
        }

        queryClient.setQueryData(["badge-counts", user.id], (oldData: any) => {
          if (!oldData) {
            return { notifications: 1, messages: 0, bookings: 0, reports: 0 };
          }
          return {
            ...oldData,
            notifications: (oldData.notifications || 0) + 1,
          };
        });

        queryClient.invalidateQueries({ queryKey: ["badge-counts", user.id] });
      },
    );

    return () => receivedSubscription.remove();
  }, [user?.id]);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          {/* Sync Gluestack mode with your system theme */}
          <GluestackUIProvider mode="light">
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ThemeProvider value={DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(protected)" />
                  <Stack.Screen name="auth" />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </GestureHandlerRootView>
          </GluestackUIProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
