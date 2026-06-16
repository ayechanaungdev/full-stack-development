import CustomAlert from "@/components/app-alert";
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
} from "@/components/ui/form-control";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { AlertCircle, Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function ChangePasswordScreen() {
  const user = useAuthStore((state) => state.user);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [submitError, setSubmitError] = useState("");

  const validateForm = () => {
    const nextErrors: typeof errors = {};

    if (!currentPassword.trim()) {
      nextErrors.currentPassword = "Please enter current password.";
    }

    if (!newPassword.trim()) {
      nextErrors.newPassword = "Please enter new password.";
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters";
    } else if (newPassword.length > 20) {
      nextErrors.newPassword = "Password too long";
    } else if (!/[A-Z]/.test(newPassword)) {
      nextErrors.newPassword =
        "Password must contain at least one uppercase letter";
    } else if (!/\d/.test(newPassword)) {
      nextErrors.newPassword = "Password must contain at least one number";
    } else if (!/[!@#$%^&*(),.?":{}|<>\[\]\\/~`'_-]/.test(newPassword)) {
      nextErrors.newPassword =
        "Password must contain at least one special character";
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please enter confirm new password.";
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (newPassword && currentPassword && newPassword === currentPassword) {
      nextErrors.newPassword =
        "New password must be different from current password";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChangePassword = async () => {
    setSubmitError("");

    if (!validateForm()) return;

    if (!user?.email) {
      setSubmitError("Unable to verify current password right now.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors((prev) => ({
          ...prev,
          currentPassword: "Current password is incorrect",
        }));
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      router.replace({
        pathname: "/(protected)/(home)/profile",
        params: {
          toastMessage: "Password changed successfully",
          toastType: "success",
        },
      });
    } catch (error: any) {
      const message = error?.message || "Unable to change password right now.";

      if (message.toLowerCase().includes("different from the old password")) {
        setErrors((prev) => ({
          ...prev,
          newPassword: "New password must be different from current password",
        }));
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPasswordField = (
    field: keyof typeof errors,
    label: string,
    placeholder: string,
    value: string,
    onChangeText: (value: string) => void,
    visible: boolean,
    onToggleVisible: () => void,
  ) => (
    <FormControl isInvalid={!!errors[field]}>
      <VStack className="gap-[10px]">
        <Text className="text-typography-800 font-semibold text-md">{label}</Text>
        <Input
          variant="outline"
          size="md"
          className={`rounded-lg border bg-white h-12 data-[focus=true]:border-brand-700 px-3 ${errors[field] ? "border-error-500" : "border-typography-300"}`}
        >
          <InputField
            value={value}
            onChangeText={(nextValue) => {
              onChangeText(nextValue);
              if (submitError) {
                setSubmitError("");
              }
              if (errors[field]) {
                setErrors((prev) => ({ ...prev, [field]: undefined }));
              }
            }}
            placeholder={placeholder}
            secureTextEntry={!visible}
            placeholderTextColor="#9CA3AF"
            className="pl-3 ios:leading-tight text-typography-900"
            maxLength={20}
          />
          <Pressable
            onPress={onToggleVisible}
            className="justify-center items-center"
          >
            {visible ? (
              <Eye size={18} color="#737373" strokeWidth={1.8} />
            ) : (
              <EyeOff size={18} color="#737373" strokeWidth={1.8} />
            )}
          </Pressable>
        </Input>
        {errors[field] ? (
          <FormControlError>
            <FormControlErrorIcon as={AlertCircle} />
            <FormControlErrorText>
              {errors[field]}
            </FormControlErrorText>
          </FormControlError>
        ) : null}
      </VStack>
    </FormControl>
  );

  return (
    <>
      <CustomAlert
        visible={isCancelConfirmOpen}
        title="Discard Changes"
        message="Do you sure you want to discard your password changes?"
        type="warning"
        onClose={() => setIsCancelConfirmOpen(false)}
        actions={[
          { text: "No", type: "cancel" },
          {
            text: "Yes",
            onPress: () => router.back(),
          },
        ]}
      />
      <KeyboardAwareScrollView
        bottomOffset={30}
        style={{ flex: 1 }}
        className="bg-brand-50"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 19,
          paddingTop: 20,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1">
          <View className="rounded-[16px] border border-outline-200 bg-white px-[25px] py-[24px]">
            <VStack className="gap-[20px]">
              {renderPasswordField(
                "currentPassword",
                "Current Password",
                "Enter your current password",
                currentPassword,
                setCurrentPassword,
                showCurrentPassword,
                () => setShowCurrentPassword((prev) => !prev),
              )}

              {renderPasswordField(
                "newPassword",
                "New Password",
                "Enter your new password",
                newPassword,
                setNewPassword,
                showNewPassword,
                () => setShowNewPassword((prev) => !prev),
              )}

              {renderPasswordField(
                "confirmPassword",
                "Confirm New Password",
                "Enter your confirm password",
                confirmPassword,
                setConfirmPassword,
                showConfirmPassword,
                () => setShowConfirmPassword((prev) => !prev),
              )}

              {submitError ? (
                <FormControl isInvalid={!!submitError}>
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {submitError}
                    </FormControlErrorText>
                  </FormControlError>
                </FormControl>
              ) : null}
            </VStack>
          </View>

          <HStack className="mt-4 px-0 pb-[22px] pt-[8px] bg-brand-50 gap-[12px] w-full">
            <Button
              variant="outline"
              className="flex-1 min-w-0 h-[49px] rounded-[4px] border border-brand-700 bg-white"
              onPress={() => {
                const hasChanges =
                  currentPassword?.trim() ||
                  newPassword?.trim() ||
                  confirmPassword?.trim();

                if (hasChanges) {
                  setIsCancelConfirmOpen(true);
                } else {
                  router.back();
                }
              }}
            >
              <ButtonText className="font-roboto font-medium text-base text-brand-700">
                Cancel
              </ButtonText>
            </Button>
            <Button
              className="flex-1 min-w-0 h-[49px] rounded-[4px] bg-brand-700"
              onPress={handleChangePassword}
              isDisabled={isSubmitting}
            >
              <ButtonText
                className="font-roboto font-medium text-base text-white text-center shrink"
                numberOfLines={2}
              >
                {isSubmitting ? "Saving..." : "Change Password"}
              </ButtonText>
            </Button>
          </HStack>
        </View>
      </KeyboardAwareScrollView>
    </>
  );
}
