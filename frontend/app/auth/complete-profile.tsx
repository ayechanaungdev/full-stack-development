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

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Main Form State
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

  // Auto-redirect if profile is already complete
  useEffect(() => {
    if (isProfileComplete()) {
      router.replace("/(protected)/(tabs)");
    }
  }, [profile]);

  /**
   * Update individual form field and clear its error
   * @param field Field name to update
   * @param value New value for the field
   */
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

  /**
   * Toggle modal visibility
   * @param modal Modal name to toggle
   * @param visible Visibility status
   */
  const toggleModal = (modal: string, visible: boolean) =>
    setModals((prev) => ({ ...prev, [modal]: visible }));

  // Computed: Available NRC Townships based on selected NRC State
  const availableNrcTownships =
    nrcData.townships[form.nrcState as keyof typeof nrcData.townships] || [];

  // Display User Metadata
  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || "User";
  const displayEmail = user?.email || "";

  /**
   * Robust Form Validation
   * Checks for required fields, valid phone, and password match.
   */
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

  /**
   * Handle Profile Completion Process
   * Performs uniqueness checks and updates profile/auth data.
   */
  const handleCompleteProfile = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // 1. Check if Phone Number already exists
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", form.phone.trim())
        .neq("id", user?.id) // Exclude current user
        .maybeSingle();

      if (existingPhone) {
        setErrors((prev) => ({
          ...prev,
          phone: "This phone number is already registered.",
        }));
        setLoading(false);
        return;
      }

      // 2. Check if NRC already exists
      const fullNrc = `${form.nrcState}/${form.nrcTownship}(${form.nrcType})${form.nrcNumber}`;
      const { data: existingNrc } = await supabase
        .from("profiles")
        .select("id")
        .eq("nrc", fullNrc)
        .neq("id", user?.id) // Exclude current user
        .maybeSingle();

      if (existingNrc) {
        setErrors((prev) => ({
          ...prev,
          nrcNumber: "This NRC number is already registered.",
        }));
        setLoading(false);
        return;
      }

      // 3. Update Profile In Supabase
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

      // 4. Update Password in Supabase Auth
      if (form.password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: form.password,
        });
        if (authError) throw authError;
      }

      // 5. Finalize and Redirect
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
      <KeyboardAwareScrollView
        bottomOffset={30}
        style={{ flex: 1 }}
        className="bg-brand-50"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box className="flex-1 px-4 pt-14 pb-10">
          {/* Header Section */}
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
          </VStack>

          {/* Welcome Section */}
          <VStack space="md" className="mt-8 mb-6 items-center">
            <Heading size="2xl" className="text-brand-700 text-center">
              Welcome!
            </Heading>
            <VStack space="xs" className="items-start w-full px-2 mt-3">
              <HStack className="items-center">
                <Text className="text-xl font-bold text-typography-800">
                  Hello,{" "}
                </Text>
                <Text className="text-xl font-bold text-brand-800">
                  {displayName}!
                </Text>
              </HStack>
              <Text className="text-typography-500 text-left text-lg mt-2">
                You've successfully registered with {"\n"}
                <Text className="text-brand-800 font-semibold mt-2">
                  {displayEmail}.
                </Text>
              </Text>
            </VStack>
          </VStack>

          <VStack space="sm">
            <Heading
              size="md"
              className="text-typography-700 font-bold ml-2 mb-2"
            >
              Complete your profile.
            </Heading>

            <Box className="bg-white/80 rounded-2xl shadow-sm border border-typography-100 overflow-hidden">
              <VStack className="p-6" space="lg">
                {/* Phone Number */}
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

                {/* NRC Number */}
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
                          {form.nrcState}
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
                          {form.nrcTownship}
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
                          ({form.nrcType})
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

                {/* Gender */}
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
                          className={`w-6 h-6 rounded-full border-2 items-center justify-center ${form.gender === g ? "border-sky-500" : "border-typography-300"}`}
                        >
                          {form.gender === g && (
                            <Box className="w-3 h-3 rounded-full bg-brand-500" />
                          )}
                        </Box>
                        <Text className="ml-2 font-semibold text-typography-700">
                          {g}
                        </Text>
                      </Pressable>
                    ))}
                  </HStack>
                </FormControl>

                {/* Password */}
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
                      style={{ letterSpacing: 0 }}
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

                {/* Confirm Password */}
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
                      placeholder="Enter your confirm password"
                      placeholderTextColor="#9CA3AF"
                      value={form.confirmPassword}
                      onChangeText={(val) => updateForm("confirmPassword", val)}
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="off"
                      maxLength={20}
                      className="pl-3 ios:leading-tight text-typography-900"
                      style={{ letterSpacing: 0 }}
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

                {/* Township */}
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

                {/* Address */}
                <FormControl isInvalid={!!errors.address}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Address{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Textarea className="rounded-lg border-typography-300 bg-white h-32 data-[focus=true]:border-brand-700">
                    <TextareaInput
                      placeholder="Enter your detail address"
                      value={form.address}
                      onChangeText={(val) => updateForm("address", val)}
                      maxLength={50}
                      className="pl-3 text-sm ios:leading-tight text-typography-900"
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

            {/* Register Button */}
            <VStack className="mt-6" space="lg">
              <Button
                size="lg"
                className={`bg-brand-700 rounded-xl h-14 data-[disabled=true]:bg-brand-700 data-[active=true]:bg-brand-800 ${loading ? "opacity-70" : ""}`}
                onPress={handleCompleteProfile}
                isDisabled={loading}
              >
                {loading && <ButtonSpinner className="mr-2" color="white" />}
                <ButtonText className="text-white font-bold text-lg">
                  {loading ? "Registering..." : "Register"}
                </ButtonText>
              </Button>
            </VStack>
          </VStack>
        </Box>

        {/* Shared Modals */}
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
          onSelect={(v: string) => {
            updateForm("nrcTownship", v);
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
                if (statusModal.title.includes("Success")) {
                  router.replace("/(protected)/(tabs)");
                }
              },
            },
          ]}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
