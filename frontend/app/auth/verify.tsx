// ================================================================
// OLD SUPABASE OTP VERIFICATION (kept for reference in git history)
// Replaced: supabase.auth.verifyOtp() → apiClient.post('/auth/verify-otp')
//           supabase.auth.resend() → apiClient.post('/auth/send-verification')
// ================================================================

import apiClient from "@/lib/axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertCircle, ShieldCheck } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "@/components/BackButton";
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

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "resending">("idle");
  const [error, setError] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error" | "info" | "warning",
  });

  const handleResendCode = useCallback(async () => {
    if (!email) return;

    try {
      setStatus("resending");
      await apiClient.post("/auth/send-verification", { email });
      setStatusModal({
        visible: true,
        title: "Code Sent!",
        message: "A fresh verification code has been sent to your email.",
        type: "success",
      });
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "Could not resend code.";
      setStatusModal({
        visible: true,
        title: "Resend Failed",
        message,
        type: "error",
      });
    } finally {
      setStatus("idle");
    }
  }, [email]);

  const handleVerify = async () => {
    if (token.length !== 6) {
      setError("Please enter the full 6-digit verification code");
      return;
    }

    try {
      setStatus("loading");
      setError(null);

      await apiClient.post("/auth/verify-otp", {
        email: email!,
        token,
      });

      setStatusModal({
        visible: true,
        title: "Account Verified!",
        message: "You have successfully verified your email. Please sign in now.",
        type: "success",
      });
    } catch (err: any) {
      setStatus("idle");
      const message = err.response?.data?.message || err.message || "The code entered is invalid or has expired.";
      setError(message);
    }
  };

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
          <VStack className="items-center mb-10" space="lg">
            <Box className="w-24 h-24 bg-white rounded-3xl items-center justify-center shadow-xl shadow-brand-100">
              <ShieldCheck size={56} color="#16a8e3" strokeWidth={1} />
            </Box>

            <VStack space="xs" className="items-center">
              <Heading size="2xl" className="text-typography-900 font-bold text-center">
                Verify Email
              </Heading>
              <Text className="text-typography-500 text-center px-4 leading-6">
                We've sent a 6-digit security code to:{"\n"}
                <Text className="font-bold text-brand-800">{email}</Text>
              </Text>
            </VStack>
          </VStack>

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
                    <FormControlErrorText>{error}</FormControlErrorText>
                  </FormControlError>
                )}
              </VStack>
            </FormControl>

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
                <Text className="text-typography-500 text-sm">Didn't receive the code?</Text>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onPress={handleResendCode}
                  isDisabled={isResending || isLoading}
                >
                  {isResending ? (
                    <HStack className="items-center">
                      <ButtonSpinner color="#16a8e3" className="mr-1" />
                      <ButtonText className="text-brand-800 font-bold text-sm">Resending...</ButtonText>
                    </HStack>
                  ) : (
                    <ButtonText className="text-brand-800 font-bold text-sm underline">Resend Code</ButtonText>
                  )}
                </Button>
              </HStack>
            </VStack>
          </VStack>
        </Box>
      </KeyboardAwareScrollView>

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
