import React, { useRef, useState } from "react";
import { Modal, Pressable, FlatList } from "react-native";
import { Box } from "@/components/ui/box";
// import { box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";

interface MonthYearPickerProps {
  initialMonth?: number;
  initialYear?: number;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (month: number, year: number) => void;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - 25 + i);

const ITEM_HEIGHT = 40;

export default function MonthYearPicker({
  initialMonth = new Date().getMonth(),
  initialYear = CURRENT_YEAR,
  isOpen,
  onClose,
  onSelect,
}: MonthYearPickerProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const yearListRef = useRef<FlatList>(null);

  const openYearPicker = () => {
    setShowYearPicker(true);

    requestAnimationFrame(() => {
      const index = YEARS.findIndex((y) => y === currentYear);

      if (index >= 0) {
        setTimeout(() => {
          yearListRef.current?.scrollToIndex({
            index,
            animated: false,
            viewPosition: 0.5,
          });
        }, 150);
      }
    });
  };

  const handleOk = () => {
    onSelect(selectedMonth, currentYear);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <Box className="flex-1 justify-center items-center bg-black/50 px-4">
        <Box className="w-full max-w-[320px] bg-white rounded-xl overflow-hidden relative">
          {/* HEADER */}
          <Box className="bg-brand-700 px-6 py-5">
            <Text className="text-xs text-white/80">Select Month & Year</Text>

            <HStack className="mt-2 items-center gap-3">
              <Text className="text-2xl font-bold text-white">
                {MONTHS[selectedMonth]}
              </Text>

              <Pressable onPress={openYearPicker}>
                <Text className="text-xl text-white/80 underline">
                  {currentYear}
                </Text>
              </Pressable>
            </HStack>
          </Box>

          {/* MONTH GRID */}
          <VStack className="p-4">
            <Box className="flex-row flex-wrap justify-between">
              {MONTHS.map((month, index) => {
                const isSelected = selectedMonth === index;

                return (
                  <Pressable
                    key={month}
                    onPress={() => setSelectedMonth(index)}
                    className={`w-[30%] h-14 mb-3 rounded-full items-center justify-center ${
                      isSelected ? "bg-brand-700" : "bg-gray-100"
                    }`}
                  >
                    <Text className="text-xs font-semibold">{month}</Text>
                  </Pressable>
                );
              })}
            </Box>

            <HStack className="justify-end mt-4" space="md">
              <Pressable
                onPress={onClose}
                className="w-[100px] bg-gray-200 px-4 py-2 rounded-full"
              >
                <Text className="text-gray-600 font-semibold text-center">
                  CANCEL
                </Text>
              </Pressable>

              <Pressable
                onPress={handleOk}
                className="w-[100px] bg-brand-100 px-4 py-2 rounded-full"
              >
                <Text className="text-brand-700 font-semibold text-center">
                  OK
                </Text>
              </Pressable>
            </HStack>
          </VStack>

          {/* YEAR PICKER */}
          {showYearPicker && (
            <Box className="absolute inset-0 bg-white justify-center items-center p-4 z-50">
              <Text className="text-center font-bold mb-3">Select Year</Text>

              <FlatList
                ref={yearListRef}
                data={YEARS}
                keyExtractor={(item) => item.toString()}
                showsVerticalScrollIndicator={false}
                style={{ height: 220, width: "100%" }}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    yearListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                    });
                  }, 200);
                }}
                renderItem={({ item }) => {
                  const isActive = item === currentYear;

                  return (
                    <Pressable
                      onPress={() => {
                        setCurrentYear(item);
                        setShowYearPicker(false);
                      }}
                      className="h-[40px] items-center justify-center"
                    >
                      <Text
                        className={
                          isActive
                            ? "text-brand-700 font-bold text-lg"
                            : "text-gray-400"
                        }
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                }}
              />

              <Pressable onPress={() => setShowYearPicker(false)}>
                <Text className="mt-3 text-brand-700 font-semibold">Close</Text>
              </Pressable>
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
