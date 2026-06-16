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
import { supabase } from "@/lib/supabase";
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
import React, { useEffect, useState } from "react";
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

export default function EditCarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // FORM STATES
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
  const [status, setStatus] = useState(true);
  const [has_ac, setHasAc] = useState(true);
  const [form, setForm] = useState({ township: "" });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<any[]>([]);
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
  const [initialData, setInitialData] = useState<any>(null);
  const primaryImage = images.find(
    (i) =>
      i.is_primary &&
      ((i.image_url && i.image_url.trim() !== "") ||
        (i.uri && i.uri.trim() !== "")),
  );
  const defaultCarIcon = require("@/assets/images/icon.png");
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
  const customBrandRef = React.useRef<any>(null);
  const customModelRef = React.useRef<any>(null);
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
  // FETCH DATA
  useEffect(() => {
    if (!id) return;
    const fetchCarData = async () => {
      setLoading(true);

      // Fetch Car Details
      const { data: car, error } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();

      if (car) {
        // 1. Create the formattedData object that your code is looking for
        const formattedData = {
          brand: car.brand || "",
          model: car.model || "",
          car_type: car.car_type || "",
          car_number: car.car_number || "",
          seats: String(car.seats || ""),
          price_per_day: String(car.price_per_day || ""),
          location: car.location || "",
          description: car.description || "",
          status: car.status === "Available",
          has_ac: car.has_ac ?? true,
          township: car.postal_code || "",
        };

        // 2. Now these calls will work because 'formattedData' is defined
        const isStandardBrand = carBrands.some(
          (b) => b.brand === formattedData.brand,
        );
        if (isStandardBrand) {
          setBrand(formattedData.brand);
          const foundBrand = carBrands.find(
            (b) => b.brand === formattedData.brand,
          );
          const isStandardModel = foundBrand
            ? foundBrand.models
                .filter((m) => m !== "Other")
                .includes(formattedData.model)
            : false;
          if (isStandardModel) {
            setModel(formattedData.model);
            setCustomModel("");
          } else {
            setModel("Other");
            setCustomModel(formattedData.model);
          }
          setCustomBrand("");
        } else {
          setBrand("Other");
          setCustomBrand(formattedData.brand);
          setModel("Other");
          setCustomModel(formattedData.model);
        }

        setCarType(formattedData.car_type);
        setCarNumber(formattedData.car_number);
        setSeats(formattedData.seats);
        setPricePerDay(formattedData.price_per_day);
        setLocation(formattedData.location);
        setDescription(formattedData.description);
        setStatus(formattedData.status);
        setHasAc(formattedData.has_ac);
        setForm({ township: formattedData.township });

        // This is important for your handleSaveData logic to work
        setInitialData(formattedData);
      }

      // Fetch Images
      const { data: imgs } = await supabase
        .from("car_images")
        .select("*")
        .eq("car_id", id)
        .order("is_primary", { ascending: false });

      // if (imgs) setImages(imgs);
      if (imgs && imgs.length > 0) {
        const cleaned = imgs.map((img, index) => ({
          ...img,
          is_primary: index === 0, // FORCE ONLY ONE PRIMARY
        }));

        setImages(cleaned);
      }
      setLoading(false);
    };

    fetchCarData();
  }, [id]);

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

      if (result.canceled || !result.assets[0].base64) return;

      const file = result.assets[0];
      const rawExt = file.uri.split(".").pop()?.toLowerCase();

      // VALIDATION: File size (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      const base64Str = file.base64 || "";
      const fileSize = file.fileSize ?? Math.ceil((base64Str.length * 3) / 4); // fallback: estimate from base64
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

      // VALIDATION: Only allow jpg, jpeg
      const allowedExtensions = ["jpg", "jpeg"];
      if (file.mimeType === "image/svg+xml") {
        setAlert({
          visible: true,
          title: "Image File Size Error",
          message: "File size must be less than 5MB.",
          type: "error",
          actions: [{ text: "OK" }],
        });

        return;
      }

      const uri = file.uri || "";
      const base64 = file.base64 || "";
      const mime = (file.mimeType || "").toLowerCase();

      const isAllowedMime = mime === "image/jpeg" || mime === "image/jpg";

      const isSvg =
        mime.includes("svg") ||
        uri.toLowerCase().includes(".svg") ||
        (base64 ? base64.startsWith("PHN2Zy") : false);

      // Block if NOT jpeg OR if it looks like an SVG
      if (!isAllowedMime || isSvg) {
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
    setImages((prev: any[]) => {
      let updated = prev.filter((i) => {
        if (img.isLocal) return i.uri !== img.uri;
        return i.id !== img.id;
      });

      if (updated.length > 0) {
        updated = updated.map((item, index) => ({
          ...item,
          is_primary: index === 0,
        }));
      }

      return updated;
    });

    // ✅ only track DB images for backend deletion
    if (!img.isLocal && img.id) {
      setImagesToDelete((prev) => [...prev, img]);
    }
  };
  const uploadPendingImages = async (carId: string) => {
    const pending = images.filter((img) => img.isLocal);

    const primaryIndex = images.findIndex((i) => i.is_primary);

    for (let i = 0; i < pending.length; i++) {
      const img = pending[i];

      const fileName = `${carId}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${img.fileExt}`;

      const { error: storageError } = await supabase.storage
        .from("car-images")
        .upload(fileName, decode(img.base64), {
          contentType: `image/${img.fileExt}`,
        });

      if (storageError) throw storageError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("car-images").getPublicUrl(fileName);

      // ✅ IMPORTANT: force primary based on final UI order
      const isPrimary = i === 0; // first image = primary

      await supabase.from("car_images").insert([
        {
          car_id: carId,
          image_url: publicUrl,
          is_primary: isPrimary,
        },
      ]);
    }
  };

  // Track changes
  useEffect(() => {
    if (!initialData) return;

    const finalBrand = brand === "Other" ? customBrand.trim() : brand.trim();
    const finalModel =
      brand === "Other" || model === "Other"
        ? customModel.trim()
        : model.trim();

    const hasChanges =
      finalBrand !== initialData.brand ||
      finalModel !== initialData.model ||
      car_type.trim() !== initialData.car_type ||
      car_number.trim() !== initialData.car_number ||
      seats !== initialData.seats ||
      price_per_day !== initialData.price_per_day ||
      location.trim() !== initialData.location ||
      description.trim() !== initialData.description ||
      status !== initialData.status ||
      has_ac !== initialData.has_ac ||
      form.township !== initialData.township ||
      images.some((img) => img.isLocal) ||
      imagesToDelete.length > 0;

    setHasUnsavedChanges(hasChanges);
  }, [
    brand,
    model,
    customBrand,
    customModel,
    car_type,
    car_number,
    seats,
    price_per_day,
    location,
    description,
    status,
    has_ac,
    form.township,
    images,
    imagesToDelete,
    initialData,
  ]);

  //  usePreventRemove replaces beforeRemove listener
  usePreventRemove(hasUnsavedChanges && !isSubmitting, ({ data }) => {
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

  // SAVE / UPDATE HANDLER
  const handleSaveData = async () => {
    const finalBrand = brand === "Other" ? customBrand.trim() : brand.trim();
    const finalModel =
      brand === "Other" || model === "Other"
        ? customModel.trim()
        : model.trim();

    // 1. Check if any text/toggle fields changed
    const hasFieldChanges =
      finalBrand !== initialData?.brand ||
      finalModel !== initialData?.model ||
      car_type.trim() !== initialData?.car_type ||
      car_number.trim() !== initialData?.car_number ||
      seats !== initialData?.seats ||
      price_per_day !== initialData?.price_per_day ||
      location.trim() !== initialData?.location ||
      description.trim() !== initialData?.description ||
      status !== initialData?.status ||
      has_ac !== initialData?.has_ac ||
      form.township !== initialData?.township;

    // 2. Check if images were added or deleted
    const hasImageChanges =
      images.some((img) => img.isLocal) || imagesToDelete.length > 0;

    if (!hasFieldChanges && !hasImageChanges) {
      setToastMessage("You haven't made any changes to the car information.");
      setToastType("info");
      setToastVisible(true);
      return;
    }

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
      // Validations
      if (images.length === 0) {
        newErrors.images = "Car Image is required.";
      } else {
        newErrors.images = null;
      }

      // Brand validation
      if (!brand.trim()) {
        newErrors.brand = "Brand is required.";
      } else if (isOtherBrand && !customBrand.trim()) {
        newErrors.customBrand = "Please enter a brand name.";
      }

      // Model validation
      if (isOtherBrand) {
        if (!customModel.trim())
          newErrors.customModel = "Please enter a model name.";
      } else if (!model.trim()) {
        newErrors.model = "Model is required.";
      } else if (isOtherModel && !customModel.trim()) {
        newErrors.customModel = "Please enter a model name.";
      }

      if (!car_type.trim()) newErrors.car_type = "Car Type is required.";

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
        newErrors.price_per_day = "Price is invalid.";
      }

      // Format Car Number Validations
      const carPlateRegex = /^[0-9][A-Z]-[0-9]{4}$/;
      const value = car_number?.trim();
      if (!value) {
        newErrors.car_number = "Car Number is required.";
      } else if (!carPlateRegex.test(value)) {
        newErrors.car_number = "Format must be 1A-1234.";
      }

      if (!form.township) newErrors.township = "Township is required.";
      if (!location.trim()) newErrors.location = "Location is required.";

      if (Object.values(newErrors).some((x) => x !== null && x !== undefined)) {
        setErrors(newErrors);
        setToastMessage("Please fill all required (*) inputs.");
        setToastType("warning");
        setToastVisible(true);

        setIsSubmitting(false);
        return;
      }

      // Supabase deletion for removed images
      for (const img of imagesToDelete) {
        const path = img.image_url.split("car-images/")[1];
        await supabase.storage.from("car-images").remove([path]);
        await supabase.from("car_images").delete().eq("id", img.id);
      }

      // Update Database
      const { error } = await supabase
        .from("cars")
        .update({
          brand: finalBrand,
          model: finalModel,
          car_type: car_type.trim(),
          seats: seatNum,
          price_per_day: priceNum,
          postal_code: form.township,
          location: location.trim(),
          description: description.trim(),
          status:
            initialData?.status === "Pending"
              ? "Pending"
              : status
                ? "Available"
                : "Unavailable",
          has_ac,
          car_number: car_number.trim(),
        })
        .eq("id", id);

      if (error) throw error;

      await uploadPendingImages(id!);
      setHasUnsavedChanges(false);

      // Invalidate React Query cache to automatically refetch details and list screens in the background
      queryClient.invalidateQueries({ queryKey: ["car_details", id] });
      queryClient.invalidateQueries({ queryKey: ["owner_cars"] });

      setToastMessage("Car updated successfully.");
      setToastType("success");
      setToastVisible(true);
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (error: any) {
      // Network & Other Errors Handling
      if (
        error.message.includes("fetch") ||
        error.message.includes("Network")
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
        setToastMessage(error.message || "Something went wrong");
        setToastType("error");
        setToastVisible(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Toggle Component
  const StatusToggle = React.memo(
    ({
      status,
      onChange,
    }: {
      status: boolean;
      onChange: (val: boolean) => void;
    }) => {
      return (
        <HStack className="bg-green-50 border border-green-200 p-4 rounded-xl justify-between items-center">
          <VStack>
            <Text className="font-bold text-typography-900">
              Vehicle Status
            </Text>
            <Text className="text-typography-500 text-sm">
              {status ? "Available" : "Unavailable"}
            </Text>
          </VStack>

          <Switch
            trackColor={{
              false: "#D4D4D4",
              true: "rgb(var(--color-success-500))",
            }}
            value={status}
            disabled={isSubmitting}
            onValueChange={onChange}
          />
        </HStack>
      );
    },
  );
  return (
    <VStack className="flex-1 bg-brand-0">
      <Stack.Screen
        options={{
          headerShown: false,
          headerBackButtonMenuEnabled: false,
          gestureEnabled: false,
        }}
      />

      {/* LOADING OVERLAY */}
      {loading && (
        <View className="absolute inset-0 justify-center items-center bg-white z-50">
          <ActivityIndicator size="large" />
        </View>
      )}
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
            Edit Car Detail
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
                    Change Car Image{" "}
                    <Text className="text-red-500 font-bold text-[14px]">
                      *
                    </Text>
                  </Text>

                  <View
                    className={`relative w-full h-48 rounded-2xl overflow-hidden mb-2 bg-transparent border ${
                      errors.images ? "border-error-600" : "border-outline-300"
                    }`}
                  >
                    {primaryImage ? (
                      <>
                        <Image
                          source={{
                            uri: primaryImage.image_url || primaryImage.uri,
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
                        {/* <GluestackImage
                        source={defaultCarIcon}
                        alt="No Car Image"
                        className="w-20 h-20 opacity-50"
                        resizeMode="contain"
                      /> */}
                        <PlusIcon size={28} className="text-brand-700" />
                      </Pressable>
                    )}
                  </View>

                  <HStack className="justify-between" style={{ gap: 12 }}>
                    {[0, 1].map((index) => {
                      const secondaryImages = images.filter(
                        (_, index) => index !== 0,
                      );
                      const img = secondaryImages[index];

                      return (
                        <View
                          key={index}
                          className="flex-1 h-28 rounded-2xl overflow-hidden relative bg-transparent border border-outline-200"
                        >
                          {img ? (
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

              {/* Status Toggle */}
              <StatusToggle
                status={status}
                onChange={(val: boolean) => {
                  // Added boolean type here
                  setStatus(val);
                  setHasUnsavedChanges(true);
                }}
              />

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
                    className={`text-[13px] font-medium ${
                      brand ? "text-typography-900" : "text-typography-400"
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
                      className={`rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mt-2 mb-1 ${
                        errors.customBrand
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
                        placeholder="Enter New Brand Name"
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
                    className={`rounded-lg border h-12 flex-row justify-between items-center px-3 mb-1 ${
                      errors.model ? "border-error-600" : "border-outline-300"
                    } ${!brand ? "opacity-50" : ""}`}
                  >
                    <Text
                      className={`text-[13px] font-medium ${
                        model ? "text-typography-900" : "text-typography-400"
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
                      className={`rounded-lg border-outline-300 data-[focus=true]:border-sky-500 h-12 bg-transparent w-full mt-2 mb-1 ${
                        errors.customModel
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
                        placeholder="Enter New Model Name"
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
                      setErrors({ ...errors, location: null });
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
                    placeholder="1 to 12"
                    keyboardType="numeric"
                  />
                </Input>
                {(!!errorfield.seats || !!errors.seats) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.seats || errors.seats}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Air Conditioning */}
              <HStack className="border border-outline-200 p-4 rounded-xl justify-between items-center  mt-5 mb-5">
                <VStack>
                  <Text className="font-bold text-typography-900 uppercase">
                    Air Conditioning
                  </Text>
                  <Text className="text-typography-500 text-sm">Included</Text>
                </VStack>
                <Switch
                  trackColor={{ false: "#D4D4D4", true: "#16a8e3" }}
                  value={has_ac}
                  disabled={isSubmitting}
                  onValueChange={setHasAc}
                />
              </HStack>

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
                {(!!errorfield.price_per_day || !!errors.price_per_day) && (
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircle} />
                    <FormControlErrorText>
                      {errorfield.price_per_day || errors.price_per_day}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Township */}
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
                    className="text-[13px] p-3"
                  />
                </Textarea>
                <Text className="text-right text-xs text-typography-400 ">
                  {location.length}/100
                </Text>
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
                  <FormControlLabelText className="font-bold">
                    Description (Optional)
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
                    placeholder="Describe car details..."
                    multiline={true}
                    className="text-[13px] p-3"
                  />
                </Textarea>
                <Text className="text-right text-xs text-typography-400 ">
                  {description.length}/100
                </Text>
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
                className="rounded-md bg-brand-700 h-12 px-10 self-center items-center justify-center mt-4"
                onPress={handleSaveData}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <HStack space="sm" className="items-center">
                    <ActivityIndicator color="white" size="small" />
                    <ButtonText className="font-semibold text-white text-[15px]">
                      Loading...
                    </ButtonText>
                  </HStack>
                ) : (
                  <ButtonText className="font-semibold text-white text-[15px]">
                    Save Changes
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
