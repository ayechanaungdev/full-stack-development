import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { LocationOption } from "@/utils/dashboard";
import {
  brand,
  CARD_SHADOW,
  dateToIso,
  DEFAULT_SEARCH_LOCATION,
  fmtDisplay,
  getTownshipName,
  isoDate,
  isoToDate,
  showToast,
} from "@/utils/dashboardHelpers";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  Calendar,
  CalendarMinus2,
  ChevronDown,
  MapPin,
  Search,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { Platform, Pressable } from "react-native";
import { SelectorModal } from "../SelectorModal";

export function QuickExploreCard({
  locationOptions,
  loadingLocations,
  userPostalCode,
}: {
  locationOptions: LocationOption[];
  loadingLocations: boolean;
  userPostalCode: string;
}) {
  const [selectedLocation, setSelectedLocation] = useState<string>(
    userPostalCode ?? DEFAULT_SEARCH_LOCATION,
  );
  const [showLocationModal, setShowLocationModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userPostalCode) {
        setSelectedLocation(userPostalCode);
      }
    }, [userPostalCode]),
  );

  const selectedLabel =
    (locationOptions.find((o) => o.value === selectedLocation)?.label ??
    getTownshipName(selectedLocation))
      ? `${locationOptions.find((o) => o.value === selectedLocation)?.label ?? getTownshipName(selectedLocation)} Township`
      : "";

  const [startDate, setStartDate] = useState(isoDate(0));
  const [endDate, setEndDate] = useState(isoDate(2));
  const [dateError, setDateError] = useState("");
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(
    null,
  );

  const [pickerValue, setPickerValue] = useState<Date>(isoToDate(isoDate(0)));
  const openPicker = (field: "start" | "end" | null) => {
    setShowLocationModal(false);
    setPickerValue(isoToDate(field === "start" ? startDate : endDate));
    setActivePicker(field);
  };

  const handlePickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setActivePicker(null);
    if (_event.type === "dismissed" || !selected) return;
    const iso = dateToIso(selected);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activePicker === "start") {
      setStartDate(iso);
      if (selected >= today) setDateError("");
    } else {
      setEndDate(iso);
      if (iso > startDate) setDateError("");
    }
  };

  const [searching, setSearching] = useState(false);
  const validate = (): boolean => {
    if (!selectedLocation) {
      showToast("Please select a location.");
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(startDate) < today) {
      setDateError("Start date cannot be in the past.");
      return false;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setDateError("End date cannot be before start date.");
      return false;
    }

    setDateError("");
    return true;
  };

  const handleSearch = async () => {
    if (!validate()) return;
    setSearching(true);
    try {
      router.push({
        pathname: "/(protected)/(home)/search",
        params: { location: selectedLocation, startDate, endDate },
      });
    } catch (err) {
      showToast("Something went wrong.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <LinearGradient
      colors={["#e0f2fe", "#bae6fd"]} // sky-100 → sky-200
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        // 1. Keep your layout styles
        marginHorizontal: 18,
        marginTop: 16,
        marginBottom: 18,
        borderRadius: 28,
        padding: 20,

        ...CARD_SHADOW,
        backgroundColor: "#e0f2fe",
        borderWidth: 1,
        borderColor: `${brand[925]}1A`,
      }}
    >
      <Box>
        <Heading size="xl" className="mb-4 font-extrabold text-brand-900">
          Quick Explore
        </Heading>

        <Box className="mb-3">
          <Pressable
            onPress={() => {
              if (!loadingLocations) setShowLocationModal(true);
            }}
            className="flex-row items-center justify-between px-4 bg-white rounded-2xl h-14"
          >
            <HStack className="items-center flex-1 gap-2">
              <Icon as={MapPin} size="md" className="text-sky-700" />
              <VStack className="flex-1">
                <Text className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">
                  Location
                </Text>

                {loadingLocations ? (
                  <HStack className="items-center gap-2">
                    <Text className="text-sm text-gray-400">
                      Select township
                    </Text>
                  </HStack>
                ) : (
                  <Text className="text-sm font-bold text-gray-800">
                    {selectedLabel || "Select township"}
                  </Text>
                )}
              </VStack>
            </HStack>
            {/* Dropdown Icon -> Blue */}
            <Icon as={ChevronDown} size="md" className="text-sky-700" />
          </Pressable>
        </Box>

        <HStack className="gap-3 mb-1">
          {/* Start Date */}
          <Pressable
            onPress={() => openPicker("start")}
            className="flex-1 px-3 py-3 bg-white rounded-2xl"
          >
            <HStack className="items-center gap-2">
              {/* Start Date Icon -> Blue */}
              <Icon as={Calendar} size="md" className="text-sky-700" />
              <VStack className="flex-1">
                <Text className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">
                  Start Date
                </Text>
                <Text className="text-sm font-bold text-gray-800">
                  {fmtDisplay(startDate)}
                </Text>
              </VStack>
            </HStack>
          </Pressable>

          {/* End Date */}
          <Pressable
            onPress={() => openPicker("end")}
            className="flex-1 px-3 py-3 bg-white rounded-2xl"
          >
            <HStack className="items-center gap-2">
              {/* End Date Icon -> Blue */}
              <Icon as={CalendarMinus2} size="md" className="text-sky-700" />
              <VStack className="flex-1">
                <Text className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">
                  End Date
                </Text>
                <Text className="text-sm font-bold text-gray-800">
                  {fmtDisplay(endDate)}
                </Text>
              </VStack>
            </HStack>
          </Pressable>
        </HStack>

        {/* DateTimePicker Logic */}
        {activePicker !== null && (
          <Box className="mt-2">
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date(2000, 0, 1)}
              onChange={handlePickerChange}
            />

            {Platform.OS === "ios" && (
              <Pressable
                onPress={() => setActivePicker(null)}
                className="self-end mt-1 px-5 py-1.5 bg-sky-500 rounded-full"
              >
                <Text className="text-xs font-bold text-white">Done</Text>
              </Pressable>
            )}
          </Box>
        )}

        {dateError ? (
          <Text className="px-1 mt-2 text-xs font-bold text-red-500">
            {dateError}
          </Text>
        ) : (
          <Box className="mt-2" />
        )}

        <Pressable
          onPress={handleSearch}
          disabled={searching}
          className="mt-3 w-full items-center justify-center rounded-full bg-sky-500 px-4 py-3"
          style={{ minHeight: 48 }}
        >
          <HStack className="items-center justify-center gap-2">
            <Icon as={Search} size="sm" color="white" />
            <Text
              className="text-center text-sm font-extrabold text-white"
              numberOfLines={1}
              allowFontScaling={false}
            >
              {searching ? "Searching…" : "Search Availability"}
            </Text>
          </HStack>
        </Pressable>

        {/* The Selector Modal implementation you prefer */}

        <SelectorModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          options={locationOptions.map((opt) => ({
            ...opt,
          }))}
          labelField="label"
          onSelect={(opt: any) => {
            setSelectedLocation(opt.value);
            setShowLocationModal(false);
            setDateError("");
          }}
          title="Select Location"
        />
      </Box>
    </LinearGradient>
  );
}
