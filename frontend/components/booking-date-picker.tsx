import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import React, { useState } from "react";
import { Modal } from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarDays } from "lucide-react-native";

interface DateInputProps {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
  markedDates?: string[];
  required?: boolean;
}

const DatePicker: React.FC<DateInputProps> = ({
  label,
  value,
  required,
  onChange,
  minimumDate,
  markedDates = [],
}) => {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = minimumDate || today;

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const formatDate = (date?: string) =>
    date ? date.replace(/-/g, "/") : "yyyy/mm/dd";

  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Generate marked dates
  const getMarkedDates = () => {
    const marked: any = {};

    markedDates.forEach((date) => {
      marked[date] = {
        disabled: true,
        disableTouchEvent: true,
        marked: true,
        dotColor: "red",
      };
    });

    if (value) {
      marked[value] = {
        selected: true,
        selectedColor: "#32B6EA",
      };
    }

    return marked;
  };

  // Month boundaries
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return (
    <VStack className="flex-1">
      <Text className="mb-1 text-black text-sm">
        {label}
        {required && <Text className="text-error-500"> *</Text>}
      </Text>

      <Pressable
        onPress={() => setVisible(true)}
        className="border border-outline-400 rounded-xl px-3 h-11 justify-center"
      >
        <HStack className="gap-2 items-center">
          <CalendarDays size={18} color="#32B6EA" />
          <Text className="text-black text-sm">
            {formatDate(value)}
          </Text>
        </HStack>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
        <Box className="flex-1 justify-end bg-black/30">
          <Box
            className="bg-white p-4 rounded-t-2xl"
            style={{ paddingBottom: insets.bottom + 12 }}
          >

            {/* Custom Header */}
            <HStack className="justify-between items-center mb-3">
              {/* Prev */}
              <Pressable
                disabled={currentMonth.getTime() === thisMonth.getTime()}
                onPress={() => {
                  setCurrentMonth(thisMonth);
                }}
              >
                <Text
                  className={`font-semibold ${currentMonth.getTime() === thisMonth.getTime()
                    ? "text-typography-600"
                    : "text-brand-700"
                    }`}
                >
                  Prev
                </Text>
              </Pressable>

              {/* Title */}
              <Text className="font-semibold">
                {currentMonth.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              {/* Next */}
              <Pressable
                disabled={currentMonth.getTime() === nextMonth.getTime()}
                onPress={() => {
                  setCurrentMonth(nextMonth);
                }}
              >
                <Text
                  className={`font-semibold ${currentMonth.getTime() === nextMonth.getTime()
                    ? "text-gray-400"
                    : "text-brand-700"
                    }`}
                >
                  Next
                </Text>
              </Pressable>
            </HStack>

            <Calendar
              key={currentMonth.toISOString()} // 🔥 force re-render

              current={formatLocalDate(currentMonth)}

              minDate={formatLocalDate(minDate)}

              maxDate={formatLocalDate(
                new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()
                )
              )}

              markedDates={getMarkedDates()}

              enableSwipeMonths={false}
              hideArrows={true}
              renderHeader={() => null}
              disableAllTouchEventsForDisabledDays={true}
              hideExtraDays={true}

              onDayPress={(day) => {
                if (new Date(day.dateString) < minDate) return;

                onChange(day.dateString);
                setVisible(false);
              }}
            />

            <Pressable
              onPress={() => setVisible(false)}
              className="items-center mt-3"
            >
              <Text className="text-base font-semibold text-brand-700">
                Close
              </Text>
            </Pressable>

          </Box>
        </Box>
      </Modal>
    </VStack>
  );
};

export default DatePicker;