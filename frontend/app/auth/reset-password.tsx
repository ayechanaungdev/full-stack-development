import apiClient from "@/lib/axios";
import CustomAlert from "@/components/app-alert";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "expo-router";
import { AlertCircle, Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

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
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export default function ResetPassword() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    verificationCode: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCode, setShowCode] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const [statusModal, setStatusModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error" | "info" | "warning",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const displayErrors = (newErrors: { [key: string]: string }) => {
    setErrors(newErrors);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  // --- Step 1: Send Reset Code ---
  const handleSendOTP = async () => {
    if (!formData.email) {
      displayErrors({ email: "Please enter your email address first." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      displayErrors({ email: "Please enter a valid email address." });
      return;
    }

    try {
      setIsSendingCode(true);

      await apiClient.post("/auth/send-verification", {
        email: formData.email.trim().toLowerCase(),
        type: "password_reset",
      });

      setCodeSent(true);
      setStatusModal({
        visible: true,
        title: "Code Sent!",
        message: "Please check your email for the 6-digit verification code.",
        type: "success",
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to send reset code.";
      displayErrors({ email: message });
    } finally {
      setIsSendingCode(false);
    }
  };

  // --- Step 2: Verify OTP & Update Password ---
  const handleResetPassword = async () => {
    const { email, verificationCode, newPassword, confirmPassword } = formData;
    const newErrs: any = {};

    if (!email) {
      newErrs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrs.email = "Please enter a valid email address.";
    }
    if (!verificationCode) newErrs.verificationCode = "Code is required.";
    if (!newPassword) {
      newErrs.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrs.newPassword = "Password must be at least 8 characters long";
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(
        newPassword,
      )
    ) {
      newErrs.newPassword =
        "Password must include uppercase, lowercase, number and special character";
    }

    if (!confirmPassword)
      newErrs.confirmPassword = "Confirm password is required.";

    if (Object.keys(newErrs).length > 0) {
      displayErrors(newErrs);
      return;
    }

    if (verificationCode.length !== 6) {
      displayErrors({ verificationCode: "Recovery code must be 6 digits." });
      return;
    }

    if (newPassword !== confirmPassword) {
      displayErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);

      await apiClient.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        token: verificationCode.trim(),
        newPassword,
      });

      setStatusModal({
        visible: true,
        title: "Success!",
        message: "Your password has been reset successfully.",
        type: "success",
      });
    } catch (error: any) {
      const rawMessage =
        error.response?.data?.message ||
        error.message ||
        "Invalid or expired code.";
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : String(rawMessage);

      if (message.toLowerCase().includes("email")) {
        displayErrors({ email: message });
      } else {
        displayErrors({ verificationCode: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={30}
        style={{ flex: 1 }}
        className="bg-brand-50"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box className="px-8 pb-32 flex-1 justify-center">
          <Heading
            size="2xl"
            className="text-brand-700 text-center mb-12 font-bold"
          >
            Reset Password
          </Heading>

          <VStack space="lg" className="w-full">
            {/* Email Field with Send Code Button */}
            <FormControl isInvalid={!!errors.email}>
              <FormControlLabel className="mb-2">
                <FormControlLabelText className="text-typography-800 font-semibold text-md">
                  Email Address{" "}
                  <Text className="text-error-500 font-bold">*</Text>
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="md"
                className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
              >
                <InputField
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={(val) => handleInputChange("email", val)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="pl-3 ios:leading-tight text-typography-900"
                  editable={!codeSent}
                  maxLength={30}
                />
                <InputSlot className="pr-2" onPress={handleSendOTP}>
                  <Box
                    className={`px-4 py-1.5 rounded-lg ${isSendingCode ? "bg-gray-100" : "bg-brand-100"}`}
                  >
                    {isSendingCode ? (
                      <Spinner size="small" color="#16a8e3" />
                    ) : (
                      <Text className="text-brand-800 font-bold text-xs">
                        {codeSent ? "Resend" : "Send Code"}
                      </Text>
                    )}
                  </Box>
                </InputSlot>
              </Input>
              {errors.email && (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} />
                  <FormControlErrorText>{errors.email}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Verification Code Field */}
            <FormControl isInvalid={!!errors.verificationCode}>
              <FormControlLabel className="mb-2">
                <FormControlLabelText className="text-typography-800 font-semibold text-md">
                  6-Digit Verification Code{" "}
                  <Text className="text-error-500 font-bold">*</Text>
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="md"
                className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
              >
                <InputField
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#9CA3AF"
                  value={formData.verificationCode}
                  onChangeText={(val) =>
                    handleInputChange("verificationCode", val)
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showCode}
                  className="pl-3 ios:leading-tight text-typography-900"
                />
                <InputSlot
                  className="pr-3"
                  onPress={() => setShowCode(!showCode)}
                >
                  <InputIcon
                    as={showCode ? Eye : EyeOff}
                    color="#4B5563"
                    size="sm"
                  />
                </InputSlot>
              </Input>
              {errors.verificationCode && (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} />
                  <FormControlErrorText>
                    {errors.verificationCode}
                  </FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* New Password Field */}
            <FormControl isInvalid={!!errors.newPassword}>
              <FormControlLabel className="mb-2">
                <FormControlLabelText className="text-typography-800 font-semibold text-md">
                  New Password{" "}
                  <Text className="text-error-500 font-bold">*</Text>
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="md"
                className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
              >
                <InputField
                  placeholder="Enter your new password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.newPassword}
                  onChangeText={(val) => handleInputChange("newPassword", val)}
                  secureTextEntry={!showNewPassword}
                  className="pl-3 ios:leading-tight text-typography-900"
                  maxLength={20}
                />
                <InputSlot
                  className="pr-3"
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <InputIcon
                    as={showNewPassword ? Eye : EyeOff}
                    color="#4B5563"
                    size="sm"
                  />
                </InputSlot>
              </Input>
              {errors.newPassword && (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} />
                  <FormControlErrorText>
                    {errors.newPassword}
                  </FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Confirm New Password Field */}
            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormControlLabel className="mb-2">
                <FormControlLabelText className="text-typography-800 font-semibold text-md">
                  Confirm New Password{" "}
                  <Text className="text-error-500 font-bold">*</Text>
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="md"
                className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
              >
                <InputField
                  placeholder="Confirm your new password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.confirmPassword}
                  onChangeText={(val) =>
                    handleInputChange("confirmPassword", val)
                  }
                  secureTextEntry={!showConfirmPassword}
                  className="pl-3 ios:leading-tight"
                  maxLength={20}
                />
                <InputSlot
                  className="pr-3"
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <InputIcon
                    as={showConfirmPassword ? Eye : EyeOff}
                    color="#4B5563"
                    size="sm"
                  />
                </InputSlot>
              </Input>
              {errors.confirmPassword && (
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} />
                  <FormControlErrorText>
                    {errors.confirmPassword}
                  </FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Action Buttons */}
            <HStack space="md" className="mt-8 mb-10">
              <Button
                action="secondary"
                variant="outline"
                size="lg"
                className="flex-1 border-brand-700 h-14 rounded-xl data-[active=true]:bg-background-50"
                onPress={() => router.back()}
              >
                <ButtonText className="text-brand-850 font-bold text-md">
                  Cancel
                </ButtonText>
              </Button>
              <Button
                size="lg"
                className={`flex-1 bg-brand-700 h-14 rounded-xl data-[disabled=true]:bg-brand-700 data-[active=true]:bg-brand-800 ${loading ? "opacity-70" : ""}`}
                onPress={handleResetPassword}
                isDisabled={loading}
              >
                {loading && <ButtonSpinner color="white" className="mr-2" />}
                <ButtonText
                  className="text-white font-bold text-md"
                  numberOfLines={1}
                >
                  {loading ? "Saving..." : "Change password"}
                </ButtonText>
              </Button>
            </HStack>
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
              if (statusModal.title.includes("Success")) {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/auth/login");
                }
              }
            },
          },
        ]}
      />
    </>
  );
}
