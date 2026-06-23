import CustomAlert from "@/components/app-alert";
import { SelectorModal } from "@/components/SelectorModal";
import Toast from "@/components/Toast";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
} from "@/components/ui/form-control";
import { HStack } from "@/components/ui/hstack";
import { CircleIcon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Input, InputField } from "@/components/ui/input";
import {
  Radio,
  RadioGroup,
  RadioIcon,
  RadioIndicator,
  RadioLabel,
} from "@/components/ui/radio";
import { Text } from "@/components/ui/text";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { VStack } from "@/components/ui/vstack";
import yangonTownships from "@/constants/yangon-townships.json";
import { apiClient } from "@/lib/axios";
import { Profile, useAuthStore } from "@/store/useAuthStore";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { AlertCircle, ArrowUpCircle, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

const PROFILE_TOAST_KEY = "__renter_profile_pending_toast__";

export const RenterProfileEdit = ({ data }: { data: Profile }) => {
  const user = useAuthStore((state) => state.user);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [gender, setGender] = useState(data.gender || "");
  const [fullName, setFullName] = useState(data.full_name || "");
  const [phoneNumber, setPhoneNumber] = useState(data.phone || "");
  const [township, setTownship] = useState(data.postal_code || "");
  const [address, setAddress] = useState(data.location || "");
  const [avatarUri, setAvatarUri] = useState(data.avatar_url || "");
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isTownshipModalOpen, setIsTownshipModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<
    "success" | "error" | "info" | "warning"
  >("info");
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [imageAlert, setImageAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "warning" as "success" | "error" | "warning" | "info",
    actions: [] as any[],
  });
  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneNumber?: string;
    gender?: string;
    township?: string;
    address?: string;
  }>({});

  const selectedTownship =
    yangonTownships.find((item) => item.postalCode === township)?.name || "";

  const getFieldBorderClass = (fieldError?: string) =>
    fieldError ? "border-error-500" : "border-typography-300";

  const hasChanged = () =>
    fullName.trim() !== (data.full_name || "").trim() ||
    phoneNumber.trim() !== (data.phone || "").trim() ||
    gender !== (data.gender || "") ||
    String(township) !== String(data.postal_code || "") ||
    address.trim() !== (data.location || "").trim() ||
    avatarUri !== (data.avatar_url || "");

  const validateField = (field: string, value: string, maxLength: number) => {
    let error = "";
    if (field === "fullName") {
      if (!value.trim()) {
        error = "Please enter Full Name.";
      } else if (value.length > 30) {
        error = "Do not more than 30 characters.";
      } else if (!/^[a-zA-Z\s]+$/.test(value)) {
        error = "Please fill meaningful name";
      }
    } else if (field === "phoneNumber") {
      if (!value.trim()) {
        error = "Please enter Phone Number";
      } else if (!value.startsWith("09")) {
        error = "Phone number must start with 09";
      } else if (value.length > 11) {
        error = "Phone Number should only contain numbers and not exceed maximum digits (e.g., 11 digits)";
      } else if (value.length === 11 && !/^09\d{9}$/.test(value)) {
        error = "Invalid Myanmar phone number (e.g. 09xxxxxxxxx)";
      }
    } else if (field === "address") {
      if (!value.trim()) {
        error = "Please enter your address";
      } else if (value.length > 100) {
        error = "Do not more than 100 characters."
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateForm = () => {
    const nextErrors: typeof errors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Please enter Full Name";
    }

    if (!phoneNumber.trim()) {
      nextErrors.phoneNumber = "Please enter Phone Number";
    } else if (
      !/^\d+$/.test(phoneNumber.trim()) ||
      phoneNumber.trim().length > 11
    ) {
      nextErrors.phoneNumber =
        "Phone Number should only contain numbers and not exceed maximum digits (e.g., 11 digits)";
    }

    if (!gender) {
      nextErrors.gender = "Please select Gender";
    }

    if (!township) {
      nextErrors.township = "Please select Township";
    }

    if (!address.trim()) {
      nextErrors.address = "Please enter your address";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateImageSize = (asset: any) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    const base64Str = asset.base64 || "";
    // Use fileSize if it's a real positive number; otherwise estimate from base64
    const fileSize =
      asset.fileSize && asset.fileSize > 0
        ? asset.fileSize
        : Math.ceil((base64Str.length * 3) / 4);
    if (fileSize > MAX_SIZE) {
      setImageAlert({
        visible: true,
        title: "File Too Large",
        message: "Image size must be less than 5MB.",
        type: "warning",
        actions: [{ text: "OK" }],
      });
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    try {
      Alert.alert("Upload Profile", "Choose image source", [
        {
          text: "Camera",
          onPress: async () => {
            const permission =
              await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission required", "Please allow camera access.");
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              aspect: [1, 1],
              quality: 0.7,
              base64: true,
            });

            if (!result.canceled) {
              const asset = result.assets[0];
              if (!validateImageSize(asset)) return;
              setAvatarUri(asset.uri);
              setAvatarBase64(asset.base64 || null);
            }
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const permission =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert(
                "Permission required",
                "Please allow gallery access.",
              );
              return;
            }

            let result;
            try {
              result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: false,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
              });
            } catch (pickError) {
              setErrors((prev) => ({
                ...prev,
                avatar: "Can upload only JPG, JPEG, or PNG files.",
              }));
              setAvatarUri(data.avatar_url || "");
              setAvatarBase64(null);
              setToastMessage("Can upload only JPG, JPEG, or PNG files.");
              setToastType("error");
              setToastVisible(true);
              return;
            }

            if (result && !result.canceled) {
              const asset = result.assets[0];
              try {
                if (!validateImageSize(asset)) return;

                const fileExtension = asset.uri.split(".").pop()?.toLowerCase() || "";
                const isSvg = fileExtension === "svg" || asset.mimeType === "image/svg+xml";

                if (isSvg || !["jpg", "jpeg", "png"].includes(fileExtension)) {
                  setErrors((prev) => ({
                    ...prev,
                    avatar: "Can upload only JPG, JPEG, or PNG files.",
                  }));

                  setAvatarUri(data.avatar_url || "");
                  setAvatarBase64(null);

                  setToastMessage("Can upload only JPG, JPEG, or PNG files.");
                  setToastType("error");
                  setToastVisible(true);
                  return;
                }

                setErrors((prev) => ({ ...prev, avatar: undefined }));
                setAvatarUri(asset.uri);
                setAvatarBase64(asset.base64 || null);
              } catch (innderError) {
                setToastMessage("Invalid image format selection.");
                setToastType("error");
                setToastVisible(true);
              }
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (error) {
      Alert.alert("Upload failed", "Unable to pick image right now.");
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id) {
      Alert.alert("Account error", "User session not found.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!hasChanged()) {
      setToastMessage("No changes to save.");
      setToastType("info");
      setToastVisible(true);
      return;
    }

    setIsSaving(true);

    try {
      const normalizedPhone = phoneNumber.trim();

      const { data: phoneCheck } = await apiClient.get<{ exists: boolean }>(
        `/users/check-phone/${encodeURIComponent(normalizedPhone)}`,
        { params: { excludeId: user.id } },
      );

      if (phoneCheck?.exists) {
        setErrors((prev) => ({
          ...prev,
          phoneNumber: "Phone number already exists",
        }));
        setIsSaving(false);
        return;
      }

      let uploadedAvatarUrl = data.avatar_url;

      if (avatarUri && avatarUri !== data.avatar_url && avatarBase64) {
        try {
          const mimeMatch = avatarBase64.match(/^data:image\/(\w+);/);
          const ext = mimeMatch ? mimeMatch[1] : 'jpg';
          const fileName = `${user.id}.${ext}`;

          const { data: uploadResult } = await apiClient.post<{ publicUrl: string }>(
            "/uploads",
            {
              filename: fileName,
              contentBase64: avatarBase64,
              contentType: `image/${ext}`,
              folder: "car_rental_app/profiles",
            },
          );

          uploadedAvatarUrl = uploadResult.publicUrl;
        } catch (uploadObjError: any) {
          console.error("[ProfileSave] Upload failed:", uploadObjError?.response?.status, uploadObjError?.response?.data || uploadObjError?.message);
          throw uploadObjError;
        }

        if (!uploadedAvatarUrl) {
          throw new Error("Avatar upload failed");
        }
      }

      const updates = {
        full_name: fullName.trim(),
        phone: normalizedPhone || null,
        gender,
        postal_code: township,
        location: address.trim() || null,
        avatar_url: uploadedAvatarUrl || null,
      };

      await apiClient.patch(`/users/${user.id}`, updates);

      await fetchProfile(user.id, true);
      (
        globalThis as typeof globalThis & {
          __renter_profile_pending_toast__?: {
            message: string;
            type: "success" | "error" | "info" | "warning";
          } | null;
        }
      )[PROFILE_TOAST_KEY] = {
        message: "Profile updated successfully",
        type: "success",
      };
      router.back();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.statusText ||
        error?.message ||
        "Unable to update profile right now.";
      const status = error?.response?.status;
      console.error("[ProfileSave] Error:", status, message, error?.config?.url);
      Alert.alert(
        "Save failed",
        status ? `Error ${status}: ${message}` : message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <VStack className="flex-1 bg-brand-50 dark:bg-background-dark">
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onClose={() => setToastVisible(false)}
        />
        <CustomAlert
          visible={isCancelConfirmOpen}
          title="Discard Changes"
          message="Are you sure you want to discard your changes?"
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
        <CustomAlert
          visible={imageAlert.visible}
          title={imageAlert.title}
          message={imageAlert.message}
          type={imageAlert.type}
          onClose={() => setImageAlert((prev) => ({ ...prev, visible: false }))}
          actions={imageAlert.actions.map(act => ({
            ...act,
            onPress: () => {
              if (act.onPress) act.onPress();
              setImageAlert((prev) => ({ ...prev, visible: false }));
            }
          }))}
        />
        <KeyboardAwareScrollView
          className="flex-1"
          bottomOffset={120}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <VStack className="px-4 py-3 gap-[18px] pb-[20px]">
            {/* Avatar Upload Card */}
            <View className="flex-row items-center justify-between px-[18px] py-[10px] bg-white dark:bg-neutral-900 rounded-2xl min-h-[120px] border border-[rgba(0,0,0,0.08)]">
              <Box className="w-[100px] h-[100px] rounded-full overflow-hidden">
                <Image
                  source={
                    avatarUri
                      ? { uri: avatarUri }
                      : data.avatar_url
                        ? { uri: data.avatar_url }
                        : require("@/assets/images/avatar1.png")
                  }
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                />
              </Box>
              <Button
                variant="outline"
                action="secondary"
                size="md"
                className="border-brand-400 bg-brand-50 rounded-2xl px-5 h-12 flex-row items-center justify-center mr-12"
                onPress={handlePickImage}
              >
                <HStack space="xs">
                  <ArrowUpCircle
                    size={22}
                    color="#0c6081"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-typography-900 font-medium text-base">
                    Upload
                  </Text>
                </HStack>
              </Button>
            </View>

            {/* Email & NRC Card */}
            <View className="px-[22px] py-[18px] bg-white dark:bg-neutral-900 rounded-2xl border border-[rgba(0,0,0,0.08)] min-h-[126px]">
              <HStack className="items-center gap-4 pt-[2px] pb-[12px]">
                <Text className="font-inter text-[#000000] dark:text-typography-white font-medium text-[15px] w-[72px]">
                  Email
                </Text>
                <Text className="font-inter text-[#000000] dark:text-typography-300 text-[15px] font-medium flex-1 text-left">
                  {user?.email || "alextommy@gmail.com"}
                </Text>
              </HStack>
              <Divider className="my-[6px] bg-[rgba(59,60,60,0.3)]" />
              <HStack className="items-center gap-4 pt-[14px] pb-[2px]">
                <Text className="font-inter text-[#000000] dark:text-typography-white font-medium text-[15px] w-[72px]">
                  NRC No.
                </Text>
                <Text className="font-inter text-[#000000] dark:text-typography-300 text-[15px] font-medium flex-1 text-left">
                  {data.nrc || "13/LAYANA(N)123456"}
                </Text>
              </HStack>
            </View>

            {/* Form Fields Card */}
            <View className="px-6 py-[18px] gap-[18px] bg-white dark:bg-neutral-900 rounded-2xl border border-[rgba(0,0,0,0.08)]">
              <FormControl isInvalid={!!errors.fullName}>
                <VStack className="gap-[8px]">
                  <Text className="text-typography-800 font-semibold text-md">
                    Full Name
                  </Text>
                  <Input
                    variant="outline"
                    size="md"
                    className={`rounded-lg border bg-white h-12 data-[focus=true]:border-brand-700 ${getFieldBorderClass(errors.fullName)}`}
                  >
                    <InputField
                      value={fullName}
                      onChangeText={(value) => {
                        setFullName(value);
                        validateField("fullName", value, 20);
                        if (errors.fullName) {
                          setErrors((prev) => ({ ...prev, fullName: undefined }));
                        }
                      }}
                      placeholder="Ales Tommy"
                      placeholderTextColor="#9CA3AF"
                      className="pl-3 ios:leading-tight text-typography-900"
                      maxLength={20}
                    />
                  </Input>
                  {errors.fullName ? (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.fullName}
                      </FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              <FormControl isInvalid={!!errors.phoneNumber}>
                <VStack className="gap-[8px]">
                  <Text className="text-typography-800 font-semibold text-md">
                    Phone Number
                  </Text>
                  <Input
                    variant="outline"
                    size="md"
                    className={`rounded-lg border bg-white h-12 data-[focus=true]:border-brand-700 ${getFieldBorderClass(errors.phoneNumber)}`}
                  >
                    <InputField
                      value={phoneNumber}
                      onChangeText={(value) => {
                        setPhoneNumber(value);
                        validateField("phoneNumber", value, 11);
                        if (errors.phoneNumber) {
                          setErrors((prev) => ({
                            ...prev,
                            phoneNumber: undefined,
                          }));
                        }
                      }}
                      placeholder="091234567"
                      keyboardType="phone-pad"
                      placeholderTextColor="#9CA3AF"
                      className="pl-3 ios:leading-tight text-typography-900"
                      maxLength={11}
                    />
                  </Input>
                  {errors.phoneNumber ? (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.phoneNumber}
                      </FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              <FormControl isInvalid={!!errors.gender}>
                <VStack className="gap-[8px]">
                  <Text className="text-typography-800 font-semibold text-md">
                    Gender
                  </Text>
                  <RadioGroup
                    value={gender}
                    onChange={(value) => {
                      setGender(value);
                      if (errors.gender) {
                        setErrors((prev) => ({ ...prev, gender: undefined }));
                      }
                    }}
                    className="flex-row gap-[56px] mt-[2px]"
                  >
                    <Radio value="Male" size="sm" className="gap-[6px]">
                      <RadioIndicator className="border-[#4A90E2]">
                        <RadioIcon as={CircleIcon} />
                      </RadioIndicator>
                      <RadioLabel className="font-roboto text-neutral-800 dark:text-typography-300 text-sm">
                        Male
                      </RadioLabel>
                    </Radio>
                    <Radio value="Female" size="sm" className="gap-[6px]">
                      <RadioIndicator className="border-[#4A90E2]">
                        <RadioIcon as={CircleIcon} />
                      </RadioIndicator>
                      <RadioLabel className="font-roboto text-neutral-800 dark:text-typography-300 text-sm">
                        Female
                      </RadioLabel>
                    </Radio>
                  </RadioGroup>
                  {errors.gender ? (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.gender}
                      </FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              <FormControl isInvalid={!!errors.township}>
                <VStack className="gap-[8px]">
                  <Text className="text-typography-800 font-semibold text-md">
                    Township
                  </Text>
                  <Pressable onPress={() => setIsTownshipModalOpen(true)}>
                    <Input
                      pointerEvents="none"
                      variant="outline"
                      size="md"
                      className={`rounded-lg border bg-white pr-[12px] flex-row items-center h-12 data-[focus=true]:border-brand-700 ${getFieldBorderClass(errors.township)}`}
                    >
                      <InputField
                        value={selectedTownship}
                        placeholder="Select township"
                        editable={false}
                        showSoftInputOnFocus={false}
                        placeholderTextColor="#9CA3AF"
                        className="pl-3 ios:leading-tight text-typography-900"
                      />
                      <ChevronDown size={16} color="#747474" />
                    </Input>
                  </Pressable>
                  {errors.township ? (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.township}
                      </FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              <FormControl isInvalid={!!errors.address}>
                <VStack className="gap-[8px]">
                  <Text className="text-typography-800 font-semibold text-md">
                    Address
                  </Text>
                  <Textarea
                    className={`rounded-lg border bg-white min-h-[96px] px-3 py-3 data-[focus=true]:border-brand-700 ${getFieldBorderClass(errors.address)}`}
                    size="md"
                  >
                    <TextareaInput
                      value={address}
                      onChangeText={(value) => {
                        setAddress(value);
                        validateField("address", value, 100);
                        if (errors.address) {
                          setErrors((prev) => ({ ...prev, address: undefined }));
                        }
                      }}
                      placeholder=""
                      placeholderTextColor="#9CA3AF"
                      className="pl-3 text-sm ios:leading-tight text-typography-900"
                      maxLength={100}
                    />
                  </Textarea>
                  {errors.address ? (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.address}
                      </FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>
            </View>
          </VStack>
          {/* Bottom Action Buttons */}
          <HStack className="px-4 pt-[8px] pb-[22px] bg-brand-50 gap-[12px]">
            <Button
              variant="outline"
              className="flex-1 rounded border border-brand-700 bg-white h-12"
              onPress={() => {
                if (hasChanged()) {
                  setIsCancelConfirmOpen(true);
                } else {
                  router.back(); 
                }
              }}
              >
              <ButtonText className="text-brand-700 font-roboto font-medium text-base">
                Cancel
              </ButtonText>
            </Button>
            <Button
              className="flex-1 rounded bg-brand-700 h-12"
              onPress={handleSaveChanges}
              isDisabled={isSaving}
            >
              <ButtonText className="font-roboto font-medium text-white text-base">
                {isSaving ? "Saving..." : "Save Changes"}
              </ButtonText>
            </Button>
          </HStack>
        </KeyboardAwareScrollView>

        <SelectorModal
          visible={isTownshipModalOpen}
          onClose={() => setIsTownshipModalOpen(false)}
          options={yangonTownships}
          onSelect={(item) => {
            setTownship(item.postalCode);
            if (errors.township) {
              setErrors((prev) => ({ ...prev, township: undefined }));
            }
          }}
          title="Select Township"
          labelField="name"
        />
      </VStack>
    </SafeAreaView>
  );
};
