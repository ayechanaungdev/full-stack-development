import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";

export const AvailabeDateCalendar = ({ unavailableDates }: { unavailableDates: string[] }) => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth()); // 0 = Jan
  const [year, setYear] = useState(today.getFullYear());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const currentDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Adjust so Monday is first column
  const offset = (firstDayOfMonth + 6) % 7;

  // Restrict navigation: only current month and next month
  const goToPrevMonth = () => {
    // Prevent going before current month
    if (month > today.getMonth() || year > today.getFullYear()) {
      if (month === 0) {
        setMonth(11);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    }
  };

  const goToNextMonth = () => {
    // Allow only up to next month
    const nextMonth = today.getMonth() + 1;
    const nextYear = today.getFullYear();
    if (month < nextMonth || year < nextYear) {
      if (month === 11) {
        setMonth(0);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    }
  };

  return (
    <Box className="mb-6 rounded-xl p-4 border border-[#00000012] shadow-md bg-white">
      {/* Top heading row: Reserve Dates + arrows on the right */}
      <HStack className="justify-between items-center mb-3">
        <Text className="font-bold text-brand-975 text-lg">
          Reserve Dates
        </Text>

        <HStack className="items-center space-x-2">
          <Pressable
            onPress={goToPrevMonth}
            disabled={month === today.getMonth() && year === today.getFullYear()}
          >
            <ChevronLeft
              size={22}
              color={
                month === today.getMonth() && year === today.getFullYear()
                  ? "#94A3B8" // disabled
                  : "#16a8e3" // active
              }
            />
          </Pressable>

          <Pressable
            onPress={goToNextMonth}
            disabled={
              month === (today.getMonth() + 1) % 12 &&
              year === today.getFullYear() + (today.getMonth() === 11 ? 1 : 0)
            }
          >
            <ChevronRight
              size={22}
              color={
                month === (today.getMonth() + 1) % 12 &&
                  year === today.getFullYear() + (today.getMonth() === 11 ? 1 : 0)
                  ? "#94A3B8" // disabled
                  : "#16a8e3" // active
              }
            />
          </Pressable>
        </HStack>
      </HStack>

      {/* Month/year aligned left */}
      <Text className="text-2xs text-[#64748B] mb-4 p-2">
        {monthNames[month]} {year}
      </Text>

      {/* Weekday labels */}
      <HStack className="flex-wrap mb-2">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <Box key={d} className="w-[14.28%] p-[2px]">
            <Box className="items-center justify-center">
              <Text className="text-gray-600 text-xs sm:text-sm">
                {d}
              </Text>
            </Box>
          </Box>
        ))}
      </HStack>

      {/* Days grid */}
      <HStack className="flex-wrap">
        {Array.from({ length: offset }).map((_, i) => (
          <Box key={`empty-${i}`} className="w-[14.28%] p-[2px]">
            <Box className="aspect-square" />
          </Box>
        ))}

        {daysArray.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isUnavailable = unavailableDates.includes(dateStr);
          const isToday = dateStr === currentDate;

          return (
            <Box key={day} className="w-[14.28%] p-[2px]">
              <Box
                className="aspect-square items-center justify-center rounded-md"
                style={{
                  backgroundColor: isUnavailable
                    ? "#DCDCDC4D" //30% of #DCDCDC
                    : isToday
                      ? "#16a8e3"
                      : "#FFFFFF",
                }}
              >
                <Text
                  style={{
                    color: isToday ? "#FFFFFF" : "#000000",
                    fontWeight: isToday ? "bold" : "normal",
                  }}
                >
                  {day}
                </Text>
              </Box>
            </Box>
          );
        })}
      </HStack>

      {/* Legend */}
      <HStack className="mt-4 gap-4">
        <HStack className="items-center gap-1">
          <Box className="w-[12px] h-[12px] rounded-sm bg-brand-700" />
          <Text className="text-xs text-gray-600">Today</Text>
        </HStack>
        <HStack className="items-center gap-1">
          <Box className="w-[12px] h-[12px] rounded-sm bg-[#DCDCDC4D]" />
          <Text className="text-xs text-gray-600">Unavailable</Text>
        </HStack>
      </HStack>
    </Box>
  );
};