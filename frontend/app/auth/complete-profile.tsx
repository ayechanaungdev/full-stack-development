/*
// ================================================================
// OLD: Complete Profile Screen — uses Supabase (commented out)
// Will migrate to backend API later.
// ================================================================
import CustomAlert from "@/components/app-alert";
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
import nrcData from "@/constants/nrc-data.json";
import yangonTownships from "@/constants/yangon-townships.json";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { AlertCircle, ChevronDown, Eye, EyeOff } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { SelectorModal } from "../../components/SelectorModal";

export default function CompleteProfile() {
  const router = useRouter();
  const { user, profile, fetchProfile, isProfileComplete } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (isProfileComplete()) {
      router.replace("/(protected)/(tabs)");
    }
  }, [profile]);

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleModal = (modal: string, visible: boolean) =>
    setModals((prev) => ({ ...prev, [modal]: visible }));

  const availableNrcTownships =
    nrcData.townships[form.nrcState as keyof typeof nrcData.townships] || [];

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || "User";
  const displayEmail = user?.email || "";

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const { phone, nrcNumber, password, confirmPassword, township, address } = form;

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

  const handleCompleteProfile = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", form.phone.trim())
        .neq("id", user?.id)
        .maybeSingle();

      if (existingPhone) {
        setErrors((prev) => ({
          ...prev,
          phone: "This phone number is already registered.",
        }));
        setLoading(false);
        return;
      }

      const fullNrc = `${form.nrcState}/${form.nrcTownship}(${form.nrcType})${form.nrcNumber}`;
      const { data: existingNrc } = await supabase
        .from("profiles")
        .select("id")
        .eq("nrc", fullNrc)
        .neq("id", user?.id)
        .maybeSingle();

      if (existingNrc) {
        setErrors((prev) => ({
          ...prev,
          nrcNumber: "This NRC number is already registered.",
        }));
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: form.phone.trim(),
          nrc: fullNrc,
          gender: form.gender,
          postal_code: form.township,
          location: form.address,
          is_active: true,
        })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      if (form.password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: form.password,
        });
        if (authError) throw authError;
      }

      await fetchProfile(user!.id);
      setStatusModal({
        visible: true,
        title: "Success!",
        message: "Profile completed! Welcome aboard.",
        type: "success",
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        title: "Update Failed",
        message: error.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [form, user, fetchProfile, router]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-brand-50">
      <KeyboardAwareScrollView>
        <Box className="flex-1 px-4 pt-14 pb-10">
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
              <Text className="text-typography-900 font-bold text-md uppercase tracking-wider">Car </Text>
              <Text className="text-brand-700 font-bold text-md uppercase tracking-wider">Rental </Text>
              <Text className="text-typography-900 font-bold text-md uppercase tracking-wider">App</Text>
            </HStack>
          </VStack>
          <VStack space="md" className="mt-8 mb-6 items-center">
            <Heading size="2xl" className="text-brand-700 text-center">Welcome!</Heading>
            <VStack space="xs" className="items-start w-full px-2 mt-3">
              <HStack className="items-center">
                <Text className="text-xl font-bold text-typography-800">Hello, </Text>
                <Text className="text-xl font-bold text-brand-800">{displayName}!</Text>
              </HStack>
              <Text className="text-typography-500 text-left text-lg mt-2">
                You've successfully registered with {"\n"}
                <Text className="text-brand-800 font-semibold mt-2">{displayEmail}.</Text>
              </Text>
            </VStack>
          </VStack>

          <VStack space="sm">
            <Heading size="md" className="text-typography-700 font-bold ml-2 mb-2">Complete your profile.</Heading>
            <Box className="bg-white/80 rounded-2xl shadow-sm border border-typography-100 overflow-hidden">
              <VStack className="p-6" space="lg">
                <FormControl isInvalid={!!errors.phone}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Phone Number <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input variant="outline" size="md" className="rounded-lg border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700">
                    <InputField
                      placeholder="Enter your phone number" placeholderTextColor="#9CA3AF"
                      value={form.phone} onChangeText={(val) => updateForm("phone", val)}
                      keyboardType="phone-pad" maxLength={11}
                      className="pl-3 ios:leading-tight text-typography-900"
                    />
                  </Input>
                  {errors.phone && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>{errors.phone}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>
              </VStack>
            </Box>
            <Button size="lg" className="bg-brand-700 rounded-xl h-14" onPress={handleCompleteProfile} isDisabled={loading}>
              {loading && <ButtonSpinner className="mr-2" color="white" />}
              <ButtonText className="text-white font-bold text-lg">{loading ? "Registering..." : "Register"}</ButtonText>
            </Button>
          </VStack>
        </Box>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
// ================================================================
// END: Old Supabase Complete Profile
// ================================================================
*/

// NEW: Backend API — redirect to main app (profile completion handled separately)
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function CompleteProfile() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(protected)/(tabs)");
  }, []);

  return null;
}
