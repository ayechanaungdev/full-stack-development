import { CircleIcon, Icon } from "@/components/ui/icon";
import {
  Radio,
  RadioGroup,
  RadioIcon,
  RadioIndicator,
  RadioLabel,
} from "@/components/ui/radio";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { default as React, useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// UI Components
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
} from "@/components/ui/form-control";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

// Icons
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AlertCircle, ChevronDown, User } from "lucide-react-native";

import CustomAlert from "@/components/app-alert";
import { SelectorModal } from "@/components/SelectorModal";
import { Center } from "@/components/ui/center";
import { Divider } from "@/components/ui/divider";
import yangonTownships from "@/constants/yangon-townships.json";
import { useNavigation } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UpdateDriverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [driver, setDriver] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("female");
  const [location, setLocation] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [formData, setFormData] = useState({
    postal_code: "",
    profile_url: null as string | null,
  });
  const imageUrl = formData.profile_url || driver?.photo_url;
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    gender?: string;
    location?: string;
  }>({});
  const navigation = useNavigation();
  const [isUpdated, setIsUpdated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // alert state
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

  useEffect(() => {
    if (id) fetchDriver();
  }, [id]);

const isFormFill = useCallback(() => {
  if (!driver) return false;

  const isPhoneFill = phone !== (driver.phone || "");
  const isGenderFill = gender !== (driver.gender || "");
  const isLocationFill = location !== (driver.location || "");

  const isOfflineFill =
    isOffline !== (driver.status === "offline");

  const isPostalFill =
    String(formData.postal_code).trim() !==
    String(driver.postal_code || "").trim();

  const isPhotoFill = profileUrl !== (driver.photo_url || "");

  return (
    isPhoneFill ||
    isGenderFill ||
    isLocationFill ||
    isOfflineFill ||
    isPostalFill ||
    isPhotoFill
  );
}, [
  driver,
  phone,
  gender,
  location,
  isOffline,
  formData.postal_code,
  profileUrl,
]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!isFormFill() || isUpdated) return;

      e.preventDefault();
      setAlertData({
        title: "Warning",
        message:
          "Are you sure you want to go back?\nUnsaved changes will be lost.",
        type: "warning",
        actions: [
          { text: "No", type: "cancel" },
          {
            text: "Yes",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      });
      setAlertVisible(true);
    });

    return unsubscribe;
  }, [navigation, isFormFill, isUpdated]);

  const withTimeout = (promise: PromiseLike<any>, ms: number) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    );
    return Promise.race([promise, timeout]);
  };

  const fetchDriver = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      setAlertData({
        title: "Driver Loading Error",
        message: "Failed to load driver",
        type: "error",
        actions: [
          {
            text: "OK",
          },
        ],
      });
    } else {
      setDriver(data);
      setPhone(data.phone || "");
      setGender(data.gender || "female");
      setLocation(data.location || "");
      setIsOffline(data.status === "offline");
      setFormData({
        postal_code: String(data.postal_code || ""),
        profile_url: data.photo_url || null,
      });
      setProfileUrl(data.photo_url || "");
    }
  };

  const isValidPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "");

    const mmRegex = /^(?:\+?959|09)(?:\d{7,9})$/;

    return mmRegex.test(cleaned);
  };

  const normalizePhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\s+/g, "");

    if (cleaned.startsWith("+959")) {
      return "09" + cleaned.slice(4);
    }

    if (cleaned.startsWith("959")) {
      return "09" + cleaned.slice(3);
    }

    return cleaned;
  };

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Phone validation
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidPhoneNumber(phone)) {
      newErrors.phone = "Invalid Myanmar phone number (e.g. 09xxxxxxxxx)";
    }

    // Gender validation
    if (!gender) {
      newErrors.gender = "Please select gender";
    }

    // Address validation
    if (!location.trim()) {
      newErrors.location = "Address is required";
    }

    if (location && location.length > 50) {
      newErrors.location =
        "Do not enter more than the maximum number of digits";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicatePhone = async (phone: string, currentId: string) => {
    const { data, error } = await supabase
      .from("drivers")
      .select("id")
      .eq("phone", phone)
      .neq("id", currentId);

    if (error) throw error;

    return data.length > 0;
  };

  const handleCancel = () => {
    router.back();
  };

  const handleUpdate = async () => {
  if (!validateForm()) return;

  setIsUpdating(true);

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const isDuplicate = await checkDuplicatePhone(normalizedPhone, id);

    if (isDuplicate) {
      setErrors((prev) => ({
        ...prev,
        phone: "This phone number already exists",
      }));
      return;
    }

    const { error } = await withTimeout(
      supabase
        .from("drivers")
        .update({
          phone: normalizedPhone,
          gender,
          postal_code: formData.postal_code,
          location,
          status: isOffline ? "offline" : "available",
          photo_url: profileUrl,
        })
        .eq("id", id),
      10000,
    );

    if (error) {
      setAlertData({
        title: "Update failed:",
        message: error.message,
        type: "error",
        actions: [{ text: "OK" }],
      });
      setAlertVisible(true);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["drivers", user?.id] });

    setAlertData({
      title: "Success",
      message: "Driver Updated successfully!",
      type: "success",
      actions: [
        {
          text: "OK",
          onPress: () => {
            setAlertVisible(false);
            setIsUpdated(true);
            router.back();
          },
        },
      ],
    });
    setAlertVisible(true);
  } catch (error: any) {
    const errorMessage = error?.message?.toLowerCase?.() || "";

    const isNetworkError =
      errorMessage.includes("network request failed") ||
      errorMessage.includes("failed to fetch") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("download");

    if (isNetworkError) {
      setAlertData({
        title: "Network Error",
        message:
          "Unable to update driver information.\nPlease check your internet connection and try again.",
        type: "error",
        actions: [{ text: "OK" }],
      });
    } else {
      setAlertData({
        title: "Update Failed",
        message: error?.message || "An unexpected error occurred.",
        type: "error",
        actions: [{ text: "OK" }],
      });
    }

    setAlertVisible(true);
  } finally {
    setIsUpdating(false);
  }
  };

    const getTownshipName = (
    postalCode: string
    ) => {
    return (
    yangonTownships.find(
      (t) => t.postalCode === postalCode
    )?.name || postalCode
    );
    };

  const pickProfileImage = () => pickImage("profile");

  const pickImage = async (type: "profile") => {
    try {
      setIsUploading(true);
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setAlertData({
          title: "Permission Needed",
          message: "Camera roll permissions are required.",
          type: "error",
          actions: [
            {
              text: "OK",
            },
          ],
        });
        setAlertVisible(true);

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // type === "profile",
        aspect: type === "profile" ? [1, 1] : [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const MAX_SIZE = 5 * 1024 * 1024;
        const base64Str = asset.base64 || "";
        const fileSize =
          asset.fileSize ?? Math.ceil((base64Str.length * 3) / 4);
        if (fileSize > MAX_SIZE) {
          setAlertData({
            title: "File Too Large",
            message: "Image size must be less than 5MB.",
            type: "warning",
            actions: [
              {
                text: "OK",
              },
            ],
          });
          setAlertVisible(true);
          return;
        }

        const uri = asset.uri.toLowerCase();
        const isValidFormat =
          uri.endsWith(".jpg") || uri.endsWith(".jpeg") || uri.endsWith(".png");
        if (!isValidFormat) {
          setAlertData({
            title: "Image Format Error",
            message: "Only JPG, JPEG, or PNG files are allowed.",
            type: "error",
            actions: [
              {
                text: "OK",
              },
            ],
          });
          setAlertVisible(true);
          return;
        }

        const field = "profile_url";
        updateForm(field, asset.uri);

        const uploadedUrl = await uploadToSupabase(asset.uri, "profiles");
        setProfileUrl(uploadedUrl);
      }
    } catch (error) {
      setAlertData({
        title: "Image Pick up Error",
        message: "Failed to pick image. Please try again.",
        type: "error",
        actions: [
          {
            text: "OK",
          },
        ],
      });
      setAlertVisible(true);
      return;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadToSupabase = async (uri: string, bucketName: string) => {
    if (!uri) throw new Error("Invalid URI");

    const extension = uri.split(".").pop() || "jpg";
    const fileName = `${Date.now()}.${extension}`;

    const formData = new FormData();
    formData.append("file", {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      name: fileName,
      type: `image/${extension === "png" ? "png" : "jpeg"}`,
    } as any);

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, formData, {
        contentType: `image/${extension === "png" ? "png" : "jpeg"}`,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    return data.publicUrl;
  };

  const [modals, setModals] = useState({
    township: false,
  });

  const toggleModal = (type: "township", value: boolean) => {
    setModals((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Box className="flex-1 bg-brand-0 px-4 pt-6">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          >
            {/* Profile Card */}
            <Card className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
              <HStack space="md" className="items-center">
                <VStack className="items-center">
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      className="w-24 h-24 rounded-full border-2 border-gray-100"
                      alt="Profile"
                    />
                  ) : (
                    <Center className="flex-1">
                      <Icon as={User} size="xl" className="text-brand-400" />
                    </Center>
                  )}

                  <Pressable
                    onPress={pickProfileImage}
                    className="flex-row items-center mt-2 border border-sky-400 rounded-full px-3 py-1 bg-white"
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={14}
                      color="#0ea5e9"
                    />
                    <Text className="ml-1 text-sky-500 text-xs font-bold">
                      Upload
                    </Text>
                  </Pressable>
                </VStack>

                <VStack className="flex-1 ml-2 py-1 px-3">
                  <Text
                    className=" text-lg font-bold text-slate-800"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {driver?.name}
                  </Text>
                  <HStack space="md" className="items-center mt-1">
                    <Feather name="credit-card" size={16} color="#64748b" />
                    <Text className="text-slate-700 font-bold mt-1">
                      {driver?.nrc || "N/A"}
                    </Text>
                  </HStack>
                  <HStack space="md" className=" mt-1">
                    <Feather name="map-pin" size={16} color="#64748b" />
                    <Text
                      className="text-slate-700 font-bold "
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {driver?.location },{getTownshipName(driver?.postal_code)}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
            </Card>

            {/* License Preview */}
            <Card className="bg-white rounded-2xl p-0 mb-4 overflow-hidden border border-gray-100">
              <View
                className="px-5 item-center
           py-3 border-b border-gray-50"
              >
                <Text
                  className="text-slate-6
            00 text-lg "
                >
                  License Number : {driver?.license_number}
                </Text>
              </View>
              <Divider
                className=" bg-background-200
           h-[1.5px]  mb-2"
              />
              <View
                className="px-2
            py-1
          "
              >
                <Image
                  source={{
                    uri:
                      driver?.license_img_url ||
                      "https://via.placeholder.com/200",
                  }}
                  className="w-full h-60 px-3
            py-2"
                  resizeMode="cover"
                  alt="License"
                />
              </View>
            </Card>

            {/* Edit Form */}
            <Card className="bg-white rounded-2xl p-5 mb-10 border border-gray-100">
              <Text className="text-lg font-bold text-slate-800 mb-5">
                Edit Driver Info :
              </Text>

              <HStack className=" items-center mb-6">
                <Text className="text-typography-800 font-semibold text-md mb-2">
                  Leave :
                </Text>
                <Switch
                  value={isOffline}
                  onValueChange={setIsOffline}
                  trackColor={{ false: "#e2e8f0", true: "#bae6fd" }}
                  thumbColor={isOffline ? "#0ea5e9" : "#f4f3f4"}
                />
              </HStack>

              <FormControl
                isInvalid={!!errors.phone}
                className="mb-4"
              >
                <Text className="text-typography-800 font-semibold text-md mb-2">
                  Phone Number<Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  keyboardType="phone-pad"
                  className={`border ${
                    errors.phone ? "border-red-500" : "border-gray-200"
                  } rounded-xl h-12 px-4`}
                />
                {(!!errors.phone) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      { errors.phone}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.gender} className="mb-4">
                <Text className="text-typography-800 font-semibold text-md mb-2">
                  Gender<Text className="text-red-500">*</Text>
                </Text>

                <RadioGroup
                  value={gender}
                  onChange={setGender}
                  className="flex-row gap-[56px] mt-[2px]"
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
                    <FormControlErrorText>{errors.gender}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Custom Township Dropdown */}
              <VStack className="mb-4">
                <Text className="text-typography-800 font-semibold text-md mb-2">
                  Township<Text className="text-red-500">*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => toggleModal("township", true)}
                  className={`border border-gray-200 rounded-xl h-10 flex-row items-center px-4`}
                >
                  <Text className="flex-1 text-brand-975">
                    {yangonTownships.find(
                      (t) =>
                        String(t.postalCode).trim() ===
                        String(formData.postal_code).trim(),
                    )?.name || "Select Township Name"}
                  </Text>

                  <Icon as={ChevronDown} size="xl" className="text-slate-200" />
                </TouchableOpacity>

                {/* Township Selection Modal */}
                <SelectorModal
                  visible={modals.township}
                  onClose={() => toggleModal("township", false)}
                  options={yangonTownships}
                  labelField="name"
                  title="Township"
                  onSelect={(item: any) =>
                    updateForm("postal_code", item.postalCode)
                  }
                />
              </VStack>

              <FormControl
                isInvalid={!!errors.location}
                className="mb-6"
              >
                <Text className="text-typography-800 font-semibold text-md mb-2">
                  Address<Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100 }}
                  className={`border ${
                    errors.location ? "border-red-500" : "border-gray-200"
                  } rounded-xl  px-4`}
                  textAlignVertical="top"
                  maxLength={100}
                />
                {( !!errors.location) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errors.location}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Action Buttons */}
              <HStack space="md">
                <Pressable
                  onPress={handleCancel}
                  className="flex-1 border border-sky-500  rounded py-3"
                >
                  <Text className="text-center text-sky-500  font-bold">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                onPress={handleUpdate}
                disabled={isUpdating}
                className={`flex-1 rounded py-3 shadow-sm shadow-sky-200 ${
                isUpdating ? "bg-sky-300" : "bg-sky-500"
                  }`}
                  >
              <Text className="text-center text-white font-bold">
               {isUpdating ? "Updating..." : "Update"}
            </Text>
              </Pressable>
              </HStack>
            </Card>
          </ScrollView>

          <CustomAlert
            visible={alertVisible}
            title={alertData.title}
            message={alertData.message}
            type={alertData.type}
            onClose={() => setAlertVisible(false)}
            actions={alertData.actions}
          />
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
