import { BackButton } from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertCircle, ShieldCheck } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

// Gluestack UI Core Components
import CustomAlert from "@/components/app-alert";
import { Box } from "@/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * OTP Verification Screen
 * Handles the 6-digit email verification flow post-signup.
 * Supports: OTP validation, avatar persistence, and resend functionality.
 */
export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  // Auth Store Hooks
  const { setIsVerifying, avatarUri, uploadAvatar, setAvatarUri } =
    useAuthStore();

  // Component State
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "resending">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error" | "info" | "warning",
  });

  /**
   * Helper: Resend OTP to user's email
   * Utilizes standard Supabase Auth resend mechanism.
   */
  const handleResendCode = useCallback(async () => {
    if (!email) return;

    try {
      setStatus("resending");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) throw error;
      setStatusModal({
        visible: true,
        title: "Code Sent!",
        message: "A fresh verification code has been dispatched to your email.",
        type: "success",
      });
    } catch (err: any) {
      setStatusModal({
        visible: true,
        title: "Resend Failed",
        message: err.message || "We couldn't resend the code right now.",
        type: "error",
      });
    } finally {
      setStatus("idle");
    }
  }, [email]);

  /**
   * Core Logic: Verify OTP and finalize account setup
   * Includes post-verification avatar upload and metadata syncing.
   */
  const handleVerify = async () => {
    // 1. Validation: Fail early if token is incomplete
    if (token.length !== 6) {
      setError("Please enter the full 6-digit verification code");
      return;
    }

    try {
      setStatus("loading");
      setError(null);
      setIsVerifying(true); // Signal global auth store to handle incoming session change

      // 2. Perform Verification
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email!,
        token,
        type: "signup",
      });

      if (verifyError) throw verifyError;

      if (data?.session) {
        const userId = data.session.user.id;

        // 3. Optional: Background Avatar Persistence
        let uploadedUrl = null;
        if (avatarUri) {
          try {
            uploadedUrl = await uploadAvatar(avatarUri, userId);
          } catch (uploadErr) {
            // Silently fail avatar upload
          }
        }

        /**
         * 4. Session Finalization Sequence
         * We delay slightly to allow Supabase DB triggers (Profile creation) to complete.
         * Then we ensure the avatar URL is synchronized before forcing a fresh sign-in.
         */
        setTimeout(async () => {
          try {
            if (uploadedUrl) {
              // Update profiles table directly
              await supabase
                .from("profiles")
                .update({ avatar_url: uploadedUrl })
                .eq("id", userId);
              // Update Auth Metadata for consistency across session tokens
              await supabase.auth.updateUser({
                data: { avatar_url: uploadedUrl },
              });
            }

            /**
             * 5. Security: Force Sign Out
             * After successful verification, we clear the session to force the user
             * to log in with their credentials, ensuring the full auth flow is respected.
             */
            await supabase.auth.signOut();

            // 6. Cleanup & Redirect
            setAvatarUri(null);
            setIsVerifying(false);
            setStatus("idle");

            setStatusModal({
              visible: true,
              title: "Account Verified!",
              message:
                "You have successfully verified your email. Please sign in now.",
              type: "success",
            });
          } catch (syncErr: any) {
            setIsVerifying(false);
            setStatus("idle");
          }
        }, 1500);
      }
    } catch (err: any) {
      setIsVerifying(false);
      setStatus("idle");
      setError(err.message || "The code entered is invalid or has expired.");
    }
  };

  // Computed: UI Derived State

  const isLoading = status === "loading";
  const isResending = status === "resending";

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]} className="bg-brand-50">
      <Box className="px-5 py-2">
        <HStack className="items-center h-16">
          <BackButton />
        </HStack>
      </Box>

      <KeyboardAwareScrollView
        bottomOffset={30}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box className="flex-1 px-8 pb-10">
          {/* Verification Illustration & Meta */}
          <VStack className="items-center mb-10" space="lg">
            <Box className="w-24 h-24 bg-white rounded-3xl items-center justify-center shadow-xl shadow-brand-100">
              <ShieldCheck size={56} color="#16a8e3" strokeWidth={1} />
            </Box>

            <VStack space="xs" className="items-center">
              <Heading
                size="2xl"
                className="text-typography-900 font-bold text-center"
              >
                Verify Email
              </Heading>
              <Text className="text-typography-500 text-center px-4 leading-6">
                We've sent a 6-digit security code to:{"\n"}
                <Text className="font-bold text-brand-800">{email}</Text>
              </Text>
            </VStack>
          </VStack>

          {/* OTP Form Input */}
          <VStack space="2xl" className="w-full">
            <FormControl isInvalid={!!error}>
              <VStack space="md">
                <FormControlLabel className="justify-center">
                  <FormControlLabelText className="text-typography-600 font-semibold">
                    Enter Verification Code
                  </FormControlLabelText>
                </FormControlLabel>

                <Input
                  variant="outline"
                  className="border-typography-200 bg-white rounded-2xl h-20 w-full shadow-sm data-[focus=true]:border-brand-700"
                >
                  <InputField
                    placeholder="000 000"
                    placeholderTextColor="#CBD5E1"
                    className="text-center text-4xl font-bold tracking-[14px] text-typography-900 ios:leading-tight text-typography-900"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={token}
                    onChangeText={(val) => {
                      setToken(val);
                      if (error) setError(null);
                    }}
                    autoFocus
                  />
                </Input>

                {error && (
                  <FormControlError className="justify-center">
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {error}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </VStack>
            </FormControl>

            {/* Action Buttons */}
            <VStack space="lg">
              <Button
                size="lg"
                className={`bg-brand-500 rounded-xl h-14 shadow-lg shadow-brand-100 data-[disabled=true]:bg-brand-500 data-[active=true]:bg-brand-800 ${isLoading ? "opacity-70" : ""}`}
                onPress={handleVerify}
                isDisabled={isLoading}
              >
                {isLoading && <ButtonSpinner className="mr-2" color="white" />}
                <ButtonText className="text-white font-bold text-lg">
                  {isLoading ? "Verifying..." : "Verify & Continue"}
                </ButtonText>
              </Button>

              <HStack className="justify-center items-center" space="xs">
                <Text className="text-typography-500 text-sm">
                  Didn't receive the code?
                </Text>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onPress={handleResendCode}
                  isDisabled={isResending || isLoading}
                >
                  {isResending ? (
                    <HStack className="items-center">
                      <ButtonSpinner color="#16a8e3" className="mr-1" />
                      <ButtonText className="text-brand-800 font-bold text-sm">
                        Resending...
                      </ButtonText>
                    </HStack>
                  ) : (
                    <ButtonText className="text-brand-800 font-bold text-sm underline">
                      Resend Code
                    </ButtonText>
                  )}
                </Button>
              </HStack>
            </VStack>
          </VStack>
        </Box>
      </KeyboardAwareScrollView>

      {/* Premium Status Modal */}
      <CustomAlert
        visible={statusModal.visible}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        actions={[
          {
            text: "Okay",
            onPress: () => {
              if (statusModal.title.includes("Account Verified")) {
                router.replace({ pathname: "/auth/login", params: { email } });
              }
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}
