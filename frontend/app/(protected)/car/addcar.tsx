import CustomAlert from "@/components/app-alert";
import { BackButton } from "@/components/BackButton";
import { SelectorModal } from "@/components/SelectorModal";
import Toast from "@/components/Toast";
import { Button, ButtonText } from "@/components/ui/button";
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
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { VStack } from "@/components/ui/vstack";
import carBrands from "@/constants/car-brands.json";
import yangonTownships from "@/constants/yangon-townships.json";
import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";

import {
  AlertCircle,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react-native";
import { cssInterop } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// For CSS Icon color
cssInterop(PlusIcon, {
  className: { target: "style", nativeStyleToProp: { color: true } },
});
cssInterop(TrashIcon, {
  className: { target: "style", nativeStyleToProp: { color: true } },
});
cssInterop(ChevronDownIcon, {
  className: { target: "style", nativeStyleToProp: { color: true } },
});

export default function AddNewCarScreen() {
  const { id: paramId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [currentId, setCurrentId] = useState<string | null>(
    (paramId as string) || null,
  );
  const [images, setImages] = useState<any[]>([]);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  // "Other" custom input values
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [car_type, setCarType] = useState("");
  const [car_number, setCarNumber] = useState("");
  const [seats, setSeats] = useState("");
  const [price_per_day, setPricePerDay] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [has_ac, setHasAc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [errorfield, setIsError] = useState<any>({
    brand: "",
    customBrand: "",
    model: "",
    customModel: "",
    car_type: "",
    car_number: "",
    seats: "",
    price_per_day: "",
    location: "",
    description: "",
  });
  const navigation = useNavigation();
  const [form, setForm] = useState({
    township: "",
  });
  const [modals, setModals] = useState({
    township: false,
    brand: false,
    model: false,
  });

  // Derived brand/model lists
  const brandList = [
    ...carBrands.filter((b) => b.brand !== "Other").map((b) => b.brand),
    "Other",
  ];
  const modelList = React.useMemo(() => {
    if (!brand || brand === "Other") return [];
    const found = carBrands.find((b) => b.brand === brand);
    if (!found) return ["Other"];
    // models already include "Other" from JSON; ensure it's last
    const withoutOther = found.models.filter((m) => m !== "Other");
    return [...withoutOther, "Other"];
  }, [brand]);

  // Helper: open exactly one modal, close all others
  const openModal = (key: "township" | "brand" | "model") =>
    setModals({ township: false, brand: false, model: false, [key]: true });

  const isOtherBrand = brand === "Other";
  const isOtherModel = model === "Other";

  // Refs for auto-focusing custom inputs when "Other" is selected
  const customBrandRef = useRef<any>(null);
  const customModelRef = useRef<any>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<
    "success" | "error" | "info" | "warning"
  >("success");
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    actions: [] as any[],
  });

  //Fetch Data
  useEffect(() => {
    if (!currentId) return;
    const fetchImages = async () => {
      try {
        const response = await apiClient.get(`/cars/${currentId}`);
        const car = response.data;
        if (car && car.carImages) {
          setImages(
            car.carImages.map((img: any) => ({
              id: img.id,
              image_url: img.image_url,
              is_primary: img.is_primary ?? false,
            })),
          );
        }
      } catch (err) {
        console.error("Error fetching car images:", err);
      }
    };
    fetchImages();
  }, [currentId]);

  // IMAGE HANDLERS
  const handlePickAndUpload = async (isPrimary: boolean) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      const file = asset;
      const uri = file.uri || "";
      const base64 = file.base64 || "";
      const mimeType = (file.mimeType || "").toLowerCase();

      // 1. File Size Validation (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      const fileSize = file.fileSize ?? Math.ceil((base64.length * 3) / 4); // fallback: estimate from base64
      if (fileSize > MAX_SIZE) {
        setAlert({
          visible: true,
          title: "File Too Large",
          message: "Image size must be less than 5MB.",
          type: "warning",
          actions: [{ text: "OK" }],
        });
        return;
      }

      // 2. Validation Logic
      const isJpegMime = mimeType === "image/jpeg" || mimeType === "image/jpg";
      const isJpegExt = /\.(jpe?g)$/i.test(uri);
      const isSvgContent =
        base64.startsWith("PHN2Zy") ||
        mimeType.includes("svg") ||
        uri.toLowerCase().endsWith(".svg");

      // Block if NOT jpeg OR if it looks like an SVG
      if (!(isJpegMime || isJpegExt) || isSvgContent) {
        setAlert({
          visible: true,
          title: "Invalid File",
          message: "Only JPG/JPEG images are allowed.",
          type: "warning",
          actions: [{ text: "OK" }],
        });
        return;
      }

      // 2. Prepare Image Object
      // Extract actual extension from URI or default to jpg
      const fileExt =
        uri.split(".").pop()?.toLowerCase() === "jpeg" ? "jpeg" : "jpg";

      const localImg = {
        uri,
        base64,
        fileExt,
        is_primary: images.length === 0 ? true : isPrimary,
        isLocal: true,
      };

      // 3. Update State
      setImages((prev: any[]) => {
        if (isPrimary || localImg.is_primary) {
          // Replace existing primary with new one, keep others
          const others = prev.filter((img) => !img.is_primary);
          return [localImg, ...others];
        }
        return [...prev, localImg];
      });
      // Clear image validation error immediately after selecting an image
      setErrors((prev: any) => ({ ...prev, images: null }));
    } catch (error: any) {
      setAlert({
        visible: true,
        title: "Image Error",
        message: error?.message || "Could not process image",
        type: "error",
        actions: [{ text: "OK" }],
      });
    }
  };
  const handleDeleteImage = (img: any) => {
    // Keep track of whether we are deleting the primary image
    const wasPrimary = img.is_primary;

    setImages((prev) => {
      // 1. Remove the deleted image
      const filtered = prev.filter((i) => {
        if (img.isLocal) return i.uri !== img.uri;
        return i.id !== img.id;
      });

      // 2. If we deleted the primary, make the next available image the primary
      if (wasPrimary && filtered.length > 0) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };
  const uploadLocalImages = async (carId: string) => {
    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      const img = updatedImages[i];
      if (img.isLocal) {
        const ext = img.fileExt || "jpg";
        const prefix = carId || user?.id || "new_car";
        const fileName = `${prefix}_${Date.now()}_${i}.${ext}`;

        const { data: uploadResult } = await apiClient.post<{ publicUrl: string }>(
          "/uploads",
          {
            filename: fileName,
            contentBase64: img.base64,
            contentType: `image/${ext}`,
            folder: "car_rental_app/car_images",
          },
        );

        // Update the image object in our array
        updatedImages[i] = {
          image_url: uploadResult.publicUrl,
          is_primary: img.is_primary ?? false,
        };
      }
    }

    return updatedImages;
  };

  //empty form
  const isFormEmpty = () => {
    return (
      brand.trim() === "" &&
      model.trim() === "" &&
      customBrand.trim() === "" &&
      customModel.trim() === "" &&
      car_type.trim() === "" &&
      seats === "" &&
      price_per_day === "" &&
      car_number.trim() === "" &&
      location.trim() === "" &&
      description.trim() === "" &&
      images.length === 0 &&
      form.township === "" &&
      has_ac === true
    );
  };

  useEffect(() => {
    if (loading || isResetting || isSubmitting) {
      setHasUnsavedChanges(false);
      return;
    }
    const currentlyHasData = !isFormEmpty();
    setHasUnsavedChanges(currentlyHasData);
  }, [
    brand,
    model,
    customBrand,
    customModel,
    car_type,
    seats,
    price_per_day,
    car_number,
    location,
    description,
    has_ac,
    images,
    form.township,
    loading,
    isResetting,
    isSubmitting,
  ]);

  //reset Form
  const resetForm = () => {
    setIsResetting(true);
    setBrand("");
    setModel("");
    setCustomBrand("");
    setCustomModel("");
    setCarType("");
    setCarNumber("");
    setSeats("");
    setPricePerDay("");
    setLocation("");
    setDescription("");
    setHasAc(true);
    setImages([]);
    setForm({ township: "" });
    setErrors({});
    setIsError({
      brand: "",
      customBrand: "",
      model: "",
      customModel: "",
      car_type: "",
      car_number: "",
      seats: "",
      price_per_day: "",
      location: "",
      description: "",
    });

    setTimeout(() => {
      setHasUnsavedChanges(false); // reset change tracker
      setIsResetting(false);
    }, 100);
  };

  useEffect(() => {
    // If editing (currentId exists), wait for fetch logic to finish (you'd set loading false there)
    // If adding new, we set loading to false after the initial mount
    if (!currentId) {
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentId]);

  // 3. Track changes (silently sets the flag)
  useEffect(() => {
    if (!loading && !isResetting) {
      setHasUnsavedChanges(true);
    }
  }, [
    brand,
    model,
    customBrand,
    customModel,
    car_type,
    seats,
    price_per_day,
    car_number,
    location,
    description,
    has_ac,
    images,
    form.township,
  ]);

  //  usePreventRemove replaces beforeRemove listener
  usePreventRemove(!isFormEmpty() && !isSubmitting && !isSuccess, ({ data }) => {
    setAlert({
      visible: true,
      title: "Discard changes?",
      message:
        "You have unsaved changes. Are you sure you want to discard them and leave?",
      type: "warning",
      actions: [
        {
          text: "No",
          type: "cancel",
          onPress: () => {
            setAlert((prev) => ({ ...prev, visible: false }));
          },
        },
        {
          text: "Yes",
          onPress: () => {
            setAlert((prev) => ({ ...prev, visible: false }));
            navigation.dispatch(data.action);
          },
        },
      ],
    });
  });

  const validateField = (field: string, value: string, maxLength: number) => {
    let error = "";
    if (field === "brand") {
      if (!value.trim()) {
        error = "Brand is required.";
      } else if (value.length > 20) {
        error = "Do not more than 20 characters.";
      }
    } else if (field === "model") {
      if (!value.trim()) {
        error = "Model is required.";
      } else if (value.length > 20) {
        error = "Do not more than 20 characters.";
      }
    } else if (field === "customBrand") {
      if (!value.trim()) {
        error = "Please enter a brand name.";
      } else if (value.length > 20) {
        error = "Do not more than 20 characters.";
      }
    } else if (field === "customModel") {
      if (!value.trim()) {
        error = "Please enter a model name.";
      } else if (value.length > 20) {
        error = "Do not more than 20 characters.";
      }
    } else if (field === "car_type") {
      if (!value.trim()) {
        error = "Car Type is required.";
      } else if (value.length > 20) {
        error = "Do not more than 20 characters.";
      }
    } else if (field === "car_number") {
      if (!value.trim()) {
        error = "Car Number is required.";
      } else if (!/^[0-9][A-Z]-[0-9]{4}$/.test(value)) {
        error = "Format must be 1A-1234.";
      }
    } else if (field === "seats") {
      if (!value.trim()) {
        error = "Seat is required.";
      } else if (value.startsWith("0")) {
        error = "Please enter a valid number without leading zeros.";
      } else if (parseInt(value) < 1 || parseInt(value) > 12) {
        error = "Seat must be between 1 and 12.";
      }
    } else if (field === "price_per_day") {
      if (!value.trim()) {
        error = "Price is required.";
      } else if (value.startsWith("0")) {
        error = "Please enter a valid number without leading zeros.";
      } else if (parseInt(value) < 10000 || parseInt(value) > 9999999) {
        error = "Price is invalid.";
      }
    } else if (field === "location") {
      if (!value.trim()) {
        error = "Location is required.";
      } else if (value.length > 100) {
        error = "Do not more than 100 characters.";
      }
    } else if (field === "description") {
      if (!value.trim()) {
        error = "Description fill this field.";
      } else if (value.length > 100) {
        error = "Do not more than 100 characters.";
      }
    }
    setIsError((prev: any) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleSaveData = async () => {
    // Block submission if any inline validation error (e.g. char limits) is still active
    const hasInlineErrors = Object.values(errorfield).some(
      (msg) => typeof msg === "string" && msg.trim() !== "",
    );
    if (hasInlineErrors) {
      setToastMessage("Please fix all validation errors before submitting.");
      setToastType("warning");
      setToastVisible(true);
      return;
    }

    setIsSubmitting(true);
    const newErrors: any = {};
    try {
      if (images.length === 0) {
        newErrors.images = "Car Image is required.";
      } else {
        // Clear the error if images exist
        newErrors.images = null;
      }

      // Brand validation
      if (!brand.trim()) {
        newErrors.brand = "Brand is required.";
      } else if (isOtherBrand && !customBrand.trim()) {
        newErrors.customBrand = "Please enter a brand name.";
      }
      // Model validation (always checked independently of brand)
      if (isOtherBrand) {
        if (!customModel.trim())
          newErrors.customModel = "Please enter a model name.";
      } else if (!model.trim()) {
        newErrors.model = "Model is required.";
      } else if (isOtherModel && !customModel.trim()) {
        newErrors.customModel = "Please enter a model name.";
      }

      // Car Type Validation
      if (!car_type.trim()) newErrors.car_type = "Car Type is required.";

      // Numeric Validations
      const seatNum = parseInt(seats);
      if (!seats || isNaN(seatNum)) newErrors.seats = "Seat is required.";
      else if (seatNum < 1 || seatNum > 12)
        newErrors.seats = "Seat must be between 1 and 12.";
      else if (seats.startsWith("0")) {
        newErrors.seats = "Please enter a valid number without leading zeros.";
      }

      const priceNum = parseInt(price_per_day);
      if (!price_per_day.trim()) {
        newErrors.price_per_day = "Price is required.";
      } else if (isNaN(priceNum) || priceNum < 10000 || priceNum > 9999999) {
        newErrors.price_per_day =
          "Price is invalid. Must be between 10,000 and 9,999,999.";
      }

      //Format Car Number  Validations
      const carNum = parseInt(car_number);
      const carPlateRegex = /^[0-9][A-Z]-[0-9]{4}$/;
      if (!car_number || isNaN(carNum))
        newErrors.car_number = "Car Number is required.";
      else if (!carPlateRegex.test(car_number))
        newErrors.car_number = "Format must be 1A-1234.";
      //Database Check for Duplicate (Only if no format error and it's a new car)
      if (!newErrors.car_number && !currentId) {
        try {
          const response = await apiClient.get("/cars", {
            params: { search: car_number.trim() }
          });
          const rawCars = response.data.data || [];
          const isDuplicate = rawCars.some(
            (c: any) => c.car_number?.toLowerCase() === car_number.trim().toLowerCase()
          );

          if (isDuplicate) {
            newErrors.car_number =
              "Duplicate license plate numbers are not allowed.";
          }
        } catch (err) {
          console.error("Error checking duplicate plate number:", err);
        }
      }

      // township and location Validations
      if (!form.township) newErrors.township = "Township is required.";
      if (!location.trim()) newErrors.location = "Location is required.";
      const errorMessages = Object.values(newErrors).filter(
        (msg) => typeof msg === "string",
      );

      if (errorMessages.length > 0) {
        setErrors(newErrors);
        if (
          Object.values(newErrors).some((x) => x !== null && x !== undefined)
        ) {
          setErrors(newErrors);

          // Toast message for required inputs
          setToastMessage("Please fill all required (*) inputs.");
          setToastType("warning");
          setToastVisible(true);
          setIsSubmitting(false);
          return;
        }
      }

      // Check current authenticated user session
      if (!user) throw new Error("You must be logged in to add a car.");

      // 1. Upload local images to Cloudinary first
      const finalImages = await uploadLocalImages(currentId || "");

      // 2. Prepare Data for API
      const finalBrand = isOtherBrand ? customBrand.trim() : brand.trim();
      const finalModel =
        isOtherBrand || isOtherModel ? customModel.trim() : model.trim();

      const carData = {
        brand: finalBrand,
        model: finalModel,
        car_type: car_type.trim(),
        seats: seatNum,
        pricePerDay: priceNum, // backend expects camelCase pricePerDay
        postal_code: form.township,
        location: location.trim(),
        description: description.trim(),
        status: "Pending",
        has_ac,
        car_number: car_number.trim(),
        images: finalImages.map((img) => ({
          id: img.id,
          image_url: img.image_url,
          is_primary: img.is_primary ?? false,
        })),
      };

      let activeId = currentId;

      // 3. Save/Update via API
      if (currentId) {
        await apiClient.patch(`/cars/${currentId}`, carData);
      } else {
        const response = await apiClient.post("/cars", carData);
        activeId = response.data.id;
        setCurrentId(activeId);
      }

      setIsSuccess(true);
      setHasUnsavedChanges(false);

      // Invalidate React Query cache to automatically refetch cars list
      queryClient.invalidateQueries({ queryKey: ["owner_cars"] });
      queryClient.invalidateQueries({ queryKey: ["car_details", activeId] });

      setToastMessage("Car submitted successfully.");
      setToastType("success");
      setToastVisible(true);
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (error: any) {
      // NETWORK ERROR INTERCEPTION
      if (
        error.message &&
        (error.message.includes("fetch") ||
          error.message.includes("Network request failed") ||
          error.message.includes("Network Error"))
      ) {
        setAlert({
          visible: true,
          title: "Network Failed",
          message:
            "Network request failed. Please check your internet connection.",
          type: "error",
          actions: [{ text: "OK" }],
        });
      } else {
        // Handle other validation or database errors
        setToastMessage(error.response?.data?.message || error.message || "Something went wrong");
        setToastType("error");
        setToastVisible(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VStack className="flex-1 bg-brand-0">
      <Stack.Screen
        options={{
          headerShown: false,
          headerBackButtonMenuEnabled: false,
          gestureEnabled: false,
        }}
      />

      {/* Render Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
      {/* Alert Model */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        actions={alert.actions}
        onClose={() =>
          setAlert((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />
      {/* HEADER */}
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1 }}
        className="bg-brand-0"
      >
        <HStack className="items-center justify-between px-5 h-16">
          <BackButton />
          <Heading className="text-brand-700 text-[18px] font-bold text-center flex-1 pr-6">
            Add New Car
          </Heading>
        </HStack>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -40} // Adjust offset as needed
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <VStack className="space-y-4 mt-8 w-full block px-10 pb-10">
              {/* Image Section */}
              <FormControl isInvalid={!!errors.images}>
                <VStack className="space-y-2 mb-4">
                  <Text className="font-bold text-typography-900 mb-3">
                    Upload Car Image{" "}
                    <Text className="text-red-500 font-bold text-[14px]">
                      *
                    </Text>
                  </Text>

                  <View
                    className={`relative w-full h-48 rounded-2xl overflow-hidden mb-2 bg-transparent border ${errors.images ? "border-error-600 " : "border-outline-300"
                      }`}
                  >
                    {images.find(
                      (i) => i.is_primary && (i.image_url || i.uri),
                    ) ? (
                      <>
                        <Image
                          source={{
                            uri:
                              images.find((i) => i.is_primary).image_url ||
                              images.find((i) => i.is_primary).uri,
                          }}
                          className="w-full h-full object-cover"
                        />
                        <Pressable
                          disabled={isSubmitting}
                          onPress={() => {
                            const img = images.find((i) => i.is_primary);
                            if (!img) return;
                            setAlert({
                              visible: true,
                              title: "Delete Image",
                              message:
                                "Are you sure you want to delete this image?",
                              type: "warning",
                              actions: [
                                {
                                  text: "No",
                                  type: "cancel",
                                  onPress: () => {
                                    setAlert((prev) => ({
                                      ...prev,
                                      visible: false,
                                    }));
                                  },
                                },
                                {
                                  text: "Yes",
                                  type: "destructive",
                                  onPress: () => {
                                    setAlert((prev) => ({
                                      ...prev,
                                      visible: false,
                                    }));
                                    handleDeleteImage(img);
                                  },
                                },
                              ],
                            });
                          }}
                          className="absolute top-3 right-3 bg-black/30 w-8 h-8 rounded-full items-center justify-center"
                        >
                          <TrashIcon size={16} className="text-error-600" />
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        disabled={isSubmitting}
                        onPress={() => handlePickAndUpload(true)}
                        className="flex-1 items-center justify-center"
                      >
                        <PlusIcon size={28} className="text-brand-700" />
                      </Pressable>
                    )}
                  </View>

                  <HStack className="justify-between" style={{ gap: 12 }}>
                    {[0, 1].map((index) => {
                      const secondaryImages = images.filter(
                        (i) => !i.is_primary,
                      );
                      const img = secondaryImages[index];
                      return (
                        <View
                          key={index}
                          className="flex-1 h-28 rounded-2xl overflow-hidden relative bg-transparent border border-outline-200"
                        >
                          {img && (img.image_url || img.uri) ? (
                            <>
                              <Image
                                source={{ uri: img.image_url || img.uri }}
                                className="w-full h-full object-cover"
                              />
                              <Pressable
                                disabled={isSubmitting}
                                onPress={() => {
                                  setAlert({
                                    visible: true,
                                    title: "Delete Image",
                                    message:
                                      "Are you sure you want to delete this image?",
                                    type: "warning",
                                    actions: [
                                      {
                                        text: "No",
                                        type: "cancel",
                                        onPress: () => {
                                          setAlert((prev) => ({
                                            ...prev,
                                            visible: false,
                                          }));
                                        },
                                      },
                                      {
                                        text: "Yes",
                                        type: "destructive",
                                        onPress: () => {
                                          setAlert((prev) => ({
                                            ...prev,
                                            visible: false,
                                          }));
                                          handleDeleteImage(img);
                                        },
                                      },
                                    ],
                                  });
                                }}
                                className="absolute top-2 right-2 bg-black/30 w-7 h-7 rounded-full items-center justify-center"
                              >
                                <TrashIcon
                                  size={14}
                                  className="text-error-600"
                                />
                              </Pressable>
                            </>
                          ) : (
                            <Pressable
                              disabled={isSubmitting}
                              onPress={() => handlePickAndUpload(false)}
                              className="flex-1 items-center justify-center"
                            >
                              <PlusIcon size={24} className="text-brand-700" />
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </HStack>

                  {/* IMAGE ERROR */}
                  {errors.images && (
                    <FormControlError>
                      <FormControlErrorIcon as={AlertCircle} />
                      <FormControlErrorText>
                        {errors.images}
                      </FormControlErrorText>
                    </FormControlError>
                  )}
                </VStack>
              </FormControl>
              {/* Brand */}
              <FormControl
                className="w-full block mt-5"
                isInvalid={
                  !!errorfield.brand ||
                  !!errors.brand ||
                  !!errorfield.customBrand ||
                  !!errors.customBrand
                }
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Brand
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => openModal("brand")}
                  className={`rounded-lg border h-12 flex-row justify-between items-center px-3 mb-1 ${errors.brand ? "border-error-600" : "border-outline-300"}`}
                >
                  <Text
                    className={`text-[13px] font-medium ${brand ? "text-typography-900" : "text-typography-400"
                      }`}
                  >
                    {brand || "Select Brand"}
                  </Text>
                  <ChevronDownIcon size={18} className="text-typography-gray" />
                </Pressable>
                {/* BRAND ERROR */}
                {(!!errorfield.brand || !!errors.brand) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.brand || errors.brand}
                    </FormControlErrorText>
                  </FormControlError>
                )}
                {/* Custom Brand Input when "Other" is selected */}
                {isOtherBrand && (
                  <>
                    <Input
                      isDisabled={isSubmitting}
                      className={`rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mt-2 mb-1 ${errors.customBrand
                        ? "border-error-600"
                        : "border-outline-300"
                        }`}
                    >
                      <InputField
                        ref={customBrandRef}
                        className="text-[13px] placeholder:text-typography-400 font-medium"
                        value={customBrand}
                        editable={!isSubmitting}
                        onChangeText={(v) => {
                          setCustomBrand(v);
                          setErrors({ ...errors, customBrand: null });
                          validateField("customBrand", v, 20);
                        }}
                        placeholder="Enter custom brand name"
                      />
                    </Input>
                    {(!!errorfield.customBrand || !!errors.customBrand) && (
                      <FormControlError>
                        <FormControlErrorIcon as={AlertCircle} />
                        <FormControlErrorText>
                          {errorfield.customBrand || errors.customBrand}
                        </FormControlErrorText>
                      </FormControlError>
                    )}
                  </>
                )}
              </FormControl>
              {/* Model */}
              <FormControl
                className="w-full block mt-3"
                isInvalid={
                  !!errorfield.model ||
                  !!errors.model ||
                  !!errorfield.customModel ||
                  !!errors.customModel
                }
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Model
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                {/* Show selector only when brand is set and not "Other" */}
                {!isOtherBrand && (
                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => (brand ? openModal("model") : null)}
                    className={`rounded-lg border h-12 flex-row justify-between items-center px-3 mb-1 ${errors.model ? "border-error-600" : "border-outline-300"
                      } ${!brand ? "opacity-50" : ""}`}
                  >
                    <Text
                      className={`text-[13px] font-medium ${model ? "text-typography-900" : "text-typography-400"
                        }`}
                    >
                      {model || (brand ? "Select Model" : "Select Brand first")}
                    </Text>
                    <ChevronDownIcon
                      size={18}
                      className="text-typography-gray"
                    />
                  </Pressable>
                )}
                {/* MODEL ERROR */}
                {(!!errorfield.model || !!errors.model) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.model || errors.model}
                    </FormControlErrorText>
                  </FormControlError>
                )}
                {/* Custom Model Input when model or brand is "Other" */}
                {(isOtherModel || isOtherBrand) && (
                  <>
                    <Input
                      isDisabled={isSubmitting}
                      className={`rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mt-2 mb-1 ${errors.customModel
                        ? "border-error-600"
                        : "border-outline-300"
                        }`}
                    >
                      <InputField
                        ref={customModelRef}
                        className="text-[13px] placeholder:text-typography-400 font-medium"
                        value={customModel}
                        editable={!isSubmitting}
                        onChangeText={(v) => {
                          setCustomModel(v);
                          setErrors({ ...errors, customModel: null });
                          validateField("customModel", v, 20);
                        }}
                        placeholder="Enter custom model name"
                      />
                    </Input>
                    {(!!errorfield.customModel || !!errors.customModel) && (
                      <FormControlError>
                        <FormControlErrorIcon as={AlertCircle} />
                        <FormControlErrorText>
                          {errorfield.customModel || errors.customModel}
                        </FormControlErrorText>
                      </FormControlError>
                    )}
                  </>
                )}
              </FormControl>
              {/* Car Type */}
              <FormControl
                className="w-full block mt-3"
                isInvalid={!!errorfield.car_type || !!errors.car_type}
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Car Type
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                <Input
                  isDisabled={isSubmitting}
                  className="rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mb-2"
                >
                  <InputField
                    className="text-[13px] placeholder:text-typography-400 font-medium"
                    value={car_type}
                    editable={!isSubmitting}
                    onChangeText={(v) => {
                      setCarType(v);
                      setErrors({ ...errors, car_type: null });
                      validateField("car_type", v, 20);
                    }}
                    placeholder="Sport"
                  />
                </Input>
                {(!!errorfield.car_type || !!errors.car_type) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.car_type || errors.car_type}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
              {/* Seats */}
              <FormControl
                className="w-full block mt-3"
                isInvalid={!!errorfield.seats || !!errors.seats}
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Seats
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                <Input
                  isDisabled={isSubmitting}
                  className={`rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mb-1 ${errors.seats ? "border-error-600" : "border-outline-300"}`}
                >
                  <InputField
                    className="text-[13px] placeholder:text-typography-400 font-medium"
                    value={seats}
                    editable={!isSubmitting}
                    onChangeText={(v) => {
                      setSeats(v);
                      setErrors({ ...errors, seats: null });
                      validateField("seats", v, 2);
                    }}
                    placeholder="Seats must be between 1 to 12"
                    keyboardType="numeric"
                  />
                </Input>
                {/* SEATS ERROR */}
                {(!!errorfield.seats || !!errors.seats) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.seats || errors.seats}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
              {/* Air Conditioning Toggle */}
              <HStack className="border border-outline-200 p-4 rounded-xl justify-between items-center mt-5 mb-5 ">
                <VStack>
                  <Text className="font-bold text-typography-900 uppercase">
                    Air Conditioning
                  </Text>
                  <Text className="text-typography-500 text-sm">Included</Text>
                </VStack>
                <Switch
                  trackColor={{ false: "#ebebeb", true: "#16a8e3" }}
                  value={has_ac}
                  disabled={isSubmitting}
                  onValueChange={(val) => setHasAc(val)}
                />
              </HStack>
              {/* Car Number */}
              <FormControl
                className="w-full block mt-1"
                isInvalid={!!errorfield.car_number || !!errors.car_number}
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Car Number
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                <Input
                  isDisabled={isSubmitting}
                  className={`rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mb-1 ${errors.car_number ? "border-error-600" : "border-outline-300"}`}
                >
                  <InputField
                    className="text-[13px] placeholder:text-typography-400 font-medium"
                    value={car_number}
                    editable={!isSubmitting}
                    onChangeText={(v) => {
                      setCarNumber(v);
                      setErrors({ ...errors, car_number: null });
                      validateField("car_number", v, 7);
                    }}
                    placeholder="1A-1234"
                  />
                </Input>
                {/* CAR NUMBER ERROR */}
                {(!!errorfield.car_number || !!errors.car_number) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.car_number || errors.car_number}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
              {/* Price Per Day */}
              <FormControl
                className="w-full block mt-3"
                isInvalid={!!errorfield.price_per_day || !!errors.price_per_day}
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Price Per Day (MMK)
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                <Input
                  isDisabled={isSubmitting}
                  className={`rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mb-1 ${errors.price_per_day ? "border-error-600" : "border-outline-300"}`}
                >
                  <InputField
                    className="text-[13px] placeholder:text-typography-400 font-medium"
                    value={price_per_day}
                    editable={!isSubmitting}
                    onChangeText={(v) => {
                      setPricePerDay(v);
                      setErrors({ ...errors, price_per_day: null });
                      validateField("price_per_day", v, 7);
                    }}
                    keyboardType="numeric"
                    placeholder="10000"
                  />
                </Input>
                {/* PRICE PER DAY ERROR */}
                {(!!errorfield.price_per_day || !!errors.price_per_day) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.price_per_day || errors.price_per_day}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
              {/* Township  */}
              <FormControl
                className="w-full block mt-3"
                isInvalid={!!errors.township}
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Township
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => openModal("township")}
                  className={`rounded-lg border h-12 flex-row justify-between items-center px-3 mb-1
                 ${errors.township ? "border-error-500" : "border-outline-300"}`}
                >
                  <Text className="text-sm">
                    {yangonTownships.find((t) => t.postalCode === form.township)
                      ?.name || "Select Township"}
                  </Text>
                  <ChevronDownIcon size={18} className="text-typography-gray" />
                </Pressable>
                {/* TOWNSHIP ERROR */}
                {errors.township && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errors.township}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
              {/* Location */}
              <FormControl
                className="w-full block mt-3"
                isInvalid={!!errorfield.location || !!errors.location}
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Location
                  </FormControlLabelText>
                  <Text className="text-red-500 font-bold text-[14px]"> *</Text>
                </FormControlLabel>
                <Textarea
                  isDisabled={isSubmitting}
                  className={`rounded-xl border-outline-300 data-[focus=true]:border-sky-500 p-2 bg-transparent h-[120px]
                 ${errors.location ? "border-error-500" : "border-outline-300 mb-1"}`}
                >
                  <TextareaInput
                    value={location}
                    editable={!isSubmitting}
                    onChangeText={(v) => {
                      setLocation(v);
                      setErrors({ ...errors, location: null });
                      validateField("location", v, 100);
                    }}
                    placeholder="Enter street name, ward or building number..."
                    multiline={true}
                    scrollEnabled={true}
                    className="text-[13px] p-3"
                  />
                </Textarea>
                <Text className="text-right text-xs text-typography-400 ">
                  {location.length}/100
                </Text>
                {/* LOCATION ERROR */}
                {(!!errorfield.location || !!errors.location) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.location || errors.location}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
              {/* Description */}
              <FormControl
                className="w-full block mt-3"
                isInvalid={!!errorfield.description || !!errors.description}
              >
                <FormControlLabel className="mb-2 w-full flex-row">
                  <FormControlLabelText className="font-extrabold text-typography-900 text-[13px]">
                    Description
                  </FormControlLabelText>
                </FormControlLabel>
                <Textarea
                  isDisabled={isSubmitting}
                  className="rounded-xl border-outline-300 data-[focus=true]:border-sky-500 p-2 bg-transparent h-[120px]"
                >
                  <TextareaInput
                    value={description}
                    editable={!isSubmitting}
                    onChangeText={(v) => {
                      setDescription(v);
                      setErrors({ ...errors, description: null });
                      validateField("description", v, 100);
                    }}
                    placeholder="Describe car details, features, condition..."
                    multiline={true}
                    scrollEnabled={true}
                    className="text-[13px] p-3"
                  />
                </Textarea>
                <Text className="text-right text-xs text-typography-400 ">
                  {description.length}/100
                </Text>
                {/* DESCRIPTION ERROR */}
                {(!!errorfield.description || !!errors.description) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.description || errors.description}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
              {/* Save Button */}
              <Button
                className="rounded-md bg-brand-700 h-12 px-10 self-center items-center justify-center border-none shadow-none mt-4"
                onPress={handleSaveData}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <HStack space="sm" className="items-center">
                    <ActivityIndicator className="text-brand-0" size="small" />
                    <ButtonText className="font-semibold text-white text-[15px]">
                      Loading...
                    </ButtonText>
                  </HStack>
                ) : (
                  <ButtonText className="font-semibold text-white text-[15px]">
                    Add Car
                  </ButtonText>
                )}
              </Button>
            </VStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <SelectorModal
        visible={modals.township}
        onClose={() => setModals((prev) => ({ ...prev, township: false }))}
        title="Select Township"
        options={yangonTownships}
        onSelect={(selectedItem: { name: string; postalCode: string }) => {
          setForm({ ...form, township: selectedItem.postalCode });
          setErrors((prev: any) => ({ ...prev, township: null }));
          setModals((prev) => ({ ...prev, township: false }));
        }}
      />

      {/* Brand Selector Modal */}
      <SelectorModal
        visible={modals.brand}
        onClose={() => setModals((prev) => ({ ...prev, brand: false }))}
        title="Select Brand"
        options={brandList}
        selectedValue={brand}
        labelField="name"
        onSelect={(selectedItem: string) => {
          setBrand(selectedItem);

          if (selectedItem === "Other") {
            setModel("Other");
            setTimeout(() => customBrandRef.current?.focus(), 100);
          } else {
            setModel("");
            setCustomBrand("");
            setCustomModel("");
          }

          setErrors((prev: any) => ({
            ...prev,
            brand: null,
            customBrand: null,
            model: null,
            customModel: null,
          }));

          setModals((prev) => ({ ...prev, brand: false }));
        }}
      />

      {/* Model Selector Modal */}
      <SelectorModal
        visible={modals.model}
        onClose={() => setModals((prev) => ({ ...prev, model: false }))}
        title="Select Model"
        options={modelList}
        selectedValue={model}
        labelField="name"
        onSelect={(selectedItem: string) => {
          setModel(selectedItem);

          if (selectedItem === "Other") {
            setTimeout(() => customModelRef.current?.focus(), 100);
          } else {
            setCustomModel("");
          }

          setErrors((prev: any) => ({
            ...prev,
            model: null,
            customModel: null,
          }));

          setModals((prev) => ({ ...prev, model: false }));
        }}
      />
    </VStack>
  );
}
