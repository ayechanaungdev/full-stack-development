import {
  Radio,
  RadioGroup,
  RadioIcon,
  RadioIndicator,
  RadioLabel,
} from "@/components/ui/radio";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AlertCircle,
  ArrowUpCircle,
  ChevronDown,
  Image as ImageIcon,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";

// Constants
import { BackButton } from "@/components/BackButton";
import nrcData from "@/constants/nrc-data.json";
import yangonTownships from "@/constants/yangon-townships.json";

import { SelectorModal } from "../../../components/SelectorModal";
import CustomAlert from "../../../components/app-alert";

// Gluestack UI Components
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
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
import { CircleIcon, Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export default function DriverRegistrationForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const navigation = useNavigation();
  const [isExiting, setIsExiting] = useState(false);
  const [error, setIsError] = useState({
    name: "",
    phone: "",
    nrcState: "",
    nrcTownship: "AhGaYa",
    nrcType: "N",
    nrcNumber: "",
    gender: "",
    township: "",
    address: "",
    profile_url: null,
    licenseType: "",
    licenseNumber: "",
    licenseYear: "",
    license_url: null,
  });

  // Consolidated State - Removed duplicate fields
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    nrcState: "1",
    nrcTownship: "AhGaYa",
    nrcType: "N",
    nrcNumber: "",
    gender: "", // Changed from "Male" to empty string for no initial selection
    township: "",
    address: "",
    profile_url: null as string | null,
    licenseType: "B",
    licenseNumber: "",
    licenseYear: "",
    license_url: null as string | null,
  });

  // Modal State
  const [modals, setModals] = useState({
    nrcState: false,
    nrcTownship: false,
    nrcType: false,
    township: false,
    licenseType: false,
  });

  // Update the state declaration at the top
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "warning" as "success" | "error" | "warning" | "info",
    actions: [] as any[],
  });

  // Helper to show the alert
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    actions: {
      text: string;
      onPress?: () => void;
      type?: "cancel" | "default";
    }[] = [],
  ) => {
    // If no actions are provided, default to a single "OK" button
    const finalActions =
      actions.length > 0
        ? actions
        : [{ text: "OK", onPress: () => { }, type: "default" as const }];

    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      actions: finalActions,
    });
  };

  const validateField = (field: string, value: string, maxLength: number) => {
    let error = "";
    if (field === "name") {
      if (!value.trim()) {
        error = "Please enter Driver's Name (alphabetic character)";
      } else if (value.length > 20) {
        error = "Do not enter more than the maximum number of characters";
      } else if (!/^[a-zA-Z\s]+$/.test(value)) {
        error = "Please enter Driver's Name (alphabetic character)";
      }
    } else if (field === "phone") {
      if (!value.trim()) {
        error = "Please enter PhoneNumber (e.g., 09784326789)";
      } else if (!value.startsWith("09")) {
        error = "Please enter PhoneNumber (e.g., 09784326789)";
      } else if (value.length > 11) {
        error = "Do not enter more than the maximum number of characters";
      } else if (value.length === 11 && !/^09\d{9}$/.test(value)) {
        error = "Invalid phone number format";
      }
    } else if (field === "nrcNumber") {
      if (!value.trim()) {
        error = "Please enter Driver's NRC Number";
      } else if (value.length !== 6) {
        error = "NRC number must be exactly 6 digits";
      } else if (!/^\d{6}$/.test(value)) {
        error = "Invalid NRC number format";
      }
    } else if (field === "address") {
      if (value && value.trim()) {
        if (value.length > 100) {
          error = "Do not enter more than the maximum number of characters";
        }
      }
    } else if (field === "licenseNumber") {
      if (!value.trim()) {
        error = "Please enter Driver's License Number";
      } else if (value.length < 5) {
        error = "License number must be exactly 5 digits";
      } else if (value.length > 5) {
        error = "License number must be exactly 5 digits";
      } else if (!/^\d{5}$/.test(value)) {
        error = "License number must contain only digits";
      }
    } else if (field === "licenseYear") {
      if (!value.trim()) {
        error = "Please enter Driver's License Year";
      } else if (value.length !== 2) {
        error = "License Year must be exactly 2 digits";
      } else if (!/^\d{2}$/.test(value)) {
        error = "License Year must contain only digits";
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };
  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    setErrors((prev) => {
      if (!prev[field]) return prev; // no error, skip

      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };
  const toggleModal = (modal: string, visible: boolean) => {
    setModals((prev) => ({ ...prev, [modal]: visible }));
  };
  const pickImage = async (type: "profile" | "license") => {
    const field = type === "profile" ? "profile_url" : "license_url";
    const fieldName = type === "profile" ? "Profile" : "License";

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Permission Required",
          "We need gallery access to upload your photos.",
          "info",
        );
        return;
      }

      setIsUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        aspect: type === "profile" ? [1, 1] : [16, 9],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const fileExtension = uri.split(".").pop()?.toLowerCase() || "";

        // Validation 1: Check for SVG
        const isSvg =
          fileExtension === "svg" || asset.mimeType === "image/svg+xml";

        if (isSvg) {
          setErrors((prev) => ({
            ...prev,
            [field]: "Can upload only JPG, JPEG, or PNG files.",
          }));
          updateForm(field, null);
          showAlert(
            "Format Error",
            "Can upload only JPG, JPEG, or PNG files.",
            "error",
          );

          return;
        }

        // Validation 2: Check allowed formats
        const allowedFormats = ["jpg", "jpeg", "png"];
        if (!allowedFormats.includes(fileExtension)) {
          setErrors((prev) => ({
            ...prev,
            [field]: "Can upload only JPG, JPEG, or PNG files.",
          }));
          updateForm(field, null);
          showAlert(
            "Invalid Format",
            "Can upload only JPG, JPEG, or PNG files.",
            "error",
          );

          return;
        }

        // Validation 3: Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          setErrors((prev) => ({
            ...prev,
            [field]: "Image size must be less than 5MB.",
          }));
          updateForm(field, null);
          showAlert(
            "File Too Large",
            "Image size must be less than 5MB.",
            "error",
          );
          return;
        }

        // Success - Clear error and update form SILENTLY
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
        updateForm(field, uri);

        // Success Alert Removed as requested
      }
    } catch (error: any) {
      if (error.message && error.message.includes("Uri lacks 'file' scheme")) {
        showAlert(
          "Format Error",
          "Can upload only JPG, JPEG, or PNG files.",
          "error",
        );
      } else {
        console.error("Picker error:", error);
        showAlert(
          "Error",
          "Something went wrong while picking the image.",
          "error",
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const pickProfileImage = () => pickImage("profile");
  const pickLicenseImage = () => pickImage("license");

  // Add this helper function
  const uploadToSupabase = async (uri: string, bucketName: string) => {
    const extension = uri.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${extension}`;

    const formData = new FormData();
    formData.append("file", {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      name: fileName,
      type: `image/${extension === "png" ? "png" : "jpeg"}`,
    } as any);

    // 1. Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, formData, {
        contentType: `image/${extension === "png" ? "png" : "jpeg"}`,
        upsert: true,
      });

    if (error) throw error;

    // 2. Create a Signed URL (e.g., valid for 1 year = 31536000 seconds)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);

    if (signedError) throw signedError;

    return signedData.signedUrl; // This URL will now work even if the bucket is private
  };

  // Validation Functions - Now returns error messages instead of showing alerts
  const validateStep1 = () => {
    const { name, phone, nrcNumber, gender, township, address } = formData;
    const alphabeticRegex = /^[a-zA-Z\s]+$/;
    const newErrors: any = {};

    if (!name || !name.trim()) {
      newErrors.name = "Please enter Driver's Name (alphabetic character)";
    } else if (!alphabeticRegex.test(name)) {
      newErrors.name = "Please enter Driver's Name (alphabetic character)";
    } else if (name.length > 20) {
      newErrors.name =
        "Do not enter more than the maximum number of characters";
    }

    if (!phone || !phone.trim()) {
      newErrors.phone = "Please enter PhoneNumber (e.g., 09784326789)";
    } else {
      const cleanPhone = phone.replace(/\D/g, "");

      // 1. Check if it starts with 09
      if (!cleanPhone.startsWith("09")) {
        newErrors.phone = "Please enter PhoneNumber (e.g., 09784326789)";
      }
      // 2. Check if it's less than 9 digits
      else if (cleanPhone.length < 9) {
        newErrors.phone = "Phone number is too short. ";
      }
      // 3. Check if it's greater than 11 digits
      else if (cleanPhone.length > 11) {
        newErrors.phone =
          "Phone number is too long. It must be within 11 digits.";
      }
    }

    if (!nrcNumber) {
      newErrors.nrcNumber = "Please enter Driver's NRC Number";
    } else if (nrcNumber.length !== 6) {
      newErrors.nrcNumber = "NRC number must be exactly 6 digits";
    }

    if (!gender) {
      newErrors.gender = "Please select Gender";
    }

    if (!formData.township || formData.township.trim() === "") {
      newErrors.township = "Please select Driver's Township";
    }

    if (!address || !address.trim()) {
      newErrors.address = "Please enter Driver's Address";
    } else if (address.length > 100) {
      newErrors.address =
        "Do not enter more than the maximum number of characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: any = {};

    // If no image is selected
    if (!formData.profile_url) {
      newErrors.profile_url = "Please upload a profile photo";
    }
    // If there's an existing error (like size) from the picker, keep it
    else if (errors.profile_url) {
      newErrors.profile_url = errors.profile_url;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const validateStep3 = () => {
    const newErrors: any = {};

    // --- License Number Validation ---
    if (!formData.licenseNumber || !formData.licenseNumber.trim()) {
      newErrors.licenseNumber = "Please enter Driver's License Number";
    } else if (formData.licenseNumber.length !== 5) {
      newErrors.licenseNumber = "License number must be exactly 5 digits";
    } else if (!/^\d{5}$/.test(formData.licenseNumber)) {
      newErrors.licenseNumber = "License number must contain only digits";
    }

    // --- License Year Validation ---
    if (!formData.licenseYear || !formData.licenseYear.trim()) {
      newErrors.licenseYear = "Please enter Driver's License Year";
    } else if (formData.licenseYear.length !== 2) {
      newErrors.licenseYear = "License Year must be exactly 2 digits";
    } else if (!/^\d{2}$/.test(formData.licenseYear)) {
      newErrors.licenseYear = "License Year must contain only digits";
    }

    // --- File Validation ---
    if (!formData.license_url) {
      newErrors.license_url = "Please upload a license photo";
    } else if (errors.license_url) {
      newErrors.license_url = errors.license_url;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkStep1Duplicates = async (nrc: string, phone: string) => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("phone, nrc")
        .or(`phone.eq.${phone},nrc.eq."${nrc}"`);

      if (error) throw error;

      const newErrors: any = {};

      if (data && data.length > 0) {
        if (data.some((d) => d.phone === phone)) {
          newErrors.phone = "The driver's phone number is duplicated.";
        }

        if (data.some((d) => d.nrc === nrc)) {
          newErrors.nrcNumber = "The driver's NRC number is duplicated.";
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors((prev) => ({
          ...prev,
          ...newErrors,
        }));

        return true;
      }

      return false;
    } catch (err) {
      console.error("Duplicate check error:", err);
      return false;
    }
  };

  const handleSaveDriver = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;

    const cleanPhone = formData.phone.replace(/\D/g, "");
    const fullNrc = `${formData.nrcState}/${formData.nrcTownship}(${formData.nrcType})${formData.nrcNumber}`;
    const fullLicense = `${formData.licenseType}/${formData.licenseNumber.trim()}/${formData.licenseYear.trim()}`;

    try {
      setIsSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found.");

      // Check for duplicates before expensive file uploads
      const isDuplicate = await checkLicenseDuplicate(fullLicense);

      if (isDuplicate) {
        setIsSubmitting(false);
        return;
      }
      if (isDuplicate) {
        setIsSubmitting(false);
        return;
      }

      let finalProfileUrl = await uploadToSupabase(
        formData.profile_url!,
        "profiles",
      );
      let finalLicenseUrl = await uploadToSupabase(
        formData.license_url!,
        "licenses",
      );

      const { error: insertError } = await supabase.from("drivers").insert([
        {
          owner_id: user.id,
          name: formData.name.trim(),
          phone: cleanPhone,
          nrc: fullNrc,
          gender: formData.gender,
          postal_code: formData.township,
          location: formData.address || null,
          license_number: fullLicense,
          photo_url: finalProfileUrl,
          license_img_url: finalLicenseUrl,
          status: "available",
        },
      ]);

      if (insertError) {
        if (insertError.code === "23505")
          throw new Error("License or NRC already exists.");
        throw insertError;
      }

      // Invalidate React Query cache to automatically refetch drivers list
      queryClient.invalidateQueries({ queryKey: ["drivers", user?.id] });

      showAlert("Success", "Driver registered successfully.", "success", [
        {
          text: "OK",
          onPress: () => {
            setIsExiting(true); // Tell the listener we are leaving on purpose
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      // A more robust check for network/connectivity issues
      const isNetworkError =
        error.message?.toLowerCase().includes("Network request failed") ||
        error.message?.toLowerCase().includes("fetch") ||
        error.message?.toLowerCase().includes("timeout") ||
        error.message?.toLowerCase().includes("download"); // Specifically for your ExpoAsset error

      if (isNetworkError || error.message === "User not found.") {
        showAlert(
          "Registration Incomplete",
          "Driver registration is not completed. Please check your network connection and try again.",
          "error",
        );
      } else {
        // Handle other errors (like duplicate license errors)
        showAlert(
          "Error",
          error.message || "An unexpected error occurred.",
          "error",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const checkLicenseDuplicate = async (license: string) => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("license_number")
        .eq("license_number", license);

      if (error) throw error;

      if (data && data.length > 0) {
        setErrors((prev: any) => ({
          ...prev,
          licenseNumber: "The driver's license number is duplicated.",
        }));

        setCurrentStep(3);

        return true;
      }

      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // 1. Validate Step 1
      if (!validateStep1()) return;

      // 2. Prepare values
      const cleanPhone = formData.phone.replace(/\D/g, "");

      const fullNrc = `${formData.nrcState}/${formData.nrcTownship}(${formData.nrcType})${formData.nrcNumber}`;

      // 3. Check duplicates
      const isDuplicate = await checkStep1Duplicates(fullNrc, cleanPhone);

      // 4. Stop if duplicate exists
      if (isDuplicate) return;

      // 5. Move to Step 2
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;

      setCurrentStep(3);
    }
  };

  // Check user authority
  useEffect(() => {
    const checkAuthority = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || profile.role?.toLowerCase() !== "car_owner") {
          showAlert(
            "Access Denied",
            "Only car owners can access this screen.",
            "error",
            [
              {
                text: "OK",
                onPress: () => router.replace("/(protected)/(tabs)/drivers"),
              },
            ],
          );
        } else {
          setIsCheckingRole(false);
        }
      } catch (err) {
        console.error(err);
        router.replace("/(protected)/(tabs)/drivers");
      }
    };
    checkAuthority();
  }, []);

  useEffect(() => {
    const beforeRemoveListener = navigation.addListener("beforeRemove", (e) => {
      // 1. If we are already submitting, or if we are exiting because of success, do nothing
      if (isSubmitting || isExiting) return;

      // 2. Text fields and Upload checks
      const hasTypedName = formData.name && formData.name.trim() !== "";
      const hasTypedPhone = formData.phone && formData.phone.trim() !== "";
      const hasTypedNrc =
        formData.nrcNumber && formData.nrcNumber.trim() !== "";
      const hasTypedAddress =
        formData.address && formData.address.trim() !== "";
      const hasUploadedProfile = !!formData.profile_url;
      const hasUploadedLicense = !!formData.license_url;

      // 3. Selection checks (Radio Buttons and Dropdown Selector Boxes)
      // We check if they have changed from their initial state setup values
      const hasSelectedGender = formData.gender !== "";
      const hasChangedTownship = formData.township !== "";
      const hasChangedNrcState = formData.nrcState !== "1";
      const hasChangedNrcTownship = formData.nrcTownship !== "AhGaYa";
      const hasChangedNrcType = formData.nrcType !== "N";
      const hasChangedLicenseType = formData.licenseType !== "B";

      // Combine everything to see if absolutely anything has been touched
      const isFormDirty =
        hasTypedName ||
        hasTypedPhone ||
        hasTypedNrc ||
        hasTypedAddress ||
        hasUploadedProfile ||
        hasUploadedLicense ||
        hasSelectedGender ||
        hasChangedTownship ||
        hasChangedNrcState ||
        hasChangedNrcTownship ||
        hasChangedNrcType ||
        hasChangedLicenseType;

      // 4. If the form is completely untouched, let them leave peacefully
      if (!isFormDirty) {
        return;
      }

      // 5. Block navigation and trigger alert if there is unsaved data
      e.preventDefault();

      showAlert(
        "Warning",
        "Are you sure you want to go back? Driver registration is not completed.",
        "warning",
        [
          { text: "No", type: "cancel" },
          {
            text: "Yes",
            onPress: () => {
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });

    return beforeRemoveListener;
  }, [navigation, isSubmitting, isExiting, formData]);
  // Loading screen while checking role
  if (isCheckingRole) {
    return (
      <Center className="flex-1 bg-brand-0">
        <ActivityIndicator size="large" color="#16a8e3" />
      </Center>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={["top", "bottom"]}
      className="bg-brand-50"
    >
      {/* Fixed Header */}
      <Box className="pt-4 pb-4 px-4 bg-brand-50 z-20">
        <HStack className="items-center" space="md">
          <BackButton />
          <Heading
            size="xl"
            className="text-brand-700 flex-1 text-center mr-8 font-bold"
          >
            Driver Registration Form
          </Heading>
        </HStack>

        {/* Progress Bar */}
        <Box className="mt-8 px-4">
          <HStack className="items-center justify-between relative">
            <Box className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-brand-200 -translate-y-1/2" />
            {[1, 2, 3].map((step) => (
              <Box key={step} className="items-center z-10">
                <Box
                  className={`w-12 h-12 rounded-full items-center justify-center border-4 border-white ${step === currentStep ? "bg-brand-700" : "bg-brand-300"
                    }`}
                />
              </Box>
            ))}
          </HStack>
        </Box>
      </Box>

      {/* Simplified KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -40} // Adjust offset as needed
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Platform.OS === "ios" ? 40 : 80, // Extra padding for Android
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} // iOS 15+ only
        >
          <Box className="flex-1 px-7 pt-14 pb-10">
            {/* Step 1: Personal Details */}
            {currentStep === 1 && (
              <VStack space="xl" className="pb-8">
                <Heading size="xl" className="text-brand-975 font-bold mb-2">
                  Personal Details
                </Heading>

                {/* Name Field */}
                <FormControl isInvalid={!!errors.name}>
                  <FormControlLabel className="mb-2">
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Name <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>

                  <Input
                    variant="outline"
                    size="md"
                    className={`rounded-lg border-gray-300 bg-transparent h-12 data-[focus=true]:border-sky-500 ${errors.name ? "border-error-500" : ""
                      }`}
                  >
                    <InputField
                      placeholder="Enter Driver's Name"
                      placeholderTextColor="#9CA3AF"
                      value={formData.name}
                      onChangeText={(v) => {
                        updateForm("name", v);
                        validateField("name", v, 30);
                      }}
                      className="pl-3 ios:leading-tight text-gray-900"
                    />
                  </Input>

                  {!!errors.name && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>{errors.name}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                {/* Phone Field */}
                <FormControl isInvalid={!!errors.phone}>
                  <FormControlLabel className="mb-2">
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Phone Number{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>

                  <Input
                    variant="outline"
                    size="md"
                    className={`rounded-lg border-gray-300 bg-transparent h-12 data-[focus=true]:border-sky-500 ${errors.phone ? "border-error-500" : ""
                      }`}
                  >
                    <InputField
                      placeholder="Enter Phone Number (e.g., 09784326789)"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      value={formData.phone}
                      onChangeText={(v) => {
                        updateForm("phone", v);
                        validateField("phone", v, 11);
                      }}
                      className="pl-3 ios:leading-tight text-gray-900"
                    />
                  </Input>

                  {!!errors.phone && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.phone}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                {/* NRC Number Group */}
                <FormControl
                  isInvalid={
                    !!(
                      errors.nrcState ||
                      errors.nrcTownship ||
                      errors.nrcType ||
                      errors.nrcNumber
                    )
                  }
                >
                  <FormControlLabel className="mb-2">
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      NRC Number{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>

                  <HStack space="xs" className="items-center">
                    {/* NRC State */}
                    <TouchableOpacity
                      onPress={() => toggleModal("nrcState", true)}
                      className={`flex-[1] border rounded-lg h-12 px-2 ${errors.nrcState ? "border-error-500" : "border-gray-300"
                        }`}
                    >
                      <HStack className="flex-1 items-center justify-between">
                        <Text className="text-sm text-gray-900">
                          {formData.nrcState || "1"}
                        </Text>
                        <Icon
                          as={ChevronDown}
                          size="sm"
                          className="text-gray-400"
                        />
                      </HStack>
                    </TouchableOpacity>

                    {/* Slash */}
                    <Text className="text-gray-400 text-lg">/</Text>

                    {/* NRC Township */}
                    <TouchableOpacity
                      onPress={() => toggleModal("nrcTownship", true)}
                      className={`flex-[2] border rounded-lg h-12 px-2 ${errors.nrcTownship
                        ? "border-error-500"
                        : "border-gray-300"
                        }`}
                    >
                      <HStack className="flex-1 items-center justify-between">
                        <Text
                          className="text-sm text-gray-900"
                          numberOfLines={1}
                        >
                          {formData.nrcTownship || "Township"}
                        </Text>
                        <Icon
                          as={ChevronDown}
                          size="sm"
                          className="text-gray-400"
                        />
                      </HStack>
                    </TouchableOpacity>

                    {/* NRC Type */}
                    <TouchableOpacity
                      onPress={() => toggleModal("nrcType", true)}
                      className={`flex-[1.2] border rounded-lg h-12 px-2 ${errors.nrcType ? "border-error-500" : "border-gray-300"
                        }`}
                    >
                      <HStack className="flex-1 items-center justify-between">
                        <Text className="text-sm text-gray-900">
                          ({formData.nrcType || "N"})
                        </Text>
                        <Icon
                          as={ChevronDown}
                          size="sm"
                          className="text-gray-400"
                        />
                      </HStack>
                    </TouchableOpacity>

                    {/* NRC Number Input */}
                    <Input
                      variant="outline"
                      size="md"
                      className={`flex-[2] rounded-lg bg-transparent h-12 ${errors.nrcNumber
                        ? "border-error-500"
                        : "border-gray-300"
                        } data-[focus=true]:border-sky-500`}
                    >
                      <InputField
                        placeholder="012345"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={formData.nrcNumber}
                        onChangeText={(v) => {
                          updateForm("nrcNumber", v);
                          validateField("nrcNumber", v, 6);
                        }}
                        className="pl-2 text-gray-900"
                      />
                    </Input>
                  </HStack>

                  {(errors.nrcState ||
                    errors.nrcTownship ||
                    errors.nrcType ||
                    errors.nrcNumber) && (
                      <FormControlError>
                        <FormControlErrorIcon as={AlertCircle} />
                        <FormControlErrorText>
                          {errors.nrcState ||
                            errors.nrcTownship ||
                            errors.nrcType ||
                            errors.nrcNumber}
                        </FormControlErrorText>
                      </FormControlError>
                    )}
                </FormControl>

                {/* Gender Selection - No initial selection */}
                <FormControl isInvalid={!!errors.gender}>
                  <FormControlLabel className="mb-2">
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Gender <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>
                  <RadioGroup
                    value={formData.gender}
                    onChange={(v) => updateForm("gender", v)}
                  >
                    <HStack space="2xl" className="mt-1">
                      <Radio value="Male" size="md">
                        <RadioIndicator className="border-brand-700">
                          <RadioIcon
                            as={CircleIcon}
                            className="text-brand-700 fill-brand-700"
                          />
                        </RadioIndicator>
                        <RadioLabel className="text-brand-975 ml-2">
                          Male
                        </RadioLabel>
                      </Radio>
                      <Radio value="Female" size="md">
                        <RadioIndicator className="border-brand-700">
                          <RadioIcon
                            as={CircleIcon}
                            className="text-brand-700 fill-brand-700"
                          />
                        </RadioIndicator>
                        <RadioLabel className="text-brand-975 ml-2">
                          Female
                        </RadioLabel>
                      </Radio>
                    </HStack>
                  </RadioGroup>
                  {errors.gender && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.gender}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                {/* Township Field */}
                <FormControl isInvalid={!!errors.township}>
                  <FormControlLabel className="mb-2">
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Township{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>

                  <TouchableOpacity
                    onPress={() => toggleModal("township", true)}
                    className={`border rounded-lg h-12 flex-row items-center px-4 ${errors.township ? "border-error-500" : "border-gray-300"
                      }`}
                  >
                    <Text className="flex-1 text-gray-900">
                      {yangonTownships.find(
                        (t) => t.postalCode === formData.township,
                      )?.name || "Select Township Name"}
                    </Text>
                    <Icon
                      as={ChevronDown}
                      size="md"
                      className="text-gray-400"
                    />
                  </TouchableOpacity>

                  {!!errors.township && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.township}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                {/* Address Field */}
                <FormControl isInvalid={!!errors.address}>
                  <FormControlLabel className="mb-2">
                    <FormControlLabelText className="text-typography-800 font-semibold text-md">
                      Address{" "}
                      <Text className="text-error-500 font-bold">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>

                  <Textarea
                    className={`rounded-lg bg-transparent min-h-[96px] border ${errors.address
                      ? "border-error-500"
                      : "border-gray-300 data-[focus=true]:border-sky-500"
                      }`}
                  >
                    <TextareaInput
                      placeholder="Enter the detailed address"
                      placeholderTextColor="#9CA3AF"
                      value={formData.address}
                      onChangeText={(v) => {
                        updateForm("address", v);
                        validateField("address", v, 60);
                      }}
                      className="text-gray-900 px-3 pt-3"
                    />
                  </Textarea>

                  {!!errors.address && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.address}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>
              </VStack>
            )}

            {/* Step 2: Profile */}
            {currentStep === 2 && (
              <VStack space="xl" className="pb-8">
                <VStack space="md">
                  <Heading size="xl" className="text-brand-975 font-bold">
                    Profile
                  </Heading>
                  <VStack space="sm" className="mt-4 px-2">
                    {[
                      "Please upload a clear, professional photo",
                      "Ensure face is fully visible and in focus",
                      "File format: JPG, JPEG, or PNG",
                    ].map((item, index) => (
                      <HStack key={index} space="md" className="items-start">
                        <Text className="text-2xl font-bold font-inter text-brand-975 leading-7">
                          •
                        </Text>
                        <Text className="text-xl font-bold font-inter text-brand-975 leading-7 flex-1">
                          {item}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>

                <VStack space="lg" className="mt-4">
                  <Text className="text-xl text-brand-975 font-bold">
                    Profile Picture
                  </Text>

                  <Box
                    className={`w-full h-80 border-2 border-dashed rounded-2xl bg-brand-50/10 items-center justify-center py-0 ${errors.profile_url
                      ? "border-error-500"
                      : "border-brand-300"
                      }`}
                  >
                    <Box className="w-60 h-60 rounded-2xl overflow-hidden bg-brand-100 border border-brand-200">
                      {formData.profile_url ? (
                        <Image
                          source={{ uri: formData.profile_url }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Center className="flex-1">
                          <Icon
                            as={User}
                            size="xl"
                            className="text-brand-400"
                          />
                        </Center>
                      )}
                    </Box>
                  </Box>

                  {errors.profile_url && (
                    <HStack space="sm" className="justify-center mt-2">
                      <AlertCircle size={18} color="#dc2626" />
                      <VStack className="mb-5">
                        <Text style={{ color: "#dc2626", fontWeight: "500" }}>
                          {errors.profile_url}
                        </Text>
                      </VStack>
                    </HStack>
                  )}

                  <Box className="items-center mt-2">
                    <TouchableOpacity
                      onPress={pickProfileImage}
                      disabled={isUploading}
                      activeOpacity={0.8}
                      className="flex-row items-center justify-center bg-brand-50 border border-brand-600 px-4 py-2 rounded-2xl shadow-sm"
                    >
                      <Icon
                        as={ArrowUpCircle}
                        size="xl"
                        className="text-brand-900 font-bold mr-2"
                      />
                      <Text className="text-brand-800 text-base tracking-wide">
                        Upload
                      </Text>
                    </TouchableOpacity>
                  </Box>
                </VStack>
              </VStack>
            )}
            {/* Step 3: License */}
            {currentStep === 3 && (
              <VStack space="md">
                <VStack space="sm">
                  <Heading size="xl" className="text-brand-975">
                    License
                  </Heading>

                  <VStack space="sm" className="mt-4 px-3">
                    {[
                      "Please upload one clear color photo of your license.",
                      "All details must be clearly legible.",
                    ].map((item, index) => (
                      <HStack key={index} space="md" className="items-start">
                        <Text className="text-2xl font-bold font-inter text-brand-975 leading-7">
                          •
                        </Text>
                        <Text className="text-xl font-bold font-inter text-brand-975 leading-7 flex-1">
                          {item}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
                <FormControl className="mt-4 px-2">
                  <FormControlLabel>
                    <FormControlLabelText className="font-bold text-brand-975 text-xl">
                      License Number <Text className="text-error-500">*</Text>
                    </FormControlLabelText>
                  </FormControlLabel>

                  <HStack space="xs" className="items-start w-full">
                    {/* 1. Toggle Button */}
                    <TouchableOpacity
                      onPress={() => toggleModal("licenseType", true)}
                      activeOpacity={0.7}
                      className="w-20 h-12 rounded-lg border border-gray-300 justify-center px-3"
                    >
                      <HStack className="items-center justify-between">
                        <Text className="text-brand-975">
                          {formData.licenseType}
                        </Text>
                        <Icon
                          as={ChevronDown}
                          size="sm"
                          className="text-gray-400"
                        />
                      </HStack>
                    </TouchableOpacity>

                    {/* 2. Slash Separator - Wrapped to prevent height shifts */}
                    <Box className="h-12 justify-center">
                      <Text className="text-brand-975 text-2xl mx-1">/</Text>
                    </Box>

                    {/* 3. License Number Input */}
                    <FormControl
                      isInvalid={!!errors.licenseNumber}
                      className="flex-[2]"
                    >
                      <Input
                        className={`rounded-xl h-12 ${errors.licenseNumber
                          ? "border-error-500"
                          : "border-gray-300"
                          } data-[focus=true]:border-sky-500`}
                      >
                        <InputField
                          className="text-center"
                          placeholder="12345"
                          keyboardType="numeric"
                          maxLength={5}
                          value={formData.licenseNumber}
                          onChangeText={(v) => {
                            updateForm("licenseNumber", v);
                            validateField("licenseNumber", v, 5);
                          }}
                        />
                      </Input>

                      {errors.licenseNumber && (
                        <FormControlError>
                          <FormControlErrorIcon as={AlertCircle} />
                          <FormControlErrorText>
                            {errors.licenseNumber}
                          </FormControlErrorText>
                        </FormControlError>
                      )}
                    </FormControl>

                    {/* 4. Slash Separator */}
                    <Box className="h-12 justify-center">
                      <Text className="text-brand-975 text-2xl mx-1">/</Text>
                    </Box>

                    {/* 5. License Year Input */}
                    <FormControl
                      isInvalid={!!errors.licenseYear}
                      className="flex-[2]"
                    >
                      <Input
                        className={`rounded-xl h-12 ${errors.licenseYear
                          ? "border-error-500"
                          : "border-gray-300"
                          } data-[focus=true]:border-sky-500`}
                      >
                        <InputField
                          className="text-center"
                          placeholder="00"
                          keyboardType="numeric"
                          maxLength={2}
                          value={formData.licenseYear}
                          onChangeText={(v) => {
                            updateForm("licenseYear", v);
                            validateField("licenseYear", v, 2);
                          }}
                        />
                      </Input>

                      {errors.licenseYear && (
                        <FormControlError>
                          <FormControlErrorIcon as={AlertCircle} />
                          <FormControlErrorText>
                            {errors.licenseYear}
                          </FormControlErrorText>
                        </FormControlError>
                      )}
                    </FormControl>
                  </HStack>
                </FormControl>

                <VStack space="md" className="mt-3 px-2">
                  <Text className="text-xl text-brand-975 font-bold">
                    License Photo{" "}
                    <Text className="text-error-500 font-bold">*</Text>
                  </Text>
                  <Box
                    className={`w-full h-80 border-2 border-dashed rounded-2xl bg-brand-50/10 items-center justify-center relative ${errors.license_url
                      ? "border-error-500"
                      : "border-brand-300"
                      }`}
                  >
                    <Box className="w-[90%] h-[80%] rounded-xl overflow-hidden bg-brand-100 border border-brand-200">
                      {formData.license_url ? (
                        <Image
                          source={{ uri: formData.license_url }}
                          className="w-full h-full"
                          style={{ resizeMode: "cover" }}
                        />
                      ) : (
                        <Center className="flex-1">
                          <Icon
                            as={ImageIcon}
                            size="xl"
                            className="text-brand-400"
                          />
                        </Center>
                      )}
                    </Box>
                  </Box>

                  {errors.license_url && (
                    <HStack space="sm" className="justify-center mt-2">
                      <AlertCircle size={18} color="#dc2626" />
                      <Text className="text-error-500">
                        {errors.license_url}
                      </Text>
                    </HStack>
                  )}

                  <Box className="mt-2 w-full items-center">
                    <TouchableOpacity
                      onPress={pickLicenseImage}
                      disabled={isUploading}
                      activeOpacity={0.8}
                      className="flex-row items-center justify-center bg-brand-50 border border-brand-600 px-4 py-2 rounded-2xl shadow-sm"
                    >
                      <Icon
                        as={ArrowUpCircle}
                        size="xl"
                        className="text-brand-900 font-bold mr-2"
                      />
                      <Text className="text-brand-800 text-base tracking-wide">
                        Upload
                      </Text>
                    </TouchableOpacity>
                  </Box>
                </VStack>

                <Box className="h-10" />
              </VStack>
            )}
            {/* Navigation Buttons */}
            <Box
              className="mt-auto pt-4 bg-brand-50"
              style={{
                paddingBottom: Platform.OS === "android" ? 24 : 10,
              }}
            >
              <HStack
                className={`w-full ${currentStep === 1 ? "justify-end" : "justify-between"
                  }`}
              >
                {currentStep > 1 && (
                  <Button
                    size="md"
                    variant="outline"
                    className="rounded-xl h-12 px-8 border-brand-700"
                    onPress={() => setCurrentStep((prev) => prev - 1)}
                  >
                    <ButtonText className="text-brand-700 font-bold text-lg">
                      Previous
                    </ButtonText>
                  </Button>
                )}

                <Button
                  size="md"
                  isDisabled={isSubmitting}
                  className={`bg-brand-700 rounded-xl h-12 px-8 active:bg-brand-800 shadow-sm ${isSubmitting ? "opacity-50" : ""
                    }`}
                  onPress={currentStep === 3 ? handleSaveDriver : handleNext}
                >
                  <ButtonText className="text-white font-bold text-lg">
                    {isSubmitting
                      ? "Saving..."
                      : currentStep === 3
                        ? "Save"
                        : "Next >>"}
                  </ButtonText>
                </Button>
              </HStack>
            </Box>
          </Box>
        </ScrollView>

        {/* Modals */}
        <SelectorModal
          visible={modals.nrcState}
          onClose={() => toggleModal("nrcState", false)}
          options={nrcData.states}
          title="State"
          onSelect={(v: string) => updateForm("nrcState", v)}
        />
        <SelectorModal
          visible={modals.nrcTownship}
          onClose={() => toggleModal("nrcTownship", false)}
          options={
            nrcData.townships[
            formData.nrcState as keyof typeof nrcData.townships
            ] || []
          }
          title="NRC Township"
          onSelect={(v: string) => updateForm("nrcTownship", v)}
        />
        <SelectorModal
          visible={modals.nrcType}
          onClose={() => toggleModal("nrcType", false)}
          options={nrcData.types}
          title="Type"
          onSelect={(v: string) => updateForm("nrcType", v)}
        />
        <SelectorModal
          visible={modals.township}
          onClose={() => toggleModal("township", false)}
          options={yangonTownships}
          labelField="name"
          title="Township"
          onSelect={(item: any) => updateForm("township", item.postalCode)}
        />
        <SelectorModal
          visible={modals.licenseType}
          onClose={() => toggleModal("licenseType", false)}
          options={["B", "D", "E"]}
          title="License Type"
          onSelect={(v: string) => updateForm("licenseType", v)}
        />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          actions={alertConfig.actions}
          onClose={() =>
            setAlertConfig((prev) => ({ ...prev, visible: false }))
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
