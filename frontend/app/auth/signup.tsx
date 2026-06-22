import nrcData from "@/constants/nrc-data.json";
import yangonTownships from "@/constants/yangon-townships.json";
import apiClient from "@/lib/axios";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowUpCircle,
  ChevronDown,
  Eye,
  EyeOff,
  User as UserIcon,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

// Gluestack UI Components
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
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { VStack } from "@/components/ui/vstack";

import CustomAlert from "@/components/app-alert";
import { SelectorModal } from "../../components/SelectorModal";

export default function Signup() {
  const router = useRouter();
  const { setAvatarUri, avatarUri } = useAuthStore();

  // UI Loading State
  const [loading, setLoading] = useState(false);

  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initial Form State

  const initialFormState = {
    fullName: "",
    email: "",
    phone: "",
    gender: "Male",
    password: "",
    confirmPassword: "",
    township: "",
    address: "",
    nrcState: "1",
    nrcTownship: "AhGaYa",
    nrcType: "N",
    nrcNumber: "",
  };

  // Main Form State

  const [form, setForm] = useState(initialFormState);

  // Validation Error State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal Visibility states
  const [modals, setModals] = useState({
    state: false,
    nrcTownship: false,
    type: false,
    township: false,
  });

  const [statusModal, setStatusModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error" | "info" | "warning",
  });

  // Focus Effect: Reset Form on Screen Entry

  useFocusEffect(
    useCallback(() => {
      setForm(initialFormState);
      setErrors({});
      setAvatarUri(null);
    }, [setAvatarUri]),
  );

  // Update Form Field
  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Toggle Modal Visibility
  const toggleModal = (modal: string, visible: boolean) => {
    setModals((prev) => ({ ...prev, [modal]: visible }));
  };

  // Computed: Available Townships for selected NRC State
  const availableNrcTownships =
    nrcData.townships[form.nrcState as keyof typeof nrcData.townships] || [];

  // Pick Image from Gallery or Camera
  const pickImage = async (useCamera: boolean = false) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setStatusModal({
          visible: true,
          title: "Permission Required",
          message: `Please allow ${useCamera ? "camera" : "gallery"} access to upload your avatar index.`,
          type: "warning",
        });
        return;
      }

      const pickerAction = useCamera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

      const result = await pickerAction({
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        // File size validation (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
        if (asset.fileSize && asset.fileSize > MAX_SIZE) {
          setStatusModal({
            visible: true,
            title: "File Too Large",
            message: "Image size must be less than 5MB.",
            type: "warning",
          });
          return;
        }
        setAvatarUri(asset.uri, asset.base64 || null);
      }
    } catch (error) {
      setStatusModal({
        visible: true,
        title: "Error",
        message: "Could not pick image. Please try again.",
        type: "error",
      });
    }
  };

  // Robust Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const {
      fullName,
      email,
      phone,
      nrcNumber,
      password,
      confirmPassword,
      township,
      address,
    } = form;

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    if (!nrcNumber.trim()) newErrors.nrcNumber = "NRC number is required";
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(
        password,
      )
    ) {
      newErrors.password =
        "Password must include uppercase, lowercase, number and special character";
    }

    if (!confirmPassword)
      newErrors.confirmPassword = "Confirm Password is required";
    if (!township) newErrors.township = "Township selection is required";
    if (!address.trim()) newErrors.address = "Address is required";

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (phone && !phone.trim().startsWith("09")) {
      newErrors.phone = "Phone number must start with 09";
    } else if (phone && phone.trim().length < 9) {
      newErrors.phone = "Phone number is too short";
    } else if (phone && phone.trim().length > 11) {
      newErrors.phone = "Phone number should not exceed 11 digits";
    } else if (phone && phone.trim().length === 11 && !/^09\d{9}$/.test(phone.trim())) {
      newErrors.phone = "Please enter a valid Myanmar phone number (e.g. 09xxxxxxxxx)";
    }

    if (password && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (nrcNumber && !/^\d+$/.test(nrcNumber)) {
      newErrors.nrcNumber = "NRC must be digit only";
    } else if (nrcNumber && nrcNumber.length !== 6) {
      newErrors.nrcNumber = "NRC number must be exactly 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ================================================================
  // OLD SUPABASE SIGNUP (kept for reference)
  // ================================================================
  // const handleSignup = useCallback(async () => {
  //   if (!validateForm()) return;
  //   try {
  //     setLoading(true);
  //     const { data: emailStatus, error: rpcError } = await supabase.rpc(
  //       "check_email_exists",
  //       { email_to_check: form.email.trim().toLowerCase() },
  //     );
  //     if (emailStatus === 1) {
  //       const { data: profileData } = await supabase
  //         .from("profiles")
  //         .select("is_blacklisted")
  //         .eq("email", form.email.trim().toLowerCase())
  //         .maybeSingle();
  //       if (profileData?.is_blacklisted) {
  //         setErrors((prev) => ({ ...prev, email: "The account is restricted." }));
  //       } else {
  //         setErrors((prev) => ({ ...prev, email: "This email is already registered and verified." }));
  //       }
  //       setLoading(false);
  //       return;
  //     }
  //     const { data: existingPhone } = await supabase
  //       .from("profiles")
  //       .select("id")
  //       .eq("phone", form.phone.trim())
  //       .maybeSingle();
  //     if (existingPhone) {
  //       setErrors((prev) => ({ ...prev, phone: "This phone number is already registered." }));
  //       setLoading(false);
  //       return;
  //     }
  //     const fullNrc = `${form.nrcState}/${form.nrcTownship}(${form.nrcType})${form.nrcNumber}`;
  //     const { data: existingNrc } = await supabase
  //       .from("profiles")
  //       .select("id")
  //       .eq("nrc", fullNrc)
  //       .maybeSingle();
  //     if (existingNrc) {
  //       setErrors((prev) => ({ ...prev, nrcNumber: "This NRC number is already registered." }));
  //       setLoading(false);
  //       return;
  //     }
  //     const { data, error } = await supabase.auth.signUp({
  //       email: form.email.trim().toLowerCase(),
  //       password: form.password,
  //       options: {
  //         data: {
  //           full_name: form.fullName,
  //           phone: form.phone,
  //           nrc: fullNrc,
  //           gender: form.gender,
  //           postal_code: form.township,
  //           location: form.address,
  //           role: "renter",
  //         },
  //       },
  //     });
  //     if (error) throw error;
  //     if (data.user) {
  //       const isRecovery = emailStatus === 2;
  //       setStatusModal({
  //         visible: true,
  //         title: isRecovery ? "Welcome Back!" : "Success",
  //         message: isRecovery
  //           ? "You have a pending registration! We've sent a new code. Please note your originally entered details will be kept."
  //           : "Account created! Check your email for the 6-digit code.",
  //         type: "success",
  //       });
  //     }
  //   } catch (error: any) {
  //     if (error.message && error.message.toLowerCase().includes("phone")) {
  //       setErrors((prev) => ({ ...prev, phone: error.message }));
  //     } else {
  //       setStatusModal({
  //         visible: true,
  //         title: "Signup Failed",
  //         message: error.message || "An unexpected error occurred.",
  //         type: "error",
  //       });
  //     }
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [form, avatarUri, router]);
  // ================================================================
  // END OLD SUPABASE SIGNUP
  // ================================================================

  // Handle Signup Process
  const handleSignup = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const fullNrc = `${form.nrcState}/${form.nrcTownship}(${form.nrcType})${form.nrcNumber}`;

      await apiClient.post("/auth/signup", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.fullName,
        phone: form.phone,
        gender: form.gender,
        nrc: fullNrc,
        postal_code: form.township,
        location: form.address,
        role: "renter",
      });

      setStatusModal({
        visible: true,
        title: "Success",
        message: "Account created! Check your email for the 6-digit code.",
        type: "success",
      });
    } catch (error: any) {
      const rawMessage = error.response?.data?.message || error.message || "An unexpected error occurred.";
      const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : String(rawMessage);

      if (message.toLowerCase().includes("phone")) {
        setErrors((prev) => ({
          ...prev,
          phone: message,
        }));
      } else if (message.toLowerCase().includes("email")) {
        setErrors((prev) => ({
          ...prev,
          email: message,
        }));
      } else {
        setStatusModal({
          visible: true,
          title: "Signup Failed",
          message,
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [form, router]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-brand-50">
      <KeyboardAwareScrollView
        bottomOffset={30}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box className="flex-1 px-4 pt-4 pb-10">
          <VStack space="xs" className="items-center">
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
            <Heading
              size="2xl"
              className="text-brand-700 font-bold my-6 text-center"
            >
              Create Account
            </Heading>
          </VStack>

          <VStack space="sm">
            <Box className="bg-white/80 rounded-2xl shadow-sm border border-typography-100 p-6">
              <HStack className="items-center gap-10 mx-6 py-2">
                <Pressable
                  onPress={() => pickImage(true)}
                  className="active:opacity-80"
                >
                  <Box className="w-24 h-24 rounded-full border-4 border-brand-700 overflow-hidden bg-brand-100 justify-center items-center shadow-lg">
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        className="w-full h-full"
                        alt="Avatar Preview"
                      />
                    ) : (
                      <UserIcon size={48} color="#16a8e3" strokeWidth={1.5} />
                    )}
                  </Box>
                </Pressable>

                <Button
                  variant="outline"
                  action="secondary"
                  size="md"
                  className="border-brand-400 bg-brand-50 rounded-2xl px-5 h-12 flex-row items-center justify-center"
                  onPress={() => pickImage(false)}
                >
                  <Icon
                    as={ArrowUpCircle}
                    color="#0c6081"
                    className="mr-2"
                    size="xl"
                  />
                  <ButtonText className="text-typography-900 font-medium text-base">
                    Upload
                  </ButtonText>
                </Button>
              </HStack>
            </Box>

            <Box className="bg-white/80 rounded-2xl shadow-sm border border-typography-100 overflow-hidden">
              <VStack className="p-6" space="lg">
                <FormControl isInvalid={!!errors.fullName}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Full Name{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
                  >
                    <InputField
                      placeholder="Enter your full name"
                      placeholderTextColor="#9CA3AF"
                      value={form.fullName}
                      onChangeText={(val) => updateForm("fullName", val)}
                      maxLength={20}
                      className="pl-3 ios:leading-tight text-typography-900"
                    />
                  </Input>
                  {errors.fullName && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.fullName}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.email}>
                  <FormControlLabel>
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
                      value={form.email}
                      onChangeText={(val) => updateForm("email", val)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      maxLength={30}
                      className="pl-3 ios:leading-tight text-typography-900"
                    />
                  </Input>
                  {errors.email && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.email}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.phone}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Phone Number{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
                  >
                    <InputField
                      placeholder="Enter your phone number"
                      placeholderTextColor="#9CA3AF"
                      value={form.phone}
                      onChangeText={(val) => updateForm("phone", val)}
                      keyboardType="phone-pad"
                      maxLength={11}
                      className="pl-3 ios:leading-tight text-typography-900"
                    />
                  </Input>
                  {errors.phone && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.phone}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.nrcNumber}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      NRC Number{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>

                  <HStack space="xs" className="items-center">
                    <Pressable
                      onPress={() => toggleModal("state", true)}
                      className="flex-[1.2] bg-white border border-typography-300 rounded-lg h-12 justify-center shadow-sm"
                    >
                      <HStack className="items-center justify-center space-x-1 px-1">
                        <Text className="text-typography-800 text-sm">
                          {form.nrcState || "1"}
                        </Text>
                        <Icon as={ChevronDown} size="xs" color="#64748B" />
                      </HStack>
                    </Pressable>
                    <Text className="text-typography-800 text-lg">/</Text>
                    <Pressable
                      onPress={() => toggleModal("nrcTownship", true)}
                      className="flex-[2.5] bg-white border border-typography-300 rounded-lg h-12 justify-center shadow-sm"
                    >
                      <HStack className="items-center justify-between px-2">
                        <Text
                          className="text-typography-800 text-[10px]"
                          numberOfLines={1}
                        >
                          {form.nrcTownship || "AhGaYa"}
                        </Text>
                        <Icon as={ChevronDown} size="xs" color="#64748B" />
                      </HStack>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleModal("type", true)}
                      className="flex-[1.8] bg-white border border-typography-300 rounded-lg h-12 justify-center shadow-sm"
                    >
                      <HStack className="items-center justify-center space-x-1 px-1">
                        <Text className="text-typography-800 text-xs">
                          ({form.nrcType || "N"})
                        </Text>
                        <Icon as={ChevronDown} size="xs" color="#64748B" />
                      </HStack>
                    </Pressable>
                    <Input
                      variant="outline"
                      className={`flex-[2.5] bg-white border border-typography-300 rounded-lg h-12 shadow-sm data-[focus=true]:border-brand-700 ${errors.nrcNumber ? "border-error-500" : ""}`}
                    >
                      <InputField
                        placeholder="123456"
                        placeholderTextColor="#9CA3AF"
                        value={form.nrcNumber}
                        onChangeText={(val) => updateForm("nrcNumber", val)}
                        keyboardType="number-pad"
                        maxLength={6}
                        className="text-sm text-typography-800 text-center ios:leading-tight text-typography-900"
                      />
                    </Input>
                  </HStack>
                  {errors.nrcNumber && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.nrcNumber}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Gender <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <HStack space="xl" className="mt-1">
                    {["Male", "Female"].map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => updateForm("gender", g)}
                        className="flex-row items-center"
                      >
                        <Box
                          className={`w-5 h-5 rounded-full border-2 items-center justify-center ${form.gender === g ? "border-brand-700" : "border-typography-300"}`}
                        >
                          {form.gender === g && (
                            <Box className="w-2.5 h-2.5 rounded-full bg-brand-700" />
                          )}
                        </Box>
                        <Text className="ml-2 font-semibold text-typography-700">
                          {g}
                        </Text>
                      </Pressable>
                    ))}
                  </HStack>
                </FormControl>

                <FormControl isInvalid={!!errors.password}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Password <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
                  >
                    <InputField
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={form.password}
                      onChangeText={(val) => updateForm("password", val)}
                      secureTextEntry={!showPassword}
                      autoComplete="off"
                      maxLength={20}
                      className="pl-3 ios:leading-tight text-typography-900"
                      style={{
                        letterSpacing: 0,
                        backgroundColor: "transparent",
                      }}
                    />
                    <InputSlot
                      className="pr-3"
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <InputIcon
                        as={showPassword ? Eye : EyeOff}
                        color="#4B5563"
                        size="sm"
                      />
                    </InputSlot>
                  </Input>
                  {errors.password && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.password}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.confirmPassword}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Confirm Password{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700"
                  >
                    <InputField
                      placeholder="Confirm your password"
                      placeholderTextColor="#9CA3AF"
                      value={form.confirmPassword}
                      onChangeText={(val) => updateForm("confirmPassword", val)}
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="off"
                      maxLength={20}
                      className="pl-3 ios:leading-tight text-typography-900"
                      style={{
                        letterSpacing: 0,
                        backgroundColor: "transparent",
                      }}
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

                <FormControl isInvalid={!!errors.township}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Township <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Pressable
                    onPress={() => toggleModal("township", true)}
                    className={`border rounded-lg bg-white px-4 h-12 justify-center ${errors.township ? "border-error-500" : "border-typography-300"}`}
                  >
                    <HStack className="items-center justify-between">
                      <Text
                        className={
                          form.township
                            ? "text-typography-800"
                            : "text-typography-400"
                        }
                      >
                        {yangonTownships.find(
                          (t) => t.postalCode === form.township,
                        )?.name || "Select your township name"}
                      </Text>
                      <Icon as={ChevronDown} size="md" color="#9CA3AF" />
                    </HStack>
                  </Pressable>
                  {errors.township && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.township}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <FormControl isInvalid={!!errors.address}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Address{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Textarea className="rounded-lg border-typography-300 bg-white h-24 data-[focus=true]:border-brand-700">
                    <TextareaInput
                      placeholder="Enter your detailed address"
                      value={form.address}
                      onChangeText={(val) => updateForm("address", val)}
                      maxLength={50}
                      className="pl-3 text-sm ios:leading-tight"
                    />
                  </Textarea>
                  {errors.address && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.address}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>
              </VStack>
            </Box>

            {/* Outside Card Elements */}
            <VStack className="mt-4" space="lg">
              <Button
                size="lg"
                className={`bg-brand-700 rounded-xl h-14 data-[disabled=true]:bg-brand-700 data-[active=true]:bg-brand-800 ${loading ? "opacity-70" : ""}`}
                onPress={handleSignup}
                isDisabled={loading}
              >
                {loading && <ButtonSpinner className="mr-2" color="white" />}
                <ButtonText className="text-white font-bold text-lg">
                  {loading ? "Creating Account..." : "Sign up"}
                </ButtonText>
              </Button>

              <VStack className="items-center mt-2 pb-4">
                <Divider className="w-full bg-typography-300 h-[1.5px] mb-6" />
                <HStack space="xs" className="items-center">
                  <Text className="text-brand-900 font-bold text-md">
                    Already have an account?{" "}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace("/auth/login");
                      }
                    }}
                  >
                    <Text className="text-brand-700 font-bold text-md underline">
                      Sign In
                    </Text>
                  </Pressable>
                </HStack>
              </VStack>
            </VStack>
          </VStack>
        </Box>

        {/* Selector Modals with Selected Value Highlights */}
        <SelectorModal
          visible={modals.state}
          onClose={() => toggleModal("state", false)}
          options={nrcData.states}
          selectedValue={form.nrcState}
          onSelect={(val: string) => {
            updateForm("nrcState", val);
            const stateTownships =
              nrcData.townships[val as keyof typeof nrcData.townships] || [];
            if (stateTownships.length > 0) {
              updateForm("nrcTownship", stateTownships[0]);
            }
            toggleModal("state", false);
          }}
          title="Select NRC State"
        />
        <SelectorModal
          visible={modals.nrcTownship}
          onClose={() => toggleModal("nrcTownship", false)}
          options={availableNrcTownships}
          selectedValue={form.nrcTownship}
          onSelect={(val: string) => {
            updateForm("nrcTownship", val);
            toggleModal("nrcTownship", false);
          }}
          title="Select NRC Township"
        />
        <SelectorModal
          visible={modals.type}
          onClose={() => toggleModal("type", false)}
          options={nrcData.types}
          selectedValue={form.nrcType}
          onSelect={(v: string) => {
            updateForm("nrcType", v);
            toggleModal("type", false);
          }}
          title="Select Identity Type"
        />
        <SelectorModal
          visible={modals.township}
          onClose={() => toggleModal("township", false)}
          options={yangonTownships}
          labelField="name"
          selectedValue={
            yangonTownships.find((t) => t.postalCode === form.township)?.name
          }
          onSelect={(v: any) => {
            updateForm("township", v.postalCode);
            toggleModal("township", false);
          }}
          title="Select Township"
        />

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
                if (statusModal.type === "success") {
                  router.push({
                    pathname: "/auth/verify",
                    params: { email: form.email },
                  });
                }
              },
            },
          ]}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
