import { SelectorModal } from "@/components/SelectorModal";
import Toast from "@/components/Toast";
import CustomAlert from "@/components/app-alert";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import YANGON_TOWNSHIPS from "@/constants/yangon-townships.json";
import { apiClient } from "@/lib/axios";
import { supabase } from "@/lib/supabase";
import { Profile, useAuthStore } from "@/store/useAuthStore";
import { decode as atob } from "base-64";
import * as ImagePicker from "expo-image-picker";
import { router, useNavigation } from "expo-router";
import {
  ArrowUpCircle,
  ChevronDown,
  CircleAlertIcon,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  TouchableOpacity
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

export const OwnerProfileEdit = ({ data }: { data: Profile }) => {
  const navigation = useNavigation();
  const setGloablProfile = useAuthStore((state) => state.setProfile);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState(data.full_name ?? "");
  const [phone, setPhone] = useState(data.phone ?? "");
  const [selectedPostalCode, setSelectedPostalCode] = useState(
    data.postal_code ?? "",
  );
  const [address, setAddress] = useState(data.location ?? "");
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
    addressPart: "",
  });
  const fullNameRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const addressRef = useRef<any>(null);
  type ToastType = "success" | "error" | "info" | "warning";
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [imageAlert, setImageAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "warning" as "success" | "error" | "warning" | "info",
    actions: [] as any[],
  });

  const handleTownshipSelect = (township: any) => {
    setSelectedPostalCode(township.postalCode);
    setErrors((prev) => ({ ...prev, township: "" }));
  };

  const currentTownshipName = useMemo(() => {
    const found = YANGON_TOWNSHIPS.find(
      (t) => t.postalCode === selectedPostalCode,
    );
    return found ? found.name : "";
  }, [selectedPostalCode]);

  const validateField = (field: string, value: string, maxLength: number) => {
    let error = "";
    if (field === "fullName") {
      if (!value.trim()) {
        error = "Please fill this field!";
      } else if (value.length > 20) {
        error = "Do not more than 20 characters.";
      } else if (!/^[a-zA-Z\s]+$/.test(value)) {
        error = "Please fill meaningful name!";
      }
    } else if (field === "phone") {
      if (value && value.trim()) {
        if (value.length > 11) {
          error = "Do not more than 11 characters."
        } else if (!/^09\d{9}$/.test(value)) {
          error = "Please fill meaningful number(eg.09123456789)!"
        }
      }
    } else if (field === "addressPart") {
      if (value && value.trim()) {
        if (value.length > 100) {
          error = "Do not more than 100 characters."
        }
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const isFormValid = () => {
    let isValid = true;

    //full name validation
    if (!fullName.trim()) {
      setErrors((prev) => ({ ...prev, fullName: "Please fill this field!" }));
      if (isValid) fullNameRef.current?.focus();
      isValid = false;
    } else if (fullName.length > 20) {
      setErrors((prev) => ({
        ...prev,
        fullName: "Do not more than 20 characters.",
      }));
      if (isValid) fullNameRef.current?.focus();
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(fullName)) {
      setErrors((prev) => ({
        ...prev,
        fullName: "Please fill meaningful name!",
      }));
      if (isValid) fullNameRef.current?.focus();
      isValid = false;
    } else {
      setErrors((prev) => ({ ...prev, fullName: "" }));
    }
    //phone number validation
    if (phone.trim()) {
      if (phone.length > 11) {
        setErrors((prev) => ({
          ...prev,
          phone: "Do not more than 11 characters."
        }));
        if (isValid) phoneRef.current?.focus();
        isValid = false;
      } else if (!/^09\d{9}$/.test(phone)) {
        setErrors((prev) => ({
          ...prev,
          phone: "Please fill meaningful number(eg.09123456789)!",
        }));
        if (isValid) phoneRef.current?.focus();
        isValid = false;
      } else {
        setErrors((prev) => ({ ...prev, phone: "" }));
      }
    }
    //township validation
    if (!selectedPostalCode) {
      setErrors((prev) => ({ ...prev, township: "Please select a township!" }));
      isValid = false;
    }
    //address validation
    if (address.trim() && address.length > 100) {
      setErrors((prev) => ({
        ...prev,
        addressPart: "Do not more than 100 characters.",
      }));
      if (isValid) addressRef.current?.focus();
      isValid = false;
    } else {
      setErrors((prev) => ({ ...prev, addressPart: "" }));
    }
    return isValid;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera permission.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const selectedImage = result.assets[0];
      // File size validation (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      const base64Str = selectedImage.base64 || "";
      const fileSize =
        selectedImage.fileSize ?? Math.ceil((base64Str.length * 3) / 4);
      if (fileSize > MAX_SIZE) {
        setImageAlert({
          visible: true,
          title: "File Too Large",
          message: "Image size must be less than 5MB.",
          type: "warning",
          actions: [{ text: "OK" }],
        });
        return;
      }
      if (selectedImage.base64) {
        setPreviewImage(`data:image/jpeg;base64,${selectedImage.base64}`);
      }
    }
  };

  const uploadImageToStorage = async (
    base64Str: string,
    userId: number | string,
  ): Promise<string | null> => {
    try {
      const mimeMatch = previewImage?.match(/^data:image\/(\w+);/);
      const ext = mimeMatch ? mimeMatch[1] : 'jpg';
      const fileName = `${userId}.${ext}`;

      const { data: uploadResult } = await apiClient.post<{ publicUrl: string }>(
        "/uploads",
        {
          filename: fileName,
          contentBase64: base64Str,
          contentType: `image/${ext}`,
          folder: "car_rental_app/profiles",
        },
      );

      return uploadResult.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const hasChanged = useCallback(() => {
    if (fullName.trim() !== (data.full_name ?? "").trim()) return true;
    if (phone.trim() !== (data.phone ?? "").trim()) return true;
    if (selectedPostalCode !== (data.postal_code ?? "")) return true;
    if (address.trim() !== (data.location ?? "").trim()) return true;
    if (previewImage) return true;
  }, [fullName, phone, selectedPostalCode, address, previewImage, data]);

  useEffect(() => {
    const beforeRemoveListener = navigation.addListener("beforeRemove", (e) => {
      if (isSaving || isSuccess || isExisting || !hasChanged()) {
        return;
      }
      if (!hasChanged()) return;
      e.preventDefault();
      setPendingAction(e.data.action);
      setShowAlert(true);
    });
    return beforeRemoveListener;
  }, [navigation, isSaving, , isSuccess, isExisting, hasChanged]);

  const handleSave = async () => {
    if (!isFormValid()) return;

    try {
      setIsSaving(true);
      const pastPhone = data.phone ?? "";
      if (phone.trim() && phone.trim() !== pastPhone) {
        const { data: phoneCheck } = await apiClient.get<{ exists: boolean }>(
          `/users/check-phone/${encodeURIComponent(phone.trim())}`,
          { params: { excludeId: data.id } },
        );

        if (phoneCheck?.exists) {
          setErrors((prev) => ({ ...prev, phone: "The phone number is already used" }));
          phoneRef.current?.focus();
          setIsSaving(false);
          return;
        }
      }
      let finalAvatarUrl = data.avatar_url;
      if (!hasChanged()) {
        setToastMessage("No changes to save.");
        setToastType("info");
        setToastVisible(true);
        setIsSaving(false);
        return;
      }
      setIsSaving(true);

      if (previewImage) {
        const base64Str = previewImage.split(",")[1];
        const uploadedUrl = await uploadImageToStorage(base64Str, data.id);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          alert("Failed to upload image");
          setIsSaving(false);
          return;
        }
      }

      const updatedFields = {
        avatar_url: finalAvatarUrl,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        postal_code: selectedPostalCode,
        location: address.trim() || null,
      };

      await apiClient.patch(`/users/${data.id}`, updatedFields);
      setGloablProfile({ ...data, ...updatedFields });
      setIsSuccess(true);
      router.dismissAll();
      router.replace({
        pathname: "/(protected)/(home)/profile",
        params: {
          toastMessage: "Profile updated successfully",
          toastType: "success",
        },
      });
    } catch (error: any) {
      setIsSaving(false);
      console.error("[OwnerProfileSave] Error:", error?.response?.status, error?.response?.data?.message || error?.message);
      router.dismissAll();
      router.replace({
        pathname: "/(protected)/(home)/profile",
        params: {
          toastMessage: "Something went wrong",
          toastType: "error",
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
      <CustomAlert
        visible={showAlert}
        type="warning"
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        onClose={() => {
          setShowAlert(false);
          setPendingAction(null);
        }}
        actions={[
          {
            text: "Cancel",
            type: "cancel",
            onPress: () => {
              setShowAlert(false);
              setPendingAction(null);
            },
          },
          {
            text: "Discard",
            onPress: () => {
              setIsExisting(true);
              setShowAlert(false);

              if (pendingAction) {
                navigation.dispatch(pendingAction);
              } else {
                router.back();
              }
            },
          },
        ]}
      />
      <CustomAlert
        visible={imageAlert.visible}
        title={imageAlert.title}
        message={imageAlert.message}
        type={imageAlert.type}
        actions={imageAlert.actions}
        onClose={() => setImageAlert((prev) => ({ ...prev, visible: false }))}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <Box className="flex-1 bg-brand-50">
          <KeyboardAwareScrollView
            bottomOffset={30}
            style={{ flex: 1 }}
            className="bg-brand-50"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <VStack space="md" className="w-full p-4 pb-20">
              {/* Avatar Section */}
              <Card className="p-4 rounded-2xl bg-white shadow-sm">
                <HStack className="items-center gap-16">
                  <Box className="rounded-full border-2 border-dashed border-brand-700 p-1">
                    <Image
                      source={{
                        uri:
                          previewImage ||
                          data.avatar_url ||
                          require("@/assets/images/avatar1.png"),
                      }}
                      alt="profile"
                      className="w-24 h-24 rounded-full"
                    />
                  </Box>
                  <Button
                    variant="outline"
                    action="secondary"
                    size="md"
                    className="border-brand-400 bg-brand-50 rounded-2xl px-5 h-12 flex-row items-center justify-center"
                    onPress={pickImage}
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
                </HStack>
              </Card>

              {/* Form Section */}
              <Card className="p-4 rounded-2xl bg-white shadow-sm">
                <VStack space="xl">
                  {/* Name */}
                  <FormControl isInvalid={!!errors.fullName}>
                    <FormControlLabel>
                      <FormControlLabel className="font-bold text-gray-700">
                        <FormControlLabelText className="font-bold text-gray-700">
                          Name
                        </FormControlLabelText>
                      </FormControlLabel>
                      <Text className="text-red-500 font-bold text-[14px]">
                        *
                      </Text>
                    </FormControlLabel>
                    <Input className="h-12 rounded-lg">
                      <InputField
                        ref={fullNameRef}
                        value={fullName}
                        maxLength={20}
                        onChangeText={(text) => {
                          setFullName(text);
                          validateField("fullName", text, 20);
                        }}
                      />
                    </Input>
                    <FormControlError>
                      <FormControlErrorIcon as={CircleAlertIcon} />
                      <FormControlErrorText>
                        {errors.fullName}
                      </FormControlErrorText>
                    </FormControlError>
                  </FormControl>

                  {/* Mobile */}
                  <FormControl isInvalid={!!errors.phone}>
                    <FormControlLabel>
                      <FormControlLabelText className="font-bold text-gray-700">
                        Mobile No.
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Input className="h-12 rounded-lg">
                      <InputField
                        ref={phoneRef}
                        value={phone}
                        maxLength={11}
                        onChangeText={(text) => {
                          setPhone(text);
                          validateField("phone", text, 11);
                        }}
                      />
                    </Input>
                    <FormControlError>
                      <FormControlErrorIcon as={CircleAlertIcon} />
                      <FormControlErrorText>
                        {errors.phone}
                      </FormControlErrorText>
                    </FormControlError>
                  </FormControl>
                  {/* Township Selection Trigger */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowModal(true);
                    }}
                  >
                    <FormControl>
                      <FormControlLabel>
                        <FormControlLabelText className="font-bold text-gray-700">
                          Township
                        </FormControlLabelText>
                        <Text className="text-red-500 font-bold text-[14px]">
                          *
                        </Text>
                      </FormControlLabel>
                      <Box pointerEvents="none">
                        <Input className="h-12 rounded-lg bg-gray-50 border-gray-200">
                          <InputField
                            placeholder="Select Township"
                            value={currentTownshipName}
                            readOnly
                          />
                          <Box className="justify-center pr-3">
                            <ChevronDown size={18} color="gray" />
                          </Box>
                        </Input>
                      </Box>
                    </FormControl>
                  </TouchableOpacity>

                  {/* Address */}
                  <FormControl isInvalid={!!errors.addressPart}>
                    <FormControlLabel>
                      <FormControlLabelText className="font-bold text-gray-700">
                        Address
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Input className="h-28 rounded-lg">
                      <InputField
                        ref={addressRef}
                        value={address}
                        maxLength={100}
                        multiline={true}
                        numberOfLines={3}
                        textAlignVertical="top"
                        className="py-2"
                        onChangeText={(text) => {
                          setAddress(text);
                          validateField("addressPart", text, 100);
                        }}
                      />
                    </Input>
                    <FormControlError>
                      <FormControlErrorIcon as={CircleAlertIcon} />
                      <FormControlErrorText>
                        {errors.addressPart}
                      </FormControlErrorText>
                    </FormControlError>
                  </FormControl>
                </VStack>
              </Card>

              {/* Save Button */}
              <Box className="items-center">
                <Button
                  className={`w-40 h-12 rounded-xl bg-brand-600 ${isSaving ? "opacity-50" : ""}`}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <ButtonText className="text-white font-bold text-base">
                    {isSaving ? "Saving..." : "Save"}
                  </ButtonText>
                </Button>
              </Box>
            </VStack>
          </KeyboardAwareScrollView>
          <SelectorModal
            visible={showModal}
            onClose={() => setShowModal(false)}
            title="Township"
            options={YANGON_TOWNSHIPS}
            labelField="name"
            selectedValue={currentTownshipName}
            onSelect={handleTownshipSelect}
          />
          {isSaving && (
            <Box
              className="absolute inset-0 bg-black/30 justify-center items-center"
              style={{ zIndex: 999 }}
            >
              <Box className="bg-white px-6 py-4 rounded-xl flex-row items-center">
                <ActivityIndicator size="large" color="#16a8e3" />
                <Text className="ml-3 font-medium text-base">
                  Saving profile...
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </SafeAreaView>
    </>
  );
};
