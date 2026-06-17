import { AlertModal } from "@/components/AlertModal";
import { SelectorModal } from "@/components/SelectorModal";
import { Button } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { CircleIcon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import {
  Radio,
  RadioGroup,
  RadioIcon,
  RadioIndicator,
  RadioLabel,
} from "@/components/ui/radio";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { VStack } from "@/components/ui/vstack";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

let inquiry_types: any[] = [];
const BOOKING_REQUIRED_TYPES = new Set([
  "service_issue",
  "car_issue",
  "driver_issue",
  "customer_issue",
]);
const validateType = (value: string) =>
  value ? "" : "Please select an inquiry type.";

const validateMessage = (value: string) =>
  value.trim() ? "" : "Please enter a message.";

const validateBookingId = (value: string, type: string) =>
  BOOKING_REQUIRED_TYPES.has(type) && !value.trim()
    ? "Please enter a booking ID."
    : "";

const Inquiry = () => {
  const { bookingId: bookingIdParam, submitted } = useLocalSearchParams<{
    bookingId?: string;
    submitted?: string;
  }>();
  const bookingIdFromParam = bookingIdParam || "";
  const [selectedType, setSelectedType] = useState<string>("");
  const selectedTypeLabel =
    inquiry_types.find((item) => item.value === selectedType)?.label || "";
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [typeError, setTypeError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [bookingIdError, setBookingIdError] = useState("");
  const [touchedFields, setTouchedFields] = useState({
    type: false,
    bookingId: false,
    message: false,
  });
  const [category, setCategory] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const user = useAuthStore((state) => state.user);
  const isOwner = useAuthStore((state) => state.profile?.role === "car_owner");
  const isSubmitted = submitted === "true";
  const requiresBookingId = BOOKING_REQUIRED_TYPES.has(selectedType);

  const markTouched = (field: keyof typeof touchedFields) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  if (!category) {
    if (isOwner) {
      inquiry_types = [
        { label: "Customer Issue", value: "customer_issue" },
        { label: "App Issue", value: "app_issue" },
        { label: "Other", value: "other" },
      ];
    } else {
      inquiry_types = [
        { label: "Service Issue", value: "service_issue" },
        { label: "Car Issue", value: "car_issue" },
        { label: "Driver Issue", value: "driver_issue" },
        { label: "App Issue", value: "app_issue" },
        { label: "Other", value: "other" },
      ];
    }
  } else if (category === "service_issue") {
    inquiry_types = [
      { label: "Service Issue", value: "service_issue" },
      { label: "Car Issue", value: "car_issue" },
      { label: "Driver Issue", value: "driver_issue" },
    ];
  } else if (category === "other_issue") {
    inquiry_types = [
      { label: "App Issue", value: "app_issue" },
      { label: "Other", value: "other" },
    ];
  } else if (category === "customer_issue") {
    inquiry_types = [{ label: "Customer Issue", value: "customer_issue" }];
  }

  useEffect(() => {
    if (!bookingIdFromParam) return;

    setBookingId(bookingIdFromParam);

    if (isOwner) {
      setCategory("customer_issue");
      setSelectedType("customer_issue");
    } else {
      setCategory("service_issue");
      setSelectedType("service_issue");
    }
  }, [bookingIdFromParam, isOwner]);

  useEffect(() => {
    if (isSubmitted) {
      setToastVisible(true);
      setToastMessage(
        "Your inquiry has been received. We will process it shortly.",
      );
    }
  }, [isSubmitted]);

  useEffect(() => {
    if (category === "customer_issue") {
      setSelectedType("customer_issue");
    }
  }, [category]);

  useEffect(() => {
    if (!touchedFields.type) return;
    setTypeError(validateType(selectedType));
  }, [selectedType, touchedFields.type]);

  useEffect(() => {
    if (!touchedFields.message) return;
    setMessageError(validateMessage(message));
  }, [message, touchedFields.message]);

  useEffect(() => {
    if (!touchedFields.bookingId) return;
    setBookingIdError(validateBookingId(bookingId, selectedType));
  }, [bookingId, selectedType, touchedFields.bookingId]);

  const submit = async () => {
    if (submitting) return; // Prevent multiple submissions
    setSubmitting(true);

    setTouchedFields({
      type: true,
      bookingId: true,
      message: true,
    });

    const nextTypeError = validateType(selectedType);
    const nextBookingIdError = validateBookingId(bookingId, selectedType);
    const nextMessageError = validateMessage(message);

    setTypeError(nextTypeError);
    setBookingIdError(nextBookingIdError);
    setMessageError(nextMessageError);

    if (nextTypeError || nextBookingIdError || nextMessageError) {
      setSubmitting(false);
      return;
    }

    if (requiresBookingId) {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId.trim())
        .single();

      if (error || !booking) {
        setBookingIdError("No booking found with the provided ID.");
        setSubmitting(false);
        return;
      }
    }

    try {
      // console.log("Submitting inquiry with data:", {
      //   submitted_user_id: user?.id,
      //   type: selectedType,
      //   content: message.trim(),
      //   booking_id:
      //     category === "service_issue" || category === "customer_issue"
      //       ? bookingId.trim()
      //       : null,
      //   status: "opened",
      // });
      const { error } = await supabase.from("inquiries").insert({
        submitted_user_id: user?.id,
        type: selectedType,
        content: message.trim(),
        booking_id:
          category === "service_issue" || category === "customer_issue"
            ? bookingId.trim()
            : null,
        status: "opened",
      });
      if (error) {
        setMessageError("Failed to submit inquiry. Please try again.");
        console.error("Error submitting inquiry:", error);
      } else {
        setCategory("");
        setSelectedType("");
        setBookingId("");
        setMessage("");
        setTouchedFields({
          type: false,
          bookingId: false,
          message: false,
        });
        router.replace("/(protected)/(home)/inquiry?submitted=true");
      }
    } catch (error) {
      setMessageError("An unexpected error occurred. Please try again.");
      console.error("Error submitting inquiry:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={["bottom"]}>
      <KeyboardAwareScrollView
        bottomOffset={30}
        style={{ flex: 1 }}
        className="bg-brand-50"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="px-6 py-6  gap-4">
          <View className="px-6 py-6 gap-6 bg-white dark:bg-neutral-900 rounded-2xl border border-[rgba(0,0,0,0.08)]">
            <VStack className="gap-3">
              <Text className="text-typography-800 font-semibold text-md">
                This inquiry is related with
              </Text>
              <RadioGroup
                value={category}
                onChange={(value: string) => {
                  setCategory(value);
                  setSelectedType("");
                  setBookingIdError("");
                  markTouched("type");
                }}
              >
                <HStack className="justify-around">
                  {isOwner ? (
                    <Radio
                      value="customer_issue"
                      size="md"
                      isInvalid={false}
                      isDisabled={false}
                    >
                      <RadioIndicator>
                        <RadioIcon as={CircleIcon} />
                      </RadioIndicator>
                      <RadioLabel>Customer Issue</RadioLabel>
                    </Radio>
                  ) : (
                    <Radio
                      value="service_issue"
                      size="md"
                      isInvalid={false}
                      isDisabled={false}
                    >
                      <RadioIndicator>
                        <RadioIcon as={CircleIcon} />
                      </RadioIndicator>
                      <RadioLabel>Service Issue</RadioLabel>
                    </Radio>
                  )}
                  <Radio
                    value="other_issue"
                    size="md"
                    isInvalid={false}
                    isDisabled={false}
                  >
                    <RadioIndicator>
                      <RadioIcon as={CircleIcon} />
                    </RadioIndicator>
                    <RadioLabel>Other Issue</RadioLabel>
                  </Radio>
                </HStack>
              </RadioGroup>
            </VStack>
            <VStack className="gap-3">
              <Text className="text-typography-800 font-semibold text-md">
                Type
              </Text>
              <Pressable
                onPress={() => {
                  markTouched("type");
                  setShowTypeModal(true);
                }}
                className={`rounded-lg border bg-white min-h-[48px] px-4 justify-center ${typeError ? "border-red-500" : "border-typography-300"}`}
              >
                <Text
                  className={
                    selectedTypeLabel
                      ? "text-typography-900 text-base"
                      : "text-typography-500 text-base"
                  }
                >
                  {selectedTypeLabel || "Choose the complaint types"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color="#9CA3AF"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                />
              </Pressable>
              {typeError ? (
                <Text className="text-red-500 text-sm mt-1">{typeError}</Text>
              ) : null}
            </VStack>

            {selectedType && requiresBookingId && (
              <VStack className="gap-3">
                <Text className="text-typography-800 font-semibold text-md">
                  Booking ID
                </Text>
                <Input
                  variant="outline"
                  size="md"
                  className={`rounded-lg border border-typography-300 bg-white h-12 data-[focus=true]:border-brand-700 ${bookingIdError ? "border-red-500" : ""}`}
                >
                  <InputField
                    value={bookingId}
                    onChangeText={(value) => {
                      markTouched("bookingId");
                      setBookingId(value);
                    }}
                    placeholder="Enter related booking id"
                    placeholderTextColor="#9CA3AF"
                    className="pl-3 ios:leading-tight text-typography-900"
                  />
                </Input>
                {bookingIdError ? (
                  <Text className="text-red-500 text-sm mt-1">
                    {bookingIdError}
                  </Text>
                ) : null}
              </VStack>
            )}

            <VStack className="gap-3">
              <Text className="text-typography-800 font-semibold text-md">
                Message
              </Text>
              <Textarea
                variant="default"
                size="md"
                className={`rounded-lg border border-typography-300 bg-white data-[focus=true]:border-brand-700 ${messageError ? "border-red-500" : ""}`}
              >
                <TextareaInput
                  value={message}
                  onChangeText={(value) => {
                    markTouched("message");
                    setMessage(value);
                  }}
                  placeholder="Enter your message"
                  placeholderTextColor="#9CA3AF"
                  className="text-base text-typography-900 px-4 py-3"
                />
              </Textarea>
              {messageError ? (
                <Text className="text-red-500 text-sm mt-1">
                  {messageError}
                </Text>
              ) : null}
            </VStack>

            <View className="flex-row gap-3">
              <Button
                action="secondary"
                variant="outline"
                size="lg"
                className="flex-1 rounded-xl border-typography-300 bg-white text-typography-900"
                onPress={() => {
                  if (!bookingIdFromParam) {
                    setSelectedType("");
                    setBookingId("");
                    setMessage("");
                    setBookingIdError("");
                    setMessageError("");
                    setTypeError("");
                    setTouchedFields({
                      type: false,
                      bookingId: false,
                      message: false,
                    });
                  } else {
                    setMessage("");
                    setMessageError("");
                    setTypeError("");
                    setBookingIdError("");
                    setTouchedFields({
                      type: false,
                      bookingId: false,
                      message: false,
                    });
                  }
                }}
              >
                <Text className="text-typography-900 text-base">Clear</Text>
              </Button>
              <Button
                action="primary"
                size="lg"
                className="flex-1 rounded-xl"
                onPress={() => submit()}
              >
                <Text className="text-white text-base">Submit</Text>
              </Button>
            </View>
          </View>
        </VStack>

        <SelectorModal
          visible={showTypeModal}
          onClose={() => setShowTypeModal(false)}
          options={inquiry_types}
          onSelect={(option) => {
            markTouched("type");
            setSelectedType(option.value);
            setTypeError("");
            setBookingIdError(validateBookingId(bookingId, option.value));
            if (
              !category &&
              (option.value === "service_issue" ||
                option.value === "car_issue" ||
                option.value === "driver_issue")
            ) {
              setCategory("service_issue");
            } else if (
              !category &&
              (option.value === "app_issue" || option.value === "other")
            ) {
              setCategory("other_issue");
            }
          }}
          title="Select Inquiry Type"
          selectedValue={selectedType}
          labelField="label"
          valueField="value"
        />
        <AlertModal
          title="Success!"
          visible={toastVisible}
          message={toastMessage}
          type="success"
          onClose={() => setToastVisible(false)}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default Inquiry;
