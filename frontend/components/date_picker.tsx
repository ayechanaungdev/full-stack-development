import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Modal, Platform } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { CalendarDays } from "lucide-react-native";

interface DateInputProps {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
  unavailableDates?: string[];
}

const DatePicker: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  minimumDate,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(undefined);
    }
  }, [value]);

  // Prevent timezone issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = minimumDate || today;

  const formatDate = (date?: Date) =>
    date
      ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
          2,
          "0",
        )}/${String(date.getDate()).padStart(2, "0")}`
      : "yyyy/mm/dd";

  // For Android: handle both confirm and cancel
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setPickerVisible(false);
      // event.type === 'dismissed' means user cancelled
      if (event?.type === "dismissed") return;
    }
    if (date) {
      setSelectedDate(date);
      const formatted = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      onChange(formatted);
    }
  };

  return (
    <VStack className="flex-1">
      <Text className="mb-1 text-black text-[14px] font-normal">{label}</Text>

      <Pressable
        onPress={() => setPickerVisible(true)}
        className="border border-outline-400 bg-white rounded-xl px-3 h-11 justify-center"
      >
        <HStack className="justify-between items-center">
          <Text className="text-black text-sm mb-1">
            {formatDate(selectedDate)}
          </Text>

          <CalendarDays size={18} color="#32B6EA" />
        </HStack>
      </Pressable>

      {/* Android */}
      {Platform.OS === "android" && pickerVisible && (
        <DateTimePicker
          value={selectedDate || minDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          onChange={handleDateChange}
        />
      )}

      {/* iOS */}
      {Platform.OS === "ios" && (
        <Modal visible={pickerVisible} transparent animationType="slide">
          <Box className="flex-1 justify-end bg-black/30">
            <Box className="bg-white p-4 rounded-t-2xl">
              <DateTimePicker
                value={selectedDate || minDate}
                mode="date"
                display="spinner"
                minimumDate={minDate}
                onValueChange={handleDateChange}
              />

              <Pressable
                onPress={() => setPickerVisible(false)}
                className="items-center mt-3"
              >
                <Text className="text-base font-semibold text-brand-700">
                  Done
                </Text>
              </Pressable>
            </Box>
          </Box>
        </Modal>
      )}
    </VStack>
  );
};

export default DatePicker;
