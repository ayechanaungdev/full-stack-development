import { useAuthStore } from "@/store/useAuthStore";
import { useFocusEffect } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert, Eye, EyeOff } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Gluestack UI Components
import CustomAlert from "@/components/app-alert";
import ContactAdminCard from "@/components/ContactAdminCard";
import Toast from "@/components/Toast";
import { Box } from "@/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
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
import { Image } from "@/components/ui/image";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Keyboard } from "react-native";
import apiClient from "@/lib/axios";

export default function Login() {
  const router = useRouter();
  const { email: initialEmail } = useLocalSearchParams<{ email: string }>();

  const [formData, setFormData] = useState({
    email: initialEmail || "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [statusModal, setStatusModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error" | "info" | "warning",
  });

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const [loginToastVisible, setLoginToastVisible] = useState(false);
  const [loginToastMessage, setLoginToastMessage] = useState("");
  const [loginToastType, setLoginToastType] = useState<
    "success" | "error" | "info" | "warning"
  >("success");

  // Google OAuth
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId;
  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      clientId: googleClientId,
      androidClientId: googleAndroidClientId,
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
    });

  // Log redirect URI for verification
  useEffect(() => {
    if (googleRequest?.redirectUri) {
      console.log("[Google] redirectUri:", googleRequest.redirectUri);
    }
  }, [googleRequest?.redirectUri]);

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === "error") {
      console.error("[Google] Auth error:", googleResponse.error);
      const message =
        googleResponse.params?.error_description ||
        googleResponse.error?.message ||
        "Google sign-in was cancelled or failed.";
      setStatusModal({
        visible: true,
        title: "Google Sign-In Error",
        message,
        type: "error",
      });
      return;
    }
    if (googleResponse?.type !== "success") return;
    const idToken = googleResponse.params.id_token;
    if (!idToken) {
      console.error("[Google] No id_token in response");
      setStatusModal({
        visible: true,
        title: "Google Sign-In Error",
        message: "Failed to retrieve identity token from Google.",
        type: "error",
      });
      return;
    }

    const handleGoogleToken = async () => {
      try {
        setLoading(true);
        const res = await apiClient.post("/auth/google", { idToken });
        const { accessToken, refreshToken, user } = res.data;

        const store = useAuthStore.getState();
        await store.setSession({ accessToken, refreshToken }, user);
        router.replace("/");
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Google sign-in failed.";
        setStatusModal({
          visible: true,
          title: "Authentication Error",
          message,
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    handleGoogleToken();
  }, [googleResponse, router]);

  // Sync initialEmail if it changes (e.g. returning from signup)
  useEffect(() => {
    if (initialEmail) {
      setFormData((prev) => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail]);

  // Clear validation errors and show pending logout toast when entering the Login screen
  useFocusEffect(
    useCallback(() => {
      setErrors({});

      const LOGIN_TOAST_KEY = "__login_pending_toast__";
      const pending = (globalThis as any)[LOGIN_TOAST_KEY];
      if (pending) {
        (globalThis as any)[LOGIN_TOAST_KEY] = null;
        setLoginToastMessage(pending.message);
        setLoginToastType(pending.type);
        setLoginToastVisible(true);
      }

      return () => {
        setErrors({});
      };
    }, []),
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  /**
   * Validates form fields and populates inline errors.
   * @returns boolean - true if form is valid
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const { email, password } = formData;

    if (!email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = "Invalid email format";
    } else if (email.trim().length > 30) {
      newErrors.email = "Email exceeds maximum length";
    }

    if (!password) {
      newErrors.password = "Please enter your password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // OLD: Supabase email/password login (kept for reference)
  // const handleEmailLogin = async () => {
  //   if (!validateForm()) return;
  //   try {
  //     setLoading(true);
  //     const { data, error } = await supabase.auth.signInWithPassword({
  //       email: formData.email.trim(),
  //       password: formData.password,
  //     });
  //     if (error) {
  //       try {
  //         const { data: emailStatus, error: rpcError } = await supabase.rpc(
  //           "check_email_exists",
  //           { email_to_check: formData.email.trim().toLowerCase() },
  //         );
  //         if (rpcError) throw rpcError;
  //         if (!emailStatus) { setErrors({ email: "User not found" }); }
  //         else { setErrors({ password: "Incorrect Password" }); }
  //       } catch {
  //         setStatusModal({ visible: true, title: "Server Error", message: "Unable to reach the server. Please try again later.", type: "error" });
  //       }
  //       return;
  //     }
  //     if (data.user) {
  //       const { data: profile, error: profileError } = await supabase
  //         .from("profiles").select("is_active, is_blacklist").eq("id", data.user.id).single();
  //       if (profileError && profileError.code !== "PGRST116") throw profileError;
  //       if (profile) {
  //         if (profile.is_active === false && profile.is_blacklist === true) {
  //           await supabase.auth.signOut();
  //           setStatusModal({ visible: true, title: "Account Denied", message: "User is blacklisted. Please Contact Admin", type: "error" });
  //           return;
  //         }
  //         if (profile.is_active === false) {
  //           await supabase.auth.signOut();
  //           setStatusModal({ visible: true, title: "Inactive Account", message: "Account is inactive. Please Contact Admin", type: "warning" });
  //           return;
  //         }
  //       }
  //       router.replace("/");
  //     }
  //   } catch (error: any) {
  //     setStatusModal({ visible: true, title: "Server Error", message: error?.message || "Unable to reach the server. Please try again later.", type: "error" });
  //   } finally { setLoading(false); }
  // };

  // NEW: Backend API email/password login
  const handleEmailLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const store = useAuthStore.getState();
      await store.login(formData.email.trim(), formData.password);

      const user = store.profile;
      if (user) {
        if (user.is_active === false && user.is_blacklist === true) {
          await store.signOut();
          setStatusModal({
            visible: true,
            title: "Account Denied",
            message: "User is blacklisted. Please Contact Admin",
            type: "error",
          });
          return;
        }
        if (user.is_active === false) {
          await store.signOut();
          setStatusModal({
            visible: true,
            title: "Inactive Account",
            message: "Account is inactive. Please Contact Admin",
            type: "warning",
          });
          return;
        }
      }

      router.replace("/");
    } catch (error: any) {
      const msg = error?.message || "Unable to reach the server. Please try again later.";
      if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("not found")) {
        setErrors({ email: "User not found" });
      } else if (msg.toLowerCase().includes("password")) {
        setErrors({ password: "Incorrect Password" });
      } else {
        setStatusModal({
          visible: true,
          title: "Server Error",
          message: msg,
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(async () => {
    if (!googleClientId || googleClientId.startsWith("your_")) {
      setStatusModal({
        visible: true,
        title: "Configuration Needed",
        message:
          "Google Sign-In is not configured yet. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.",
        type: "info",
      });
      return;
    }
    await googlePromptAsync();
  }, [googleClientId, googlePromptAsync]);

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-brand-50"
      edges={["top", "left", "right"]}
    >
      <KeyboardAwareScrollView
        bottomOffset={30}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box className="flex-1 px-8 pt-4 pb-10">
          {/* Header & Logo */}
          <VStack space="xs" className="items-center mb-10">
            <Box className="w-32 h-16 items-center justify-center">
              <Image
                source={require("@/assets/images/icon.png")}
                className="w-[100px] h-[50px]"
                size="none"
                resizeMode="contain"
                alt="App Logo"
              />
            </Box>
            <Divider className="w-24 bg-typography-400 h-[1.5px] mt-1 mb-2" />
            <HStack className="items-center">
              <Text className="text-typography-900 font-bold text-md uppercase tracking-wider">
                Car{" "}
              </Text>
              <Text className="text-brand-700 font-bold text-md uppercase tracking-wider">
                Rental{" "}
              </Text>
              <Text className="text-typography-900 font-bold text-md uppercase tracking-wider">
                App
              </Text>
            </HStack>
          </VStack>

          <Heading
            size="2xl"
            className="text-brand-700 text-center mb-10 font-bold"
          >
            Sign in to your Account
          </Heading>

          <VStack space="lg" className="w-full">
            {/* Email Field */}
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
                className="rounded-lg border-gray-300 bg-transparent h-12 data-[focus=true]:border-sky-500"
              >
                <InputField
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={(val) => handleInputChange("email", val)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="pl-3 ios:leading-tight text-gray-900"
                  maxLength={30}
                />
              </Input>
              {errors.email && (
                <FormControlError>
                  <FormControlErrorIcon as={CircleAlert} />
                  <FormControlErrorText>{errors.email}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Password Field */}
            <FormControl isInvalid={!!errors.password}>
              <FormControlLabel className="mb-2">
                <FormControlLabelText className="text-typography-800 font-semibold text-md">
                  Password <Text className="text-error-500 font-bold">*</Text>
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="md"
                className="rounded-lg border-gray-300 bg-transparent h-12 data-[focus=true]:border-sky-500"
              >
                <InputField
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={(val) => handleInputChange("password", val)}
                  secureTextEntry={!showPassword}
                  autoComplete="off"
                  className="pl-3 ios:leading-tight text-gray-900"
                  style={{ letterSpacing: 0, backgroundColor: "transparent" }}
                />
                <InputSlot className="pr-3" onPress={handleTogglePassword}>
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
                  <FormControlErrorText>{errors.password}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            <Pressable
              className="items-end"
              onPress={() => router.push("./reset-password")}
            >
              <Text className="text-brand-850 font-bold text-md">
                Forgot Password?
              </Text>
            </Pressable>

            {/* Login Button */}
            <Button
              size="lg"
              className={`w-full bg-brand-700 rounded-xl h-14 data-[disabled=true]:bg-brand-700 data-[active=true]:bg-brand-800 ${loading ? "opacity-70" : ""}`}
              onPress={handleEmailLogin}
              isDisabled={loading}
            >
              {loading && <ButtonSpinner className="mr-2" color="white" />}
              <ButtonText className="text-white font-bold text-lg">
                {loading ? "Signing in..." : "Sign In"}
              </ButtonText>
            </Button>
          </VStack>

          {/* Divider */}
          <HStack space="sm" className="items-center my-10">
            <Divider className="flex-1 bg-typography-300 h-[1.5px]" />
            <Text className="text-brand-900 font-semibold px-2 text-md">
              For New Renter
            </Text>
            <Divider className="flex-1 bg-typography-300 h-[1.5px]" />
          </HStack>

          {/* Social Login */}
          <Button
            size="lg"
            variant="outline"
            className="border-typography-400 rounded-none h-14 bg-transparent active:bg-typography-50 border"
            onPress={handleGoogleLogin}
            isDisabled={loading}
          >
            <HStack space="md" className="items-center justify-center">
              <Image
                source={{
                  uri: "https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png",
                }}
                className="w-6 h-6"
                size="none"
                alt="Google Logo"
              />
              <ButtonText className="text-brand-900 font-semibold text-lg">
                Continue with Google
              </ButtonText>
            </HStack>
          </Button>

          {/* Signup Link */}
          <HStack space="xs" className="justify-center mt-10 mb-8 items-center">
            <Text className="text-typography-800 font-semibold text-md">
              Or Create{" "}
            </Text>
            <Pressable onPress={() => router.push("/auth/signup")}>
              <Text className="text-brand-900 font-bold text-md">
                New Account
              </Text>
            </Pressable>
          </HStack>
        </Box>

        <LinearGradient
          colors={[
            "rgba(223,243,251,0)",
            "rgba(223,243,251,0.92)",
            "rgba(223,243,251,1)",
            "rgba(223,243,251,0.85)",
            "rgba(223,243,251,0)",
          ]}
          locations={[0, 0.18, 0.25, 0.82, 1]}
          style={{
            width: "100%",
            paddingTop: 14,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 14,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HStack space="xs" className="justify-center items-center flex-1">
            <CircleAlert size={15} color="#00a8e3" />
            <Text className="text-slate-600 font-medium text-xs">
              Need help? Contact admin for login issues.
            </Text>
          </HStack>

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setIsSupportOpen(true);
            }}
            style={{
              backgroundColor: "#00a8e3",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 4,
            }}
            className="active:opacity-70"
          >
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 10 }}>
              Contact Us
            </Text>
          </Pressable>
        </LinearGradient>
      </KeyboardAwareScrollView>

      <ContactAdminCard
        visible={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <Toast
        visible={loginToastVisible}
        message={loginToastMessage}
        type={loginToastType}
        onClose={() => setLoginToastVisible(false)}
      />

      {/* Premium Status Modal */}
      <CustomAlert
        visible={statusModal.visible}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        actions={[{ text: "Okay" }]}
      />
    </SafeAreaView>
  );
}

// OLD: WebBrowser warmup effect (kept for reference)
// useEffect(() => {
//   WebBrowser.warmUpAsync();
//   return () => { WebBrowser.coolDownAsync(); };
// }, []);

// OLD: parseAuthSessionUrl utility for Google OAuth callback (kept for reference)
// const parseAuthSessionUrl = (url: string) => {
//   const params: Record<string, string> = {};
//   const urlToParse = url.replace("#", "?");
//   const queryParams = urlToParse.split("?")[1] || "";
//   queryParams.split("&").forEach((part) => {
//     const [key, value] = part.split("=");
//     if (key && value) params[key] = value;
//   });
//   return { access_token: params.access_token, refresh_token: params.refresh_token };
// };


