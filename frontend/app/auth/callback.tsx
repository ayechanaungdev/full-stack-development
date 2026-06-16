import { useAuthStore } from "@/store/useAuthStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * OAuth Callback Handler Component
 * Processes the authentication response from Supabase (Google, GitHub, etc.)
 * Extracts tokens from the deep-link URL and establishes a session.
 */
export default function Callback() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  
  // Use a ref to prevent double-processing in strict mode or rapid re-renders
  const hasProcessed = useRef(false);

  useEffect(() => {
    /**
     * Extracts tokens from the provided URL and updates the global session.
     * We treat both Hash (#) and Query (?) parameters for maximum compatibility.
     */
    const processOAuthPayload = async () => {
      if (!url || hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        const decodedUrl = decodeURIComponent(url);
        
        // --- Helper: Extract parameters efficiently from complex deep links ---
        const getParam = (name: string) => {
          const match = decodedUrl.match(new RegExp(`[?&#]${name}=([^&#]+)`));
          return match ? match[1] : null;
        };

        const accessToken = getParam("access_token");
        const refreshToken = getParam("refresh_token");

        if (!accessToken || !refreshToken) {
          throw new Error("Authentication failed: Missing tokens in callback.");
        }

        /**
         * 1. Set the session in Supabase client (Local state)
         * 2. Update global AuthStore (Triggers profile fetch & navigation)
         */
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;

        // Force a session sync in our Zustand store
        const { data: { session } } = await supabase.auth.getSession();
        await setSession(session);

        /**
         * Final Navigation:
         * Logic is handled globally by Index / Layout routing based on isProfileComplete,
         * but we trigger a replace to "/" to start the bootstrap flow.
         */
        router.replace("/");
        
      } catch (err: any) {
        console.error("[Callback] Processing Error:", err);
        Alert.alert(
          "Sign-In Error",
          err.message || "We couldn't finalize your session. Please try again."
        );
        router.replace("/auth/login");
      }
    };

    processOAuthPayload();
  }, [url, router, setSession]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="items-center">
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text className="mt-6 text-typography-800 text-lg font-bold">
          Authenticating...
        </Text>
        <Text className="mt-2 text-typography-500 text-center text-sm">
          Please wait while we complete the secure sign-in process.
        </Text>
      </View>
    </View>
  );
}
