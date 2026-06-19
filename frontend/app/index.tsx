import { Box } from "@/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuthStore } from "@/store/useAuthStore";
import { useRootNavigationState, useRouter } from "expo-router";
import React, { useEffect } from "react";

/**
 * Root Entry Point (Splash/Gatekeeper)
 * Responsible for initial routing based on authentication and profile status.
 */
export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  // OLD: destructured only session (Supabase session had .user inside)
  // const { session, isLoading, isInitialized, isProfileComplete, error, fetchProfile } = useAuthStore();
  // NEW: also destructure user (backend auth stores user separately)
  const { session, user, isLoading, isInitialized, isProfileComplete, error, fetchProfile } =
    useAuthStore();

  /**
   * Effect: Handles redirection once navigation and data are ready.
   * Prevents navigation if a fetch error occurred to allow for retry.
   */
  useEffect(() => {
    // 1. Guard: Ensure navigation is mounted and data is not in a transitional/error state
    //    isInitialized ensures we never navigate before getSession() has completed
    if (!rootNavigationState?.key || isLoading || error || !isInitialized) return;

    // 2. Perform redirection logic with a micro-timeout for UI stability
    const redirectTimer = setTimeout(() => {
      if (!session) {
        return router.replace("/auth/start");
      }

      if (isProfileComplete()) {
        return router.replace("/(protected)/(tabs)");
      }

      // Default: Profile needs completion
      router.replace("/auth/complete-profile");
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [session, isLoading, isInitialized, error, rootNavigationState?.key]);

  /**
   * Action: Manually triggers a profile fetch retry.
   */
  // OLD: fetchProfile(session.user.id)
  // const handleRetry = () => { if (session?.user.id) { fetchProfile(session.user.id); } };
  // NEW: fetchProfile(user.id)
  const handleRetry = () => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  };

  // --- Render: Error State ---
  if (error && !isLoading) {
    return (
      <Center className="flex-1 bg-background-0 px-6">
        <VStack space="lg" className="items-center w-full">
          <Box className="items-center">
            <Text className="text-error-600 font-bold text-xl mb-2">
              Connection Error
            </Text>
            <Text className="text-typography-500 text-center text-sm">
              {error === "Timeout"
                ? "The request took too long. Please check your internet connection and try again."
                : "Unable to connect to the server. Please check your internet connection and try again."}
            </Text>
          </Box>

          <Button
            size="md"
            variant="solid"
            action="primary"
            className="bg-brand-700 h-11 px-8 rounded-lg active:bg-brand-800"
            onPress={handleRetry}
            isDisabled={isLoading}
          >
            {isLoading && <ButtonSpinner className="mr-2" />}
            <ButtonText className="font-semibold">
              {isLoading ? "Connecting..." : "Retry Connection"}
            </ButtonText>
          </Button>
        </VStack>
      </Center>
    );
  }

  // --- Render: Loading State (Default) ---
  return (
    <Center className="flex-1 bg-background-0">
      <VStack space="md" className="items-center">
        <Spinner size="large" color="$brand700" />
        <Text className="text-typography-400 text-sm font-medium">
          Initializing app...
        </Text>
      </VStack>
    </Center>
  );
}
