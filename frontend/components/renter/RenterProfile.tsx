import CustomAlert from "@/components/app-alert";
import Toast from "@/components/Toast";
import { Box } from "@/components/ui/box";
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
} from "@/components/ui/checkbox";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
} from "@/components/ui/form-control";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { supabase } from "@/lib/supabase";
import { Profile, useAuthStore } from "@/store/useAuthStore";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Bell,
  Bookmark,
  CheckIcon,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  HelpCircle,
  LogIn,
  PencilLine,
  SquarePen,
  TriangleAlert,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileToastType = "success" | "error" | "info" | "warning";

type PendingProfileToast = {
  message: string;
  type: ProfileToastType;
} | null;

const PROFILE_TOAST_KEY = "__renter_profile_pending_toast__";
const LOGIN_TOAST_KEY = "__login_pending_toast__";

export const setPendingLoginToast = (
  message: string,
  type: ProfileToastType = "info",
) => {
  (globalThis as any)[LOGIN_TOAST_KEY] = { message, type };
};

const getPendingProfileToast = (): PendingProfileToast =>
  (
    globalThis as typeof globalThis & {
      [PROFILE_TOAST_KEY]?: PendingProfileToast;
    }
  )[PROFILE_TOAST_KEY] ?? null;

export const setPendingProfileToast = (
  message: string,
  type: ProfileToastType = "info",
) => {
  (
    globalThis as typeof globalThis & {
      [PROFILE_TOAST_KEY]?: PendingProfileToast;
    }
  )[PROFILE_TOAST_KEY] = { message, type };
};

const MenuItem = ({
  icon: Icon,
  title,
  showArrow = false,
  onPress,
  textColor,
}: any) => {
  const { colorScheme } = useColorScheme();
  const iconColor =
    textColor ?? (colorScheme === "dark" ? "#f8fafc" : "#181719");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <HStack className="items-center justify-between py-[14px]">
        <HStack className="items-center gap-[18px]">
          <Icon size={23} color={iconColor} strokeWidth={2} />
          <Text
            className="font-roboto font-semibold text-lg leading-[22px] text-typography-black dark:text-typography-white"
            style={textColor ? { color: textColor } : undefined}
          >
            {title}
          </Text>
        </HStack>
        {showArrow && (
          <ChevronRight size={22} color="#0C6081" strokeWidth={2.2} />
        )}
      </HStack>
    </Pressable>
  );
};

export const RenterProfile = ({ data: initialData }: { data: Profile }) => {
  const signOut = useAuthStore((state) => state.signOut);
  const unsubscribeFromProfile = useAuthStore(
    (state) => state.unsubscribeFromProfile,
  );
  const setIsVerifying = useAuthStore((state) => state.setIsVerifying);
  const user = useAuthStore((state) => state.user);

  const params = useLocalSearchParams<{
    toastMessage: string;
    toastType: ProfileToastType;
  }>();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ProfileToastType>("info");
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);
  // for deactivate modal
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isPreChecking, setIsPreChecking] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  // "confirm" = normal deactivate flow, "blocked" = approved booking restriction
  const [deactivateModalMode, setDeactivateModalMode] = useState<
    "confirm" | "blocked"
  >("confirm");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [latestEndDate, setLatestEndDate] = useState("");
  const [hasPendingWarning, setHasPendingWarning] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    isChecked?: boolean;
  }>({});
  // Custom Alert States (for errors only, not booking validation)
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    actions: [] as {
      text: string;
      onPress?: () => void;
      type?: "cancel" | "default";
    }[],
  });
  // For KeyboardAvoidingView
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOffset(e.endCoordinates.height * 0.75);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const pendingToast = getPendingProfileToast();

      if (pendingToast) {
        (
          globalThis as typeof globalThis & {
            [PROFILE_TOAST_KEY]?: PendingProfileToast;
          }
        )[PROFILE_TOAST_KEY] = null;
        setToastMessage(pendingToast.message);
        setToastType(pendingToast.type);
        setToastVisible(true);
        return;
      }

      if (params.toastMessage) {
        setToastMessage(params.toastMessage);
        setToastType(params.toastType || "info");
        setToastVisible(true);
        router.setParams({ toastMessage: undefined, toastType: undefined });
      }
    }, [params.toastMessage, params.toastType]),
  );

  // Format a date string to "DD MMMM YYYY" (e.g. "12 June 2026")
  const formatBookingDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const executeDeactivation = async (shouldCancelPending: boolean) => {
    try {
      setIsDeactivating(true);

      // Unsubscribe from realtime profile updates first to prevent
      // the listener from detecting is_active=false and racing with signOut
      unsubscribeFromProfile();

      if (shouldCancelPending) {
        const { error: cancelError } = await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("customer_id", user?.id)
          .eq("status", "pending");

        if (cancelError) throw cancelError;
      }

      // Update profile to inactive
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      // Use the same flow as logout: set a pending toast, then signOut via store
      setPendingLoginToast(
        "Your account has been successfully deactivated.",
        "success",
      );
      // Re-enable auth state listener so signOut navigates cleanly
      setIsVerifying(false);
      // Add a brief delay for a smoother deactivating transition
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await signOut();

      setShowDeactivateModal(false);
      setPassword("");
      setIsChecked(false);
      setErrors({});
      setIsDeactivating(false);
    } catch (error) {
      setIsVerifying(false);
      setIsDeactivating(false);
      setAlertData({
        title: "Error",
        message: "Something went wrong. Please try again later.",
        type: "error",
        actions: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    }
  };

  // Pre-check bookings BEFORE opening the deactivate modal
  const handleDeactivatePress = async () => {
    if (isPreChecking) return;
    try {
      setIsPreChecking(true);

      const { data: bookings, error: bookingError } = await supabase
        .from("bookings")
        .select("status, end_date")
        .eq("customer_id", user?.id);

      if (bookingError) throw bookingError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeApproved = (bookings ?? []).filter((b) => {
        if (b.status !== "approved") return false;
        const endDate = new Date(b.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
      });

      if (activeApproved.length > 0) {
        // Blocked — show restriction message in modal directly
        activeApproved.sort(
          (a, b) =>
            new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
        );
        const endD = formatBookingDate(activeApproved[0].end_date);
        const prefix =
          activeApproved.length === 1
            ? "You can deactivate your account only after your approved booking date is completed on "
            : "You can deactivate your account only after your latest approved booking date is completed on ";

        setDeactivateModalMode("blocked");
        setBlockedMessage(prefix);
        setLatestEndDate(endD);
        setHasPendingWarning(false);
      } else {
        // Normal confirm flow
        const hasPending = (bookings ?? []).some((b) => b.status === "pending");
        setDeactivateModalMode("confirm");
        setHasPendingWarning(hasPending);
        setBlockedMessage("");
        setLatestEndDate("");
      }

      setPassword("");
      setIsChecked(false);
      setErrors({});
      setShowDeactivateModal(true);
    } catch (error) {
      setAlertData({
        title: "Error",
        message: "Something went wrong. Please try again later.",
        type: "error",
        actions: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    } finally {
      setIsPreChecking(false);
    }
  };

  const handleCheckboxChange = (value: boolean) => {
    setIsChecked(value);
    if (value && errors.isChecked) {
      setErrors((prev) => ({ ...prev, isChecked: undefined }));
    }
  };

  const handleDeactivate = async () => {
    if (isDeactivating) return;

    const newErrors: { password?: string; isChecked?: boolean } = {};
    if (!password.trim()) {
      newErrors.password = "Please enter your password.";
    }
    if (!isChecked) {
      newErrors.isChecked = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const userEmail = user?.email;
    if (!userEmail) {
      setAlertData({
        title: "Error",
        message: "User session not found. Please log in again.",
        type: "error",
        actions: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
      return;
    }

    try {
      setIsDeactivating(true);

      // Block onAuthStateChange from triggering profile re-fetch during password verification
      setIsVerifying(true);
      unsubscribeFromProfile();

      // Verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      if (authError) {
        // Re-enable auth state listener on failure
        setIsVerifying(false);
        setErrors({ password: "Incorrect password. Please try again." });
        setIsDeactivating(false);
        return;
      }

      // Cancel pending bookings if any, then deactivate
      await executeDeactivation(hasPendingWarning);
    } catch (error) {
      setIsVerifying(false);
      setIsDeactivating(false);
      setAlertData({
        title: "Error",
        message: "Something went wrong. Please try again later.",
        type: "error",
        actions: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    }
  };

  const handleLogout = async () => {
    try {
      isLoggingOutRef.current = true;
      setIsLoggingOut(true);
      setPendingLoginToast("Logged out successfully.", "warning");
      // Add a brief delay for a smoother logging out transition
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await signOut();
    } catch (error) {
      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <>
      <CustomAlert
        visible={isLogoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        type="warning"
        onClose={() => {
          if (!isLoggingOutRef.current) {
            setIsLogoutConfirmOpen(false);
          }
        }}
        actions={
          isLoggingOut
            ? [
              {
                text: (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <View
                      style={{
                        position: "absolute",
                        top: -12,
                        bottom: -12,
                        left: -26,
                        right: -26,
                        borderRadius: 16,
                        backgroundColor: "#ffffff",
                        opacity: 0.5,
                      }}
                    />
                    <Text className="text-gray-400 font-semibold text-sm" style={{ opacity: 0.5 }}>
                      Cancel
                    </Text>
                  </View>
                ) as any,
                type: "cancel",
                onPress: () => { },
              },
              {
                text: (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <View
                      style={{
                        position: "absolute",
                        top: -12,
                        bottom: -12,
                        left: -26,
                        right: -26,
                        borderRadius: 16,
                        backgroundColor: "#ffffff",
                        opacity: 0.3,
                      }}
                    />
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 6, opacity: 0.7 }} />
                    <Text className="text-white font-semibold text-sm" style={{ opacity: 0.7 }}>
                      Logging out...
                    </Text>
                  </View>
                ) as any,
                type: "default",
                onPress: () => { },
              },
            ]
            : [
              {
                text: "Cancel",
                type: "cancel",
              },
              {
                text: "Logout",
                onPress: handleLogout,
              },
            ]
        }
      />
      {/* Deactivate */}
      <CustomAlert
        visible={alertVisible}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
        onClose={() => setAlertVisible(false)}
        actions={alertData.actions}
      />
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
      <SafeAreaView className="flex-1 bg-brand-50" edges={["bottom"]}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <VStack className="px-6 pb-12 pt-6 gap-7">
            {/* Profile Card (Alert-solid) */}
            <View className="flex-row items-center p-[14px] gap-[14px] bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 shadow-hard-2">
              {/* Avatar */}
              <Box className="w-[92px] h-[92px] rounded-full overflow-hidden border-[4px] border-brand-300">
                <Image
                  source={
                    initialData.avatar_url
                      ? { uri: initialData.avatar_url }
                      : require("@/assets/images/avatar1.png")
                  }
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                />
              </Box>

              {/* User Info */}
              <VStack className="flex-1">
                <Text className="font-roboto font-bold text-[19px] leading-[24px] uppercase text-typography-black dark:text-typography-white">
                  {initialData.full_name || "ALEX TOMMY"}
                </Text>
                <Text className="font-roboto text-sm text-typography-black mt-1">
                  {initialData.nrc || "13/LAYANA(N)123456"}
                </Text>
                <Text className="font-roboto text-sm text-typography-black mt-1">
                  {user?.email || "alextommy@gmail.com"}
                </Text>
              </VStack>
            </View>

            {/* PROFILE SECTION */}
            <VStack>
              <Text className="font-roboto font-bold text-2xl leading-[28px] text-neutral-800 dark:text-typography-100 mb-[18px]">
                PROFILE
              </Text>
              <VStack className="pl-[14px] gap-2">
                <MenuItem
                  icon={SquarePen}
                  title="Personal Information"
                  showArrow
                  onPress={() => router.push("/profile-edit")}
                />
                <MenuItem
                  icon={Bookmark}
                  title="WishList"
                  onPress={() => router.push("/wishlist")}
                />
                <MenuItem
                  icon={Bell}
                  title="Notification"
                  onPress={() => router.push("/notifications")}
                />
                <MenuItem
                  icon={EyeOff}
                  title={isPreChecking ? "Checking..." : "Deactivate"}
                  onPress={handleDeactivatePress}
                />
              </VStack>
            </VStack>

            {/* SETTING SECTION */}
            <VStack>
              <Text className="font-roboto font-bold text-2xl leading-[28px] text-neutral-800 dark:text-typography-100 mb-[18px]">
                SETTING
              </Text>
              <VStack className="pl-[14px] gap-2 pb-[100px]">
                <MenuItem
                  icon={PencilLine}
                  title="Change Password"
                  onPress={() => router.push("/change-password")}
                />
                <MenuItem
                  icon={HelpCircle}
                  title="Inquiry & Support"
                  onPress={() => {
                    router.push("/inquiry");
                  }}
                />
                <MenuItem
                  icon={LogIn}
                  title="Logout"
                  onPress={() => setIsLogoutConfirmOpen(true)}
                  textColor="#ef4444"
                />
              </VStack>
            </VStack>
          </VStack>

          <Modal visible={showDeactivateModal} transparent animationType="fade">
            <Box
              className="flex-1 justify-center items-center bg-black/50 px-6"
              style={{ transform: [{ translateY: -keyboardOffset }] }}
            >
              <Box
                className="bg-white w-full max-h-[70%] p-6 rounded-[20px] flex-col"
                style={{
                  minHeight: deactivateModalMode === "blocked" ? 350 : 500,
                }}
              >
                {/* Modal title changes based on mode */}
                <Text className="text-lg font-medium mb-4">
                  {deactivateModalMode === "blocked"
                    ? "Cannot Deactivate"
                    : "Deactivate your account"}
                </Text>

                <ScrollView
                  className="flex-1 mb-2"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Warning Area */}
                  <Box className="flex-row justify-center items-center gap-3 p-4 bg-red-100 rounded-md">
                    <TriangleAlert />
                    <Box className="flex-1">
                      <Text className="text-lg font-medium text-center">
                        {deactivateModalMode === "blocked"
                          ? "Account deactivation is currently restricted."
                          : "Login access requires administrator permission."}
                      </Text>
                    </Box>
                  </Box>

                  {deactivateModalMode === "blocked" ? (
                    /* Blocked mode — restriction message only */
                    <Box className="mt-3 p-3 rounded-lg">
                      <Text className="text-lg text-gray-600 leading-6">
                        {blockedMessage}
                        <Text className="font-bold text-lg text-gray-600 leading-6">
                          {latestEndDate}
                        </Text>
                        .
                      </Text>
                    </Box>
                  ) : (
                    /* Confirm mode — normal deactivate flow */
                    <>
                      {/* Condition Area */}
                      <Box className="mb-4 p-3 rounded-lg">
                        <Text className="text-lg font-semibold text-gray-700 mb-1">
                          Deactivation Terms and Conditions:
                        </Text>
                        <Text className="text-lg text-gray-600 leading-6">
                          • You will be signed out immediately.{"\n"}
                          {"\n"}
                          {hasPendingWarning ? (
                            <Text className="text-lg text-gray-600 leading-6">
                              • Pending bookings{" "}
                              <Text className="text-lg text-gray-600 leading-6 font-bold">
                                will be cancelled
                              </Text>{" "}
                              automatically after account deactivation.{"\n"}
                              {"\n"}
                            </Text>
                          ) : null}
                          • Re-activation requires approval by the system
                          administrator.
                        </Text>
                      </Box>
                      {/* Password Area */}
                      <FormControl isInvalid={!!errors.password} className="w-full">
                        <VStack space="xs">
                          <Text className="text-typography-500">Password</Text>
                          <Input variant="outline" size="md" className="w-full">
                            <InputField
                              secureTextEntry={!showPassword}
                              value={password}
                              onChangeText={(text) => {
                                setPassword(text);
                                if (errors.password) {
                                  setErrors((prev) => ({ ...prev, password: undefined }));
                                }
                              }}
                            />
                            <InputSlot
                              className="pr-3"
                              onPress={handleTogglePassword}
                            >
                              <InputIcon
                                as={showPassword ? Eye : EyeOff}
                                color="#6B7280"
                                size="xs"
                              />
                            </InputSlot>
                          </Input>
                          {errors.password && (
                            <FormControlError>
                              <FormControlErrorIcon as={CircleAlert} />
                              <FormControlErrorText>
                                {errors.password}
                              </FormControlErrorText>
                            </FormControlError>
                          )}
                        </VStack>
                      </FormControl>
                      {/* CheckBox Area */}
                      <Box className="mt-4 w-full">
                        <Pressable
                          onPress={() => handleCheckboxChange(!isChecked)}
                          className="flex-row items-start gap-3 p-1"
                        >
                          <Checkbox
                            value="confirm-delete"
                            isChecked={isChecked}
                            onChange={handleCheckboxChange}
                            isInvalid={!!errors.isChecked}
                            size="md"
                            className="mt-0.5"
                          >
                            <CheckboxIndicator
                              className={`w-5 h-5 rounded ${errors.isChecked
                                  ? "border-red-500"
                                  : isChecked
                                    ? "border-red-500"
                                    : "border-gray-300"
                                } ${isChecked ? "bg-red-500" : "bg-white"}`}
                            >
                              <CheckboxIcon
                                as={CheckIcon}
                                className="text-white w-3 h-3"
                              />
                            </CheckboxIndicator>
                          </Checkbox>
                          <Box className="flex-1">
                            <Text className="text-gray-600 text-base leading-5">
                              I am agree with terms and conditions.
                            </Text>
                          </Box>
                        </Pressable>
                      </Box>
                    </>
                  )}
                </ScrollView>

                {/* Buttons — blocked mode: only Close; confirm mode: Cancel + Deactivate */}
                <Box className="flex-row items-center justify-end gap-4 mt-6 w-full">
                  {deactivateModalMode === "blocked" ? (
                    <Pressable
                      onPress={() => setShowDeactivateModal(false)}
                      className="h-12 rounded-lg justify-center items-center flex-1 bg-brand-500"
                    >
                      <Text className="text-white font-medium">Close</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Pressable
                        onPress={() => {
                          if (isDeactivating) return;
                          setShowDeactivateModal(false);
                          setPassword("");
                          setIsChecked(false);
                          setErrors({});
                        }}
                        className="border border-gray-300 h-12 rounded-lg justify-center items-center flex-1"
                        disabled={isDeactivating}
                        style={{ opacity: isDeactivating ? 0.5 : 1 }}
                      >
                        <Text className="text-gray-400">Cancel</Text>
                      </Pressable>
                      <Pressable
                        className="h-12 rounded-lg justify-center items-center flex-1"
                        style={{
                          backgroundColor: "#53c1ed",
                          opacity: isDeactivating ? 0.7 : 1,
                        }}
                        onPress={handleDeactivate}
                        disabled={isDeactivating}
                      >
                        <HStack space="xs" className="items-center justify-center">
                          {isDeactivating && (
                            <ActivityIndicator size="small" color="white" />
                          )}
                          <Text className="text-white">
                            {isDeactivating ? "Deactivating..." : "Deactivate"}
                          </Text>
                        </HStack>
                      </Pressable>
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};
